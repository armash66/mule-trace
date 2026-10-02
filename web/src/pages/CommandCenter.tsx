import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { mockNetworks } from '../api/mockData';
import { useStore } from '../store/store';
import type { DiscoveredRing, StatsResponse, NetworkNode, NetworkEdge, AccountListItem } from '../api/types';
import { formatIndianCurrency, formatIndianDate, maskAccountId } from '../lib/utils';
import { CytoscapeGraph } from '../components/CytoscapeGraph';
import {
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  UploadCloud,
  Layers,
  Database,
  RefreshCw,
  Sliders,
  Snowflake,
  FolderOpen,
  Zap,
  Pause,
  Play,
  Square,
  FastForward,
} from 'lucide-react';
import { simulationEngine } from '../lib/simulateEngine';
import './CommandCenter.css';

/* ── Pattern name formatter ───────────────────────────── */
function getPatternDisplayName(pattern?: string): string {
  switch (pattern) {
    case 'fan':
      return 'Fan-In/Out Aggregation';
    case 'cycle':
      return 'Rapid Cycle Loop';
    case 'chain':
      return 'Multi-Hop Pass-Through';
    case 'cluster':
      return 'Hardware / Proxy Collision';
    case 'dormancy':
      return 'Dormant Account Re-activation';
    default:
      return 'Mule Syndicate Topology';
  }
}

