import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ShieldAlert,
  Network,
  Cpu,
  FileText,
  Activity,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import {
  mockAccountDetails,
  mockNetworks,
  mockExplain,
  mockCaseReport,
} from '../api/mockData';
import './FeatureTabs.css';

export type TabId = 'detect' | 'trace' | 'explain' | 'report';

interface TabDefinition {
  id: TabId;
  num: string;
  label: string;
  caption: string;
  headerStrip: string;
  provenance: 'live' | 'recorded' | 'sample' | 'illustrative';
  openAppPath: string;
  openAppLabel: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'detect',
    num: '01',
    label: 'DETECT',
    caption: 'Surface suspicious topological patterns & structuring',
    headerStrip: 'PANEL 01 / DETECT · RECORDED',
    provenance: 'recorded',
    openAppPath: '/workspace/ACC_05001',
    openAppLabel: 'Open in app →',
  },
  {
    id: 'trace',
    num: '02',
    label: 'TRACE',
    caption: 'Follow multi-hop entity chains and tainted cash flows',
    headerStrip: 'PANEL 02 / TRACE · LIVE',
    provenance: 'live',
    openAppPath: '/workspace/ACC_05001',
    openAppLabel: 'Open in app →',
  },
  {
    id: 'explain',
    num: '03',
    label: 'EXPLAIN',
    caption: 'Deconstruct risk attribution with real SHAP factors',
    headerStrip: 'PANEL 03 / EXPLAIN · SAMPLE',
    provenance: 'sample',
    openAppPath: '/workspace/ACC_05001',
    openAppLabel: 'Open in app →',
  },
  {
    id: 'report',
    num: '04',
    label: 'REPORT',
    caption: 'Assemble an audit-ready PMLA Section 12 SAR draft',
    headerStrip: 'PANEL 04 / REPORT · SAMPLE',
    provenance: 'sample',
    openAppPath: '/cases',
    openAppLabel: 'Open in app →',
  },
];

/* ── Typologies implemented in repo ── */
interface TypologyPattern {
  id: 'fan' | 'cycle' | 'chain' | 'cluster' | 'dormancy';
  name: string;
  tag: string;
  description: string;
  evidence: Array<{ label: string; value: string }>;
  diagram: {
    nodes: Array<{ id: string; x: number; y: number; label: string; isHot?: boolean }>;
    edges: Array<{ src: string; dst: string }>;
  };
}

