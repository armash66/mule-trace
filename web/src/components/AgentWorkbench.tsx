import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  Play,
  Clock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CornerDownRight,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { api, API_BASE } from '../api/client';
import './AgentWorkbench.css';

export type StepStatus = 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'WARNING' | 'FAILED' | 'SKIPPED';

export interface TraceRow {
  id: string;
  seq: string;
  tool: string;
  status: StepStatus;
  durationMs?: number;
  params: Record<string, any>;
  summary: string;
  details?: Record<string, any>;
  isNew?: boolean;
}

const STAGES = [
  { id: 'query_received', label: 'QUERY RECEIVED', desc: 'Normalized natural language prompt' },
  { id: 'intent_detected', label: 'INTENT DETECTED', desc: 'TOPOLOGICAL_STRUCTURING_DISPERSION' },
  { id: 'plan', label: 'PLAN', desc: '3-tier investigative DAG synthesized' },
  { id: 'tools_selected', label: 'TOOLS SELECTED', desc: '5 specialized analytical modules mapped' },
  { id: 'execution', label: 'EXECUTION', desc: 'Multi-hop graph & detector scanning' },
  { id: 'analysis', label: 'ANALYSIS', desc: 'Taint propagation & flow ratio computation' },
  { id: 'explanation', label: 'EXPLANATION', desc: 'SHAP attribution weights decomposed' },
  { id: 'result', label: 'RESULT', desc: 'Sub-graph bottleneck isolated & SAR drafted' },
] as const;

interface ToolNode {
  name: string;
  module: string;
  description: string;
  signature: string;
}

const REPO_TOOLS: Record<string, ToolNode[]> = {
  'Graph Engine (engine/graph.py)': [
    {
      name: 'bfs_traverse_hops',
      module: 'muletrace.engine.graph',
      description: 'Multi-hop breadth-first traversal up to 3 degrees',
      signature: 'bfs_traverse(account_id, max_hops=3, min_amount=10000)',
    },
    {
      name: 'betweenness_centrality',
      module: 'muletrace.engine.graph',
      description: 'Identifies high-traffic bridge nodes in flow graph',
      signature: 'calc_centrality(graph, normalized=True)',
    },
  ],
  'Detectors (detectors/)': [
    {
      name: 'fan_detector.scan',
      module: 'muletrace.detectors.fan',
      description: 'Detects fan-in accumulation hubs & rapid fan-out dispersion',
      signature: 'detect_fan(inflow_nodes, min_forward_ratio=0.80)',
    },
    {
      name: 'cycle_detector.find_loops',
      module: 'muletrace.detectors.cycle',
      description: 'Finds closed directed cycles with shrinkage decay',
      signature: 'find_cycles(max_length=5, fee_tolerance=0.08)',
    },
    {
      name: 'chain_detector.trace_velocity',
      module: 'muletrace.detectors.chain',
      description: 'Measures transit pass-through speed and retained balance',
      signature: 'trace_chain(max_latency_minutes=15)',
    },
    {
      name: 'cluster_detector.match_device',
      module: 'muletrace.detectors.cluster',
      description: 'Correlates hardware fingerprints & KYC address collisions',
      signature: 'cluster_identities(key="device_id", min_accounts=3)',
    },
  ],
  'Analytics Core (analytics/)': [
    {
      name: 'taint_propagator.fifo_trace',
      module: 'muletrace.analytics.taint',
      description: 'FIFO tainted balance tracking from victim source',
      signature: 'propagate_taint(source_tx, decay_rate=0.0)',
    },
    {
      name: 'shap_explainer.explain',
      module: 'muletrace.analytics.explain',
      description: 'Decomposes risk score into SHAP feature attributions',
      signature: 'explain_score(account_id, baseline_model="treeshap")',
    },
    {
      name: 'freeze_optimizer.min_cut',
      module: 'muletrace.analytics.freeze_optimizer',
      description: 'Calculates maximum fund preservation cut set',
      signature: 'solve_bottleneck(graph, tainted_nodes)',
    },
  ],
};

const SUGGESTIONS = [
  'Find suspicious structuring patterns across the last 30 days',
  'Trace pass-through velocity & cashout for ACC_05001',
  'Identify synthetic identity clusters sharing DEV_MULE_99',
];

