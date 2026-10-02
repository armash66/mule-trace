import React from 'react';

export type ProvenanceKind = 'LIVE' | 'RECORDED' | 'SAMPLE' | 'ILLUSTRATIVE';
export type ProvenanceInput = ProvenanceKind | 'live' | 'recorded' | 'sample' | 'illustrative';

export interface ProvenanceLabelProps {
  /** The data provenance classification: LIVE, RECORDED, SAMPLE, or ILLUSTRATIVE */
  source: ProvenanceInput;
  /** Optional custom display text. Defaults to the uppercase category name */
  label?: string;
  /** Whether to show a pulse/status dot. Defaults to true */
  showDot?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional custom class names */
  className?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

const META: Record<ProvenanceKind, { color: string; bg: string; border: string; desc: string }> = {
  LIVE: {
    color: 'var(--ok, #34D399)',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.35)',
    desc: 'Real backend data stream',
  },
  RECORDED: {
    color: 'var(--data, #7C93B8)',
    bg: 'rgba(124, 147, 184, 0.12)',
    border: 'rgba(124, 147, 184, 0.35)',
    desc: 'Replay of a real transaction run',
  },
  SAMPLE: {
    color: 'var(--signal, #FF9F1C)',
    bg: 'rgba(255, 159, 28, 0.12)',
    border: 'rgba(255, 159, 28, 0.35)',
    desc: "Repository's own demo data",
  },
  ILLUSTRATIVE: {
    color: 'var(--text-1, #A5A9B3)',
    bg: 'var(--bg-2, #12151B)',
    border: 'var(--line, #232833)',
    desc: 'Concept diagram or animated model only',
  },
};

export const ProvenanceLabel: React.FC<ProvenanceLabelProps> = ({
  source,
  label,
  showDot = true,
  size = 'sm',
  className = '',
  style,
}) => {
  const normSource = (typeof source === 'string' ? source.toUpperCase() : 'SAMPLE') as ProvenanceKind;
  const meta = META[normSource] || META.SAMPLE;
  const isSm = size === 'sm';

  return (
    <span
      className={`provenance-label ${className}`}
      data-source={normSource.toLowerCase()}
      role="status"
      title={`${normSource}: ${meta.desc}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '5px' : '7px',
        padding: isSm ? '2px 7px' : '3px 9px',
        fontSize: isSm ? '10px' : '11px',
        fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 500,
        letterSpacing: '0.08em',
        lineHeight: 1,
        textTransform: 'uppercase',
        color: meta.color,
        backgroundColor: meta.bg,
        border: `1px solid ${meta.border}`,
        borderRadius: 'var(--radius-6, 6px)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ...style,
      }}
    >
      {showDot && (
        <span
          aria-hidden="true"
          style={{
            width: isSm ? '5px' : '6px',
            height: isSm ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: meta.color,
            boxShadow: normSource === 'LIVE' ? '0 0 6px var(--ok, #34D399)' : 'none',
            display: 'inline-block',
          }}
        />
      )}
      <span>{label || normSource}</span>
    </span>
  );
};

export default ProvenanceLabel;