const REPO_PATTERNS: TypologyPattern[] = [
  {
    id: 'fan',
    name: 'Fan-in / Fan-out Hub',
    tag: 'STRUCTURING',
    description: '11 victim originators funnel ₹4.24L into central hub ACC_05001, which disperses 94.2% to 6 mules within 14 min.',
    evidence: [
      { label: 'Originators', value: '11 victim accounts' },
      { label: 'Receivers', value: '6 mule endpoints' },
      { label: 'Inflow', value: '₹4,24,089.49' },
      { label: 'Outflow', value: '₹3,99,620.00 (94.2%)' },
      { label: 'Transit Window', value: '14.2 minutes' },
      { label: 'Nexus Node', value: 'ACC_05001 (Hub)' },
    ],
    diagram: {
      nodes: [
        { id: 'v1', x: 28, y: 35, label: 'ACC_01094' },
        { id: 'v2', x: 28, y: 75, label: 'ACC_01429' },
        { id: 'v3', x: 28, y: 115, label: 'ACC_01592' },
        { id: 'hub', x: 140, y: 75, label: 'ACC_05001', isHot: true },
        { id: 'm1', x: 252, y: 35, label: 'ACC_05002' },
        { id: 'm2', x: 252, y: 75, label: 'ACC_05003' },
        { id: 'm3', x: 252, y: 115, label: 'ACC_05004' },
      ],
      edges: [
        { src: 'v1', dst: 'hub' },
        { src: 'v2', dst: 'hub' },
        { src: 'v3', dst: 'hub' },
        { src: 'hub', dst: 'm1' },
        { src: 'hub', dst: 'm2' },
        { src: 'hub', dst: 'm3' },
      ],
    },
  },
  {
    id: 'cycle',
    name: 'Closed Circular Flow',
    tag: 'CIRCULAR LAYERING',
    description: '3-node closed circuit circulating ₹1.62L through intermediary mules returning to origin with 3.5% decay in 31.3 min.',
    evidence: [
      { label: 'Loop Nodes', value: 'ACC_05008 → 05009 → 05010' },
      { label: 'Turnaround Time', value: '31.3 minutes' },
      { label: 'Starting Volume', value: '₹1,61,994.57' },
      { label: 'Shrinkage Rate', value: '3.5% (Fee decay)' },
      { label: 'Pattern Type', value: 'Layer 2 Wash Circle' },
      { label: 'Network Density', value: '1.0 (Full Triad)' },
    ],
    diagram: {
      nodes: [
        { id: 'c1', x: 140, y: 32, label: 'ACC_05008', isHot: true },
        { id: 'c2', x: 220, y: 110, label: 'ACC_05009' },
        { id: 'c3', x: 60, y: 110, label: 'ACC_05010' },
      ],
      edges: [
        { src: 'c1', dst: 'c2' },
        { src: 'c2', dst: 'c3' },
        { src: 'c3', dst: 'c1' },
      ],
    },
  },
  {
    id: 'chain',
    name: 'High-Speed Pass-Through',
    tag: 'RAPID TRANSIT',
    description: 'Serial transit mule chain forwarding 98.4% of ₹2.10L in under 4.2 minutes per hop, maintaining zero terminal balance.',
    evidence: [
      { label: 'Hop Count', value: '5 serial nodes' },
      { label: 'Transit Latency', value: '4.2 minutes' },
      { label: 'Pass-Through', value: '98.4% forwarded' },
      { label: 'Retained Balance', value: '₹3,360 (1.6%)' },
      { label: 'Originator', value: 'ACC_05016' },
      { label: 'Final Destination', value: 'ACC_05020 (Cashout)' },
    ],
    diagram: {
      nodes: [
        { id: 'ch1', x: 30, y: 75, label: 'ACC_05016', isHot: true },
        { id: 'ch2', x: 105, y: 75, label: 'ACC_05017' },
        { id: 'ch3', x: 180, y: 75, label: 'ACC_05018' },
        { id: 'ch4', x: 255, y: 75, label: 'ACC_05019' },
      ],
      edges: [
        { src: 'ch1', dst: 'ch2' },
        { src: 'ch2', dst: 'ch3' },
        { src: 'ch3', dst: 'ch4' },
      ],
    },
  },
  {
    id: 'cluster',
    name: 'Synthetic Device Cluster',
    tag: 'SYNTHETIC IDENTITY',
    description: '5 accounts registered in same 48-hour window authenticated from identical device fingerprint DEV_MULE_99.',
    evidence: [
      { label: 'Hardware Key', value: 'DEV_MULE_99' },
      { label: 'Accounts Linked', value: '5 identities' },
      { label: 'KYC Hash Collision', value: '100% address match' },
      { label: 'Avg Account Age', value: '14 days' },
      { label: 'Aggregate Flow', value: '₹1,85,000.00' },
      { label: 'Cluster Density', value: '0.85' },
    ],
    diagram: {
      nodes: [
        { id: 'dev', x: 140, y: 75, label: 'DEV_MULE_99', isHot: true },
        { id: 'cl1', x: 45, y: 35, label: 'ACC_05026' },
        { id: 'cl2', x: 45, y: 115, label: 'ACC_05027' },
        { id: 'cl3', x: 235, y: 35, label: 'ACC_05028' },
        { id: 'cl4', x: 235, y: 115, label: 'ACC_05029' },
      ],
      edges: [
        { src: 'cl1', dst: 'dev' },
        { src: 'cl2', dst: 'dev' },
        { src: 'dev', dst: 'cl3' },
        { src: 'dev', dst: 'cl4' },
      ],
    },
  },
  {
    id: 'dormancy',
    name: 'Dormancy Sudden Awakening',
    tag: 'SLEEPER ACTIVATION',
    description: 'Account inactive for 142 days suddenly wakes up to funnel ₹3.50L across 14 transactions within 1.8 hours.',
    evidence: [
      { label: 'Dormancy Period', value: '142 days inactive' },
      { label: 'Awakening Burst', value: '₹3,50,000.00' },
      { label: 'Burst Velocity', value: '14.8 tx/hour' },
      { label: 'Time to Drain', value: '1.8 hours' },
      { label: 'Target Account', value: 'ACC_05044' },
      { label: 'Prior Baseline', value: '₹0 / 4 months' },
    ],
    diagram: {
      nodes: [
        { id: 'd0', x: 40, y: 75, label: '142d DORMANT' },
        { id: 'dm', x: 140, y: 75, label: 'ACC_05044', isHot: true },
        { id: 'd1', x: 245, y: 40, label: 'BURST_UPI_1' },
        { id: 'd2', x: 245, y: 110, label: 'BURST_UPI_2' },
      ],
      edges: [
        { src: 'd0', dst: 'dm' },
        { src: 'dm', dst: 'd1' },
        { src: 'dm', dst: 'd2' },
      ],
    },
  },
];

