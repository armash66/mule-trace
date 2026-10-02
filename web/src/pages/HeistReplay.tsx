import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { ReplayResponse, ReplayEvent } from '../api/types';
import { formatLakhs, formatDateTime } from '../lib/utils';
import { CytoscapeGraph } from '../components/CytoscapeGraph';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Lock,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export const HeistReplay: React.FC = () => {
  const { ringId: routeRingId } = useParams<{ ringId?: string }>();
  const activeRing = routeRingId || 'fan_1';

  const [replay, setReplay] = useState<ReplayResponse | null>(null);
  const [applyFreeze, setApplyFreeze] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    api.getRingReplay(activeRing, applyFreeze ? 'ACC_05001' : undefined).then((data) => {
      setReplay(data);
      setCurrentStep(0);
      setIsPlaying(false);
    });
  }, [activeRing, applyFreeze]);

  // Animation player loop
  useEffect(() => {
    if (isPlaying && replay) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= replay.events.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500 / speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, replay, speed]);

  const events: ReplayEvent[] = replay?.events || [];
  const currentEvent = events[currentStep] || null;

  // Build active network up to current step
  const activeNodes = (replay?.accounts || []).map((acc) => ({
    id: acc,
    score: acc === 'ACC_05001' ? 96 : 70,
    patterns: ['fan'],
    age_days: 20,
  }));

  const activeEdges = events.slice(0, currentStep + 1).map((e) => ({
    src: e.src,
    dst: e.dst,
    total_amount: e.amount,
    count: 1,
    first_time: e.timestamp,
  }));

  // Calculations for stopped vs escaped
  const totalVolume = replay?.total_amount || 424089.49;
  const stoppable = applyFreeze ? totalVolume : 0;
  const escaped = applyFreeze ? 0 : totalVolume;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Banner & Strategy Comparison */}
      <div
        style={{
          padding: '14px 24px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              Replay Simulator: Ring #{activeRing}
            </h2>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: 'var(--accent-muted)',
                color: 'var(--accent)',
                padding: '2px 8px',
                fontWeight: 600,
              }}
            >
              Time-Respecting Flow
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Scrub chronological funds movement to simulate the effect of proactive freeze intervention.
          </p>
        </div>

        {/* Freeze Intervention Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: applyFreeze ? 'var(--accent-muted)' : 'var(--surface-raised)',
            border: `1px solid ${applyFreeze ? 'var(--accent)' : 'var(--line)'}`,
            padding: '8px 14px',
            transition: 'all 0.15s ease',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            <input
              type="checkbox"
              checked={applyFreeze}
              onChange={(e) => setApplyFreeze(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Apply Min-Cut Freeze at ACC_05001</span>
          </label>

          <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>•</span>

          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--ink-3)' }}>Outcome: </span>
            <span className="mono" style={{ fontWeight: 700, color: applyFreeze ? 'var(--ok)' : 'var(--risk-high)' }}>
              {applyFreeze ? `Stopped ${formatLakhs(stoppable)} (100%)` : `Lost ${formatLakhs(escaped)} (100%)`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Cytoscape Graph on Left, Events Timeline on Right */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Replay Graph View */}
        <div style={{ flex: 2, position: 'relative', height: '100%', backgroundColor: 'var(--bg)' }}>
          <CytoscapeGraph
            nodes={activeNodes}
            edges={activeEdges}
            selectedId={currentEvent ? currentEvent.src : undefined}
            recommendedFreezeId={applyFreeze ? 'ACC_05001' : undefined}
          />
        </div>

        {/* Right: Step Ledger & Event Details */}
        <div
          style={{
            flex: 1,
            minWidth: '360px',
            maxWidth: '420px',
            backgroundColor: 'var(--surface)',
            borderLeft: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, }}>
              Chronological Transfer Ledger
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '2px' }}>
              Step {events.length > 0 ? currentStep + 1 : 0} of {events.length}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {events.map((ev, idx) => {
              const isPastOrCurrent = idx <= currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    backgroundColor: isCurrent
                      ? 'var(--accent-muted)'
                      : isPastOrCurrent
                      ? 'var(--surface-raised)'
                      : 'transparent',
                    opacity: isPastOrCurrent ? 1 : 0.4,
                    borderLeft: isCurrent ? '3px solid var(--accent)' : '1px solid var(--line)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span className="mono" style={{ color: 'var(--ink-3)' }}>{formatDateTime(ev.timestamp)}</span>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                      {formatLakhs(ev.amount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span className="mono" style={{ color: 'var(--ink-2)' }}>{ev.src}</span>
                    <ArrowRight size={12} color="var(--ink-3)" />
                    <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{ev.dst}</span>
                  </div>

                  {ev.is_freeze_point && (
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: 'var(--ok)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <ShieldCheck size={12} />
                      FREEZE INTERVENTION POINT
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Playback Scrubber Control Bar */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        {/* Play/Pause & Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              color: 'var(--paper)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
          </button>

          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            title="Reset to Beginning"
            style={{
              background: 'transparent',
              border: '1px solid var(--line)',
              padding: '6px',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Timeline Slider */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>T=0</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, events.length - 1)}
            value={currentStep}
            onChange={(e) => setCurrentStep(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
            Step {currentStep + 1}/{events.length}
          </span>
        </div>

        {/* Speed Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            padding: '2px',
          }}
        >
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                border: 'none',
                backgroundColor: speed === s ? 'var(--accent)' : 'transparent',
                color: speed === s ? 'var(--paper)' : 'var(--ink-2)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