/* ── Smooth Animated Numeric Counter ───────────────────── */
const SmoothCounter: React.FC<{ value: number; className?: string; isCurrency?: boolean }> = ({
  value,
  className = '',
  isCurrency = true,
}) => {
  const [displayVal, setDisplayVal] = useState(value);
  const prevValRef = useRef(value);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setDisplayVal(value);
      prevValRef.current = value;
      return;
    }

    const startVal = prevValRef.current;
    const diff = value - startVal;
    if (diff === 0) {
      setDisplayVal(value);
      return;
    }

    const duration = 250;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(startVal + diff * eased);
      setDisplayVal(current);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setDisplayVal(value);
        prevValRef.current = value;
      }
    };

    const anim = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(anim);
  }, [value]);

  return (
    <span
      className={`mono ${className}`}
      style={{
        display: 'inline-block',
        minWidth: isCurrency ? '12ch' : '4ch',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {isCurrency ? formatIndianCurrency(displayVal) : displayVal.toLocaleString('en-IN')}
    </span>
  );
};

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    setSelectedAccountId,
    setSelectedRingId,
    runs,
    activeRunId,
    fetchRuns,
    setStagedFiles,
    showToast,
    // Simulation state & handlers
    isSimulating,
    setIsSimulating,
    simulationPayload,
    setSimulationPayload,
    simulationAlerts,
    simulationSpeed,
    setSimulationSpeed,
    simulationPaused,
    setSimulationPaused,
    setSimulationSummary,
    setSummaryModalOpen,
    activeScenarioId,
  } = useStore();

  const handleTogglePause = () => {
    if (simulationPaused) {
      simulationEngine.resume();
      setSimulationPaused(false);
    } else {
      simulationEngine.pause();
      setSimulationPaused(true);
    }
  };

  const handleToggleSpeed = () => {
    const nextSpeed = simulationSpeed === 1.0 ? 2.0 : 1.0;
    simulationEngine.setSpeed(nextSpeed);
    setSimulationSpeed(nextSpeed);
  };

  const handleStopSimulation = () => {
    simulationEngine.stop();
    const scenario = simulationEngine.getActiveScenario();
    const summary = {
      events_processed: simulationPayload?.step || 0,
      total_events: simulationPayload?.total_steps || scenario.transactions.length,
      alerts_raised: simulationAlerts.length,
      initial_amount: scenario.initial_amount,
      stolen_moving: simulationPayload?.stolen_moving || 0,
      money_out: simulationPayload?.money_out || 0,
      money_intercepted: simulationPayload?.freeze_point?.amount_stoppable || 0,
      time_to_intercept: simulationPayload?.time_to_intercept || 0,
      is_offline_fallback: simulationEngine.getIsOfflineFallback(),
    };
    setIsSimulating(false);
    setSimulationPayload(null);
    setSimulationSummary(summary);
    setSummaryModalOpen(true);
    loadData();
  };

  const activeScenarioDef = simulationEngine.getActiveScenario();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [rings, setRings] = useState<DiscoveredRing[]>([]);
  const [alertsList, setAlertsList] = useState<AccountListItem[]>([]);
  const [topRingGraph, setTopRingGraph] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animated count-up states
  const [displayAmount, setDisplayAmount] = useState(0);
  const [displayAlerts, setDisplayAlerts] = useState(0);
  const [displayRings, setDisplayRings] = useState(0);
  const [displayFreezes, setDisplayFreezes] = useState(0);

  // Check if forced empty or forced loaded via query param (?state=empty / ?state=loaded)
  const isForcedEmpty = searchParams.get('state') === 'empty' || searchParams.get('empty') === '1';
  const isForcedLoaded = searchParams.get('state') === 'loaded' || searchParams.get('loaded') === '1';

  const loadData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      await fetchRuns();
      const [s, r, accts] = await Promise.all([
        api.getStats(),
        api.getDiscoveredRings(),
        api.getAccounts({ page_size: 5, sort_by: 'score_desc' }),
      ]);
      setStats(s);
      setRings(r);
      const items = accts.items.length > 0 ? accts.items.slice(0, 5) : [];
      setAlertsList(items);

      // Fetch top ring network if available, prioritizing real alert accounts
      const primaryTarget =
        items.length > 0
          ? items[0].account_id
          : (r.length > 0 && r[0].accounts?.length > 0 ? r[0].accounts[0] : 'ACC_05001');

      try {
        const net = await api.getAccountNetwork(primaryTarget);
        if (net && net.nodes && net.nodes.length > 0) {
          setTopRingGraph(net);
        } else {
          setTopRingGraph(mockNetworks['ACC_05001']);
        }
      } catch {
        setTopRingGraph(mockNetworks['ACC_05001']);
      }
    } catch (err: any) {
      setFetchError(err?.message || 'Failed to communicate with intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute real numbers
  const targetAmount =
    rings.reduce((sum, r) => sum + (r.estimated_at_risk || 0), 0) || 480000;
  const targetAlerts = stats?.flagged_count || 44;
  const targetRings = rings.length || 5;
  const topRing = rings[0];
  const targetFreezes = topRing?.accounts ? Math.min(topRing.accounts.length, 2) : 2;

  // Single count-up animation on load (600ms duration)
  useEffect(() => {
    if (loading || isForcedEmpty) return;

    // Check reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayAmount(targetAmount);
      setDisplayAlerts(targetAlerts);
      setDisplayRings(targetRings);
      setDisplayFreezes(targetFreezes);
      return;
    }

    const duration = 600;
    const steps = 24;
    const intervalTime = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayAmount(Math.round(targetAmount * progress));
      setDisplayAlerts(Math.round(targetAlerts * progress));
      setDisplayRings(Math.round(targetRings * progress));
      setDisplayFreezes(Math.round(targetFreezes * progress));

      if (step >= steps) {
        setDisplayAmount(targetAmount);
        setDisplayAlerts(targetAlerts);
        setDisplayRings(targetRings);
        setDisplayFreezes(targetFreezes);
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [loading, isForcedEmpty, targetAmount, targetAlerts, targetRings, targetFreezes]);

  // Handle Demo Reset / Load
  const handleUseDemo = async () => {
    setIsResettingDemo(true);
    try {
      await api.resetDemo();
      await fetchRuns();
      const currentRuns = useStore.getState().runs;
      if (!currentRuns || currentRuns.length === 0) {
        useStore.getState().setRuns([
          {
            id: 'run_seed_42_latest',
            name: 'Seeded Demo Run (Seed 42)',
            created_at: new Date().toISOString(),
            source: 'Demo Seed 42',
            status: 'completed',
            is_active: true,
            config_preset: 'default',
            txn_count: 62218,
            acct_count: 5044,
            flagged_count: 44,
            duplicates_removed: 622,
            out_of_order_fixed: 124,
            missing_device_pct: 4.9,
            missing_ip_pct: 5.0,
            self_transfers_dropped: 31,
          },
        ]);
        useStore.getState().setActiveRunId('run_seed_42_latest');
      }
      if (searchParams.has('empty') || searchParams.has('state')) {
        searchParams.delete('empty');
        searchParams.delete('state');
        setSearchParams(searchParams);
      }
      showToast('Demo dataset loaded');
      await loadData();
    } catch {
      showToast('Failed to load demo dataset.');
    } finally {
      setIsResettingDemo(false);
    }
  };

  // Drag and drop handlers for empty state
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setStagedFiles(files);
      navigate('/data?step=select');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setStagedFiles(files);
      navigate('/data?step=select');
    }
  };

  const fallbackDemoRun = {
    id: 'run_seed_42_latest',
    name: 'Seeded Demo Run (Seed 42)',
    created_at: new Date().toISOString(),
    source: 'Demo Seed 42',
    status: 'completed' as const,
    is_active: true,
    config_preset: 'default',
    txn_count: 62218,
    acct_count: 5044,
    flagged_count: 44,
    duplicates_removed: 622,
    out_of_order_fixed: 124,
    missing_device_pct: 4.9,
    missing_ip_pct: 5.0,
    self_transfers_dropped: 31,
  };

  const effectiveRuns = runs.length > 0 ? runs : (isForcedLoaded ? [fallbackDemoRun] : runs);
  const activeRun = effectiveRuns.find((r) => r.id === activeRunId) || effectiveRuns[0] || fallbackDemoRun;
  const topAlert = alertsList[0];
  const topRingId = topRing ? topRing.ring_id : 'fan_1';
  const topRingCutAmount = topRing
    ? Math.round(topRing.estimated_at_risk * 0.85) || 410000
    : 410000;
  const topRingCutAccounts =
    topRing && topRing.accounts ? Math.min(topRing.accounts.length, 2) : 2;

  // Determine if empty: when not forced loaded, and either forced empty or runs are empty
  const isEmpty = !loading && !isForcedLoaded && (runs.length === 0 || isForcedEmpty);

  /* ─────────────────────────────────────────────────────────
     1. EMPTY STATE ("No data loaded yet")
     ───────────────────────────────────────────────────────── */
  if (isEmpty) {
    return (
      <div className="overview-container">
        <div className="overview-empty-state forensic-panel">
          {/* 4 Corner Ticks */}
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />

          {/* Dim ILLUSTRATIVE Network Ghost (15% opacity) */}
          <svg
            className="empty-network-ghost"
            viewBox="0 0 1000 500"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M150 250 L 350 140 L 500 220 L 700 180 L 850 320 M350 140 L 450 360 L 700 180 M200 380 L 450 360 M700 180 L 780 400"
              stroke="#FF9F1C"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <circle cx="150" cy="250" r="14" fill="#12151B" stroke="#232833" strokeWidth="2" />
            <circle cx="350" cy="140" r="18" fill="#1A1E26" stroke="#FF9F1C" strokeWidth="2" />
            <circle cx="500" cy="220" r="22" fill="#1A1E26" stroke="#FF4B4B" strokeWidth="2" />
            <circle cx="700" cy="180" r="16" fill="#12151B" stroke="#232833" strokeWidth="2" />
            <circle cx="850" cy="320" r="14" fill="#12151B" stroke="#232833" strokeWidth="2" />
            <circle cx="450" cy="360" r="15" fill="#12151B" stroke="#232833" strokeWidth="2" />
            <circle cx="200" cy="380" r="12" fill="#12151B" stroke="#232833" strokeWidth="2" />
            <circle cx="780" cy="400" r="13" fill="#12151B" stroke="#232833" strokeWidth="2" />
          </svg>

          {/* Central Content Box */}
          <div className="empty-content-box">
            <div className="empty-kicker-row">
              <span className="prov-badge illustrative">ILLUSTRATIVE</span>
              <span className="mono" style={{ color: 'var(--text-2)', fontSize: '11px' }}>
                INTAKE REQUIRED
              </span>
            </div>

            <h1 className="empty-heading">No data loaded yet</h1>
            <p className="empty-subcopy">
              Load the demo dataset to see MuleTrace trace a mule network, or drop your own files.
            </p>

            {/* Hero Action: Large Amber Button First In Tab Order */}
            <button
              type="button"
              tabIndex={1}
              className="btn btn-primary btn-hero-demo"
              disabled={isResettingDemo}
              onClick={handleUseDemo}
            >
              <span>{isResettingDemo ? 'Initializing dataset…' : 'Use demo dataset'}</span>
              {!isResettingDemo && <ArrowRight size={15} />}
              {isResettingDemo && <div className="btn-progress-hairline" />}
            </button>

            {/* Quieter Dropzone Panel with Corner Ticks */}
            <div
              className={`empty-drop-panel ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={2}
              aria-label="Upload files"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.tsv,.xlsx,.json,.ndjson,.zip"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
              />
              <UploadCloud size={20} className="drop-glyph" />
              <div className="drop-label">Drop transaction or account files to begin</div>
              <div className="drop-types">CSV · Excel · JSON · ZIP · or paste data</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     2. LOADING / SKELETON STATE
     ───────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="overview-container">
        <div className="forensic-panel panel-skeleton">
          <div className="skeleton-bar" style={{ width: '45%' }} />
          <div className="skeleton-bar" style={{ width: '70%', height: '12px' }} />
        </div>
        <div className="overview-kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="forensic-panel panel-skeleton" style={{ height: '110px' }}>
              <div className="skeleton-bar" style={{ width: '50%', height: '10px' }} />
              <div className="skeleton-bar" style={{ width: '65%', height: '28px' }} />
            </div>
          ))}
        </div>
        <div className="overview-main-grid">
          <div className="forensic-panel panel-skeleton" style={{ height: '360px' }}>
            <div className="skeleton-bar" style={{ width: '40%' }} />
            <div className="skeleton-bar" style={{ width: '90%' }} />
            <div className="skeleton-bar" style={{ width: '85%' }} />
          </div>
          <div className="forensic-panel panel-skeleton" style={{ height: '360px' }}>
            <div className="skeleton-bar" style={{ width: '50%' }} />
            <div className="skeleton-bar" style={{ width: '100%', height: '240px' }} />
          </div>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     3. ERROR STATE WITH RETRY
     ───────────────────────────────────────────────────────── */
  if (fetchError) {
    return (
      <div className="overview-container">
        <div className="forensic-panel panel-error-box">
          <AlertTriangle size={24} color="var(--risk)" />
          <div className="panel-error-msg">{fetchError}</div>
          <button type="button" className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={13} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────────
     4. LOADED STATE (Forensic Command Room Overview)
     ───────────────────────────────────────────────────────── */
  return (
    <div className="overview-container">
      {/* ── TOP STATUS STRIP ──────────────────────────────── */}
      <div className="overview-status-strip animate-entrance stagger-1">
        <div className="status-strip-left">
          <span className="prov-badge sample">SAMPLE</span>
          <span className="status-dataset-name">
            {activeRun?.name || 'Seeded Demo Run (Seed 42)'}
          </span>
          <span className="status-separator">·</span>
          <span className="status-counts">
            {(activeRun?.txn_count || 62218).toLocaleString()} transactions · {(activeRun?.acct_count || stats?.total_accounts || 5044).toLocaleString()} accounts
          </span>
          <span className="status-separator">·</span>
          <span className="status-timestamp">
            {formatIndianDate(activeRun?.created_at || '2026-10-03T00:09:00Z')}
          </span>
        </div>

        <div className="status-strip-right">
          {topAlert && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSelectedAccountId(topAlert.account_id);
                navigate(`/workspace/${topAlert.account_id}`);
              }}
            >
              <span>Investigate top alert</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── LIVE SIMULATION CONTROL STRIP ─────────────────── */}
      {isSimulating && (
        <div className="sim-live-strip animate-entrance">
          <div className="sim-strip-info">
            <span className="prov-badge sample">
              SIMULATION ACTIVE
            </span>
            <span className="sim-strip-title">
              <Zap size={15} color="var(--signal)" />
              {activeScenarioDef?.title || 'Live Heist Sandbox'}
            </span>
            <span className="sim-strip-step">
              Step {simulationPayload?.step || 1} of {simulationPayload?.total_steps || 12}
            </span>
            <span className="sim-engine-tag">
              {simulationPayload?.is_offline_fallback ? 'FALLBACK: CLIENT ENGINE' : 'LIVE SSE STREAM'}
            </span>
          </div>

          <div className="sim-strip-controls">
            <button
              type="button"
              className="sim-btn-ctrl"
              onClick={handleTogglePause}
              title={simulationPaused ? 'Resume simulation' : 'Pause simulation'}
            >
              {simulationPaused ? <Play size={12} /> : <Pause size={12} />}
              <span>{simulationPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              className={`sim-btn-ctrl ${simulationSpeed > 1 ? 'active' : ''}`}
              onClick={handleToggleSpeed}
              title="Toggle playback speed (1x / 2x)"
            >
              <FastForward size={12} />
              <span>Speed {simulationSpeed}x</span>
            </button>

            <button
              type="button"
              className="sim-btn-stop"
              onClick={handleStopSimulation}
              title="Stop simulation & restore original dataset"
            >
              <Square size={12} />
              <span>Stop & reset</span>
            </button>
          </div>
        </div>
      )}

      {/* ── KPI ROW (4 Compact Panels, Amber Accent on Capital at Risk / Stolen Moving) */}
      <div className="overview-kpi-grid">
        {/* KPI 1: Stolen money still moving / Capital at Risk */}
        <div className="forensic-panel kpi-card animate-entrance stagger-2">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />
          <div className="kpi-label-row">
            <span className="kpi-label">
              {isSimulating ? 'Stolen money still moving' : 'Capital at Risk'}
            </span>
            <span className="prov-badge sample">
              {isSimulating ? 'SIMULATION' : 'SAMPLE'}
            </span>
          </div>
          <div className="kpi-val signal-val">
            {isSimulating ? (
              <SmoothCounter
                value={simulationPayload ? simulationPayload.stolen_moving : 1500000}
                className="signal-val"
              />
            ) : (
              formatIndianCurrency(displayAmount)
            )}
          </div>
          <div className="kpi-subtext">
            {isSimulating ? 'In-flight funds not yet at terminal sink' : `Across ${targetRings} identified rings`}
          </div>
        </div>

        {/* KPI 2: Money already out / Open Alerts */}
        <div className="forensic-panel kpi-card animate-entrance stagger-2">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />
          <div className="kpi-label-row">
            <span className="kpi-label">
              {isSimulating ? 'Money already out' : 'Open Alerts'}
            </span>
            <span className="prov-badge sample">
              {isSimulating ? 'SIMULATION' : 'SAMPLE'}
            </span>
          </div>
          <div className="kpi-val" style={{ color: isSimulating ? 'var(--risk)' : undefined }}>
            {isSimulating ? (
              <SmoothCounter value={simulationPayload ? simulationPayload.money_out : 0} />
            ) : (
              displayAlerts
            )}
          </div>
          <div className="kpi-subtext">
            {isSimulating ? 'Extracted at ATM / crypto off-ramps' : 'Awaiting analyst triage'}
          </div>
        </div>

        {/* KPI 3: Time to intercept / Mule Rings Detected */}
        <div className="forensic-panel kpi-card animate-entrance stagger-3">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />
          <div className="kpi-label-row">
            <span className="kpi-label">
              {isSimulating ? 'Time to intercept' : 'Mule Rings Detected'}
            </span>
            <span className="prov-badge sample">
              {isSimulating ? 'SIMULATION' : 'SAMPLE'}
            </span>
          </div>
          <div className="kpi-val">
            {isSimulating ? (
              <span className="mono" style={{ minWidth: '8ch', display: 'inline-block', fontVariantNumeric: 'tabular-nums' }}>
                {simulationPayload && simulationPayload.time_to_intercept > 0
                  ? `${simulationPayload.time_to_intercept.toFixed(1)}s`
                  : '1.5s'}
              </span>
            ) : (
              displayRings
            )}
          </div>
          <div className="kpi-subtext">
            {isSimulating ? 'From 1st event to critical rule trigger' : 'Fan, cycle & cluster topologies'}
          </div>
        </div>

        {/* KPI 4: Alerts Triggered / Actionable Freezes */}
        <div className="forensic-panel kpi-card animate-entrance stagger-3">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />
          <div className="kpi-label-row">
            <span className="kpi-label">
              {isSimulating ? 'Alerts Triggered' : 'Actionable Freezes'}
            </span>
            <span className="prov-badge sample">
              {isSimulating ? 'SIMULATION' : 'SAMPLE'}
            </span>
          </div>
          <div className="kpi-val">
            {isSimulating ? (
              <span className="mono" style={{ minWidth: '4ch', display: 'inline-block', fontVariantNumeric: 'tabular-nums', color: 'var(--risk)' }}>
                {simulationAlerts.length}
              </span>
            ) : (
              `${displayFreezes} accounts`
            )}
          </div>
          <div className="kpi-subtext">
            {isSimulating
              ? (simulationPayload?.freeze_point?.label || 'Min-cut bottleneck identified')
              : `Preserves ${formatIndianCurrency(topRingCutAmount)}`}
          </div>
        </div>
      </div>

      {/* ── TWO-COLUMN INVESTIGATION GRID ─────────────────── */}
      <div className="overview-main-grid">
        {/* Left Column: Priority Alert List / Live Simulation Alerts */}
        <div className="forensic-panel alerts-list-card animate-entrance stagger-4">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />

          <div className="panel-header-strip">
            <div className="panel-title-group">
              <span className="panel-title-text">
                {isSimulating ? `Live Rule Triggers (${simulationAlerts.length})` : 'Priority Alerts Queue'}
              </span>
              <span className="prov-badge sample">
                {isSimulating ? 'SIMULATION' : 'SAMPLE'}
              </span>
            </div>
            {!isSimulating ? (
              <Link
                to="/alerts"
                style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-1)',
                  textDecoration: 'none',
                }}
              >
                View all alerts →
              </Link>
            ) : (
              <span className="mono" style={{ fontSize: '11px', color: 'var(--signal)' }}>
                STREAMING
              </span>
            )}
          </div>

          <div className="alerts-items-wrapper">
            {isSimulating ? (
              simulationAlerts.length > 0 ? (
                simulationAlerts.map((alt) => {
                  const isCrit = alt.severity === 'CRITICAL';
                  return (
                    <div
                      key={alt.alert_id}
                      className="alert-row"
                      style={{ cursor: 'default' }}
                    >
                      {/* Risk Rail */}
                      <div
                        className={`alert-risk-rail ${isCrit ? 'risk-high' : 'risk-medium'}`}
                      />

                      {/* Severity Badge */}
                      <div
                        className={`alert-severity-badge ${isCrit ? 'risk-high' : 'risk-medium'}`}
                      >
                        {isCrit ? (
                          <>
                            <AlertCircle size={11} />
                            <span>CRITICAL</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={11} />
                            <span>HIGH</span>
                          </>
                        )}
                      </div>

                      {/* Masked ID + Pattern + Plain Reason */}
                      <div className="alert-meta">
                        <div className="alert-id-pattern">
                          <span className="alert-masked-id">{alt.account_id || alt.ring_id}</span>
                          <span className="alert-pattern-name">{alt.title}</span>
                        </div>
                        <div className="alert-reason-summary">{alt.detail}</div>
                      </div>

                      {/* Score Column */}
                      <div className="alert-score-col">
                        <span className={`alert-score-val ${isCrit ? 'high' : ''}`}>
                          {isCrit ? 98 : 86}
                        </span>
                        <span className="alert-score-label">RULE</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-2)',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Evaluating stream rules: rapid fan-out, shared device, velocity…
                </div>
              )
            ) : (
              alertsList.map((item) => {
                const score = item.risk_score;
                const isHigh = score >= 80;
                const isMedium = score >= 50 && score < 80;
                const patternText = item.patterns?.[0]
                  ? getPatternDisplayName(item.patterns[0])
                  : 'Rapid flow velocity';

                return (
                  <div
                    key={item.account_id}
                    className="alert-row"
                    onClick={() => {
                      setSelectedAccountId(item.account_id);
                      navigate(`/workspace/${item.account_id}`);
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {/* 2px Risk Rail */}
                    <div
                      className={`alert-risk-rail ${
                        isHigh ? 'risk-high' : isMedium ? 'risk-medium' : 'risk-low'
                      }`}
                    />

                    {/* Severity Badge with Icon + Label (not color alone!) */}
                    <div
                      className={`alert-severity-badge ${
                        isHigh ? 'risk-high' : isMedium ? 'risk-medium' : 'risk-low'
                      }`}
                    >
                      {isHigh ? (
                        <>
                          <AlertTriangle size={11} />
                          <span>HIGH</span>
                        </>
                      ) : isMedium ? (
                        <>
                          <AlertCircle size={11} />
                          <span>MEDIUM</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={11} />
                          <span>LOW</span>
                        </>
                      )}
                    </div>

                    {/* Masked ID + Pattern + Plain Reason */}
                    <div className="alert-meta">
                      <div className="alert-id-pattern">
                        <span className="alert-masked-id">{maskAccountId(item.account_id)}</span>
                        <span className="alert-pattern-name">{patternText}</span>
                      </div>
                      <div className="alert-reason-summary">
                        {item.reason || 'Unusual rapid money movement across counterpart accounts.'}
                      </div>
                    </div>

                    {/* Score Column */}
                    <div className="alert-score-col">
                      <span className={`alert-score-val ${isHigh ? 'high' : ''}`}>
                        {score}
                      </span>
                      <span className="alert-score-label">RISK</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Highest-Risk Cluster Network Panel / Live Heist Flow */}
        <div className="forensic-panel network-cluster-card animate-entrance stagger-5">
          <span className="corner-tick tick-tl" />
          <span className="corner-tick tick-tr" />
          <span className="corner-tick tick-bl" />
          <span className="corner-tick tick-br" />

          <div className="panel-header-strip">
            <div className="panel-title-group">
              <span className="panel-title-text">
                {isSimulating ? 'Live Adversary Flow Graph' : 'Highest-Risk Cluster'}
              </span>
              <span className="prov-badge sample">
                {isSimulating ? 'SIMULATION' : 'SAMPLE'}
              </span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
              TOPOLOGY
            </span>
          </div>

          <div className="cluster-info-bar">
            <div className="cluster-meta-left">
              <span className="cluster-ring-id">
                {isSimulating
                  ? `${activeScenarioDef?.title || 'Heist Scenario'}`
                  : `Ring #${topRingId}`}
              </span>
              <span className="cluster-pattern">
                {isSimulating
                  ? (simulationPayload?.freeze_point?.label || 'Bottleneck Interception Active')
                  : (topRing?.pattern ? getPatternDisplayName(topRing.pattern) : 'Fan-In Syndicate')}
              </span>
            </div>
            <div className="cluster-at-risk">
              {isSimulating
                ? formatIndianCurrency(simulationPayload?.stolen_moving || 1500000)
                : formatIndianCurrency(topRing?.estimated_at_risk || 480000)}
            </div>
          </div>

          <div className="cluster-graph-container">
            {isSimulating && simulationPayload ? (
              <CytoscapeGraph
                nodes={simulationPayload.nodes}
                edges={simulationPayload.edges}
                height="290px"
                isSimulationActive={true}
                activeEdgeId={simulationPayload.active_edge_id}
                settledEdgeIds={simulationPayload.settled_edge_ids}
                freezeNodeId={simulationPayload.freeze_point?.account_id}
                freezeLabel={simulationPayload.freeze_point?.label}
                onNodeClick={(id) => {
                  setSelectedAccountId(id);
                  navigate(`/workspace/${id}`);
                }}
              />
            ) : topRingGraph.nodes.length > 0 ? (
              <CytoscapeGraph
                nodes={topRingGraph.nodes}
                edges={topRingGraph.edges}
                height="290px"
                selectedId={topRing?.accounts?.[0]}
                recommendedFreezeId={topRing?.accounts?.[1]}
                onNodeClick={(id) => {
                  setSelectedAccountId(id);
                  navigate(`/workspace/${id}`);
                }}
              />
            ) : (
              <div
                style={{
                  height: '290px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-2)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}
              >
                Rendering topology cluster…
              </div>
            )}
          </div>

          <div className="cluster-action-bar">
            <span className="cluster-freeze-note">
              {isSimulating
                ? (simulationPayload?.freeze_point
                    ? `Min-cut interception: ${simulationPayload.freeze_point.account_id} stops ₹${(simulationPayload.freeze_point.amount_stoppable / 100000).toFixed(1)}L`
                    : 'Calculating min-cut bottleneck…')
                : `${topRingCutAccounts} accounts bottleneck ${formatIndianCurrency(topRingCutAmount)}`}
            </span>
            <Link
              to={isSimulating ? `/workspace/${simulationPayload?.freeze_point?.account_id || 'ACC-RING07-00'}` : `/cases/${topRingId}`}
              className="cluster-action-link"
              onClick={() => {
                if (!isSimulating) setSelectedRingId(topRingId);
              }}
            >
              <span>{isSimulating ? 'Inspect bottleneck account' : 'Investigate this cluster'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