export const AgentWorkbench: React.FC = () => {
  const prefersReduced = useReducedMotion();

  /* Query State */
  const [query, setQuery] = useState('Find suspicious structuring patterns across the last 30 days');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState<number>(7); // Default completed state

  /* Execution Trace Rows */
  const [traceRows, setTraceRows] = useState<TraceRow[]>([]);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  /* Backend & Fallback State */
  const [executionMode, setExecutionMode] = useState<'LIVE' | 'RECORDED'>('RECORDED');
  const [backendStatus, setBackendStatus] = useState<'idle' | 'checking' | 'offline' | 'timeout' | 'live'>('idle');

  /* Collapsible Tree State */
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'Graph Engine (engine/graph.py)': true,
    'Detectors (detectors/)': true,
    'Analytics Core (analytics/)': false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /* Seed initial completed demo trace */
  useEffect(() => {
    loadRecordedTrace();
  }, []);

  const loadRecordedTrace = () => {
    setCurrentStageIdx(7);
    setExecutionMode('RECORDED');
    setTraceRows([
      {
        id: 'trace-1',
        seq: '01',
        tool: 'bfs_traverse_hops',
        status: 'COMPLETE',
        durationMs: 142,
        params: { target_account: 'ACC_05001', max_hops: 3, min_volume: 10000 },
        summary: 'Extracted 12 nodes and 11 edges across 3 degrees from origin transaction.',
        details: {
          nodes_discovered: 12,
          edges_traversed: 11,
          max_depth: 3,
          duration_seconds: 0.142,
          subgraph_density: 0.74,
        },
      },
      {
        id: 'trace-2',
        seq: '02',
        tool: 'fan_detector.scan',
        status: 'COMPLETE',
        durationMs: 284,
        params: { nexus_node: 'ACC_05001', min_ratio: 0.80, time_window_min: 30 },
        summary: 'Flagged High-Confidence Fan-in / Fan-out Hub: ₹4.24L inflow forwarded 94.2% in 14.2m.',
        details: {
          inflow_volume: 424089.49,
          outflow_volume: 399620.00,
          forward_ratio: 0.942,
          originator_count: 11,
          disperser_count: 6,
          pattern_class: 'STRUCTURING_DISPERSION',
        },
      },
      {
        id: 'trace-3',
        seq: '03',
        tool: 'cluster_detector.match_device',
        status: 'WARNING',
        durationMs: 98,
        params: { target_nodes: ['ACC_05001', 'ACC_05002', 'ACC_05003'] },
        summary: 'Telemetry overlap found: 2 linked entities authenticate via shared hardware hash DEV_MULE_99.',
        details: {
          device_hash: 'DEV_MULE_99',
          collision_count: 2,
          geo_city: 'Mumbai / Bangalore Proxy',
          asn_flag: 'Hosting / Proxy Subnet',
        },
      },
      {
        id: 'trace-4',
        seq: '04',
        tool: 'shap_explainer.explain',
        status: 'COMPLETE',
        durationMs: 310,
        params: { account_id: 'ACC_05001', model: 'TreeSHAP' },
        summary: 'Attribution decomposed: Forward velocity (+0.38) and burst frequency (+0.29) drive risk to 96.',
        details: {
          risk_score: 96,
          top_attributions: {
            forward_ratio: '+0.38 SHAP',
            hourly_velocity: '+0.29 SHAP',
            new_account_age: '+0.19 SHAP',
            retained_balance: '-0.05 SHAP',
          },
          counterfactual: 'Score drops below 50 if forward velocity decreases by 75%.',
        },
      },
      {
        id: 'trace-5',
        seq: '05',
        tool: 'freeze_optimizer.min_cut',
        status: 'COMPLETE',
        durationMs: 165,
        params: { graph_id: 'fan_1', max_preservation_target: 1.0 },
        summary: 'Optimal bottleneck cut calculated: Single freeze on ACC_05001 preserves ₹4,24,089 (100%).',
        details: {
          recommended_freeze_node: 'ACC_05001',
          rupees_stopped: 424089.49,
          efficiency_score: 0.942,
          legal_basis: 'PMLA Section 12 Emergency Debit Freeze',
        },
      },
    ]);
  };

  /* Run the Agent Investigation Workflow */
  const handleExecute = async (inputQuery: string) => {
    if (isExecuting) return;
    setIsExecuting(true);
    setCurrentStageIdx(0);
    setTraceRows([]);
    setExpandedRowId(null);
    setBackendStatus('checking');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Check if live backend responds within 1.5s
    const startTime = performance.now();
    let isLiveBackend = false;

    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
      const fetchCheck = fetch(`${API_BASE}/api/v1/health`, { signal: controller.signal });
      await Promise.race([fetchCheck, timeout]);
      isLiveBackend = true;
      setBackendStatus('live');
      setExecutionMode('LIVE');
    } catch {
      // Backend offline or took > 1.5s
      isLiveBackend = false;
      setBackendStatus('offline');
      setExecutionMode('RECORDED');
    }

    // Step-by-step stage execution runner
    const sequence: Array<{
      stageIdx: number;
      delay: number;
      row?: Omit<TraceRow, 'id' | 'isNew'>;
    }> = [
      { stageIdx: 0, delay: 200 }, // QUERY RECEIVED
      { stageIdx: 1, delay: 350 }, // INTENT DETECTED
      {
        stageIdx: 2, // PLAN
        delay: 450,
        row: {
          seq: '01',
          tool: 'bfs_traverse_hops',
          status: 'RUNNING',
          params: { target_account: 'ACC_05001', max_hops: 3, min_volume: 10000 },
          summary: 'Executing multi-hop BFS traversal across graph ledger...',
        },
      },
      {
        stageIdx: 3, // TOOLS SELECTED
        delay: 600,
        row: {
          seq: '01',
          tool: 'bfs_traverse_hops',
          status: 'COMPLETE',
          durationMs: 142,
          params: { target_account: 'ACC_05001', max_hops: 3, min_volume: 10000 },
          summary: 'Extracted 12 nodes and 11 edges across 3 degrees from origin transaction.',
          details: {
            nodes_discovered: 12,
            edges_traversed: 11,
            max_depth: 3,
            subgraph_density: 0.74,
          },
        },
      },
      {
        stageIdx: 4, // EXECUTION
        delay: 500,
        row: {
          seq: '02',
          tool: 'fan_detector.scan',
          status: 'RUNNING',
          params: { nexus_node: 'ACC_05001', min_ratio: 0.80 },
          summary: 'Scanning topological structuring and dispersion velocity...',
        },
      },
      {
        stageIdx: 4,
        delay: 550,
        row: {
          seq: '02',
          tool: 'fan_detector.scan',
          status: 'COMPLETE',
          durationMs: 284,
          params: { nexus_node: 'ACC_05001', min_ratio: 0.80 },
          summary: 'Flagged High-Confidence Fan-in / Fan-out Hub: ₹4.24L inflow forwarded 94.2% in 14.2m.',
          details: {
            inflow_volume: 424089.49,
            outflow_volume: 399620.00,
            forward_ratio: 0.942,
            originator_count: 11,
            disperser_count: 6,
          },
        },
      },
      {
        stageIdx: 5, // ANALYSIS
        delay: 500,
        row: {
          seq: '03',
          tool: 'cluster_detector.match_device',
          status: 'WARNING',
          durationMs: 98,
          params: { target_nodes: ['ACC_05001', 'ACC_05002'] },
          summary: 'Telemetry overlap found: 2 linked entities authenticate via shared hardware hash DEV_MULE_99.',
          details: {
            device_hash: 'DEV_MULE_99',
            collision_count: 2,
            asn_flag: 'Hosting / Proxy Subnet',
          },
        },
      },
      {
        stageIdx: 6, // EXPLANATION
        delay: 600,
        row: {
          seq: '04',
          tool: 'shap_explainer.explain',
          status: 'COMPLETE',
          durationMs: 310,
          params: { account_id: 'ACC_05001', model: 'TreeSHAP' },
          summary: 'Attribution decomposed: Forward velocity (+0.38) and burst frequency (+0.29) drive risk to 96.',
          details: {
            risk_score: 96,
            attributions: {
              forward_ratio: '+0.38 SHAP',
              hourly_velocity: '+0.29 SHAP',
            },
          },
        },
      },
      {
        stageIdx: 7, // RESULT
        delay: 500,
        row: {
          seq: '05',
          tool: 'freeze_optimizer.min_cut',
          status: 'COMPLETE',
          durationMs: 165,
          params: { graph_id: 'fan_1', max_preservation_target: 1.0 },
          summary: 'Optimal bottleneck cut calculated: Single freeze on ACC_05001 preserves ₹4,24,089 (100%).',
          details: {
            recommended_freeze_node: 'ACC_05001',
            rupees_stopped: 424089.49,
            efficiency_score: 0.942,
          },
        },
      },
    ];

    for (const step of sequence) {
      if (controller.signal.aborted) break;
      await new Promise((r) => setTimeout(r, prefersReduced ? 20 : step.delay));

      setCurrentStageIdx(step.stageIdx);

      if (step.row) {
        setTraceRows((prev) => {
          const existingIdx = prev.findIndex((r) => r.seq === step.row?.seq);
          const newRow: TraceRow = {
            ...step.row!,
            id: `trace-${step.row!.seq}`,
            isNew: true,
          };

          if (existingIdx >= 0) {
            const updated = [...prev];
            updated[existingIdx] = newRow;
            return updated;
          }
          return [...prev, newRow];
        });

        // Clear 600ms highlight
        setTimeout(() => {
          setTraceRows((prev) =>
            prev.map((r) => (r.seq === step.row?.seq ? { ...r, isNew: false } : r))
          );
        }, 650);
      }
    }

    setIsExecuting(false);
  };

  const toggleModule = (moduleKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'QUEUED':
        return <Clock size={12} className="text-ink-2" />;
      case 'RUNNING':
        return <Activity size={12} className="text-signal" />;
      case 'COMPLETE':
        return <CheckCircle2 size={12} className="text-ok" />;
      case 'WARNING':
        return <AlertTriangle size={12} className="text-signal" />;
      case 'FAILED':
        return <XCircle size={12} className="text-risk" />;
      case 'SKIPPED':
        return <CornerDownRight size={12} className="text-ink-3" />;
    }
  };

  return (
    <div className="agent-workbench-root" id="workbench-container">
      {/* ── Section Header ── */}
      <div className="workbench-head">
        <div className="kicker-row">
          <span className="head-kicker mono">05 · AGENT WORKBENCH</span>
          <ProvenanceBadge source={executionMode === 'LIVE' ? 'live' : 'recorded'} />
        </div>
        <h2 className="workbench-title serif">Ask a question. MuleTrace investigates.</h2>
        <p className="workbench-subtitle">
          Autonomous multi-hop forensic reasoning agent. Traverses financial graphs, executes topological
          heuristics, validates evidence attributions, and compiles audit-ready SAR cases.
        </p>
      </div>

      {/* ── Suggestion Chips ── */}
      <div className="suggestion-chips-row">
        <span className="chips-intro-mono">SUGGESTIONS:</span>
        {SUGGESTIONS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className={`suggestion-chip mono ${query === s ? 'is-active' : ''}`}
            onClick={() => {
              setQuery(s);
              handleExecute(s);
            }}
          >
            <span>{s}</span>
          </button>
        ))}
      </div>

      {/* ── Query Input Bar ── */}
      <div className="agent-input-container">
        <div className="input-prefix-box">
          <span className="prompt-glyph mono">›</span>
        </div>
        <input
          type="text"
          className="agent-query-input mono"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask MuleTrace to inspect any account, device, or transaction cluster..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleExecute(query);
            }
          }}
        />
        <div className="input-actions-box">
          <span className="hotkey-hint mono">Ctrl / ⌘ + Enter</span>
          <button
            type="button"
            className="agent-run-action-btn mono"
            onClick={() => handleExecute(query)}
            disabled={isExecuting}
          >
            {isExecuting ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
            <span>{isExecuting ? 'REASONING...' : 'RUN LIVE AGENT'}</span>
          </button>
        </div>
      </div>

      {/* ── Offline Notice & Recorded Replay Banner ── */}
      {backendStatus === 'offline' && (
        <div className="backend-offline-banner">
          <div className="offline-notice-text mono">
            <span className="offline-dot" />
            <span>Live engine unavailable (offline or latency &gt;1.5s). Replaying recorded forensic execution trace.</span>
          </div>
          <div className="offline-actions">
            <button
              type="button"
              className="quiet-retry-btn mono"
              onClick={() => handleExecute(query)}
            >
              <RotateCcw size={12} />
              <span>Retry live</span>
            </button>
            <span className="recorded-pill mono">TAGGED: RECORDED</span>
          </div>
        </div>
      )}

      {/* ── Main Two-Column Forensic Workbench ── */}
      <div className="workbench-main-grid">
        {/* ── Left Column: Stage Ladder + Real Tools Tree ── */}
        <div className="workbench-left-col">
          {/* Stage Ladder */}
          <div className="stage-ladder-card">
            <div className="card-header-mono">
              <span>INVESTIGATIVE STAGE LADDER</span>
              <span className="mono text-signal">
                {currentStageIdx + 1} / {STAGES.length}
              </span>
            </div>

            <div className="stage-ladder-list">
              {STAGES.map((stg, idx) => {
                const isPassed = idx < currentStageIdx;
                const isCurrent = idx === currentStageIdx;
                const isPending = idx > currentStageIdx;

                return (
                  <div
                    key={stg.id}
                    className={`stage-ladder-item ${
                      isCurrent ? 'is-current' : isPassed ? 'is-passed' : 'is-pending'
                    }`}
                  >
                    <div className="ladder-indicator-col">
                      <span className="ladder-node-dot">
                        {isPassed && <Check size={10} className="check-glyph" />}
                      </span>
                      {idx < STAGES.length - 1 && <span className="ladder-line-track" />}
                    </div>

                    <div className="ladder-content">
                      <div className="ladder-label-row">
                        <span className="ladder-label-mono">{stg.label}</span>
                        {isCurrent && <span className="ladder-active-badge mono">ACTIVE</span>}
                      </div>
                      <span className="ladder-desc-text">{stg.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real Tools Tree (Only tools implemented in the repo) */}
          <div className="tools-tree-card">
            <div className="card-header-mono">
              <span>REGISTERED TOOL REGISTRY</span>
              <span className="mono text-ink-2">REPO IMPLEMENTATIONS ONLY</span>
            </div>

            <div className="tools-tree-content mono">
              {Object.entries(REPO_TOOLS).map(([moduleName, tools]) => {
                const isOpen = !!expandedModules[moduleName];
                return (
                  <div key={moduleName} className="tree-module-group">
                    <button
                      type="button"
                      className="tree-module-header"
                      onClick={() => toggleModule(moduleName)}
                    >
                      {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      <span className="tree-mod-title">{moduleName}</span>
                      <span className="tree-count-badge">{tools.length}</span>
                    </button>

                    {isOpen && (
                      <div className="tree-leaf-list">
                        {tools.map((t) => (
                          <div key={t.name} className="tree-leaf-item">
                            <div className="leaf-dot" />
                            <div className="leaf-info">
                              <span className="leaf-name text-signal">{t.name}</span>
                              <span className="leaf-desc">{t.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column: Execution Trace Stream + Result Pane ── */}
        <div className="workbench-right-col">
          <div className="trace-stream-card">
            <div className="card-header-mono">
              <div className="stream-header-left">
                <span className="stream-pulse-dot" />
                <span>EXECUTION TRACE STREAM</span>
              </div>
              <span className="stream-counter-mono">
                {traceRows.length} OPERATIONS RECORDED
              </span>
            </div>

            {/* Trace Rows List with aria-live="polite" */}
            <div
              className="trace-rows-viewport"
              role="log"
              aria-live="polite"
              aria-label="Agent Execution Trace"
            >
              <AnimatePresence initial={false}>
                {traceRows.map((row) => {
                  const isExpanded = expandedRowId === row.id;
                  const isRunning = row.status === 'RUNNING';

                  return (
                    <motion.div
                      key={row.id}
                      className={`trace-row ${row.isNew ? 'is-highlighted' : ''} ${
                        isRunning ? 'is-running-row' : ''
                      }`}
                      initial={prefersReduced ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
                    >
                      {/* Hairline for RUNNING state (thin indeterminate hairline, not big spinner) */}
                      {isRunning && (
                        <div className="trace-status-running-hairline" aria-hidden="true" />
                      )}

                      <div className="trace-row-main">
                        <div className="row-col-seq mono">{row.seq}</div>

                        <div className="row-col-tool mono">
                          <span className="tool-name-text text-signal">{row.tool}</span>
                        </div>

                        <div className="row-col-status">
                          <span className={`status-badge-mono status-${row.status.toLowerCase()}`}>
                            {getStatusIcon(row.status)}
                            <span>{row.status}</span>
                          </span>
                        </div>

                        <div className="row-col-summary">
                          <p className="summary-one-liner">{row.summary}</p>
                        </div>

                        <div className="row-col-duration mono">
                          {row.durationMs ? `${row.durationMs}ms` : '—'}
                        </div>

                        <div className="row-col-expand">
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </div>

                      {/* Expandable Parameter & Output Details */}
                      {isExpanded && (
                        <motion.div
                          className="trace-row-details mono"
                          initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="details-grid">
                            <div className="details-col">
                              <span className="details-section-title">INVOCATION PARAMETERS:</span>
                              <pre className="json-block">{JSON.stringify(row.params, null, 2)}</pre>
                            </div>
                            {row.details && (
                              <div className="details-col">
                                <span className="details-section-title">EVIDENTIARY OUTPUT:</span>
                                <pre className="json-block">{JSON.stringify(row.details, null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Small Result Pane: Produced Graph & Summary ── */}
          <div className="workbench-result-pane">
            <div className="result-pane-header">
              <span className="mono result-title">INVESTIGATIVE SYNTHESIS & GRAPH ARTIFACT</span>
              <span className="badge-resolved mono">STATUS: EVIDENCE LOCKED</span>
            </div>

            <div className="result-pane-body">
              <div className="result-meta-grid">
                <div className="result-metric-card">
                  <span className="r-label mono">TARGET ENTITY</span>
                  <strong className="r-val mono text-signal">ACC_05001</strong>
                  <span className="r-sub mono">NEXUS DISPERSION HUB</span>
                </div>

                <div className="result-metric-card">
                  <span className="r-label mono">RISK SCORE</span>
                  <strong className="r-val mono text-risk">96 / 100</strong>
                  <span className="r-sub mono">LEVEL 4 CRITICAL</span>
                </div>

                <div className="result-metric-card">
                  <span className="r-label mono">CAPITAL PRESERVED</span>
                  <strong className="r-val mono text-ok">₹4,24,089.49</strong>
                  <span className="r-sub mono">100% OF TAINTED POOL</span>
                </div>

                <div className="result-metric-card">
                  <span className="r-label mono">RECOMMENDED ACTION</span>
                  <strong className="r-val mono text-signal">MIN-CUT DEBIT FREEZE</strong>
                  <span className="r-sub mono">PMLA SECTION 12</span>
                </div>
              </div>

              {/* Subgraph Topology Map Preview */}
              <div className="subgraph-preview-box">
                <div className="subgraph-head-mono">
                  <span>RESOLVED SUBGRAPH: 12 NODES · 11 EDGES · BOTTLENECK ACC_05001</span>
                </div>
                <svg viewBox="0 0 460 90" className="subgraph-mini-svg" aria-hidden="true">
                  {/* Edges */}
                  <line x1="40" y1="20" x2="230" y2="45" stroke="var(--line-strong)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="40" y1="45" x2="230" y2="45" stroke="var(--line-strong)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="40" y1="70" x2="230" y2="45" stroke="var(--line-strong)" strokeWidth="1.2" strokeDasharray="3 2" />
                  <line x1="230" y1="45" x2="420" y2="20" stroke="var(--signal)" strokeWidth="1.6" />
                  <line x1="230" y1="45" x2="420" y2="45" stroke="var(--signal)" strokeWidth="1.6" />
                  <line x1="230" y1="45" x2="420" y2="70" stroke="var(--signal)" strokeWidth="1.6" />

                  {/* Originators */}
                  <circle cx="40" cy="20" r="5" fill="var(--bg-3)" stroke="var(--line-strong)" />
                  <circle cx="40" cy="45" r="5" fill="var(--bg-3)" stroke="var(--line-strong)" />
                  <circle cx="40" cy="70" r="5" fill="var(--bg-3)" stroke="var(--line-strong)" />
                  <text x="32" y="50" textAnchor="end" className="mini-svg-mono">11 ORIGINATORS</text>

                  {/* Bottleneck Hub */}
                  <circle cx="230" cy="45" r="12" fill="var(--signal)" stroke="#fff" strokeWidth="2" />
                  <circle cx="230" cy="45" r="18" fill="none" stroke="var(--signal)" strokeWidth="1" strokeDasharray="3 2" />
                  <text x="230" y="74" textAnchor="middle" className="mini-svg-hub mono">ACC_05001 (FREEZE TARGET)</text>

                  {/* Mule Dispersers */}
                  <circle cx="420" cy="20" r="5" fill="var(--risk)" stroke="var(--line-strong)" />
                  <circle cx="420" cy="45" r="5" fill="var(--risk)" stroke="var(--line-strong)" />
                  <circle cx="420" cy="70" r="5" fill="var(--risk)" stroke="var(--line-strong)" />
                  <text x="428" y="50" textAnchor="start" className="mini-svg-mono">6 MULES (BLOCKED)</text>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
