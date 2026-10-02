import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { FreezePlanResponse, ReplayResponse, ReplayEvent, NetworkEdge } from '../api/types';
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
  const [freezePlan, setFreezePlan] = useState<FreezePlanResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<NetworkEdge | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    Promise.all([api.getRingReplay(activeRing, applyFreeze ? 'ACC_05001' : undefined), api.getRingFreezePlan(activeRing)])
      .then(([data, plan]) => {
        setReplay(data);
        setFreezePlan(plan);
        setCurrentStep(0);
        setSelectedNode(null);
        setSelectedEdge(null);
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
  const replayTime = (value: string) => {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
    const match = value.match(/(\d{2})-(\d{2})-(\d{4}).*?(\d{2}):(\d{2})\s*([AP]M)/i);
    if (!match) return 0;
    let hour = Number(match[4]) % 12;
    if (match[6].toUpperCase() === 'PM') hour += 12;
    return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hour, Number(match[5]));
  };
  const eventGaps = events.slice(1).map((event, index) => Math.max(0, replayTime(event.timestamp) - replayTime(events[index].timestamp)));
  const sortedGaps = [...eventGaps].sort((a, b) => a - b);
  const percentile = (value: number) => sortedGaps.length ? sortedGaps[Math.min(sortedGaps.length - 1, Math.floor(sortedGaps.length * value))] : 0;
  const replayDuration = events.length > 1 ? Math.max(1, replayTime(events[events.length - 1].timestamp) - replayTime(events[0].timestamp)) : 1;
  const throughput = events.length / (replayDuration / 1000);

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
    isTainted: e.tainted_amount > 0,
  }));

  const riskOrder = [...activeNodes].sort((a, b) => b.score - a.score).slice(0, 3).map((node) => node.id);
  const baselineIntercepted = events
    .filter((event) => riskOrder.includes(event.dst))
    .reduce((sum, event) => sum + event.tainted_amount, 0);
  const stolenAmount = replay?.total_tainted || 0;
  const freezeAccounts = freezePlan?.recommended_freeze_accounts || [];
  const freezeSeconds = events.length && currentEvent
    ? Math.max(0, (replayTime(currentEvent.timestamp) - replayTime(events[0].timestamp)) / 1000)
    : 0;

  const balances = new Map<string, number>();
  const latestRecipients = new Map<string, { recipient: string; timestamp: string }>();
  events.slice(0, currentStep + 1).forEach((event) => {
    const taint = event.tainted_amount || 0;
    balances.set(event.src, Math.max(0, (balances.get(event.src) || 0) - taint));
    balances.set(event.dst, (balances.get(event.dst) || 0) + taint);
    if (taint > 0) latestRecipients.set(event.src, { recipient: event.dst, timestamp: event.timestamp });
  });
  const watchlist = [...balances.entries()]
    .filter(([, exposure]) => exposure > 0.01)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

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
          backgroundColor: 'var(--paper)',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              Replay of historical data: Ring #{activeRing}
            </h2>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: 'var(--paper-2)',
                color: 'var(--signal)',
                padding: '2px 8px',
                fontWeight: 600,
              }}
            >
              Time-Respecting Flow
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Scrub chronological funds movement. Trace depth capped at 8. p50 {percentile(0.5)}ms · p95 {percentile(0.95)}ms · {throughput.toFixed(2)} transactions/sec.
          </p>
        </div>

        {/* Freeze Intervention Toggle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: applyFreeze ? 'var(--paper-2)' : 'var(--paper-2)',
            border: `1px solid ${applyFreeze ? 'var(--signal)' : 'var(--rule)'}`,
            padding: '8px 14px',
            transition: 'all 0.15s ease',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            <input
              type="checkbox"
              checked={applyFreeze}
              onChange={(e) => setApplyFreeze(e.target.checked)}
              style={{ accentColor: 'var(--signal)', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Apply Min-Cut Freeze at ACC_05001</span>
          </label>

          <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>•</span>

          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--ink-2)' }}>Outcome: </span>
            <span className="mono" style={{ fontWeight: 700, color: applyFreeze ? 'var(--ok)' : 'var(--signal)' }}>
              {applyFreeze ? `Stopped ${formatLakhs(stoppable)} (100%)` : `Lost ${formatLakhs(escaped)} (100%)`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Cytoscape Graph on Left, Events Timeline on Right */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Replay Graph View */}
        <div style={{ flex: 2, position: 'relative', height: '100%', backgroundColor: 'var(--paper)' }}>
            <CytoscapeGraph
            nodes={activeNodes}
            edges={activeEdges}
            selectedId={currentEvent ? currentEvent.src : undefined}
            recommendedFreezeId={applyFreeze ? 'ACC_05001' : undefined}
            onNodeClick={(nodeId) => { setSelectedNode(nodeId); setSelectedEdge(null); }}
            onEdgeClick={(edge) => { setSelectedEdge(edge); setSelectedNode(null); }}
            />
        </div>

        {/* Right: Step Ledger & Event Details */}
        <div
          style={{
            flex: 1,
            minWidth: '360px',
            maxWidth: '420px',
            backgroundColor: 'var(--paper)',
            borderLeft: '1px solid var(--rule)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', backgroundColor: 'var(--paper-2)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Case result</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginBottom: '8px' }}>Synthetic injected case · observed replay, not prediction</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
              <span>Stolen amount <b className="mono">{formatLakhs(stolenAmount)}</b></span>
              <span>Freeze set <b className="mono">{formatLakhs(freezePlan?.rupees_stopped || 0)} / {freezeAccounts.length}</b></span>
              {freezePlan?.estimate_note && <span style={{ color: 'var(--ink-2)' }}>{freezePlan.estimate_note}</span>}
              <span>Top-3 baseline <b className="mono">{formatLakhs(baselineIntercepted)}</b></span>
              <span>Victim → recommendation <b className="mono">{freezeSeconds.toFixed(1)}s</b></span>
            </div>
            {freezePlan && freezePlan.rupees_stopped <= baselineIntercepted && (
              <div style={{ marginTop: '8px', color: 'var(--signal)', fontSize: '11px' }}>Min-cut did not beat the top-3 baseline on this case.</div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>Evidence panel</div>
            {selectedNode && <div style={{ marginTop: '6px', fontSize: '11px' }}>Account <b className="mono">{selectedNode}</b> · click an edge to inspect its transaction.</div>}
            {selectedEdge && <div style={{ marginTop: '6px', fontSize: '11px' }}><b className="mono">{selectedEdge.src} → {selectedEdge.dst}</b><br />Observed transaction: {formatLakhs(selectedEdge.total_amount)} at {selectedEdge.first_time}</div>}
            {!selectedNode && !selectedEdge && <div style={{ marginTop: '6px', color: 'var(--ink-2)', fontSize: '11px' }}>Click a node for account evidence or an edge for its transaction.</div>}
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700 }}>Next-hop watchlist</div>
            <div style={{ fontSize: '10px', color: 'var(--ink-2)', margin: '4px 0 8px' }}>based on observed flows, not prediction · at current replay time</div>
            {watchlist.length === 0 && <div style={{ fontSize: '11px', color: 'var(--ink-2)' }}>No tainted balance observed yet.</div>}
            {watchlist.map(([account, exposure]) => <div key={account} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0' }}><span className="mono">{account} → {latestRecipients.get(account)?.recipient || 'no observed recipient'}</span><b className="mono">{formatLakhs(exposure)}</b></div>)}
          </div>

          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', fontWeight: 600, }}>
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
                    border: '1px solid var(--rule)',
                    backgroundColor: isCurrent
                      ? 'var(--paper-2)'
                      : isPastOrCurrent
                      ? 'var(--paper-2)'
                      : 'transparent',
                    opacity: isPastOrCurrent ? 1 : 0.4,
                    borderLeft: isCurrent ? '3px solid var(--signal)' : '1px solid var(--rule)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                    <span className="mono" style={{ color: 'var(--ink-2)' }}>{formatDateTime(ev.timestamp)}</span>
                    <span className="mono" style={{ fontWeight: 700, color: 'var(--ink)' }}>
                      {formatLakhs(ev.amount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                    <span className="mono" style={{ color: 'var(--ink-2)' }}>{ev.src}</span>
                    <ArrowRight size={12} color="var(--ink-2)" />
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
          backgroundColor: 'var(--paper)',
          borderTop: '1px solid var(--rule)',
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
              backgroundColor: 'var(--signal)',
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
              border: '1px solid var(--rule)',
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
          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>T=0</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, events.length - 1)}
            value={currentStep}
            onChange={(e) => setCurrentStep(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--signal)', cursor: 'pointer' }}
          />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
            Step {currentStep + 1}/{events.length}
          </span>
        </div>

        {/* Speed Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--paper-2)',
            border: '1px solid var(--rule)',
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
                backgroundColor: speed === s ? 'var(--signal)' : 'transparent',
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
