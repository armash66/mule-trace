/**
 * ProvenanceBadge — §2.2 Truthfulness compliance.
 *
 * Every analytical claim on screen must carry one of four source labels:
 *   LIVE         — value comes from a live backend API response
 *   RECORDED     — value comes from a saved/seeded run
 *   SAMPLE       — value is hardcoded mock/fallback data
 *   ILLUSTRATIVE — value is derived, animated, or estimated
 *
 * Usage:
 *   <ProvenanceBadge source="live" />
 *   <ProvenanceBadge source="sample" label="Demo data" />
 *
 * The badge uses the `.prov[data-source]` classes defined in tokens.css.
 */

import React from 'react';

export type ProvenanceSource = 'live' | 'recorded' | 'sample' | 'illustrative';

interface ProvenanceBadgeProps {
  /** The data provenance category. */
  source: ProvenanceSource;
  /** Optional override label. Defaults to the source name in uppercase. */
  label?: string;
  /** Optional extra inline styles. */
  style?: React.CSSProperties;
  /** Optional className override. */
  className?: string;
}

const DEFAULT_LABELS: Record<ProvenanceSource, string> = {
  live: 'Live',
  recorded: 'Recorded',
  sample: 'Sample',
  illustrative: 'Illustrative',
};

export const ProvenanceBadge: React.FC<ProvenanceBadgeProps> = ({
  source,
  label,
  style,
  className,
}) => {
  return (
    <span
      className={`prov ${className || ''}`}
      data-source={source}
      title={`Data source: ${DEFAULT_LABELS[source]}`}
      style={style}
    >
      {label || DEFAULT_LABELS[source]}
    </span>
  );
};

/**
 * Helper hook to determine the provenance of data returned by the API client.
 * Since every api method catches errors and returns mock data, we can detect
 * whether the real backend responded by checking if the data matches the mock shape.
 *
 * For simple usage, components should just pass the source directly:
 *   - Use "live" when you know the backend is responding.
 *   - Use "sample" when using mock fallback.
 *   - Use "recorded" when displaying data from a saved run.
 *   - Use "illustrative" for derived/animated values.
 */
export function inferProvenance(hasBackend: boolean, isSeededRun?: boolean): ProvenanceSource {
  if (!hasBackend) return 'sample';
  if (isSeededRun) return 'recorded';
  return 'live';
}

export { ProvenanceLabel } from './ProvenanceLabel';
export type { ProvenanceKind, ProvenanceInput } from './ProvenanceLabel';
