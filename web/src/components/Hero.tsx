import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ArrowRight, ShieldAlert, Activity } from 'lucide-react';
import { ProvenanceLabel } from './ProvenanceLabel';
import { useReducedMotion } from '../hooks/useReducedMotion';
import './Hero.css';

/* ── Node & Edge Data Topology ───────────────────────────── */

export type GlyphType = 'ACCOUNT' | 'TRANSACTION' | 'DEVICE' | 'IP' | 'CASHOUT';

export interface GraphNode {
  id: string;
  label: string;
  type: GlyphType;
  x: number;
  y: number;
  isCluster: boolean;
  isSelected?: boolean;
  isBackground?: boolean;
  score?: number;
  annotation?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  isCluster: boolean;
  annotation?: string;
}

// Pre-calibrated sample graph topology from repo's mock/seed database
const DESKTOP_NODES: GraphNode[] = [
  // Selected Cluster Center
  { id: 'DEV_MULE_99', label: 'DEV_MULE_99', type: 'DEVICE', x: 500, y: 350, isCluster: true, isSelected: true, score: 88, annotation: 'COLLISION: 6 ACCOUNTS' },

  // Cluster Linked Mule Accounts
  { id: 'ACC_05026', label: 'ACC-05026', type: 'ACCOUNT', x: 410, y: 260, isCluster: true, score: 88, annotation: 'AGE: 14D' },
  { id: 'ACC_05001', label: 'ACC-05001', type: 'ACCOUNT', x: 590, y: 270, isCluster: true, score: 96, annotation: 'HUB: ₹4.24L' },
  { id: 'ACC_05002', label: 'ACC-05002', type: 'ACCOUNT', x: 410, y: 440, isCluster: true, score: 76 },
  { id: 'ACC_05008', label: 'ACC-05008', type: 'ACCOUNT', x: 590, y: 430, isCluster: true, score: 94 },
  { id: 'ACC_05016', label: 'ACC-05016', type: 'ACCOUNT', x: 330, y: 350, isCluster: true, score: 91 },
  { id: 'ACC_05030', label: 'ACC-05030', type: 'ACCOUNT', x: 670, y: 350, isCluster: true, score: 79 },
  { id: 'IP_SUBNET_4', label: 'IP: 198.51.100.4', type: 'IP', x: 500, y: 210, isCluster: true },
  { id: 'ATM_CASHOUT', label: 'ATM_CASHOUT_1', type: 'CASHOUT', x: 680, y: 460, isCluster: true },

  // Inflow Originator Source Nodes
  { id: 'SRC_1001', label: 'SRC-1001', type: 'ACCOUNT', x: 190, y: 200, isCluster: false },
  { id: 'SRC_1002', label: 'SRC-1002', type: 'ACCOUNT', x: 230, y: 280, isCluster: false },
  { id: 'SRC_1003', label: 'SRC-1003', type: 'ACCOUNT', x: 170, y: 360, isCluster: false },
  { id: 'SRC_1004', label: 'SRC-1004', type: 'ACCOUNT', x: 220, y: 450, isCluster: false },
  { id: 'SRC_1005', label: 'SRC-1005', type: 'ACCOUNT', x: 180, y: 530, isCluster: false },

  // Transaction Layering Nodes
  { id: 'TX_L1_01', label: 'TX-49K', type: 'TRANSACTION', x: 280, y: 230, isCluster: false },
  { id: 'TX_L1_02', label: 'TX-48K', type: 'TRANSACTION', x: 270, y: 400, isCluster: false },
  { id: 'TX_L2_01', label: 'TX-72K', type: 'TRANSACTION', x: 670, y: 250, isCluster: false },
  { id: 'TX_L2_02', label: 'TX-68K', type: 'TRANSACTION', x: 730, y: 330, isCluster: false },

  // Outflow Destination Entities
  { id: 'DEST_801', label: 'DEST-801', type: 'ACCOUNT', x: 760, y: 190, isCluster: false },
  { id: 'DEST_802', label: 'DEST-802', type: 'ACCOUNT', x: 820, y: 260, isCluster: false },
  { id: 'DEST_803', label: 'CRYPTO_EXIT', type: 'CASHOUT', x: 810, y: 400, isCluster: false },
  { id: 'DEST_804', label: 'MERCHANT_POS', type: 'CASHOUT', x: 770, y: 520, isCluster: false },

  // Background Ambient Nodes (Bleeding off edges, dimmer)
  { id: 'BG_01', label: 'EXT-01', type: 'ACCOUNT', x: 110, y: 130, isCluster: false, isBackground: true },
  { id: 'BG_02', label: 'EXT-02', type: 'ACCOUNT', x: 130, y: 620, isCluster: false, isBackground: true },
  { id: 'BG_03', label: 'EXT-03', type: 'IP', x: 380, y: 120, isCluster: false, isBackground: true },
  { id: 'BG_04', label: 'EXT-04', type: 'TRANSACTION', x: 620, y: 130, isCluster: false, isBackground: true },
  { id: 'BG_05', label: 'EXT-05', type: 'ACCOUNT', x: 860, y: 140, isCluster: false, isBackground: true },
  { id: 'BG_06', label: 'EXT-06', type: 'ACCOUNT', x: 890, y: 330, isCluster: false, isBackground: true },
  { id: 'BG_07', label: 'EXT-07', type: 'CASHOUT', x: 880, y: 480, isCluster: false, isBackground: true },
  { id: 'BG_08', label: 'EXT-08', type: 'IP', x: 840, y: 610, isCluster: false, isBackground: true },
  { id: 'BG_09', label: 'EXT-09', type: 'ACCOUNT', x: 600, y: 570, isCluster: false, isBackground: true },
  { id: 'BG_10', label: 'EXT-10', type: 'ACCOUNT', x: 380, y: 580, isCluster: false, isBackground: true },
  { id: 'BG_11', label: 'EXT-11', type: 'TRANSACTION', x: 260, y: 610, isCluster: false, isBackground: true },
  { id: 'BG_12', label: 'EXT-12', type: 'ACCOUNT', x: 80, y: 420, isCluster: false, isBackground: true },
];

