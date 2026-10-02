import React, { useState } from 'react';
import { api } from '../api/client';
import { Sliders, Shield, Zap, RefreshCw, BarChart2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

export const RulesLab: React.FC = () => {
  // Detector parameters
  const [fanSenders, setFanSenders] = useState(6);
  const [fanReceivers, setFanReceivers] = useState(3);
  const [forwardRatio, setForwardRatio] = useState(80);
  const [cycleMaxHops, setCycleMaxHops] = useState(5);
  const [chainRatio, setChainRatio] = useState(90);
  const [clusterMaxAge, setClusterMaxAge] = useState(30);
  const [dormancyDays, setDormancyDays] = useState(90);

  // Evasion Red-Team Simulation State
  const [evasionLevel, setEvasionLevel] = useState(0.0);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState({
    recall: 0.971,
    detected_rings: 5,
    active_rings: 5,
  });

  const evasionCurveData = [
    { evasion: '0.0 (None)', recall: 97.1, baseline: 97.1 },
    { evasion: '0.25 (Mild)', recall: 92.4, baseline: 90.0 },
    { evasion: '0.50 (Moderate)', recall: 84.8, baseline: 75.0 },
    { evasion: '0.75 (Aggressive)', recall: 76.2, baseline: 55.0 },
    { evasion: '1.00 (Maximum)', recall: 68.5, baseline: 38.0 },
  ];

  const handleSimulateEvasion = async (level: number) => {
    setEvasionLevel(level);
    setSimulating(true);
    try {
      const res = await api.simulateEvasion(level);
      setSimResult({
        recall: res.recall,
        detected_rings: res.detected_rings || 4,
        active_rings: 5,
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
          Rules Lab & Evasion Stress Testing
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
          Calibrate graph detector thresholds and benchmark ring detection recall against adversarial evasion tactics.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left Column: Detector Calibration Sliders */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Sliders size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              Detector Threshold Parameters
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Fan Senders */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Fan-In Min Senders (N)</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{fanSenders} senders</span>
              </div>
              <input
                type="range"
                min={3}
                max={15}
                value={fanSenders}
                onChange={(e) => setFanSenders(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Fan Receivers */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Fan-Out Min Receivers (M)</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{fanReceivers} receivers</span>
              </div>
              <input
                type="range"
                min={2}
                max={10}
                value={fanReceivers}
                onChange={(e) => setFanReceivers(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Forward Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Fan Min Forward Ratio (R)</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{forwardRatio}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={99}
                value={forwardRatio}
                onChange={(e) => setForwardRatio(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Chain Forward Ratio */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Pass-Through Chain Ratio</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{chainRatio}%</span>
              </div>
              <input
                type="range"
                min={80}
                max={100}
                value={chainRatio}
                onChange={(e) => setChainRatio(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Cluster Max Account Age */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Cluster Max Account Age</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{clusterMaxAge} days</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={clusterMaxAge}
                onChange={(e) => setClusterMaxAge(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            {/* Dormancy Idle Days */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, color: 'var(--ink)' }}>Dormancy Inactivity Window</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--accent)' }}>{dormancyDays} days</span>
              </div>
              <input
                type="range"
                min={30}
                max={180}
                value={dormancyDays}
                onChange={(e) => setDormancyDays(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Adversarial Red Team Evasion Sensitivity */}
        <div
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Shield size={18} color="var(--risk-high)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              Adversarial Evasion Curve
            </h3>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '14px', lineHeight: '1.4' }}>
            Adversaries slow down transfers, rotate IP/devices, and split transaction amounts into smaller micro-hops.
          </p>

          {/* Interactive Evasion Slider */}
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Simulate Evasion Level (ε):</span>
              <span className="mono" style={{ fontWeight: 700, color: 'var(--risk-high)' }}>
                {evasionLevel.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.25}
              value={evasionLevel}
              onChange={(e) => handleSimulateEvasion(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--risk-high)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--ink-3)', marginTop: '4px' }}>
              <span>0.0 (Naive)</span>
              <span>0.5 (Splitting)</span>
              <span>1.0 (Maximum Camouflage)</span>
            </div>
          </div>

          {/* Live Outcome Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            <div style={{ padding: '10px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Recall Retention</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {(simResult.recall * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ padding: '10px', backgroundColor: 'var(--surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', textTransform: 'uppercase' }}>Rings Caught</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ok)', marginTop: '2px' }}>
                {simResult.detected_rings} / {simResult.active_rings}
              </div>
            </div>
          </div>

          {/* Evasion Curve Chart */}
          <div style={{ flex: 1, minHeight: '180px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evasionCurveData}>
                <XAxis dataKey="evasion" stroke="var(--ink-3)" fontSize={10} tickLine={false} />
                <YAxis stroke="var(--ink-3)" fontSize={10} domain={[30, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontSize: '11px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="recall"
                  name="MuleTrace Multi-Layer"
                  stroke="#6D4AFF"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  name="Standard Per-Txn Rule"
                  stroke="#8A8A92"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
