import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Network,
  List,
  ArrowUpRight,
  TrendingDown,
  Clock,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { mockExplain, mockNetworks } from '../api/mockData';
import './XaiSection.css';

interface XaiSectionProps {
  pageVisible?: boolean;
}

export const XaiSection: React.FC<XaiSectionProps> = ({ pageVisible = true }) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // Active factor selection (keys: 'forward_ratio' | 'hourly_velocity' | 'account_age_days' | 'retained_balance')
  const [selectedFactor, setSelectedFactor] = useState<string>('forward_ratio');

  // Mobile graph vs entity list toggle
  const [mobileView, setMobileView] = useState<'list' | 'graph'>('list');

  // Mobile accordion expanded state (records factor key)
  const [mobileExpandedFactor, setMobileExpandedFactor] = useState<string | null>('forward_ratio');

  // Tooltip hover state on graph nodes
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Section in-view / reveal stages
  // Reveal order: 1: risk identified -> 2: risk score -> 3: contributing factors -> 4: evidence rows -> 5: small graph -> 6: counterfactual explanation
  const [revealStage, setRevealStage] = useState<number>(prefersReduced ? 6 : 0);

  useEffect(() => {
    if (prefersReduced) {
      setRevealStage(6);
      return;
    }
    // Stagger reveal order in sequence
    const timers = [
      setTimeout(() => setRevealStage(1), 100),   // Risk identified
      setTimeout(() => setRevealStage(2), 350),   // Risk score & arc gauge
      setTimeout(() => setRevealStage(3), 650),   // Contributing factor bars fill
      setTimeout(() => setRevealStage(4), 950),   // Evidence rows
      setTimeout(() => setRevealStage(5), 1250),  // Graph highlighting
      setTimeout(() => setRevealStage(6), 1550),  // Plain-language explanation
    ];
    return () => timers.forEach(clearTimeout);
  }, [prefersReduced]);

  // Network data for ACC_05001
  const network = mockNetworks['ACC_05001'];
  const hubNode = network.nodes.find((n) => n.id === 'ACC_05001')!;
  const inboundEdges = network.edges.filter((e) => e.dst === 'ACC_05001');
  const outboundEdges = network.edges.filter((e) => e.src === 'ACC_05001');

  // Exact factors from backend
  const factors = mockExplain.top_features; // 4 factors in descending SHAP magnitude order: forward_ratio (0.38), hourly_velocity (0.29), account_age_days (0.19), retained_balance (-0.05)

  // Factor specific evidence rows
  const evidenceMap: Record<
    string,
    {
      summary: string;
      metrics: { label: string; value: string }[];
      rows: { timestamp: string; desc: string; amount: string; tag: string }[];
    }
  > = {
    forward_ratio: {
      summary:
        'Inflow of ₹4,24,089.49 was immediately evacuated across 6 outbound accounts within 14.2 minutes of arrival (94.23% pass-through ratio).',
      metrics: [
        { label: 'Pass-Through', value: '94.23%' },
        { label: 'Transit Window', value: '14.2 min' },
        { label: 'Destinations', value: '6 accounts' },
      ],
      rows: [
        { timestamp: '10:28:00 UTC', desc: 'ACC_05001 → ACC_05002', amount: '₹72,000.00', tag: 'Dispersal 1/6' },
        { timestamp: '10:29:15 UTC', desc: 'ACC_05001 → ACC_05003', amount: '₹68,000.00', tag: 'Dispersal 2/6' },
        { timestamp: '10:30:40 UTC', desc: 'ACC_05001 → ACC_05004', amount: '₹65,000.00', tag: 'Dispersal 3/6' },
        { timestamp: '10:32:00 UTC', desc: 'ACC_05001 → ACC_05005', amount: '₹64,000.00', tag: 'Dispersal 4/6' },
        { timestamp: '10:33:30 UTC', desc: 'ACC_05001 → ACC_05006', amount: '₹65,000.00', tag: 'Dispersal 5/6' },
        { timestamp: '10:35:00 UTC', desc: 'ACC_05001 → ACC_05007', amount: '₹65,620.00', tag: 'Dispersal 6/6' },
      ],
    },
    hourly_velocity: {
      summary:
        'Burst arrival of 18.4 transactions/hour far exceeds retail threshold (0.32 tx/h). 5 inbound credits arrived within 8 minutes 45 seconds.',
      metrics: [
        { label: 'Burst Velocity', value: '18.4 tx/h' },
        { label: 'Baseline Average', value: '0.32 tx/h' },
        { label: 'Velocity Multiplier', value: '57.5x' },
      ],
      rows: [
        { timestamp: '10:14:00 UTC', desc: 'ACC_01094 → ACC_05001', amount: '₹45,000.00', tag: 'Inbound 1' },
        { timestamp: '10:16:30 UTC', desc: 'ACC_01429 → ACC_05001', amount: '₹38,500.00', tag: 'Inbound 2' },
        { timestamp: '10:18:10 UTC', desc: 'ACC_01592 → ACC_05001', amount: '₹52,000.00', tag: 'Inbound 3' },
        { timestamp: '10:20:00 UTC', desc: 'ACC_01883 → ACC_05001', amount: '₹49,000.00', tag: 'Inbound 4' },
        { timestamp: '10:22:45 UTC', desc: 'ACC_02183 → ACC_05001', amount: '₹42,000.00', tag: 'Inbound 5' },
      ],
    },
    account_age_days: {
      summary:
        'Account was opened only 22 days prior to receiving ₹4.24L in rapid transfers. Zero recurring salary or utility history on file.',
      metrics: [
        { label: 'Account Age', value: '22 days' },
        { label: 'Prior Inflow', value: '₹0.00' },
        { label: 'KYC Telemetry', value: 'Unverified' },
      ],
      rows: [
        { timestamp: '22 days ago', desc: 'Account opened via mobile instant onboarding', amount: 'Initial Deposit: ₹500', tag: 'KYC Event' },
        { timestamp: '15 days ago', desc: 'Phone SIM activated with zero prepaid recharge history', amount: 'Device: DEV_MULE_99', tag: 'Device Telemetry' },
        { timestamp: 'Day 22 (Today)', desc: 'Sudden spike of ₹4.24L inflow from 11 distinct accounts', amount: '₹4,24,089.49 Total', tag: 'Volume Surge' },
      ],
    },
    retained_balance: {
      summary:
        '₹24,469.49 residual balance retained (5.77% of total volume) as a liquidity buffer, slightly mitigating risk contribution by -0.05 SHAP.',
      metrics: [
        { label: 'Retained Balance', value: '₹24,469.49' },
        { label: 'Retention Rate', value: '5.77%' },
        { label: 'SHAP Contribution', value: '-0.05' },
      ],
      rows: [
        { timestamp: '10:25:00 UTC', desc: 'Total Inbound Pool Accumulation', amount: '₹4,24,089.49', tag: 'Total Credited' },
        { timestamp: '10:35:00 UTC', desc: 'Total Outbound Dispersal Executed', amount: '₹3,99,620.00', tag: 'Drained Out' },
        { timestamp: 'Current Status', desc: 'Residual Unmoved Account Balance', amount: '₹24,469.49', tag: 'Available Buffer' },
      ],
    },
  };

  const activeEvidence = evidenceMap[selectedFactor] || evidenceMap.forward_ratio;

  // Normalization for horizontal bar widths (max absolute SHAP in set is 0.38)
  const getBarPercentage = (shapValue: number) => {
    const absVal = Math.abs(shapValue);
    return Math.min(100, Math.round((absVal / 0.40) * 100));
  };

  // Arc Gauge calculations: 270 degree arc
  // Radius = 62, center = (80, 80)
  // Arc starts at 135 deg and ends at 405 deg (length 270 deg)
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees is 75% of circumference
  const arcLength = circumference * 0.75; // 292.17
  const scorePercent = mockExplain.risk_score / 100; // 0.96
  const strokeDashoffset = arcLength * (1 - scorePercent);

  // SVG network node coordinates (viewBox: 0 0 960 280)
  // Inbound nodes (x: 100)
  const inboundPositions = [
    { id: 'ACC_01094', y: 35 },
    { id: 'ACC_01429', y: 85 },
    { id: 'ACC_01592', y: 135 },
    { id: 'ACC_01883', y: 185 },
    { id: 'ACC_02183', y: 235 },
  ];
  // Central hub (x: 480, y: 135)
  const hubPos = { x: 480, y: 135 };
  // Outbound nodes (x: 860)
  const outboundPositions = [
    { id: 'ACC_05002', y: 25 },
    { id: 'ACC_05003', y: 69 },
    { id: 'ACC_05004', y: 113 },
    { id: 'ACC_05005', y: 157 },
    { id: 'ACC_05006', y: 201 },
    { id: 'ACC_05007', y: 245 },
  ];

  return (
    <section className="xai-section" id="xai">
      <div className="god-wrap">
        {/* Section Header */}
        <div className="section-head">
          <div className="section-meta-row">
            <span className="head-kicker mono">07 · AUDITABLE DECISIONING</span>
            <ProvenanceBadge source="sample" label="SAMPLE · ACC_05001 AUDIT" />
          </div>
          <h2 className="head-title serif">Why was this flagged?</h2>
          <p className="head-sub">
            Black-box AI is unacceptable in financial compliance. Every MuleTrace score is decomposed into exact
            GraphSAGE SHAP factor contributions, transaction evidence rows, and localized topology cut.
          </p>
        </div>

        {/* Asymmetric Desktop Layout: Verdict Left, Explanation & Factors Right */}
        <div className="xai-asymmetric-layout">
          {/* Left Column: Verdict Card */}
          <div className="xai-verdict-column">
            <div className="xai-verdict-card">
              {/* Reveal Step 1: Risk Identified */}
              <div
                className={`xai-risk-status ${revealStage >= 1 ? 'revealed' : 'hidden-stage'}`}
              >
                <span className="risk-pulse-dot" />
                <span className="mono risk-status-label">RISK IDENTIFIED · TIER 1</span>
              </div>

              <div className="verdict-subject-row">
                <span className="mono subject-kicker">PRIMARY SUBJECT</span>
                <h3 className="mono subject-id">{mockExplain.account_id}</h3>
              </div>

              {/* Reveal Step 2: Risk Score Gauge */}
              <div className={`xai-gauge-wrap ${revealStage >= 2 ? 'revealed' : 'hidden-stage'}`}>
                <svg className="xai-arc-svg" viewBox="0 0 160 160" width="160" height="160">
                  {/* Gauge background track (270 deg) */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth="5"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset="0"
                    transform="rotate(135 80 80)"
                    strokeLinecap="round"
                  />
                  {/* Gauge active value stroke */}
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="var(--risk)"
                    strokeWidth="6"
                    strokeDasharray={`${arcLength} ${circumference}`}
                    strokeDashoffset={prefersReduced || revealStage >= 2 ? strokeDashoffset : arcLength}
                    transform="rotate(135 80 80)"
                    strokeLinecap="round"
                    className="xai-arc-fill"
                  />
                </svg>

                <div className="xai-gauge-content">
                  <span className="xai-score-num mono">{mockExplain.risk_score}</span>
                  <span className="xai-score-max mono">/ 100</span>
                  <span className="xai-score-sub mono">PROBABILITY 0.96</span>
                </div>
              </div>

              <div className="verdict-meta-list mono">
                <div className="verdict-meta-item">
                  <span className="meta-label">TYPOLOGY</span>
                  <span className="meta-val text-signal">Fan-In / Fan-Out Hub</span>
                </div>
                <div className="verdict-meta-item">
                  <span className="meta-label">GRAPH DENSITY</span>
                  <span className="meta-val">0.74 (Threshold 0.25)</span>
                </div>
                <div className="verdict-meta-item">
                  <span className="meta-label">TOTAL VOLUME</span>
                  <span className="meta-val">₹4,24,089.49</span>
                </div>
              </div>

              <button
                className="primary-btn xai-inspect-btn"
                onClick={() => navigate('/workspace/ACC_05001')}
                title="Open live workspace for ACC_05001"
              >
                <span>Inspect in Real Workspace</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          {/* Right Column: Contributing Factors & Evidence */}
          <div className="xai-explanation-column">
            {/* Reveal Step 3: Contributing Factors with 25/50/75% Ticks */}
            <div className={`xai-factors-card ${revealStage >= 3 ? 'revealed' : 'hidden-stage'}`}>
              <div className="factors-card-head mono">
                <span className="kicker">SHAP FACTOR ATTRIBUTION (CLICK TO AUDIT EVIDENCE)</span>
                <span className="sort-hint">DESCENDING CONTRIBUTION</span>
              </div>

              {/* Desktop Factor List */}
              <div className="factors-desktop-list">
                {factors.map((feat) => {
                  const isSelected = selectedFactor === feat.feature;
                  const isPositive = feat.shap_value > 0;
                  const pct = getBarPercentage(feat.shap_value);

                  return (
                    <div
                      key={feat.feature}
                      className={`factor-row ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedFactor(feat.feature)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setSelectedFactor(feat.feature)}
                    >
                      <div className="factor-row-head">
                        <div className="factor-title-group">
                          <span className="mono factor-name">{feat.label}</span>
                          <span className="mono factor-direction">
                            {isPositive ? 'Increases Risk' : 'Reduces Risk'}
                          </span>
                        </div>
                        <div className="factor-value-group mono">
                          <span className={`shap-pill ${isPositive ? 'shap-risk' : 'shap-ok'}`}>
                            {isPositive ? `+${feat.shap_value.toFixed(2)}` : feat.shap_value.toFixed(2)} SHAP
                          </span>
                        </div>
                      </div>

                      {/* Bar Track with Visual Ticks at 25%, 50%, 75% */}
                      <div className="factor-bar-track">
                        <div className="tick tick-25" title="25% threshold">
                          <span className="tick-line" />
                          <span className="tick-label mono">25%</span>
                        </div>
                        <div className="tick tick-50" title="50% threshold">
                          <span className="tick-line" />
                          <span className="tick-label mono">50%</span>
                        </div>
                        <div className="tick tick-75" title="75% threshold">
                          <span className="tick-line" />
                          <span className="tick-label mono">75%</span>
                        </div>

                        {/* Animated fill bar */}
                        <div
                          className={`factor-bar-fill ${isPositive ? 'fill-risk' : 'fill-ok'}`}
                          style={{
                            width: prefersReduced || revealStage >= 3 ? `${pct}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Factor Accordion */}
              <div className="factors-mobile-accordion">
                {factors.map((feat) => {
                  const isExpanded = mobileExpandedFactor === feat.feature;
                  const isPositive = feat.shap_value > 0;
                  const pct = getBarPercentage(feat.shap_value);

                  return (
                    <div key={`mob-${feat.feature}`} className="accordion-item">
                      <button
                        className="accordion-trigger"
                        onClick={() => {
                          const next = isExpanded ? null : feat.feature;
                          setMobileExpandedFactor(next);
                          setSelectedFactor(feat.feature);
                        }}
                      >
                        <div className="accordion-title-block">
                          <span className="mono factor-title-mob">{feat.label}</span>
                          <span className={`shap-pill ${isPositive ? 'shap-risk' : 'shap-ok'}`}>
                            {isPositive ? `+${feat.shap_value.toFixed(2)}` : feat.shap_value.toFixed(2)} SHAP
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>

                      {isExpanded && (
                        <div className="accordion-body">
                          <div className="factor-bar-track mob-track">
                            <div className="tick tick-25"><span className="tick-line" /><span className="tick-label mono">25%</span></div>
                            <div className="tick tick-50"><span className="tick-line" /><span className="tick-label mono">50%</span></div>
                            <div className="tick tick-75"><span className="tick-line" /><span className="tick-label mono">75%</span></div>
                            <div
                              className={`factor-bar-fill ${isPositive ? 'fill-risk' : 'fill-ok'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="accordion-summary">{evidenceMap[feat.feature]?.summary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reveal Step 4: Evidence Rows for Active Factor */}
            <div className={`xai-evidence-card ${revealStage >= 4 ? 'revealed' : 'hidden-stage'}`}>
              <div className="evidence-head mono">
                <div className="evidence-title">
                  <Layers size={13} className="text-signal" />
                  <span>SUPPORTING EVIDENCE FOR SELECTED FACTOR</span>
                </div>
                <span className="mono active-factor-tag">{selectedFactor.toUpperCase()}</span>
              </div>

              <p className="evidence-summary-text">{activeEvidence.summary}</p>

              {/* Key metric pills */}
              <div className="evidence-metric-grid">
                {activeEvidence.metrics.map((m) => (
                  <div key={m.label} className="evidence-metric-box">
                    <span className="metric-label mono">{m.label}</span>
                    <span className="metric-val mono">{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Ledger transaction rows */}
              <div className="evidence-rows-list">
                {activeEvidence.rows.map((row, idx) => (
                  <div key={idx} className="evidence-row-item mono">
                    <div className="row-left">
                      <span className="row-time">{row.timestamp}</span>
                      <span className="row-desc">{row.desc}</span>
                    </div>
                    <div className="row-right">
                      <span className="row-amount">{row.amount}</span>
                      <span className="row-tag">{row.tag}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reveal Step 6: One Plain-Language Explanation */}
            <div className={`xai-counterfactual-card ${revealStage >= 6 ? 'revealed' : 'hidden-stage'}`}>
              <div className="counterfactual-head mono">
                <span className="cf-kicker">COUNTERFACTUAL REMEDIATION HYPOTHESIS</span>
                <span className="cf-badge text-ok">MODEL INVERSION</span>
              </div>
              <p className="counterfactual-body serif">
                "{mockExplain.counterfactual}"
              </p>
              <div className="counterfactual-footer mono">
                <span>VERDICT: UNREGULATED TRANSIT LIQUIDATION</span>
                <span>ACTION REQUIRED: DEBIT FREEZE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Reveal Step 5: Full-Width Graph Band Below */}
        <div className={`xai-graph-band ${revealStage >= 5 ? 'revealed' : 'hidden-stage'}`}>
          <div className="graph-band-head">
            <div className="band-title-group">
              <span className="mono band-kicker">TOPOLOGICAL SUBGRAPH (ACC_05001 1-HOP EGO CUT)</span>
              <h3 className="serif band-title">
                {selectedFactor === 'forward_ratio' && 'Highlighting 6 Rapid Dispersal Edges (94.2% Evacuation)'}
                {selectedFactor === 'hourly_velocity' && 'Highlighting 5 High-Velocity Inbound Burst Edges'}
                {selectedFactor === 'account_age_days' && 'Highlighting Synthetic Accounts Opened < 30 Days Ago'}
                {selectedFactor === 'retained_balance' && 'Highlighting Nexus Retention Node (₹24,469.49 Buffer)'}
              </h3>
            </div>

            {/* Mobile View Toggle */}
            <div className="mobile-view-toggle mono">
              <button
                className={`toggle-btn ${mobileView === 'list' ? 'active' : ''}`}
                onClick={() => setMobileView('list')}
              >
                <List size={12} />
                <span>Entity List</span>
              </button>
              <button
                className={`toggle-btn ${mobileView === 'graph' ? 'active' : ''}`}
                onClick={() => setMobileView('graph')}
              >
                <Network size={12} />
                <span>Topology Graph</span>
              </button>
            </div>
          </div>

          {/* Desktop Graph View (or Mobile when toggled) */}
          <div className={`graph-canvas-container ${mobileView === 'list' ? 'mobile-hide-graph' : ''}`}>
            <svg
              className="xai-subgraph-svg"
              viewBox="0 0 960 280"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="edgeGlowOutbound" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--risk)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="edgeGlowInbound" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--data)" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Inbound Edges (ACC_01094... -> ACC_05001) */}
              {inboundPositions.map((pos) => {
                const isHighlighted = selectedFactor === 'hourly_velocity';
                const isDimmed = selectedFactor === 'forward_ratio';

                return (
                  <g key={`in-edge-${pos.id}`}>
                    <path
                      d={`M ${110} ${pos.y} C ${280} ${pos.y}, ${320} ${hubPos.y}, ${hubPos.x - 22} ${hubPos.y}`}
                      fill="none"
                      stroke={isHighlighted ? 'url(#edgeGlowInbound)' : isDimmed ? 'var(--line)' : 'var(--line-strong)'}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeDasharray={isHighlighted ? '4 3' : 'none'}
                      opacity={isDimmed ? 0.25 : 1}
                      className={isHighlighted ? 'edge-pulse-active' : ''}
                    />
                  </g>
                );
              })}

              {/* Outbound Edges (ACC_05001 -> ACC_05002...05007) */}
              {outboundPositions.map((pos) => {
                const isHighlighted = selectedFactor === 'forward_ratio';
                const isDimmed = selectedFactor === 'hourly_velocity';

                return (
                  <g key={`out-edge-${pos.id}`}>
                    <path
                      d={`M ${hubPos.x + 22} ${hubPos.y} C ${640} ${hubPos.y}, ${700} ${pos.y}, ${850} ${pos.y}`}
                      fill="none"
                      stroke={isHighlighted ? 'url(#edgeGlowOutbound)' : isDimmed ? 'var(--line)' : 'var(--line-strong)'}
                      strokeWidth={isHighlighted ? 2.5 : 1}
                      strokeDasharray={isHighlighted ? '5 3' : 'none'}
                      opacity={isDimmed ? 0.25 : 1}
                      className={isHighlighted ? 'edge-dash-flow' : ''}
                    />
                  </g>
                );
              })}

              {/* Inbound Feeder Nodes (Left Column) */}
              {inboundPositions.map((pos) => {
                const isSelectedFactorInbound = selectedFactor === 'hourly_velocity';
                return (
                  <g
                    key={`in-node-${pos.id}`}
                    className="graph-node-group"
                    onMouseEnter={() => setHoveredNode(pos.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx={100}
                      cy={pos.y}
                      r={7}
                      fill="var(--bg-2)"
                      stroke={isSelectedFactorInbound ? 'var(--signal)' : 'var(--line-strong)'}
                      strokeWidth={isSelectedFactorInbound ? 2 : 1}
                    />
                    <text
                      x={85}
                      y={pos.y + 4}
                      textAnchor="end"
                      fill={isSelectedFactorInbound ? 'var(--text-0)' : 'var(--text-2)'}
                      className="node-mono-text"
                    >
                      {pos.id}
                    </text>
                  </g>
                );
              })}

              {/* Central Hub Node (ACC_05001) */}
              <g
                className="graph-hub-group"
                onMouseEnter={() => setHoveredNode('ACC_05001')}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Outer radar ripple */}
                <circle
                  cx={hubPos.x}
                  cy={hubPos.y}
                  r={32}
                  fill="none"
                  stroke="var(--risk)"
                  strokeWidth="1"
                  opacity="0.3"
                  className="hub-radar"
                />
                <circle
                  cx={hubPos.x}
                  cy={hubPos.y}
                  r={22}
                  fill="var(--bg-1)"
                  stroke="var(--risk)"
                  strokeWidth="2.5"
                />
                <circle cx={hubPos.x} cy={hubPos.y} r={8} fill="var(--risk)" />
                <text
                  x={hubPos.x}
                  y={hubPos.y + 34}
                  textAnchor="middle"
                  fill="var(--risk)"
                  className="hub-id-text mono"
                >
                  ACC_05001 (HUB)
                </text>
                <text
                  x={hubPos.x}
                  y={hubPos.y - 28}
                  textAnchor="middle"
                  fill="var(--text-1)"
                  className="hub-badge-text mono"
                >
                  RISK 96 · TIER 1
                </text>
              </g>

              {/* Outbound Destination Nodes (Right Column) */}
              {outboundPositions.map((pos) => {
                const isSelectedFactorOutbound = selectedFactor === 'forward_ratio';
                const isAgeHighlight = selectedFactor === 'account_age_days';

                return (
                  <g
                    key={`out-node-${pos.id}`}
                    className="graph-node-group"
                    onMouseEnter={() => setHoveredNode(pos.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <circle
                      cx={860}
                      cy={pos.y}
                      r={7}
                      fill="var(--bg-2)"
                      stroke={isSelectedFactorOutbound || isAgeHighlight ? 'var(--signal)' : 'var(--line-strong)'}
                      strokeWidth={isSelectedFactorOutbound ? 2 : 1}
                    />
                    <text
                      x={875}
                      y={pos.y + 4}
                      textAnchor="start"
                      fill={isSelectedFactorOutbound ? 'var(--text-0)' : 'var(--text-2)'}
                      className="node-mono-text"
                    >
                      {pos.id}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Graph Legend & Active Selection Footnote */}
            <div className="graph-band-footer mono">
              <div className="legend-items">
                <span className="legend-item"><span className="legend-dot in" /> 5 Inbound Victim Accounts</span>
                <span className="legend-item"><span className="legend-dot hub" /> Primary Pass-Through Bottleneck</span>
                <span className="legend-item"><span className="legend-dot out" /> 6 Layer-2 Destination Nodes</span>
              </div>
              <div className="active-highlight-desc">
                {selectedFactor === 'forward_ratio' && (
                  <span className="text-signal">ACTIVE: Outbound edges glow with active transfer dispersion</span>
                )}
                {selectedFactor === 'hourly_velocity' && (
                  <span className="text-signal">ACTIVE: Rapid 18.4 tx/h inbound burst pulse</span>
                )}
                {selectedFactor === 'account_age_days' && (
                  <span className="text-signal">ACTIVE: Fresh accounts flagged (&lt; 30 days active history)</span>
                )}
                {selectedFactor === 'retained_balance' && (
                  <span className="text-ok">ACTIVE: Retained liquidity buffer ₹24,469.49</span>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Entity List (Shown on mobile when 'list' toggle is active) */}
          <div className={`mobile-entity-list ${mobileView === 'list' ? 'mobile-show-list' : 'mobile-hide-list'}`}>
            <div className="entity-list-head mono">
              <span>COUNTERPARTY ENTITY (11 TOTAL)</span>
              <span>ROLE / TRANSFER</span>
            </div>
            <div className="entity-items">
              <div className="entity-item hub-row mono">
                <div>
                  <span className="entity-id text-risk">ACC_05001</span>
                  <span className="entity-tag">PRIMARY HUB</span>
                </div>
                <div className="text-right">
                  <span className="entity-amt">₹4,24,089.49</span>
                  <span className="entity-sub text-risk">Score 96</span>
                </div>
              </div>

              {inboundEdges.slice(0, 3).map((e) => (
                <div key={e.src} className="entity-item mono">
                  <div>
                    <span className="entity-id">{e.src}</span>
                    <span className="entity-tag">VICTIM INBOUND</span>
                  </div>
                  <div className="text-right">
                    <span className="entity-amt">₹{e.total_amount.toLocaleString('en-IN')}</span>
                    <span className="entity-sub">10:14 UTC</span>
                  </div>
                </div>
              ))}

              {outboundEdges.slice(0, 3).map((e) => (
                <div key={e.dst} className="entity-item mono">
                  <div>
                    <span className="entity-id text-signal">{e.dst}</span>
                    <span className="entity-tag">MULE BENEFICIARY</span>
                  </div>
                  <div className="text-right">
                    <span className="entity-amt">₹{e.total_amount.toLocaleString('en-IN')}</span>
                    <span className="entity-sub text-signal">Layer 2</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              className="ghost-btn switch-to-graph-btn mono"
              onClick={() => setMobileView('graph')}
            >
              <Network size={13} />
              <span>View Full Interactive Topology Cut</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
