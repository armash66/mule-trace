import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, type Variants, useReducedMotion } from 'framer-motion';
import {
  ShieldAlert,
  ArrowRight,
  Eye,
  Network,
  Cpu,
  FileText,
  Play,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Search,
  Filter,
  Layers,
  HelpCircle,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ProblemSection } from '../components/ProblemSection';
import { ApproachSection } from '../components/ApproachSection';
import { FeatureTabs } from '../components/FeatureTabs';
import { AgentWorkbench } from '../components/AgentWorkbench';
import { CinematicScrollSection } from '../components/CinematicScrollSection';
import { XaiSection } from '../components/XaiSection';
import { SarSection } from '../components/SarSection';
import { CtaSection } from '../components/CtaSection';
import { useStore } from '../store/store';
import { useScrollReveal, usePageVisibility } from '../lib/useScrollReveal';
import './Landing.css';

/* ── Motion variants (transform + opacity only) ──────────── */

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fade + lift entrance used on section heads and cards */
const enterVariants: Variants = {
  hidden: REDUCED ? {} : { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.40, ease: [0.2, 0, 0, 1] as const },
  },
};

/** Staggered children wrapper */
const staggerParent: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.10 } },
};

/** Child item: fade + lift */
const staggerChild: Variants = {
  hidden: REDUCED ? {} : { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.36, ease: [0.2, 0, 0, 1] as const },
  },
};

/* ── Typologies & Patterns Data ─────────────────────────── */

const PATTERNS = [
  {
    name: 'Collect and Split',
    tag: 'STRUCTURING',
    copy: 'Multiple accounts funnel funds into a single hub, which immediately disperses them across fresh accounts to stay below reporting thresholds.',
    kind: 'split',
    metrics: '9 in → 4 out · 96% drained',
  },
  {
    name: 'Round Trip',
    tag: 'LAYERING',
    copy: 'Funds circulate through intermediary mule entities across banks before returning to an originator-controlled account.',
    kind: 'round',
    metrics: '3 hops · 0.04% fee retention',
  },
  {
    name: 'Quick Relay',
    tag: 'RAPID TRANSIT',
    copy: 'Transit accounts retain funds for less than 15 minutes, forwarding balances in rapid succession before KYC locks trigger.',
    kind: 'relay',
    metrics: '11 min velocity · 98% pass-through',
  },
  {
    name: 'Shared Device Cluster',
    tag: 'SYNTHETIC KYC',
    copy: 'Dozens of supposedly unrelated accounts authenticate from identical hardware fingerprints, IMEI hashes, or IP subnets.',
    kind: 'device',
    metrics: '1 Device ID → 6 Mule Accounts',
  },
];

/* ── SVG Pattern Diagrams ────────────────────────────────── */

const PatternDiagram: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === 'round') {
    return (
      <svg viewBox="0 0 160 84" aria-hidden="true" className="pattern-svg">
        <path className="pat-line" d="M50 18H110V66H50Z" strokeDasharray="3 3" />
        <circle className="pat-hot" cx="50" cy="18" r="6" />
        <circle className="pat-dot" cx="110" cy="18" r="4" />
        <circle className="pat-dot" cx="110" cy="66" r="4" />
        <circle className="pat-dot" cx="50" cy="66" r="4" />
        <text x="62" y="46" className="pat-txt">₹3.2L LOOP</text>
      </svg>
    );
  }
  if (kind === 'relay') {
    return (
      <svg viewBox="0 0 160 84" aria-hidden="true" className="pattern-svg">
        <path className="pat-line" d="M16 42H144" />
        <circle className="pat-hot" cx="16" cy="42" r="6" />
        {[48, 80, 112, 144].map((x) => (
          <circle className="pat-dot" key={x} cx={x} cy={42} r="4" />
        ))}
        <text x="42" y="64" className="pat-txt">11 MIN PASS-THROUGH</text>
      </svg>
    );
  }
  if (kind === 'device') {
    return (
      <svg viewBox="0 0 160 84" aria-hidden="true" className="pattern-svg">
        <rect x="58" y="26" width="44" height="32" rx="4" fill="none" stroke="var(--signal)" strokeWidth="1.5" />
        <path className="pat-line" d="M18 16L58 36M18 68L58 48M142 16L102 36M142 68L102 48" />
        {[[18, 16], [18, 68], [142, 16], [142, 68]].map(([cx, cy]) => (
          <circle className="pat-dot" key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
        ))}
        <text x="64" y="45" className="pat-txt">DEV-9014</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 84" aria-hidden="true" className="pattern-svg">
      <path className="pat-line" d="M12 16L74 42M12 42L74 42M12 68L74 42M74 42L148 16M74 42L148 42M74 42L148 68" />
      {[[12, 16], [12, 42], [12, 68], [148, 16], [148, 42], [148, 68]].map(([cx, cy]) => (
        <circle className="pat-dot" key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" />
      ))}
      <circle className="pat-hot" cx="74" cy="42" r="7" />
      <text x="56" y="66" className="pat-txt">ACC-7731 (HUB)</text>
    </svg>
  );
};