interface FeatureTabsProps {
  activeTab?: TabId;
  onTabChange?: (tab: TabId) => void;
}

export const FeatureTabs: React.FC<FeatureTabsProps> = ({
  activeTab: externalActiveTab,
  onTabChange,
}) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  /* Active tab state */
  const [internalTab, setInternalTab] = useState<TabId>('detect');
  const activeTab = externalActiveTab || internalTab;

  /* Timer & auto-advance state (7.5s interval) */
  const AUTO_INTERVAL = 7500;
  const [progress, setProgress] = useState(0); // 0 to 1
  const [isHeld, setIsHeld] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const tabListRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);

  /* Panel 01: Detect state */
  const [selectedPatternId, setSelectedPatternId] = useState<'fan' | 'cycle' | 'chain' | 'cluster' | 'dormancy'>('fan');

  /* Panel 02: Trace state */
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  /* Panel 04: Report state */
  const [copiedSar, setCopiedSar] = useState(false);

  /* Select tab handler */
  const selectTab = useCallback(
    (tabId: TabId, focus = false) => {
      if (onTabChange) {
        onTabChange(tabId);
      } else {
        setInternalTab(tabId);
      }
      setProgress(0);
      lastTimeRef.current = performance.now();

      if (focus && tabListRef.current) {
        const btn = tabListRef.current.querySelector<HTMLButtonElement>(`#feature-tab-${tabId}`);
        btn?.focus();
      }
    },
    [onTabChange]
  );

  /* Intersection Observer to pause when offscreen */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.2 }
    );
    observer.observe(el);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        isVisibleRef.current = false;
      } else {
        isVisibleRef.current = true;
        lastTimeRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  /* Auto-advance loop */
  useEffect(() => {
    if (prefersReduced) {
      setProgress(1);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      if (!isHeld && isVisibleRef.current) {
        setProgress((prev) => {
          const next = prev + dt / AUTO_INTERVAL;
          if (next >= 1) {
            // Auto advance
            const currentIndex = TABS.findIndex((t) => t.id === activeTab);
            const nextTab = TABS[(currentIndex + 1) % TABS.length].id;
            selectTab(nextTab);
            return 0;
          }
          return next;
        });
      }

      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(requestRef.current);
  }, [activeTab, isHeld, prefersReduced, selectTab]);

  /* Keyboard ARIA navigation */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = TABS.findIndex((t) => t.id === activeTab);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = TABS.length - 1;
    }

    if (nextIndex !== currentIndex) {
      selectTab(TABS[nextIndex].id, true);
    }
  };

  /* Copy SAR handler */
  const handleCopySar = () => {
    navigator.clipboard.writeText(mockCaseReport.draft_str);
    setCopiedSar(true);
    setTimeout(() => setCopiedSar(false), 2400);
  };

  /* Transition specification:
     Outgoing: fades & moves -8px (180ms)
     Incoming: fades in from +8px (320ms)
     Total under 500ms. Animate only transform + opacity.
  */
  const panelVariants: Variants = {
    initial: {
      opacity: 0,
      y: prefersReduced ? 0 : 8,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReduced ? 0.05 : 0.32,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: {
      opacity: 0,
      y: prefersReduced ? 0 : -8,
      transition: {
        duration: prefersReduced ? 0.05 : 0.18,
        ease: [0.4, 0, 0.6, 1],
      },
    },
  };

  const currentTabDef = TABS.find((t) => t.id === activeTab) || TABS[0];
  const activePattern = REPO_PATTERNS.find((p) => p.id === selectedPatternId) || REPO_PATTERNS[0];
  const network = mockNetworks['ACC_05001'];

  return (
    <div
      ref={containerRef}
      className={`feature-tabs-root ${isHeld ? 'is-held' : ''}`}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'touch') setIsHeld(true);
      }}
      onPointerLeave={() => setIsHeld(false)}
      onFocus={() => setIsHeld(true)}
      onBlur={(e) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
          setIsHeld(false);
        }
      }}
      onTouchStart={() => setIsHeld(true)}
      onTouchEnd={() => setIsHeld(false)}
    >
      {/* ── Left Column: Tab List ── */}
      <div
        ref={tabListRef}
        className="feature-tabs-list"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Investigation Pipeline Features"
        onKeyDown={handleKeyDown}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              id={`feature-tab-${tab.id}`}
              role="tab"
              type="button"
              className={`feature-tab-btn ${isActive ? 'is-active' : ''}`}
              aria-selected={isActive}
              aria-controls={`feature-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
            >
              <div className="tab-btn-content">
                <span className="tab-num-glyph">{tab.num}</span>
                <div className="tab-text-block">
                  <span className="tab-label-text">{tab.label}</span>
                  <span className="tab-caption-text">{tab.caption}</span>
                </div>
              </div>

              {/* Progress hairline */}
              <div className="tab-hairline-track" aria-hidden="true">
                <div
                  className="tab-hairline-fill"
                  style={{
                    transform: isActive ? `scaleX(${progress})` : 'scaleX(0)',
                  }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right Column: Interactive Stage (at least 60% wide) ── */}
      <div className="feature-stage-container">
        {/* Corner ticks */}
        <span className="stage-corner stage-corner-tl" aria-hidden="true" />
        <span className="stage-corner stage-corner-tr" aria-hidden="true" />
        <span className="stage-corner stage-corner-bl" aria-hidden="true" />
        <span className="stage-corner stage-corner-br" aria-hidden="true" />

        {/* Stage Header Strip */}
        <div className="stage-header-strip">
          <div className="header-strip-left">
            <span className="stage-status-dot" />
            <span className="stage-title-mono">{currentTabDef.headerStrip}</span>
          </div>
          <ProvenanceBadge source={currentTabDef.provenance} />
        </div>

        {/* Stage Panel Content Viewport */}
        <div className="stage-viewport">
          <AnimatePresence mode="wait">
            {activeTab === 'detect' && (
              <motion.div
                key="detect"
                id="feature-panel-detect"
                role="tabpanel"
                aria-labelledby="feature-tab-detect"
                className="stage-panel"
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* DETECT: Only patterns repo implements; chips animate in one-by-one; selected chip expands evidence */}
                <div className="detect-panel-wrap">
                  <div className="detect-toolbar">
                    <span className="toolbar-label-mono">IMPLEMENTED PATTERNS:</span>
                    <div className="detect-chips-row">
                      {REPO_PATTERNS.map((p, idx) => (
                        <motion.button
                          key={p.id}
                          type="button"
                          className={`detect-chip ${selectedPatternId === p.id ? 'chip-active' : ''}`}
                          onClick={() => setSelectedPatternId(p.id)}
                          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.24,
                            delay: prefersReduced ? 0 : idx * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          <span className="chip-indicator" />
                          <span className="chip-name">{p.name}</span>
                          <span className="chip-tag-mono">{p.tag}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Active Pattern Card with SVG Diagram + Evidence Details */}
                  <motion.div
                    key={activePattern.id}
                    className="pattern-detail-card"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className="pattern-visual-box">
                      <svg viewBox="0 0 280 150" className="pattern-graph-svg" aria-hidden="true">
                        <defs>
                          <marker
                            id="arrow-amber"
                            viewBox="0 0 10 10"
                            refX="7"
                            refY="5"
                            markerWidth="5"
                            markerHeight="5"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--signal)" />
                          </marker>
                        </defs>
                        {/* Edges */}
                        {activePattern.diagram.edges.map((e, i) => {
                          const srcNode = activePattern.diagram.nodes.find((n) => n.id === e.src);
                          const dstNode = activePattern.diagram.nodes.find((n) => n.id === e.dst);
                          if (!srcNode || !dstNode) return null;
                          return (
                            <line
                              key={i}
                              x1={srcNode.x}
                              y1={srcNode.y}
                              x2={dstNode.x}
                              y2={dstNode.y}
                              stroke="var(--line-strong)"
                              strokeWidth="1.5"
                              strokeDasharray="4 2"
                            />
                          );
                        })}
                        {/* Nodes */}
                        {activePattern.diagram.nodes.map((n) => (
                          <g key={n.id}>
                            <circle
                              cx={n.x}
                              cy={n.y}
                              r={n.isHot ? 11 : 7}
                              fill={n.isHot ? 'var(--signal)' : 'var(--bg-3)'}
                              stroke={n.isHot ? '#fff' : 'var(--line-strong)'}
                              strokeWidth="1.5"
                            />
                            <text
                              x={n.x}
                              y={n.y + (n.isHot ? 22 : 18)}
                              textAnchor="middle"
                              className="svg-node-text"
                            >
                              {n.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>

                    {/* Expanded Evidence Row */}
                    <div className="pattern-evidence-block">
                      <div className="evidence-header">
                        <h4 className="pattern-title">{activePattern.name}</h4>
                        <p className="pattern-desc">{activePattern.description}</p>
                      </div>

                      <div className="evidence-grid">
                        {activePattern.evidence.map((ev, i) => (
                          <div key={i} className="evidence-item">
                            <span className="evidence-label-mono">{ev.label}</span>
                            <span className="evidence-value-mono">{ev.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === 'trace' && (
              <motion.div
                key="trace"
                id="feature-panel-trace"
                role="tabpanel"
                aria-labelledby="feature-tab-trace"
                className="stage-panel"
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* TRACE: nodes enter, relevant edges draw, unrelated nodes recede to 25%; hover = tooltip, click = select & highlight */}
                <div className="trace-panel-wrap">
                  <div className="trace-telemetry-bar">
                    <span className="mono">TARGET: ACC_05001</span>
                    <span className="telemetry-sep">/</span>
                    <span className="mono">12 NODES</span>
                    <span className="telemetry-sep">/</span>
                    <span className="mono">11 EDGES</span>
                    <span className="telemetry-sep">/</span>
                    <span className="mono text-signal">TOTAL FLOW: ₹4.24L IN → ₹3.99L OUT</span>
                  </div>

                  <div className="trace-graph-canvas" onClick={() => setSelectedNodeId(null)}>
                    <svg viewBox="0 0 540 260" className="trace-interactive-svg" aria-label="Interactive Graph Visual">
                      {/* Interactive Edges */}
                      <g className="trace-edges-group">
                        {network.edges.map((edge, i) => {
                          const isHubOut = edge.src === 'ACC_05001';
                          const isRelevant =
                            !selectedNodeId ||
                            edge.src === selectedNodeId ||
                            edge.dst === selectedNodeId;

                          // Compute coordinates based on deterministic layout
                          let x1 = 70;
                          let y1 = 40 + i * 40;
                          let x2 = 270;
                          let y2 = 130;

                          if (isHubOut) {
                            x1 = 270;
                            y1 = 130;
                            x2 = 470;
                            y2 = 30 + (i - 5) * 38;
                          }

                          return (
                            <line
                              key={`edge-${i}`}
                              x1={x1}
                              y1={y1}
                              x2={x2}
                              y2={y2}
                              stroke={isRelevant ? (isHubOut ? 'var(--signal)' : 'var(--risk)') : 'var(--line)'}
                              strokeWidth={isRelevant ? 1.8 : 1}
                              opacity={isRelevant ? 0.9 : 0.25}
                              strokeDasharray={isHubOut ? 'none' : '3 2'}
                            />
                          );
                        })}
                      </g>

                      {/* Inbound Victim Nodes */}
                      {network.nodes.slice(1, 6).map((node, i) => {
                        const cx = 70;
                        const cy = 40 + i * 42;
                        const isSelected = selectedNodeId === node.id;
                        const isHovered = hoveredNodeId === node.id;
                        const isConnected =
                          !selectedNodeId ||
                          selectedNodeId === node.id ||
                          selectedNodeId === 'ACC_05001';

                        return (
                          <g
                            key={node.id}
                            className="node-group cursor-pointer"
                            opacity={isConnected ? 1 : 0.25}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                            }}
                          >
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected || isHovered ? 10 : 8}
                              fill="var(--bg-3)"
                              stroke={isSelected ? 'var(--signal)' : 'var(--line-strong)'}
                              strokeWidth={isSelected ? 2 : 1.2}
                            />
                            <text x={cx - 16} y={cy + 4} textAnchor="end" className="svg-node-mono">
                              {node.id}
                            </text>
                          </g>
                        );
                      })}

                      {/* Central Hub Node ACC_05001 */}
                      {(() => {
                        const hub = network.nodes[0];
                        const isSelected = selectedNodeId === hub.id;
                        const isHovered = hoveredNodeId === hub.id;
                        const isConnected = !selectedNodeId || selectedNodeId === hub.id;

                        return (
                          <g
                            key={hub.id}
                            className="node-group cursor-pointer"
                            opacity={isConnected ? 1 : 0.25}
                            onMouseEnter={() => setHoveredNodeId(hub.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(selectedNodeId === hub.id ? null : hub.id);
                            }}
                          >
                            <circle
                              cx={270}
                              cy={130}
                              r={isSelected || isHovered ? 20 : 16}
                              fill="var(--signal)"
                              stroke="#fff"
                              strokeWidth={2}
                            />
                            <circle
                              cx={270}
                              cy={130}
                              r={26}
                              fill="none"
                              stroke="var(--signal)"
                              strokeWidth={1}
                              opacity={0.4}
                              strokeDasharray="4 2"
                            />
                            <text x={270} y={166} textAnchor="middle" className="svg-hub-mono">
                              {hub.id} (HUB · 96)
                            </text>
                          </g>
                        );
                      })()}

                      {/* Outbound Mule Disperser Nodes */}
                      {network.nodes.slice(6, 12).map((node, i) => {
                        const cx = 470;
                        const cy = 30 + i * 38;
                        const isSelected = selectedNodeId === node.id;
                        const isHovered = hoveredNodeId === node.id;
                        const isConnected =
                          !selectedNodeId ||
                          selectedNodeId === node.id ||
                          selectedNodeId === 'ACC_05001';

                        return (
                          <g
                            key={node.id}
                            className="node-group cursor-pointer"
                            opacity={isConnected ? 1 : 0.25}
                            onMouseEnter={() => setHoveredNodeId(node.id)}
                            onMouseLeave={() => setHoveredNodeId(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNodeId(selectedNodeId === node.id ? null : node.id);
                            }}
                          >
                            <circle
                              cx={cx}
                              cy={cy}
                              r={isSelected || isHovered ? 10 : 8}
                              fill={node.score >= 70 ? 'var(--risk)' : 'var(--bg-3)'}
                              stroke={isSelected ? 'var(--signal)' : 'var(--line-strong)'}
                              strokeWidth={isSelected ? 2 : 1.2}
                            />
                            <text x={cx + 16} y={cy + 4} textAnchor="start" className="svg-node-mono">
                              {node.id} ({node.score})
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive Tooltip Dock */}
                    <div className="trace-tooltip-dock">
                      {hoveredNodeId ? (
                        <div className="node-tooltip-card">
                          <span className="mono node-tt-id">{hoveredNodeId}</span>
                          <span className="node-tt-meta">
                            {hoveredNodeId === 'ACC_05001'
                              ? 'NEXUS BOTTLENECK HUB · RISK 96'
                              : hoveredNodeId.startsWith('ACC_01')
                              ? 'VICTIM ORIGINATOR · ₹38K-52K INFLOW'
                              : 'MULE DISPERSER · RISK 62-76'}
                          </span>
                        </div>
                      ) : selectedNodeId ? (
                        <div className="node-tooltip-card active-selection">
                          <span className="mono node-tt-id">SELECTED: {selectedNodeId}</span>
                          <span className="node-tt-meta text-signal">
                            Connected relationships isolated (unrelated dimmed to 25%)
                          </span>
                        </div>
                      ) : (
                        <div className="node-tooltip-hint mono">
                          Hover nodes for entity telemetry · Click node to isolate flow relationships
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'explain' && (
              <motion.div
                key="explain"
                id="feature-panel-explain"
                role="tabpanel"
                aria-labelledby="feature-tab-explain"
                className="stage-panel"
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* EXPLAIN: risk score, then factor bars fill, then evidence, then one-sentence interpretation. Only real factors. */}
                <div className="explain-panel-wrap">
                  {/* Step 1: Risk Score */}
                  <motion.div
                    className="explain-score-header"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: prefersReduced ? 0 : 0.05 }}
                  >
                    <div className="score-hero-box">
                      <span className="score-big-num text-signal">{mockExplain.risk_score}</span>
                      <div className="score-hero-info">
                        <span className="score-level-badge mono">HIGH RISK · LEVEL 4</span>
                        <span className="score-target-mono">ACCOUNT: {mockExplain.account_id}</span>
                      </div>
                    </div>
                    <div className="score-meta-pill mono">
                      <span>SHAP EXPLAINABILITY</span>
                      <span className="pill-dot" />
                      <span>4 PROVENANCE FACTORS</span>
                    </div>
                  </motion.div>

                  {/* Step 2: Factor Bars Fill */}
                  <div className="explain-factors-list">
                    {mockExplain.top_features.map((feat, idx) => {
                      const isRisk = feat.direction === 'increases_risk';
                      const pct = Math.min(100, Math.round(Math.abs(feat.shap_value) * 220));

                      return (
                        <motion.div
                          key={feat.feature}
                          className="factor-row"
                          initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.28,
                            delay: prefersReduced ? 0 : 0.12 + idx * 0.04,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                        >
                          <div className="factor-header">
                            <span className="factor-name-mono">{feat.label}</span>
                            <span className={`factor-shap-mono ${isRisk ? 'text-risk' : 'text-ok'}`}>
                              {feat.shap_value > 0 ? `+${feat.shap_value}` : feat.shap_value} SHAP
                            </span>
                          </div>

                          <div className="factor-track">
                            <motion.div
                              className={`factor-fill ${isRisk ? 'fill-risk' : 'fill-ok'}`}
                              initial={prefersReduced ? false : { scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{
                                duration: prefersReduced ? 0 : 0.55,
                                delay: prefersReduced ? 0 : 0.18 + idx * 0.04,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              style={{
                                width: `${pct}%`,
                                transformOrigin: 'left center',
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Step 3: Evidentiary Values */}
                  <motion.div
                    className="explain-evidence-row"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.26, delay: prefersReduced ? 0 : 0.3 }}
                  >
                    <div className="explain-ev-cell">
                      <span className="ev-label-mono">FORWARD RATIO</span>
                      <span className="ev-val-mono">94.2%</span>
                    </div>
                    <div className="explain-ev-cell">
                      <span className="ev-label-mono">HOURLY VELOCITY</span>
                      <span className="ev-val-mono">18.4 tx/h</span>
                    </div>
                    <div className="explain-ev-cell">
                      <span className="ev-label-mono">ACCOUNT AGE</span>
                      <span className="ev-val-mono">22 days</span>
                    </div>
                    <div className="explain-ev-cell">
                      <span className="ev-label-mono">RETAINED BALANCE</span>
                      <span className="ev-val-mono">₹24,469.49</span>
                    </div>
                  </motion.div>

                  {/* Step 4: One-Sentence Interpretation */}
                  <motion.div
                    className="explain-interpretation-box"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: prefersReduced ? 0 : 0.36 }}
                  >
                    <span className="interpretation-label mono">COUNTERFACTUAL INTERPRETATION:</span>
                    <p className="interpretation-text serif">{mockExplain.counterfactual}</p>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {activeTab === 'report' && (
              <motion.div
                key="report"
                id="feature-panel-report"
                role="tabpanel"
                aria-labelledby="feature-tab-report"
                className="stage-panel"
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* REPORT: SAR draft assembling from entities, evidence, narrative */}
                <div className="report-panel-wrap">
                  {/* Step 1: Entities Bound */}
                  <motion.div
                    className="report-assembly-block"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: prefersReduced ? 0 : 0.05 }}
                  >
                    <span className="assembly-title-mono">01 · ENTITIES BOUND</span>
                    <div className="entities-pill-row">
                      {mockCaseReport.accounts.map((acc) => (
                        <div
                          key={acc.account_id}
                          className={`report-entity-pill ${acc.is_recommended_freeze ? 'pill-freeze' : ''}`}
                        >
                          <span className="mono entity-id">{acc.account_id}</span>
                          <span className="mono entity-kyc">{acc.kyc_address_masked}</span>
                          {acc.is_recommended_freeze && (
                            <span className="badge-freeze-target mono">MIN-CUT FREEZE</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Step 2: Evidence Audit Trail */}
                  <motion.div
                    className="report-assembly-block"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: prefersReduced ? 0 : 0.12 }}
                  >
                    <span className="assembly-title-mono">02 · EVIDENTIARY AUDIT TRAIL</span>
                    <div className="audit-metrics-row">
                      <div className="metric-cell">
                        <span className="m-label mono">AGGREGATE VOLUME</span>
                        <span className="m-val mono">₹4,24,089.49</span>
                      </div>
                      <div className="metric-cell">
                        <span className="m-label mono">DISPERSION RATE</span>
                        <span className="m-val mono text-signal">94.2% in 14.2m</span>
                      </div>
                      <div className="metric-cell">
                        <span className="m-label mono">CYBER CRIME REFERENCE</span>
                        <span className="m-val mono">NCRP / I4C-2026-992</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Step 3: Regulatory Narrative Draft */}
                  <motion.div
                    className="report-assembly-block"
                    initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: prefersReduced ? 0 : 0.18 }}
                  >
                    <span className="assembly-title-mono">03 · ASSEMBLED PMLA SECTION 12 NARRATIVE</span>
                    <div className="sar-narrative-terminal mono">
                      <p className="sar-terminal-line text-signal">
                        SUSPICIOUS TRANSACTION REPORT [STR / SAR DRAFT]
                      </p>
                      <p className="sar-terminal-line">
                        PRIMARY NEXUS: ACC_05001 · DISPERSION NETWORK fan_1
                      </p>
                      <p className="sar-terminal-line body-text">
                        {mockCaseReport.summary_sentence} In less than 15 minutes following receipt,
                        approximately 94.2% was systematically layered out to 6 secondary beneficiary accounts.
                        Graph cut optimization identifies ACC_05001 as the pivotal min-cut bottleneck.
                      </p>
                      <p className="sar-terminal-line alert-text text-risk">
                        RECOMMENDED ACTION: Immediate preventive debit-freeze on primary node ACC_05001
                        under PMLA Section 12.
                      </p>
                    </div>
                  </motion.div>

                  {/* Report Action Row */}
                  <div className="report-action-row">
                    <button
                      type="button"
                      className="sar-copy-btn mono"
                      onClick={handleCopySar}
                    >
                      {copiedSar ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                      <span>{copiedSar ? 'COPIED TO CLIPBOARD' : 'COPY SAR DRAFT TEXT'}</span>
                    </button>
                    <span className="sar-fiu-tag mono">FORMAT: FIU-IND STR-v2.1</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stage Footer Bar with "Open in app →" link */}
        <div className="stage-footer-strip">
          <div className="footer-status-mono">
            <span className="status-indicator-live" />
            <span>MULETRACE FORENSIC ENGINE ONLINE</span>
          </div>

          <button
            type="button"
            className="open-in-app-btn"
            onClick={() => navigate(currentTabDef.openAppPath)}
          >
            <span>{currentTabDef.openAppLabel}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