const DESKTOP_EDGES: GraphEdge[] = [
  // Cluster Internal Edges (linked to DEV_MULE_99 & IP)
  { id: 'e_c1', source: 'ACC_05026', target: 'DEV_MULE_99', isCluster: true, annotation: 'DEVICE_FINGERPRINT' },
  { id: 'e_c2', source: 'ACC_05001', target: 'DEV_MULE_99', isCluster: true },
  { id: 'e_c3', source: 'ACC_05002', target: 'DEV_MULE_99', isCluster: true },
  { id: 'e_c4', source: 'ACC_05008', target: 'DEV_MULE_99', isCluster: true },
  { id: 'e_c5', source: 'ACC_05016', target: 'DEV_MULE_99', isCluster: true },
  { id: 'e_c6', source: 'ACC_05030', target: 'DEV_MULE_99', isCluster: true },
  { id: 'e_c7', source: 'ACC_05026', target: 'IP_SUBNET_4', isCluster: true },
  { id: 'e_c8', source: 'ACC_05001', target: 'IP_SUBNET_4', isCluster: true },
  { id: 'e_c9', source: 'ACC_05008', target: 'ATM_CASHOUT', isCluster: true },
  { id: 'e_c10', source: 'ACC_05001', target: 'ACC_05002', isCluster: true },
  { id: 'e_c11', source: 'ACC_05001', target: 'ACC_05008', isCluster: true },

  // Inflow to Transit Edges
  { id: 'e_in1', source: 'SRC_1001', target: 'TX_L1_01', isCluster: false },
  { id: 'e_in2', source: 'TX_L1_01', target: 'ACC_05026', isCluster: false },
  { id: 'e_in3', source: 'SRC_1002', target: 'ACC_05026', isCluster: false },
  { id: 'e_in4', source: 'SRC_1003', target: 'ACC_05016', isCluster: false },
  { id: 'e_in5', source: 'SRC_1004', target: 'TX_L1_02', isCluster: false },
  { id: 'e_in6', source: 'TX_L1_02', target: 'ACC_05002', isCluster: false },
  { id: 'e_in7', source: 'SRC_1005', target: 'ACC_05002', isCluster: false },

  // Transit to Outflow Edges
  { id: 'e_out1', source: 'ACC_05001', target: 'TX_L2_01', isCluster: false },
  { id: 'e_out2', source: 'TX_L2_01', target: 'DEST_801', isCluster: false },
  { id: 'e_out3', source: 'TX_L2_01', target: 'DEST_802', isCluster: false },
  { id: 'e_out4', source: 'ACC_05030', target: 'TX_L2_02', isCluster: false },
  { id: 'e_out5', source: 'TX_L2_02', target: 'DEST_803', isCluster: false },
  { id: 'e_out6', source: 'ACC_05008', target: 'DEST_804', isCluster: false },

  // Background ambient edges
  { id: 'e_bg1', source: 'BG_01', target: 'SRC_1001', isCluster: false },
  { id: 'e_bg2', source: 'BG_03', target: 'TX_L1_01', isCluster: false },
  { id: 'e_bg3', source: 'BG_04', target: 'DEST_801', isCluster: false },
  { id: 'e_bg4', source: 'DEST_802', target: 'BG_05', isCluster: false },
  { id: 'e_bg5', source: 'DEST_803', target: 'BG_06', isCluster: false },
  { id: 'e_bg6', source: 'DEST_804', target: 'BG_07', isCluster: false },
  { id: 'e_bg7', source: 'DEST_804', target: 'BG_08', isCluster: false },
  { id: 'e_bg8', source: 'ACC_05002', target: 'BG_09', isCluster: false },
  { id: 'e_bg9', source: 'SRC_1005', target: 'BG_10', isCluster: false },
  { id: 'e_bg10', source: 'BG_10', target: 'BG_11', isCluster: false },
  { id: 'e_bg11', source: 'BG_12', target: 'SRC_1003', isCluster: false },
];

