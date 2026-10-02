import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Eye, Network, ShieldCheck } from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { usePageVisibility } from '../lib/useScrollReveal';
import './ProblemSection.css';

/* ── Formatted Currency & Time Utilities ─────────────────── */
const inrFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

interface TransactionRecord {
  id: string;
  timeIST: string;
  fromAccount: string;
  toAccount: string;
  amount: number;
  channel: 'UPI' | 'IMPS' | 'NEFT' | 'RTGS';
  status: string;
  isAmberPath?: boolean;
}

const TRANSACTIONS: TransactionRecord[] = [
  {
    id: 'TX-1092',
    timeIST: '14:02:11 IST',
    fromAccount: 'ACC-****1092',
    toAccount: 'ACC-****7731',
    amount: 48500,
    channel: 'UPI',
    status: 'CLEARED (< ₹50K)',
    isAmberPath: true,
  },
  {
    id: 'TX-4821',
    timeIST: '14:03:45 IST',
    fromAccount: 'ACC-****4821',
    toAccount: 'ACC-****7731',
    amount: 49200,
    channel: 'IMPS',
    status: 'CLEARED (< ₹50K)',
  },
  {
    id: 'TX-8910',
    timeIST: '14:05:12 IST',
    fromAccount: 'ACC-****8910',
    toAccount: 'ACC-****7731',
    amount: 47800,
    channel: 'NEFT',
    status: 'CLEARED (< ₹50K)',
  },
  {
    id: 'TX-3302',
    timeIST: '14:07:30 IST',
    fromAccount: 'ACC-****7731',
    toAccount: 'ACC-****3302',
    amount: 46500,
    channel: 'UPI',
    status: 'CLEARED (< ₹50K)',
  },
  {
    id: 'TX-9921',
    timeIST: '14:08:15 IST',
    fromAccount: 'ACC-****7731',
    toAccount: 'ACC-****9921',
    amount: 49900,
    channel: 'IMPS',
    status: 'CLEARED (< ₹50K)',
    isAmberPath: true,
  },
  {
    id: 'TX-CASH',
    timeIST: '14:09:50 IST',
    fromAccount: 'ACC-****9921',
    toAccount: 'CASHOUT-ATM',
    amount: 95000,
    channel: 'RTGS',
    status: 'CLEARED',
    isAmberPath: true,
  },
];