/* ── Main Landing Component ──────────────────────────────── */

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  /* Page visibility — pause CSS animations when tab is hidden */
  const pageVisible = usePageVisibility();

  /* Prefers-reduced-motion (Rule 7: show final static state) */
  const prefersReduced = useReducedMotion();
  const activeEnterVariants: Variants = prefersReduced
    ? {
        hidden: { opacity: 1, y: 0 },
        visible: { opacity: 1, y: 0, transition: { duration: 0 } },
      }
    : enterVariants;

  /* Scroll-reveal refs — each major section head / card group */
  const { ref: refProblem,  isInView: inProblem  } = useScrollReveal();
  const { ref: refApproach, isInView: inApproach } = useScrollReveal();
  const { ref: refFeatures, isInView: inFeatures } = useScrollReveal();
  const { ref: refWorkbench,isInView: inWorkbench} = useScrollReveal();
  const { ref: refForensic, isInView: inForensic } = useScrollReveal();
  const { ref: refXai,      isInView: inXai      } = useScrollReveal();
  const { ref: refCta,      isInView: inCta      } = useScrollReveal();

  /* State */
  const [activeTab, setActiveTab] = useState<'detect' | 'trace' | 'explain' | 'report'>('detect');
  const [isTabPaused, setIsTabPaused] = useState(false);
  const [tabProgress, setTabProgress] = useState(0);
  const [problemMode, setProblemMode] = useState<'transaction' | 'network'>('network');
  const [investigationStage, setInvestigationStage] = useState(4);
  const [selectedFactor, setSelectedFactor] = useState(0);
  const [agentQuery, setAgentQuery] = useState('Trace pass-through velocity for ACC-7731');
  const [isAgentExecuting, setIsAgentExecuting] = useState(false);
  const [agentStep, setAgentStep] = useState(4);
  const [isPresenterOpen, setIsPresenterOpen] = useState(false);
  const [copiedSar, setCopiedSar] = useState(false);

  /* Auto-advance Feature Tabs every 7s unless paused */
  useEffect(() => {
    if (isTabPaused) return;
    const interval = 50;
    const totalDuration = 7000;
    const timer = setInterval(() => {
      setTabProgress((prev) => {
        if (prev >= 100) {
          setActiveTab((cur) => {
            if (cur === 'detect') return 'trace';
            if (cur === 'trace') return 'explain';
            if (cur === 'explain') return 'report';
            return 'detect';
          });
          return 0;
        }
        return prev + (interval / totalDuration) * 100;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isTabPaused, activeTab]);

  /* Presenter Mode Hotkey 'P' */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'p' || e.key === 'P') {
        setIsPresenterOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTabClick = (tab: 'detect' | 'trace' | 'explain' | 'report') => {
    setActiveTab(tab);
    setTabProgress(0);
  };

  const handleRunAgent = (query: string) => {
    setAgentQuery(query);
    setIsAgentExecuting(true);
    setAgentStep(1);
    setTimeout(() => setAgentStep(2), 500);
    setTimeout(() => setAgentStep(3), 1100);
    setTimeout(() => setAgentStep(4), 1800);
    setTimeout(() => setIsAgentExecuting(false), 2200);
  };

  const handleCopySar = () => {
    navigator.clipboard.writeText(
      `SUSPICIOUS ACTIVITY REPORT (SAR DRAFT)\nSUBJECT: ACC-7731\nRISK SCORE: 94/100 (HIGH RISK)\nTYPOLOGY: High-Velocity Rapid Pass-Through & Synthetic Shared-Device Cluster\nFINDINGS: Account ACC-7731 received aggregate inward transfers of ₹4,80,000 from 9 separate originator accounts between 14:02 and 14:11 UTC. 96.2% of inward balance was dispersed to 4 outbound beneficiary accounts within 11 minutes of arrival.\nLINKED HARDWARE: Authentication shared with Device DEV-9014 (4 associated accounts).\nRECOMMENDED ACTION: Immediate account freeze under PMLA Section 12.`
    );
    setCopiedSar(true);
    setTimeout(() => setCopiedSar(false), 2500);
  };

  return (
    <main className={`god-landing${pageVisible ? '' : ' anim-paused'}`} id="top">
      {/* ── Story Rail (Floating right-hand side navigator) ── */}
      <nav className="story-rail" aria-label="Story Chapters">
        {[
          { href: '#top', label: '01 Hero', num: '01' },
          { href: '#problem', label: '02 Problem', num: '02' },
          { href: '#approach', label: '03 Approach', num: '03' },
          { href: '#features', label: '04 Features', num: '04' },
          { href: '#workbench', label: '05 Agent', num: '05' },
          { href: '#scroll', label: '06 Forensic', num: '06' },
          { href: '#xai', label: '07 XAI', num: '07' },
          { href: '#sar', label: '08 Action', num: '08' },
        ].map((item) => (
          <a key={item.href} href={item.href} className="story-rail-dot" title={item.label}>
            <span className="rail-label">{item.label}</span>
            <span className="rail-pip" />
          </a>
        ))}
      </nav>

      {/* ── Chapter 01: Top Navigation Bar ────────────────── */}
      <Navbar
        onLaunch={() => navigate('/workspace/ACC_05001')}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onOpenPresenter={() => setIsPresenterOpen(true)}
      />

      {/* ── Chapter 02: Cinematic Hero Section (Choreographed 9s Forensic Visual) ── */}
      <Hero onLaunch={() => navigate('/workspace/ACC_05001')} />

      {/* ── Chapter 03: Live Telemetry Ticker ─────────────── */}
      <section className="god-ticker" aria-label="System Telemetry Feed">
        <div className="ticker-track">
          {[...Array(2)].map((_, loopIdx) => (
            <div key={loopIdx} className="ticker-inner">
              <span className="ticker-item">
                <span className="ticker-dot live" />
                <span className="ticker-label mono">TRANSACTIONS ANALYZED:</span>
                <strong className="mono">10,482</strong>
                <span className="ticker-badge mono">RECORDED</span>
              </span>
              <span className="ticker-sep">/</span>
              <span className="ticker-item">
                <span className="ticker-dot live" />
                <span className="ticker-label mono">GRAPH ENGINE:</span>
                <strong className="mono">ONLINE (60 FPS)</strong>
              </span>
              <span className="ticker-sep">/</span>
              <span className="ticker-item">
                <span className="ticker-dot alert" />
                <span className="ticker-label mono">ACTIVE MULE RINGS:</span>
                <strong className="mono text-signal">4 IDENTIFIED</strong>
              </span>
              <span className="ticker-sep">/</span>
              <span className="ticker-item">
                <span className="ticker-dot live" />
                <span className="ticker-label mono">AGENT REASONING PLANNER:</span>
                <strong className="mono">READY</strong>
              </span>
              <span className="ticker-sep">/</span>
              <span className="ticker-item">
                <span className="ticker-dot" />
                <span className="ticker-label mono">CAPITAL PRESERVED:</span>
                <strong className="mono">₹4.1L</strong>
              </span>
              <span className="ticker-sep">/</span>
              <span className="ticker-item">
                <span className="ticker-dot live" />
                <span className="ticker-label mono">DETECTION LATENCY:</span>
                <strong className="mono">140ms</strong>
              </span>
              <span className="ticker-sep">/</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Chapter 04: The Problem (Asymmetric Layout, Two-Line Threshold Reveal, 1.2s Reveal Stage) ── */}
      <ProblemSection />

      {/* ── Chapter 05: The 4-Stage Approach Section (Horizontal Spine, Staggered Numerals, 1.2s Segment, NOT 4 cards) ── */}
      <ApproachSection
        activeTab={activeTab}
        onStageHover={(stageId) => setActiveTab(stageId)}
        onStageClick={(stageId) => handleTabClick(stageId)}
      />

      {/* ── Chapter 06: Feature Tabs (Interactive 4-in-1 Stage) ── */}
      <motion.section
        className="god-section"
        id="features"
        ref={refFeatures as any}
        variants={activeEnterVariants}
        initial={prefersReduced ? false : 'hidden'}
        animate={inFeatures ? 'visible' : 'hidden'}
      >
        <div className="god-wrap">
          <div className="section-head">
            <span className="head-kicker mono">04 · ARCHITECTURE</span>
            <h2 className="head-title serif">One platform. Complete AML clarity.</h2>
          </div>

          <FeatureTabs
            activeTab={activeTab}
            onTabChange={(tab) => handleTabClick(tab)}
          />
        </div>
      </motion.section>

      {/* ── Chapter 08: Agent Workbench ───────────────────── */}
      <motion.section
        className="god-section bg-surface"
        id="workbench"
        ref={refWorkbench as any}
        variants={activeEnterVariants}
        initial={prefersReduced ? false : 'hidden'}
        animate={inWorkbench ? 'visible' : 'hidden'}
      >
        <div className="god-wrap">
          <AgentWorkbench />
        </div>
      </motion.section>

      {/* ── Chapter 09: Cinematic Forensic Scroll (GSAP Pinned) ── */}
      <CinematicScrollSection />

      {/* ── Chapter 10: Explainable AI (XAI) ──────────────── */}
      <XaiSection pageVisible={pageVisible} />

      {/* ── Chapter 11: SAR Document Generation ────────────── */}
      <SarSection pageVisible={pageVisible} />

      {/* ── Chapter 12: Final CTA & System Footer ──────────── */}
      <CtaSection
        onOpenPresenter={() => setIsPresenterOpen(true)}
        pageVisible={pageVisible}
      />

      {/* ── Presenter Mode Drawer / Overlay (Hotkey: P) ──── */}
      {isPresenterOpen && (
        <div className="presenter-overlay" onClick={() => setIsPresenterOpen(false)}>
          <div className="presenter-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="presenter-head">
              <div className="mono title">
                <Sparkles size={14} className="text-signal" />
                <span>PRESENTER MODE — JUDGE PITCH GUIDE</span>
              </div>
              <button className="close-btn mono" onClick={() => setIsPresenterOpen(false)}>
                [ESC / CLOSE]
              </button>
            </div>

            <div className="presenter-body">
              <div className="pitch-route-card">
                <span className="mono route-tag">30-SECOND PITCH ROUTE</span>
                <h4 className="serif">The Rapid Hook</h4>
                <p>
                  1. Show Hero headline: "Follow stolen money before it disappears." <br />
                  2. Flip Problem toggle to Network View: "Standard systems see normal payments; we see the shared IMEI." <br />
                  3. Click 'Launch Live Investigation' to prove real graph traversal in under 15 seconds.
                </p>
              </div>

              <div className="pitch-route-card">
                <span className="mono route-tag">90-SECOND PITCH ROUTE</span>
                <h4 className="serif">The Compliance Defense</h4>
                <p>
                  1. Walk through the 4-step Pipeline Spine (Detect → Trace → Explain → Report). <br />
                  2. Demo the Agent Workbench: Run live reasoning query to showcase automated investigative heuristics. <br />
                  3. Open XAI breakdown: "Regulators require proof — here is the exact 4-factor mathematical attribution."
                </p>
              </div>

              <div className="pitch-route-card">
                <span className="mono route-tag">3-MINUTE COMPREHENSIVE ROUTE</span>
                <h4 className="serif">Full System Walkthrough</h4>
                <p>
                  1. Hero & Metrics → 2. Problem Paradox (Human vs Network) → 3. 4-in-1 Architecture Tabs → 4. Forensic Evidence Accumulation → 5. SAR Draft Export.
                </p>
              </div>
            </div>

            <div className="presenter-footer mono">
              <span>HOTKEY 'P' TOGGLES THIS GUIDE AT ANY TIME</span>
              <button className="primary-btn mono" onClick={() => setIsPresenterOpen(false)}>
                RESUME PRESENTATION
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