export interface HeroProps {
  onLaunch?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onLaunch }) => {
  const reducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Health check state for status pill (Truthfulness Rule 4)
  const [healthStatus, setHealthStatus] = useState<'LIVE' | 'ILLUSTRATIVE'>('ILLUSTRATIVE');
  const [isScrolledPast, setIsScrolledPast] = useState(false);

  // Parallax pointer offset
  const [pointerOffset, setPointerOffset] = useState({ x: 0, y: 0 });
  const targetOffsetRef = useRef({ x: 0, y: 0 });

  // Choreography elapsed time in seconds (0.0s to 9.0s+)
  const [timelineSec, setTimelineSec] = useState<number>(() => (reducedMotion ? 9.0 : 0));
  const [isTabVisible, setIsTabVisible] = useState(true);
  const [isInViewport, setIsInViewport] = useState(true);

  // Real backend health check probe
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/v1/health');
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data && data.status === 'ok') {
            setHealthStatus('LIVE');
          }
        }
      } catch {
        if (isMounted) setHealthStatus('ILLUSTRATIVE');
      }
    };
    checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Monitor tab visibility and scroll position
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    const handleScroll = () => {
      setIsScrolledPast(window.scrollY > 30);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Monitor viewport intersection
  useEffect(() => {
    if (!heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  // Pointer move for subtle +/-6px parallax (Rule 6: animate only transform & opacity)
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion || window.innerWidth <= 860) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    targetOffsetRef.current = {
      x: nx * 12, // max +/-6px
      y: ny * 12,
    };
  }, [reducedMotion]);

  // Single requestAnimationFrame Choreography Loop
  useEffect(() => {
    if (reducedMotion) {
      setTimelineSec(9.0);
      return;
    }

    const loop = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      if (isTabVisible && isInViewport) {
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        setTimelineSec(elapsed);

        // Smooth pointer parallax lerp
        setPointerOffset((prev) => ({
          x: prev.x + (targetOffsetRef.current.x - prev.x) * 0.06,
          y: prev.y + (targetOffsetRef.current.y - prev.y) * 0.06,
        }));
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isTabVisible, isInViewport, reducedMotion]);

  // Calculate cluster bounding hull for step 3.6-5.0s
  const clusterHullPoints = useMemo(() => {
    const cNodes = DESKTOP_NODES.filter((n) => n.isCluster);
    const minX = Math.min(...cNodes.map((n) => n.x)) - 32;
    const maxX = Math.max(...cNodes.map((n) => n.x)) + 32;
    const minY = Math.min(...cNodes.map((n) => n.y)) - 28;
    const maxY = Math.max(...cNodes.map((n) => n.y)) + 28;
    return { minX, minY, width: maxX - minX, height: maxY - minY };
  }, []);

  // Map nodes dictionary for fast edge coordinate lookup
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    DESKTOP_NODES.forEach((n) => map.set(n.id, n));
    return map;
  }, []);

  const handleLaunchClick = () => {
    if (onLaunch) {
      onLaunch();
    } else {
      window.location.href = '/workspace/ACC_05001';
    }
  };

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.querySelector('#approach') || document.querySelector('#workbench');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Choreography progression flags
  const t = reducedMotion ? 9.0 : timelineSec;
  const isHeadlineActive = t >= 0.0;
  const areNodesEntering = t >= 0.4;
  const areEdgesDrawing = t >= 2.0;
  const isClusterBrightening = t >= 3.6;
  const isClusterAmber = t >= 5.0;
  const isRiskCardVisible = t >= 6.4;
  const isIdle = t >= 8.0;

  return (
    <section
      ref={heroRef}
      className="mule-hero"
      id="main-content"
      tabIndex={-1}
      onMouseMove={handleMouseMove}
      aria-label="Hero Overview"
    >
      {/* ── Background Subtle Forensic Coordinate Grid ── */}
      <div
        className="hero-grid-bg"
        style={{
          opacity: reducedMotion ? 0.35 : Math.min(0.35, t * 0.45),
        }}
        aria-hidden="true"
      />

      <div className="hero-wrap">
        {/* ── Left Column (~40%): Headlines, Subcopy, CTAs ── */}
        <div className="hero-text-col">
          {/* Status Pill */}
          <div className="hero-status-pill">
            <span
              className={`status-indicator-dot ${healthStatus === 'LIVE' ? 'is-live' : 'is-mock'}`}
              aria-hidden="true"
            />
            <span className="status-pill-text mono">SYSTEM ONLINE</span>
            <ProvenanceLabel source={healthStatus} label={healthStatus} size="sm" />
          </div>

          {/* Masked Headline Lines (stagger 80ms, per-line only, never per-letter) */}
          <h1 className="hero-headline font-display">
            <span className="headline-mask">
              <span
                className={`headline-line ${isHeadlineActive ? 'is-in' : ''}`}
                style={{
                  transitionDelay: reducedMotion ? '0ms' : '0ms',
                }}
              >
                SEE THE MONEY TRAIL.
              </span>
            </span>
            <span className="headline-mask">
              <span
                className={`headline-line headline-dim ${isHeadlineActive ? 'is-in' : ''}`}
                style={{
                  transitionDelay: reducedMotion ? '0ms' : '80ms',
                }}
              >
                BEFORE IT <span className="headline-amber">DISAPPEARS.</span>
              </span>
            </span>
          </h1>

          {/* Subcopy */}
          <p
            className={`hero-subcopy ${isHeadlineActive ? 'is-in' : ''}`}
            style={{
              transitionDelay: reducedMotion ? '0ms' : '160ms',
            }}
          >
            Autonomous AML intelligence that detects hidden transaction patterns, traces connected
            entities, and explains why risk exists.
          </p>

          {/* CTAs */}
          <div
            className={`hero-ctas ${isHeadlineActive ? 'is-in' : ''}`}
            style={{
              transitionDelay: reducedMotion ? '0ms' : '240ms',
            }}
          >
            <button
              type="button"
              className="hero-primary-btn"
              onClick={handleLaunchClick}
            >
              <ShieldAlert size={16} aria-hidden="true" />
              <span>LAUNCH INVESTIGATION</span>
            </button>

            <a
              href="#approach"
              className="hero-secondary-btn"
              onClick={handleExploreClick}
            >
              <span>EXPLORE INTELLIGENCE</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </div>

          {/* Key Metric Telemetry Strip (Sample Data Tagged) */}
          <div className="hero-quick-stats">
            <div className="stat-unit">
              <span className="stat-num mono tabular-nums text-signal">₹4.24L</span>
              <span className="stat-label mono">CLUSTER FLOW</span>
            </div>
            <div className="stat-sep" aria-hidden="true" />
            <div className="stat-unit">
              <span className="stat-num mono tabular-nums">14 MIN</span>
              <span className="stat-label mono">PASS-THROUGH</span>
            </div>
            <div className="stat-sep" aria-hidden="true" />
            <div className="stat-unit">
              <span className="stat-num mono tabular-nums">6 ACCOUNTS</span>
              <span className="stat-label mono">LINKED DEVICE</span>
            </div>
          </div>
        </div>

        {/* ── Right Column (~60%): Bleeding Forensic Network ── */}
        <div
          className="hero-network-col"
          style={{
            transform: reducedMotion
              ? 'none'
              : `translate3d(${pointerOffset.x}px, ${pointerOffset.y}px, 0)`,
          }}
          role="img"
          aria-label="Forensic Multi-Hop Transaction Graph"
        >
          {/* Edge Annotations */}
          <div className="network-annotations mono" aria-hidden="true">
            <span className="anno-tag anno-top">NODE: DEV_MULE_99 · SHARED_DEVICE</span>
            <span className="anno-tag anno-right">TAINT_CUT: HALTS ₹3.99L</span>
            <span className="anno-tag anno-bottom">PATTERN: SYNTHETIC_CLUSTER_FAN</span>
          </div>

          <svg
            className="hero-network-svg"
            viewBox="0 0 920 700"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Subtle Linear Edge Gradient */}
              <linearGradient id="edgeGradDefault" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7C93B8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#7C93B8" stopOpacity="0.8" />
              </linearGradient>

              <linearGradient id="edgeGradAmber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF9F1C" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#FF9F1C" stopOpacity="0.95" />
              </linearGradient>

              {/* Edge Arrowhead Markers */}
              <marker
                id="arrow-default"
                viewBox="0 0 6 6"
                refX="14"
                refY="3"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#7C93B8" opacity="0.6" />
              </marker>

              <marker
                id="arrow-amber"
                viewBox="0 0 6 6"
                refX="14"
                refY="3"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#FF9F1C" opacity="0.9" />
              </marker>
            </defs>

            {/* Step 3.6-5.0s: Dashed Amber Cluster Convex Hull */}
            {isClusterBrightening && (
              <g
                className="cluster-hull-group"
                style={{
                  opacity: reducedMotion ? 1 : Math.min(1, (t - 3.6) / 0.8),
                }}
              >
                <rect
                  x={clusterHullPoints.minX}
                  y={clusterHullPoints.minY}
                  width={clusterHullPoints.width}
                  height={clusterHullPoints.height}
                  rx="16"
                  className="cluster-hull-rect"
                />
                <text
                  x={clusterHullPoints.minX + 16}
                  y={clusterHullPoints.minY + 20}
                  className="hull-label mono"
                >
                  CLUSTER IDENTIFIED: DEV_MULE_99 (6 ENTITIES)
                </text>
              </g>
            )}

            {/* Step 2.0-3.6s: Edges draw along direction via strokeDashoffset */}
            <g className="edges-group">
              {DESKTOP_EDGES.map((edge) => {
                const s = nodeMap.get(edge.source);
                const tgt = nodeMap.get(edge.target);
                if (!s || !tgt) return null;

                const dx = tgt.x - s.x;
                const dy = tgt.y - s.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Calculate edge opacity & progress based on choreographic phase
                let edgeOpacity = 0;
                let dashOffset = dist;

                if (reducedMotion) {
                  edgeOpacity = edge.isCluster ? 0.95 : 0.25;
                  dashOffset = 0;
                } else if (areEdgesDrawing) {
                  const edgeProgress = Math.min(1, Math.max(0, (t - 2.0) / 1.4));
                  dashOffset = dist * (1 - edgeProgress);

                  if (isClusterBrightening) {
                    edgeOpacity = edge.isCluster ? 0.95 : 0.25;
                  } else {
                    edgeOpacity = 0.6;
                  }
                }

                const isAmberEdge = isClusterBrightening && edge.isCluster;

                return (
                  <line
                    key={edge.id}
                    x1={s.x}
                    y1={s.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={isAmberEdge ? 'url(#edgeGradAmber)' : 'url(#edgeGradDefault)'}
                    strokeWidth={edge.isCluster ? 1.5 : 1.0}
                    strokeDasharray={dist}
                    strokeDashoffset={dashOffset}
                    strokeOpacity={edgeOpacity}
                    markerEnd={isAmberEdge ? 'url(#arrow-amber)' : 'url(#arrow-default)'}
                    className={`graph-edge ${isAmberEdge ? 'is-cluster-edge' : ''}`}
                  />
                );
              })}
            </g>

            {/* Step 0.4-2.0s: Staggered Nodes with distinct Entity Glyphs */}
            <g className="nodes-group">
              {DESKTOP_NODES.map((node, idx) => {
                // Calculate node entrance animation
                let nodeScale = 1;
                let nodeOpacity = 0;

                if (reducedMotion) {
                  nodeOpacity = node.isCluster ? 1 : 0.4;
                  nodeScale = node.isBackground ? 0.75 : 1;
                } else if (areNodesEntering) {
                  const nodeEntryStart = 0.4 + (idx % 8) * 0.12;
                  const nodeProgress = Math.min(1, Math.max(0, (t - nodeEntryStart) / 0.5));
                  nodeScale = 0.6 + 0.4 * nodeProgress;
                  if (node.isBackground) nodeScale *= 0.75;

                  if (isClusterBrightening) {
                    nodeOpacity = node.isCluster ? 1 : 0.25;
                  } else {
                    nodeOpacity = node.isBackground ? 0.35 : nodeProgress;
                  }
                }

                const isAmberNode = isClusterAmber && node.isCluster;
                const nodeStrokeColor = isAmberNode ? '#FF9F1C' : '#7C93B8';
                const nodeFillColor = isAmberNode ? 'rgba(255, 159, 28, 0.16)' : 'rgba(124, 147, 184, 0.12)';

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y}) scale(${nodeScale})`}
                    opacity={nodeOpacity}
                    className={`node-anchor ${node.isCluster ? 'is-cluster-node' : ''} ${
                      node.isSelected ? 'is-selected-node' : ''
                    }`}
                  >
                    {/* Step 5.0-6.4s: Selected node single pulse ring */}
                    {node.isSelected && (isClusterAmber || reducedMotion) && (
                      <circle
                        r={28}
                        className={`selected-pulse-ring ${reducedMotion ? 'is-static' : ''}`}
                      />
                    )}

                    {/* Glyphs: ACCOUNT (rounded square), TRANSACTION (diamond), DEVICE (notched rectangle), IP (hexagon), CASHOUT (outward arrow) */}
                    {node.type === 'ACCOUNT' && (
                      <rect
                        x="-10"
                        y="-10"
                        width="20"
                        height="20"
                        rx="4"
                        fill={nodeFillColor}
                        stroke={nodeStrokeColor}
                        strokeWidth="1.5"
                      />
                    )}

                    {node.type === 'TRANSACTION' && (
                      <polygon
                        points="0,-12 12,0 0,12 -12,0"
                        fill={nodeFillColor}
                        stroke={nodeStrokeColor}
                        strokeWidth="1.5"
                      />
                    )}

                    {node.type === 'DEVICE' && (
                      <g>
                        <rect
                          x="-8"
                          y="-13"
                          width="16"
                          height="26"
                          rx="3"
                          fill={nodeFillColor}
                          stroke={nodeStrokeColor}
                          strokeWidth="1.5"
                        />
                        <line
                          x1="-3"
                          y1="-8"
                          x2="3"
                          y2="-8"
                          stroke={nodeStrokeColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {node.type === 'IP' && (
                      <polygon
                        points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6"
                        fill={nodeFillColor}
                        stroke={nodeStrokeColor}
                        strokeWidth="1.5"
                      />
                    )}

                    {node.type === 'CASHOUT' && (
                      <g>
                        <path
                          d="M -3 -9 H -8 A 2 2 0 0 0 -10 -7 V 7 A 2 2 0 0 0 -8 9 H 6 A 2 2 0 0 0 8 7 V 2"
                          fill={nodeFillColor}
                          stroke={nodeStrokeColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <polyline
                          points="3 -9 9 -9 9 -3"
                          fill="none"
                          stroke={nodeStrokeColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <line
                          x1="0"
                          y1="0"
                          x2="9"
                          y2="-9"
                          stroke={nodeStrokeColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Node Text Label (Cluster entities get crisp labels) */}
                    {!node.isBackground && (
                      <text
                        x="0"
                        y={node.type === 'DEVICE' ? 24 : 20}
                        textAnchor="middle"
                        className="graph-node-label mono"
                        fill={isAmberNode ? '#F2EFE9' : '#A5A9B3'}
                      >
                        {node.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* ── Step 6.4-8.0s: Attached Risk Card ─────────── */}
          {(isRiskCardVisible || reducedMotion) && (
            <div
              className={`attached-risk-card ${reducedMotion ? 'is-static' : 'is-entering'}`}
              style={{
                left: '52%',
                top: '52%',
              }}
            >
              <div className="risk-card-header">
                <div className="header-left">
                  <Activity size={14} className="text-signal" aria-hidden="true" />
                  <span className="entity-type mono">DEVICE · SHARED HARDWARE</span>
                </div>
                <ProvenanceLabel source="SAMPLE" label="DEMO RUN" size="sm" />
              </div>

              <div className="risk-card-body">
                <div className="risk-entity-id mono">DEV_MULE_99</div>
                <div className="risk-stat-grid">
                  <div className="risk-stat-cell">
                    <span className="cell-label mono">LINKED ACCOUNTS</span>
                    <strong className="cell-val mono text-signal">6 ACCOUNTS</strong>
                  </div>
                  <div className="risk-stat-cell">
                    <span className="cell-label mono">ANOMALY SCORE</span>
                    <strong className="cell-val mono text-risk">RISK 88 / 100</strong>
                  </div>
                </div>
                <p className="risk-card-summary">
                  Account opened 14 days ago sharing physical hardware signature with 5 transit
                  accounts. 94% pass-through velocity within 14 min.
                </p>
              </div>

              <div className="risk-card-footer mono">
                <span>INTERVENTION: PRESERVES ₹3.99L</span>
                <span className="action-tag text-signal">RECOMMENDED DEBIT FREEZE →</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Scroll Cue (1px line with traveling amber dot, hidden after scroll) ── */}
      {!isScrolledPast && (
        <div className="hero-scroll-cue" aria-hidden="true">
          <span className="scroll-cue-text mono">SCROLL TO TRACE</span>
          <div className="scroll-cue-line">
            <span className={`scroll-cue-dot ${reducedMotion ? 'is-static' : ''}`} />
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;
