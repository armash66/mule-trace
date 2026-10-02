import React, { useState, useRef, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { usePageVisibility } from '../lib/useScrollReveal';
import './ApproachSection.css';

export type StageId = 'detect' | 'trace' | 'explain' | 'report';

interface ApproachStage {
  id: StageId;
  num: '01' | '02' | '03' | '04';
  name: 'Detect' | 'Trace' | 'Explain' | 'Report';
  copy: string;
  yStagger: number; // Vertical offset on desktop for rhythm
  fillDelay: number; // Staggered fill timing over 1.2s
}

const STAGES: ApproachStage[] = [
  {
    id: 'detect',
    num: '01',
    name: 'Detect',
    copy: 'surface suspicious behaviour.',
    yStagger: 0,
    fillDelay: 0.15,
  },
  {
    id: 'trace',
    num: '02',
    name: 'Trace',
    copy: 'follow entities and money.',
    yStagger: 42,
    fillDelay: 0.45,
  },
  {
    id: 'explain',
    num: '03',
    name: 'Explain',
    copy: 'show the evidence behind the risk.',
    yStagger: -18,
    fillDelay: 0.75,
  },
  {
    id: 'report',
    num: '04',
    name: 'Report',
    copy: 'turn the investigation into a SAR draft.',
    yStagger: 32,
    fillDelay: 1.05,
  },
];

export interface ApproachSectionProps {
  activeTab?: StageId;
  onStageHover?: (stageId: StageId) => void;
  onStageClick?: (stageId: StageId) => void;
}

export const ApproachSection: React.FC<ApproachSectionProps> = ({
  activeTab = 'detect',
  onStageHover,
  onStageClick,
}) => {
  const prefersReduced = useReducedMotion();
  const pageVisible = usePageVisibility();

  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, {
    amount: 0.2,
    once: true,
  });

  const [hoveredStage, setHoveredStage] = useState<StageId | null>(null);

  const handleStageSelect = (stageId: StageId) => {
    onStageClick?.(stageId);
    // Smoothly scroll to the matching features section
    const featuresElement = document.getElementById('features');
    if (featuresElement) {
      featuresElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleMouseEnter = (stageId: StageId) => {
    setHoveredStage(stageId);
    onStageHover?.(stageId);
  };

  const handleMouseLeave = () => {
    setHoveredStage(null);
  };

  return (
    <section
      ref={sectionRef}
      id="approach"
      className={`approach-section ${pageVisible ? '' : 'anim-paused'}`}
      aria-label="Four-stage investigation pipeline: Detect, Trace, Explain, Report"
    >
      <div className="approach-wrap">
        {/* Section Header */}
        <div className="approach-header">
          <div className="approach-kicker mono">
            <span className="kicker-num">03</span>
            <span className="kicker-sep">/</span>
            <span className="kicker-label">THE 4-STAGE PIPELINE</span>
          </div>
          <h2 className="approach-title serif">
            Detect. Trace. Explain. Report.
          </h2>
          <p className="approach-desc">
            Continuous evidentiary progression from initial pattern collision to an audit-ready Suspicious Activity Report.
          </p>
        </div>

        {/* ── The 4-Stage Spine Stage (NOT 4 cards) ── */}
        <div className="approach-spine-container">
          {/* 1. Horizontal Spine Track & Travelling Bright Segment */}
          <div className="spine-track-line" aria-hidden="true">
            {/* Background base hairline track */}
            <div className="spine-base-line" />

            {/* Bright segment travelling stage-to-stage over ~1.2s on viewport entry */}
            <motion.div
              className="spine-bright-segment"
              initial={prefersReduced ? { scaleX: 1, opacity: 1 } : { scaleX: 0, opacity: 0 }}
              animate={
                prefersReduced
                  ? { scaleX: 1, opacity: 1 }
                  : isInView
                  ? { scaleX: 1, opacity: 1 }
                  : { scaleX: 0, opacity: 0 }
              }
              transition={{
                duration: prefersReduced ? 0 : 1.2,
                ease: [0.16, 1, 0.3, 1],
              }}
            />
          </div>

          {/* 2. Four Open Stages with Staggered Numerals */}
          <div className="spine-stages-list" role="list">
            {STAGES.map((stage) => {
              const isTargetActive = activeTab === stage.id || hoveredStage === stage.id;

              return (
                <div
                  key={stage.id}
                  role="listitem"
                  className={`spine-stage-item ${isTargetActive ? 'is-active-target' : ''}`}
                  style={{
                    '--desktop-y': `${stage.yStagger}px`,
                  } as React.CSSProperties}
                >
                  <button
                    type="button"
                    className="stage-interaction-target"
                    onClick={() => handleStageSelect(stage.id)}
                    onMouseEnter={() => handleMouseEnter(stage.id)}
                    onMouseLeave={handleMouseLeave}
                    onFocus={() => handleMouseEnter(stage.id)}
                    onBlur={handleMouseLeave}
                    aria-label={`${stage.name}: ${stage.copy}. Jump to ${stage.name} platform feature`}
                  >
                    {/* Spine Node Pip & Vertical Anchor */}
                    <div className="stage-spine-anchor" aria-hidden="true">
                      <motion.div
                        className="anchor-pip"
                        initial={prefersReduced ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                        animate={
                          prefersReduced
                            ? { scale: 1, opacity: 1 }
                            : isInView
                            ? { scale: 1, opacity: 1 }
                            : { scale: 0, opacity: 0 }
                        }
                        transition={{
                          duration: prefersReduced ? 0 : 0.35,
                          delay: prefersReduced ? 0 : stage.fillDelay,
                        }}
                      />
                      <div className="anchor-drop-line" />
                    </div>

                    {/* Huge Outlined Numeral (Fills solid as the segment passes) */}
                    <div className="numeral-wrapper">
                      {/* Outlined Base Layer (-webkit-text-stroke: 1px var(--line-strong)) */}
                      <span className="numeral-outline" aria-hidden="true">
                        {stage.num}
                      </span>

                      {/* Solid Fill Layer (Fills as bright segment passes) */}
                      <motion.span
                        className="numeral-solid"
                        aria-hidden="true"
                        initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
                        animate={
                          prefersReduced
                            ? { opacity: 1 }
                            : isInView
                            ? { opacity: 1 }
                            : { opacity: 0 }
                        }
                        transition={{
                          duration: prefersReduced ? 0 : 0.45,
                          delay: prefersReduced ? 0 : stage.fillDelay,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                      >
                        {stage.num}
                      </motion.span>
                    </div>

                    {/* Stage Title and Exact Specified Copy */}
                    <div className="stage-content">
                      <div className="stage-title-row">
                        <h3 className="stage-name serif">
                          {stage.name}
                        </h3>
                        <ArrowUpRight size={14} className="stage-arrow-icon" aria-hidden="true" />
                      </div>

                      <p className="stage-copy mono">
                        <span className="copy-operator">=</span> {stage.copy}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interaction Hint Footer */}
        <div className="approach-footer-hint mono">
          <span className="hint-indicator" />
          <span className="hint-text">
            HOVER TO PREVIEW · CLICK TO ACTIVATE IN ARCHITECTURE STAGE
          </span>
        </div>
      </div>
    </section>
  );
};
