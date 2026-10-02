import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import {
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Layers,
  Network,
  Smartphone,
  FileText,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import './CinematicScrollSection.css';

gsap.registerPlugin(ScrollTrigger);

interface StageData {
  stageNum: string;
  readout: string;
  kicker: string;
  heading: string;
  copy: string;
  card: {
    entityType: string;
    maskedId: string;
    relationship: string;
    activity: string;
    risk: string;
    badgeLabel: string;
    details: { label: string; value: string }[];
  };
}

const STAGES: StageData[] = [
  {
    stageNum: '01',
    readout: 'STAGE 01 / 06 · RAW TRANSACTION DATA',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 01',
    heading: 'It starts with a transaction.',
    copy: 'A single transfer of ₹45,000 is executed. Standard threshold-based banking rules see nothing abnormal—amounts under ₹50,000 bypass traditional regulatory alerts.',
    card: {
      entityType: 'TRANSACTION',
      maskedId: 'TX_70192',
      relationship: 'ACC_01094 ────► ACC_05001',
      activity: '₹45,000.00 via UPI · 10:14:00 UTC',
      risk: 'Normal retail volume (Sub-threshold)',
      badgeLabel: 'SAMPLE · INITIAL INFLOW',
      details: [
        { label: 'Amount', value: '₹45,000.00' },
        { label: 'Channel', value: 'Instant UPI' },
        { label: 'Rule Engine', value: 'Pass (Below ₹50K)' },
      ],
    },
  },
  {
    stageNum: '02',
    readout: 'STAGE 02 / 06 · RELATIONSHIPS APPEAR',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 02',
    heading: 'Every transaction has a counterpart.',
    copy: 'Within minutes, 11 separate accounts initiate rapid transfers into ACC_05001. Isolated retail logic sees 11 unrelated deposits; graph intelligence sees deliberate capital pooling.',
    card: {
      entityType: 'ACCOUNT NEXUS',
      maskedId: 'ACC_05001',
      relationship: '11 Inbound Accounts ────► Pooling Hub',
      activity: '₹4,24,089.49 Total · 18.5 min window',
      risk: 'Elevated pass-through velocity',
      badgeLabel: 'SAMPLE · AGGREGATION HUB',
      details: [
        { label: 'Counterparties', value: '11 distinct accounts' },
        { label: 'Time Window', value: '18.5 minutes' },
        { label: 'Total Inflow', value: '₹4,24,089.49' },
      ],
    },
  },
  {
    stageNum: '03',
    readout: 'STAGE 03 / 06 · ENTITY NETWORK FORMS',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 03',
    heading: 'And hardware. And networks.',
    copy: 'Non-financial telemetry exposes hidden bindings: all 11 accounts authenticate from identical Android IMEI hardware DEV_MULE_99 and a shared residential proxy subnet.',
    card: {
      entityType: 'HARDWARE DEVICE',
      maskedId: 'DEV_MULE_99',
      relationship: 'Hardware Binding · IMEI #3589...11',
      activity: '6 New Accounts Opened & Authenticated in 24h',
      risk: 'Synthetic identity collision',
      badgeLabel: 'SAMPLE · HARDWARE TELEMETRY',
      details: [
        { label: 'Device Model', value: 'DEV_MULE_99 (Android)' },
        { label: 'Account Multi-tenancy', value: '6 accounts' },
        { label: 'Geo-IP', value: 'Bangalore Proxy' },
      ],
    },
  },
  {
    stageNum: '04',
    readout: 'STAGE 04 / 06 · SUSPICIOUS PATTERN EMERGES',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 04',
    heading: 'Then the pattern shows itself.',
    copy: 'Structuring and pass-through fan-out triggers: 94.2% of pooled funds are drained across 6 fresh destination accounts in 14.2 minutes, retaining only a 5.8% liquidity buffer.',
    card: {
      entityType: 'MULE CLUSTER',
      maskedId: 'RING_FAN_1',
      relationship: 'ACC_05001 ────► 6 Downstream Mules',
      activity: '₹3,99,620.00 Layered to 6 Mules in 14.2m',
      risk: 'Structuring evasion signature',
      badgeLabel: 'SAMPLE · TYPOLOGY SIGNATURE',
      details: [
        { label: 'Typology', value: 'Fan-In / Fan-Out Hub' },
        { label: 'Pass-Through', value: '94.23% in 14.2 min' },
        { label: 'Drained Out', value: '₹3,99,620.00' },
      ],
    },
  },
  {
    stageNum: '05',
    readout: 'STAGE 05 / 06 · RISK SIGNAL APPEARS',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 05',
    heading: 'And it has a risk.',
    copy: 'GraphSAGE 2-hop topological embeddings and SHAP explainability reach mathematical certainty: Risk Score 96/100. Primary attribution: +0.38 forward velocity, +0.19 account age.',
    card: {
      entityType: 'RISK EVALUATION',
      maskedId: 'ACC_05001',
      relationship: 'Min-Cut Bottleneck Isolated',
      activity: 'SHAP: Velocity +0.38 · Age +0.19',
      risk: 'CRITICAL SCORE: 96 / 100 · TIER 1',
      badgeLabel: 'SAMPLE · SHAP AUDIT',
      details: [
        { label: 'GraphSAGE Score', value: '96 / 100' },
        { label: 'Risk Tier', value: 'Tier 1 Critical' },
        { label: 'Graph Density', value: '0.74 (Threshold 0.25)' },
      ],
    },
  },
  {
    stageNum: '06',
    readout: 'STAGE 06 / 06 · INVESTIGATION RESULT',
    kicker: '06 · EVIDENCE ACCUMULATION · STAGE 06',
    heading: 'Now you can explain it.',
    copy: 'Deterministic graph min-cut isolates ACC_05001 as the pivotal bottleneck. Evidence condenses into an actionable case file before cashout dissipation occurs at ATM endpoints.',
    card: {
      entityType: 'INVESTIGATION CASE',
      maskedId: 'CASE_FAN_1',
      relationship: 'Actionable Enforcement Packet',
      activity: '₹4,24,089.49 Stoppable Capital Preserved',
      risk: 'Confirmed Syndicate Conviction',
      badgeLabel: 'SAMPLE · ACTIONABLE CASE',
      details: [
        { label: 'Stoppable Volume', value: '₹4,24,089.49' },
        { label: 'Recommended Action', value: 'Debit-Freeze ACC_05001' },
        { label: 'Draft SAR', value: 'Compiled for FIU Review' },
      ],
    },
  },
];

export const CinematicScrollSection: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const pinWrapRef = useRef<HTMLDivElement>(null);

  // Lazy-loading: activate GSAP only when section is within ~1.5 viewports
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150% 0px 150% 0px' }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Call ScrollTrigger.refresh() once fonts are ready
  useEffect(() => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        ScrollTrigger.refresh();
      });
    }
  }, [isNear]);

  // GSAP + ScrollTrigger implementation
  useGSAP(
    () => {
      if (!isNear || !sectionRef.current || !pinWrapRef.current) return;

      const mm = gsap.matchMedia();

      // ─────────────────────────────────────────────────────────────
      // 1. DESKTOP (500vh pin, 3 layers, blur + scale + opacity, 1-3px counter drift)
      // ─────────────────────────────────────────────────────────────
      mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.deck-card');
        const readouts = gsap.utils.toArray<HTMLElement>('.deck-readout-item');
        const headings = gsap.utils.toArray<HTMLElement>('.deck-text-stage');
        const edgePaths = gsap.utils.toArray<SVGPathElement>('.cinematic-edge');
        const total = STAGES.length;

        // Set initial states
        cards.forEach((card, idx) => {
          if (idx === 0) {
            gsap.set(card, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', zIndex: 10 });
          } else {
            gsap.set(card, {
              opacity: 0,
              scale: 0.88 - idx * 0.03,
              y: 40 + idx * 14,
              filter: 'blur(6px)',
              zIndex: 10 - idx,
            });
          }
        });

        readouts.forEach((ro, idx) => {
          gsap.set(ro, { opacity: idx === 0 ? 1 : 0 });
        });

        headings.forEach((hd, idx) => {
          gsap.set(hd, { opacity: idx === 0 ? 1 : 0, y: idx === 0 ? 0 : 20 });
        });

        // Set initial SVG edge dashoffsets
        edgePaths.forEach((p, idx) => {
          const len = p.getTotalLength ? p.getTotalLength() : 300;
          gsap.set(p, { strokeDasharray: len, strokeDashoffset: idx === 0 ? 0 : len });
        });

        // Master Timeline pinned for 500vh (desktop: 5 * window.innerHeight)
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: pinWrapRef.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * 5}`,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        // Transition through each stage
        for (let i = 0; i < total - 1; i++) {
          const stepTime = i * 1.0;

          // 1. Edge draws ahead of node fade
          if (edgePaths[i + 1]) {
            tl.to(
              edgePaths[i + 1],
              {
                strokeDashoffset: 0,
                duration: 0.35,
                ease: 'power1.out',
              },
              stepTime + 0.05
            );
          }

          // 2. Old foreground pushes back (scale down, blur up, opacity down)
          tl.to(
            cards[i],
            {
              scale: 0.90,
              y: -24,
              opacity: 0.22,
              filter: 'blur(4px)',
              zIndex: 5,
              duration: 0.7,
              ease: 'power2.inOut',
            },
            stepTime + 0.15
          );

          // 3. New foreground card advances (scale 1.0, blur 0, opacity 1)
          tl.to(
            cards[i + 1],
            {
              scale: 1.0,
              y: 0,
              opacity: 1,
              filter: 'blur(0px)',
              zIndex: 12,
              duration: 0.7,
              ease: 'power2.out',
            },
            stepTime + 0.15
          );

          // 4. Card label / details trail by 80-120ms
          const labels = cards[i + 1].querySelectorAll('.trail-label');
          if (labels.length) {
            tl.fromTo(
              labels,
              { opacity: 0, y: 6 },
              { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: 'power1.out' },
              stepTime + 0.25
            );
          }

          // 5. Readout and Heading updates
          tl.to(readouts[i], { opacity: 0, duration: 0.3 }, stepTime + 0.1);
          tl.to(readouts[i + 1], { opacity: 1, duration: 0.3 }, stepTime + 0.2);

          tl.to(headings[i], { opacity: 0, y: -16, duration: 0.3 }, stepTime + 0.1);
          tl.to(headings[i + 1], { opacity: 1, y: 0, duration: 0.4 }, stepTime + 0.25);
        }

        // Parallax counter-drift between layers (1-3px drift across scroll)
        tl.to(
          '.deck-background-grid',
          { y: -18, ease: 'none', duration: total - 1 },
          0
        );
        tl.to(
          '.deck-cards-column',
          { x: 3, y: -6, ease: 'none', duration: total - 1 },
          0
        );

        // Progress bar rail indicator
        tl.to(
          '.deck-rail-fill',
          { height: '100%', ease: 'none', duration: total - 1 },
          0
        );
      });

      // ─────────────────────────────────────────────────────────────
      // 2. MOBILE (300vh pin, 2 layers max, no blur, scale + opacity only)
      // ─────────────────────────────────────────────────────────────
      mm.add('(max-width: 860px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.deck-card');
        const readouts = gsap.utils.toArray<HTMLElement>('.deck-readout-item');
        const headings = gsap.utils.toArray<HTMLElement>('.deck-text-stage');
        const total = STAGES.length;

        cards.forEach((card, idx) => {
          gsap.set(card, {
            opacity: idx === 0 ? 1 : 0,
            scale: idx === 0 ? 1 : 0.94,
            filter: 'none', // No blur on mobile
            zIndex: idx === 0 ? 5 : 1,
          });
        });

        readouts.forEach((ro, idx) => gsap.set(ro, { opacity: idx === 0 ? 1 : 0 }));
        headings.forEach((hd, idx) => gsap.set(hd, { opacity: idx === 0 ? 1 : 0 }));

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            pin: pinWrapRef.current,
            start: 'top top',
            end: () => `+=${window.innerHeight * 3}`,
            scrub: 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });

        for (let i = 0; i < total - 1; i++) {
          const stepTime = i * 1.0;

          // Old card fades out
          tl.to(
            cards[i],
            { opacity: 0, scale: 0.92, duration: 0.5, ease: 'power2.inOut' },
            stepTime + 0.1
          );

          // Next card fades in (max 2 visible momentarily)
          tl.to(
            cards[i + 1],
            { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
            stepTime + 0.2
          );

          tl.to(readouts[i], { opacity: 0, duration: 0.25 }, stepTime + 0.1);
          tl.to(readouts[i + 1], { opacity: 1, duration: 0.25 }, stepTime + 0.2);

          tl.to(headings[i], { opacity: 0, duration: 0.25 }, stepTime + 0.1);
          tl.to(headings[i + 1], { opacity: 1, duration: 0.25 }, stepTime + 0.2);
        }
      });

      // ─────────────────────────────────────────────────────────────
      // 3. REDUCED MOTION (No pin, stacked static panels)
      // ─────────────────────────────────────────────────────────────
      mm.add('(prefers-reduced-motion: reduce)', () => {
        // Nothing to animate: static panels will be styled via CSS
      });

      return () => mm.revert();
    },
    { dependencies: [isNear], scope: sectionRef }
  );

  return (
    <section className="cinematic-section" id="scroll" ref={sectionRef}>
      {/* ── Pinned Scene Viewport ─────────────────────────────── */}
      <div className="cinematic-pin-wrap" ref={pinWrapRef}>
        {/* Background Layer: Dim Parallax Ambient Grid & SVG Edges */}
        <div className="deck-background-grid" aria-hidden="true">
          <svg className="deck-svg-layer" viewBox="0 0 1200 700" preserveAspectRatio="none">
            {/* Stage 1 -> 2 Edge */}
            <path
              className="cinematic-edge edge-1"
              d="M 280 220 C 440 220, 520 280, 680 320"
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth="1.5"
            />
            {/* Stage 2 -> 3 Edge */}
            <path
              className="cinematic-edge edge-2"
              d="M 680 320 C 780 340, 840 260, 920 220"
              fill="none"
              stroke="var(--data)"
              strokeWidth="1.5"
            />
            {/* Stage 3 -> 4 Edge */}
            <path
              className="cinematic-edge edge-3"
              d="M 920 220 C 820 420, 580 460, 480 500"
              fill="none"
              stroke="var(--signal)"
              strokeWidth="2"
            />
            {/* Stage 4 -> 5 Edge */}
            <path
              className="cinematic-edge edge-4"
              d="M 480 500 C 600 520, 720 480, 800 380"
              fill="none"
              stroke="var(--risk)"
              strokeWidth="2.5"
            />
            {/* Stage 5 -> 6 Edge */}
            <path
              className="cinematic-edge edge-5"
              d="M 800 380 C 660 380, 560 300, 420 240"
              fill="none"
              stroke="var(--ok)"
              strokeWidth="2"
            />
          </svg>
        </div>

        <div className="god-wrap deck-wrap">
          {/* Top Corner Readout HUD */}
          <div className="deck-corner-readout mono">
            {STAGES.map((s, idx) => (
              <div key={`ro-${idx}`} className={`deck-readout-item ${idx === 0 ? 'initial-active' : ''}`}>
                <span className="ro-dot" />
                <span className="ro-text">{s.readout}</span>
              </div>
            ))}
          </div>

          <div className="deck-main-layout">
            {/* Left Column: Stage Text (Headline + Copy + Dynamic CTAs on Stage 6) */}
            <div className="deck-text-column">
              {STAGES.map((s, idx) => (
                <div key={`txt-${idx}`} className={`deck-text-stage ${idx === 0 ? 'initial-active' : ''}`}>
                  <span className="mono stage-kicker">{s.kicker}</span>
                  <h2 className="serif stage-heading">"{s.heading}"</h2>
                  <p className="stage-copy">{s.copy}</p>

                  {idx === 5 && (
                    <div className="stage-6-cta-group">
                      <a href="#xai" className="primary-btn stage-cta-btn">
                        <span>Why was this flagged</span>
                        <ArrowRight size={13} />
                      </a>
                      <button
                        className="ghost-btn stage-cta-btn"
                        onClick={() => navigate('/workspace/ACC_05001')}
                      >
                        <span>Open this in the app</span>
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Center/Right Column: 3D Layered Evidence Cards Deck */}
            <div className="deck-cards-column">
              <div className="cards-stack-container">
                {STAGES.map((s, idx) => (
                  <div
                    key={`card-${idx}`}
                    className={`deck-card card-stage-${idx} ${idx === 0 ? 'initial-front' : ''}`}
                  >
                    {/* Corner Ticks (Hairline + 4 Corner Notches) */}
                    <span className="corner-tick tick-tl" />
                    <span className="corner-tick tick-tr" />
                    <span className="corner-tick tick-bl" />
                    <span className="corner-tick tick-br" />

                    {/* Card Head: Entity Type + Masked ID + Provenance Badge */}
                    <div className="card-top-bar mono">
                      <div className="card-type-group">
                        {idx === 0 && <Clock size={12} className="text-signal" />}
                        {idx === 1 && <Network size={12} className="text-signal" />}
                        {idx === 2 && <Smartphone size={12} className="text-data" />}
                        {idx === 3 && <Layers size={12} className="text-signal" />}
                        {idx === 4 && <AlertTriangle size={12} className="text-risk" />}
                        {idx === 5 && <ShieldAlert size={12} className="text-ok" />}
                        <span className="card-entity-type">{s.card.entityType}</span>
                        <span className="card-sep">·</span>
                        <span className="card-masked-id">{s.card.maskedId}</span>
                      </div>
                      <ProvenanceBadge source="sample" label={s.card.badgeLabel} />
                    </div>

                    {/* Card Relationship & Activity */}
                    <div className="card-body">
                      <div className="card-rel-row mono">
                        <span className="rel-label">RELATIONSHIP</span>
                        <span className="rel-val trail-label">{s.card.relationship}</span>
                      </div>

                      <div className="card-act-row">
                        <span className="mono act-label">ACTIVITY</span>
                        <span className="serif act-val trail-label">{s.card.activity}</span>
                      </div>

                      {/* Detail Metrics */}
                      <div className="card-metrics-grid mono">
                        {s.card.details.map((d, dIdx) => (
                          <div key={dIdx} className="metric-box trail-label">
                            <span className="m-label">{d.label}</span>
                            <span className="m-val">{d.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Card Risk Row */}
                      <div className="card-risk-row mono">
                        <span className="risk-label">RISK VERDICT</span>
                        <span
                          className={`risk-val trail-label ${
                            idx >= 4 ? 'text-risk' : idx === 3 ? 'text-signal' : 'text-text-1'
                          }`}
                        >
                          {s.card.risk}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Far Right: Vertical Progress Rail */}
            <div className="deck-rail-column mono" aria-hidden="true">
              <div className="rail-counter-top">01</div>
              <div className="deck-rail-track">
                <div className="deck-rail-fill" />
              </div>
              <div className="rail-counter-bottom">06</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reduced Motion Fallback: Stacked Static Panels ──── */}
      <div className="cinematic-reduced-motion-fallback god-wrap">
        <div className="section-head">
          <span className="head-kicker mono">06 · EVIDENCE ACCUMULATION</span>
          <h2 className="head-title serif">Six stages of an unmasked heist.</h2>
          <p className="head-sub">
            Watch how evidence accumulates from a single ordinary transfer into an undeniable syndicate conviction.
          </p>
        </div>

        <div className="reduced-panels-list">
          {STAGES.map((s, idx) => (
            <div key={`red-${idx}`} className="reduced-panel">
              <div className="panel-left">
                <span className="mono panel-kicker">{s.kicker}</span>
                <h3 className="serif panel-heading">"{s.heading}"</h3>
                <p className="panel-copy">{s.copy}</p>

                {idx === 5 && (
                  <div className="stage-6-cta-group">
                    <a href="#xai" className="primary-btn stage-cta-btn">
                      <span>Why was this flagged</span>
                      <ArrowRight size={13} />
                    </a>
                    <button
                      className="ghost-btn stage-cta-btn"
                      onClick={() => navigate('/workspace/ACC_05001')}
                    >
                      <span>Open this in the app</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                )}
              </div>

              <div className="panel-right">
                <div className="deck-card static-card">
                  <span className="corner-tick tick-tl" />
                  <span className="corner-tick tick-tr" />
                  <span className="corner-tick tick-bl" />
                  <span className="corner-tick tick-br" />

                  <div className="card-top-bar mono">
                    <span className="card-entity-type">{s.card.entityType}</span>
                    <span className="card-sep">·</span>
                    <span className="card-masked-id">{s.card.maskedId}</span>
                    <ProvenanceBadge source="sample" label={s.card.badgeLabel} />
                  </div>

                  <div className="card-body">
                    <div className="card-rel-row mono">
                      <span className="rel-label">RELATIONSHIP</span>
                      <span className="rel-val">{s.card.relationship}</span>
                    </div>
                    <div className="card-act-row">
                      <span className="mono act-label">ACTIVITY</span>
                      <span className="serif act-val">{s.card.activity}</span>
                    </div>
                    <div className="card-risk-row mono">
                      <span className="risk-label">RISK</span>
                      <span className="risk-val text-signal">{s.card.risk}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