export const ProblemSection: React.FC = () => {
  const prefersReduced = useReducedMotion();
  const pageVisible = usePageVisibility();

  /* View Mode: 'transaction' | 'network' */
  const [viewMode, setViewMode] = useState<'transaction' | 'network'>('network');

  /* Separate scroll reveal refs for Line 1 and Line 2 of headline */
  const sectionRef = useRef<HTMLElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);

  // Line 1 reveals earlier on scroll
  const line1InView = useInView(line1Ref, {
    amount: 0.1,
    once: true,
  });

  // Line 2 reveals on a higher scroll threshold so it lands as its own punchy beat
  const line2InView = useInView(line2Ref, {
    amount: 0.25,
    once: true,
  });

  /* Auto-switch or keyboard tab handling */
  const tabTxRef = useRef<HTMLButtonElement>(null);
  const tabNetRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setViewMode('network');
      tabNetRef.current?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setViewMode('transaction');
      tabTxRef.current?.focus();
    }
  };

  /* Active states */
  const isNetwork = viewMode === 'network';

  /* Animation timing matching requirement: about 1.2s */
  const duration = prefersReduced ? 0 : 1.2;
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <section
      ref={sectionRef}
      id="problem"
      className={`problem-section ${pageVisible ? '' : 'anim-paused'}`}
      aria-label="The Anomaly Paradox Problem Statement"
    >
      <div className="problem-wrap">
        {/* ── Left Column: Giant Two-Line Statement & Explanatory Context ── */}
        <div className="problem-left-col">
          <div className="problem-kicker mono">
            <span className="kicker-index">02</span>
            <span className="kicker-divider">/</span>
            <span className="kicker-text">THE NETWORK PARADOX</span>
          </div>

          <h2 className="problem-headline" aria-label="One transaction can look normal. The network doesn't.">
            {/* Line 1: Early scroll threshold */}
            <span className="headline-line-wrap" ref={line1Ref}>
              <motion.span
                className="headline-line line-1"
                initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
                animate={line1InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
                transition={{ duration: 0.6, ease }}
              >
                One transaction can look normal.
              </motion.span>
            </span>

            {/* Line 2: Separate, deeper scroll threshold lands as its own beat */}
            <span className="headline-line-wrap" ref={line2Ref}>
              <motion.span
                className="headline-line line-2"
                initial={prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
                animate={line2InView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
                transition={{ duration: 0.7, ease, delay: prefersReduced ? 0 : 0.15 }}
              >
                The network doesn’t.
              </motion.span>
            </span>
          </h2>

          <p className="problem-subhead">
            Siloed core banking controls evaluate transfers in isolation. Layering syndicates exploit
            this by structuring payments under ₹50,000 across multiple mule accounts. In isolation, every transaction clears.
            Connected across hardware and network topologies, the syndicate is unmasked.
          </p>

          {/* Interactive Keyboard-Accessible View Mode Switcher */}
          <div className="problem-toggle-container">
            <span className="toggle-heading mono" id="view-mode-label">
              VIEW PERSPECTIVE:
            </span>
            <div
              className="problem-toggle-group"
              role="tablist"
              aria-labelledby="view-mode-label"
              onKeyDown={handleKeyDown}
            >
              <button
                ref={tabTxRef}
                id="tab-transaction"
                role="tab"
                type="button"
                aria-selected={viewMode === 'transaction'}
                aria-controls="stage-transaction-panel"
                tabIndex={viewMode === 'transaction' ? 0 : -1}
                className={`problem-toggle-btn ${viewMode === 'transaction' ? 'active' : ''}`}
                onClick={() => setViewMode('transaction')}
              >
                <Eye size={13} className="toggle-btn-icon" />
                <span className="toggle-btn-label">TRANSACTION VIEW</span>
              </button>

              <button
                ref={tabNetRef}
                id="tab-network"
                role="tab"
                type="button"
                aria-selected={viewMode === 'network'}
                aria-controls="stage-network-panel"
                tabIndex={viewMode === 'network' ? 0 : -1}
                className={`problem-toggle-btn ${viewMode === 'network' ? 'active' : ''}`}
                onClick={() => setViewMode('network')}
              >
                <Network size={13} className="toggle-btn-icon" />
                <span className="toggle-btn-label">NETWORK VIEW</span>
              </button>
            </div>
          </div>

          {/* Core Caption Requirement */}
          <div className="problem-caption-box">
            <div className="caption-indicator" aria-hidden="true" />
            <p className="problem-caption-text">
              “Nothing in any single row is unusual. The shared device is.”
            </p>
          </div>

          {/* Typology Path Indicator */}
          <div className="problem-path-tracker mono">
            <span className="tracker-label">ACTIVE GRAPH PATH:</span>
            <div className="tracker-flow">
              <span className="flow-step">ACCOUNT</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">TRANSACTION</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">ACCOUNT</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step highlight-amber">DEVICE</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">ACCOUNT</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">CASHOUT</span>
            </div>
          </div>
        </div>

        {/* ── Right Column: Comparison Stage Extending Full-Bleed ── */}
        <div className="problem-stage-col">
          <div className="stage-frame">
            {/* Stage Bar with Provenance Badge */}
            <div className="stage-topbar mono">
              <div className="stage-title-wrap">
                <span className={`stage-status-dot ${isNetwork ? 'dot-amber' : 'dot-green'}`} />
                <span className="stage-title">
                  {isNetwork
                    ? 'ENTITY & INFRASTRUCTURE GRAPH · SHARED HARDWARE UNMASKED'
                    : 'STANDARD TRANSACTION LEDGER · NO THRESHOLD ANOMALIES'}
                </span>
              </div>
              <ProvenanceBadge source="illustrative" />
            </div>

            {/* Stage Canvas Area */}
            <div className={`stage-content-area ${prefersReduced ? 'reduced-motion-stacked' : ''}`}>
              {/* ── 1. The Calm Transaction Ledger ── */}
              <motion.div
                id="stage-transaction-panel"
                role="tabpanel"
                aria-labelledby="tab-transaction"
                className="stage-ledger-view"
                initial={false}
                animate={
                  prefersReduced
                    ? { opacity: 1, x: 0 }
                    : isNetwork
                    ? { opacity: 0.14, x: -12 }
                    : { opacity: 1, x: 0 }
                }
                transition={{ duration, ease }}
              >
                <div className="ledger-scroll-wrap">
                  <table className="problem-ledger-table mono">
                    <thead>
                      <tr>
                        <th scope="col">TIMESTAMP</th>
                        <th scope="col">FROM ACCOUNT</th>
                        <th scope="col">TO ACCOUNT</th>
                        <th scope="col" className="text-right">AMOUNT</th>
                        <th scope="col">CHANNEL</th>
                        <th scope="col">AUDIT STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TRANSACTIONS.map((tx) => (
                        <tr
                          key={tx.id}
                          className={isNetwork && tx.isAmberPath ? 'row-nexus-path' : ''}
                        >
                          <td className="cell-time">{tx.timeIST}</td>
                          <td className="cell-from">
                            <span className="account-tag">{tx.fromAccount}</span>
                          </td>
                          <td className="cell-to">
                            <span className="account-tag">{tx.toAccount}</span>
                          </td>
                          <td className="cell-amount text-right">
                            {inrFormat.format(tx.amount)}
                          </td>
                          <td className="cell-channel">
                            <span className="channel-badge">{tx.channel}</span>
                          </td>
                          <td className="cell-status">
                            <span className="status-badge-ok">
                              <ShieldCheck size={11} className="inline-icon" />
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="ledger-footer-note mono">
                  <span className="note-alert">ℹ</span>
                  <span>
                    Threshold limit: ₹50,000 (PMLA Section 12). All inward payments cleared within normal operating bounds.
                  </span>
                </div>
              </motion.div>

              {/* ── 2. The Network Topology Reveal (about 1.2s Choreography) ── */}
              <motion.div
                id="stage-network-panel"
                role="tabpanel"
                aria-labelledby="tab-network"
                className={`stage-network-overlay ${isNetwork ? 'is-active' : 'is-hidden'}`}
                initial={false}
                animate={
                  prefersReduced
                    ? { opacity: 1, x: 0 }
                    : isNetwork
                    ? { opacity: 1, x: 0 }
                    : { opacity: 0, x: 12 }
                }
                transition={{ duration, ease }}
              >
                <div className="network-svg-container">
                  <svg
                    viewBox="0 0 760 400"
                    className="network-svg"
                    preserveAspectRatio="xMidYMid meet"
                    aria-label="Network topology showing shared device DEV-****9014 binding accounts ACC-****1092, ACC-****7731, and ACC-****9921"
                  >
                    <defs>
                      {/* Gradient filter for glowing amber path */}
                      <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#FF9F1C" floodOpacity="0.6" />
                      </filter>
                      <filter id="glow-risk" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#FF4B4B" floodOpacity="0.7" />
                      </filter>
                    </defs>

                    {/* ── Background Connectors (Faint Gray Lines) ── */}
                    <g className="faint-edges">
                      <line x1="90" y1="290" x2="350" y2="210" stroke="#232833" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="90" y1="360" x2="350" y2="210" stroke="#232833" strokeWidth="1.5" strokeDasharray="3 3" />
                      <line x1="380" y1="210" x2="520" y2="310" stroke="#232833" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>

                    {/* ── Shared IP Binding Group ── */}
                    <g className="ip-binding-group">
                      <motion.g
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.6, ease }}
                      >
                        <line x1="380" y1="350" x2="90" y2="290" stroke="#7C93B8" strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
                        <line x1="380" y1="350" x2="380" y2="225" stroke="#7C93B8" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
                        <line x1="380" y1="350" x2="540" y2="225" stroke="#7C93B8" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />

                        {/* IP Node */}
                        <g transform="translate(380, 350)">
                          <polygon
                            points="0,-18 16,-9 16,9 0,18 -16,9 -16,-9"
                            fill="#0C0E12"
                            stroke="#7C93B8"
                            strokeWidth="1.5"
                          />
                          <text y="28" textAnchor="middle" className="svg-node-title mono" fill="#7C93B8">
                            IP-49.36.***
                          </text>
                          <text y="39" textAnchor="middle" className="svg-node-sub mono" fill="#6B707C">
                            SHARED SUBNET
                          </text>
                        </g>
                      </motion.g>
                    </g>

                    {/* ── Shared Device Binding Group (The Smoking Gun) ── */}
                    <g className="device-binding-group">
                      <motion.g
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.7, delay: prefersReduced ? 0 : 0.45, ease }}
                      >
                        <line x1="380" y1="70" x2="100" y2="135" stroke="#FF9F1C" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />
                        <line x1="380" y1="85" x2="380" y2="195" stroke="#FF9F1C" strokeWidth="2" strokeDasharray="3 3" opacity="0.9" />
                        <line x1="380" y1="70" x2="540" y2="195" stroke="#FF9F1C" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.85" />

                        {/* Device Node */}
                        <g transform="translate(380, 70)">
                          <rect
                            x="-65"
                            y="-20"
                            width="130"
                            height="40"
                            rx="6"
                            fill="#12151B"
                            stroke="#FF9F1C"
                            strokeWidth="2"
                            filter="url(#glow-amber)"
                          />
                          <circle cx="-45" cy="0" r="4" fill="#FF9F1C" />
                          <text x="-32" y="-2" className="svg-node-title mono bold" fill="#FF9F1C">
                            DEV-****9014
                          </text>
                          <text x="-32" y="11" className="svg-node-sub mono" fill="#F2EFE9">
                            IMEI / HARDWARE LINK
                          </text>
                        </g>
                      </motion.g>
                    </g>

                    {/* ── THE AMBER PATH: ACCOUNT → TRANSACTION → ACCOUNT → DEVICE → ACCOUNT → CASHOUT ── */}
                    <motion.g
                      className="amber-nexus-path"
                      filter="url(#glow-amber)"
                      initial={prefersReduced ? false : { opacity: 0 }}
                      animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                      transition={{ duration: 0.8, delay: prefersReduced ? 0 : 0.65, ease }}
                    >
                      {/* 1. Account 1092 -> Transaction */}
                      <line x1="110" y1="135" x2="215" y2="135" stroke="#FF9F1C" strokeWidth="2.5" />
                      {/* 2. Transaction -> Hub Account 7731 */}
                      <line x1="245" y1="135" x2="360" y2="205" stroke="#FF9F1C" strokeWidth="2.5" />
                      {/* 3. Hub Account 7731 -> Dispersal Account 9921 */}
                      <line x1="400" y1="210" x2="520" y2="210" stroke="#FF9F1C" strokeWidth="2.5" />
                      {/* 4. Dispersal Account 9921 -> Cashout */}
                      <line x1="560" y1="210" x2="665" y2="210" stroke="#FF9F1C" strokeWidth="2.5" />
                    </motion.g>

                    {/* ── Graph Nodes (Rows Lift Out with Staggered Entrance) ── */}

                    {/* 1. Originator Account (ACCOUNT) */}
                    <g transform="translate(90, 135)">
                      <motion.g
                        className="node-account"
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.1, ease }}
                      >
                        <rect x="-20" y="-20" width="40" height="40" rx="8" fill="#0C0E12" stroke="#FF9F1C" strokeWidth="1.5" />
                        <circle cx="0" cy="0" r="5" fill="#FF9F1C" />
                        <text y="32" textAnchor="middle" className="svg-node-title mono" fill="#F2EFE9">
                          ACC-****1092
                        </text>
                        <text y="44" textAnchor="middle" className="svg-node-sub mono" fill="#A5A9B3">
                          ORIGINATOR 1
                        </text>
                      </motion.g>
                    </g>

                    {/* 2. Transaction Node (TRANSACTION) */}
                    <g transform="translate(230, 135)">
                      <motion.g
                        className="node-tx"
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.22, ease }}
                      >
                        <polygon points="0,-16 16,0 0,16 -16,0" fill="#12151B" stroke="#FF9F1C" strokeWidth="1.5" />
                        <text y="-22" textAnchor="middle" className="svg-node-title mono bold" fill="#FF9F1C">
                          ₹48,500 (UPI)
                        </text>
                        <text y="30" textAnchor="middle" className="svg-node-sub mono" fill="#6B707C">
                          HOP 1 (&lt; 50K)
                        </text>
                      </motion.g>
                    </g>

                    {/* Secondary Account Inflow 2 (Background node) */}
                    <g className="node-account faint-node" transform="translate(90, 290)">
                      <rect x="-16" y="-16" width="32" height="32" rx="6" fill="#0C0E12" stroke="#323949" strokeWidth="1" />
                      <text y="26" textAnchor="middle" className="svg-node-title mono" fill="#6B707C">
                        ACC-****4821
                      </text>
                    </g>

                    {/* 3. Central Mule Hub (ACCOUNT HUB - High Risk) */}
                    <g transform="translate(380, 210)">
                      <motion.g
                        className="node-hub"
                        filter="url(#glow-risk)"
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.7, delay: prefersReduced ? 0 : 0.35, ease }}
                      >
                        <rect x="-26" y="-26" width="52" height="52" rx="10" fill="#1A1E26" stroke="#FF4B4B" strokeWidth="2" />
                        <circle cx="0" cy="0" r="7" fill="#FF4B4B" />
                        <text y="38" textAnchor="middle" className="svg-node-title mono bold" fill="#FF4B4B">
                          ACC-****7731
                        </text>
                        <text y="50" textAnchor="middle" className="svg-node-sub mono" fill="#FF9F1C">
                          HUB [VELOCITY 11m]
                        </text>
                      </motion.g>
                    </g>

                    {/* 4. Dispersal Account (ACCOUNT) */}
                    <g transform="translate(540, 210)">
                      <motion.g
                        className="node-account"
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.55, ease }}
                      >
                        <rect x="-20" y="-20" width="40" height="40" rx="8" fill="#0C0E12" stroke="#FF9F1C" strokeWidth="1.5" />
                        <circle cx="0" cy="0" r="5" fill="#FF9F1C" />
                        <text y="32" textAnchor="middle" className="svg-node-title mono" fill="#F2EFE9">
                          ACC-****9921
                        </text>
                        <text y="44" textAnchor="middle" className="svg-node-sub mono" fill="#A5A9B3">
                          DISPERSAL
                        </text>
                      </motion.g>
                    </g>

                    {/* Secondary Dispersal (Background node) */}
                    <g className="node-account faint-node" transform="translate(540, 310)">
                      <rect x="-16" y="-16" width="32" height="32" rx="6" fill="#0C0E12" stroke="#323949" strokeWidth="1" />
                      <text y="26" textAnchor="middle" className="svg-node-title mono" fill="#6B707C">
                        ACC-****3302
                      </text>
                    </g>

                    {/* 5. Final Rapid Cashout (CASHOUT) */}
                    <g transform="translate(685, 210)">
                      <motion.g
                        className="node-cashout"
                        initial={prefersReduced ? false : { opacity: 0 }}
                        animate={isNetwork ? { opacity: 1 } : { opacity: 0 }}
                        transition={{ duration: 0.6, delay: prefersReduced ? 0 : 0.72, ease }}
                      >
                        <rect x="-20" y="-20" width="40" height="40" rx="8" fill="#0C0E12" stroke="#FF9F1C" strokeWidth="2" />
                        <polyline points="-6,-6 4,-6 4,4" fill="none" stroke="#FF9F1C" strokeWidth="2" />
                        <line x1="-6" y1="4" x2="4" y2="-6" stroke="#FF9F1C" strokeWidth="2" />
                        <text y="32" textAnchor="middle" className="svg-node-title mono bold" fill="#FF9F1C">
                          CASHOUT-ATM
                        </text>
                        <text y="44" textAnchor="middle" className="svg-node-sub mono" fill="#FF4B4B">
                          ₹95,000 EXTRACTED
                        </text>
                      </motion.g>
                    </g>
                  </svg>

                  {/* Network Callout Banner */}
                  <div className="network-detection-summary mono">
                    <div className="summary-left">
                      <span className="summary-alert-badge">SHARED DEVICE COLLISION</span>
                      <span className="summary-description">
                        Device <strong>DEV-****9014</strong> authenticated transactions for ACC-****1092, ACC-****7731, and ACC-****9921 within 7 minutes.
                      </span>
                    </div>
                    <div className="summary-right">
                      <span className="summary-stat-label">PMLA SAR PRIORITY</span>
                      <strong className="summary-stat-val text-risk">HIGH RISK · 94/100</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Stage Integrated Caption Bar */}
            <div className="stage-caption-bar mono">
              <span className="caption-dot-signal" />
              <span className="caption-bar-text">
                “Nothing in any single row is unusual. The shared device is.”
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
