import React from 'react';

export interface HonestyProps {
  source?: string;
  isEstimate?: boolean;
  label?: string;
  children?: React.ReactNode;
}

export const HonestyBadge: React.FC<HonestyProps> = ({
  source = 'ESTIMATE',
  isEstimate = true,
  children,
}) => {
  return (
    <span className={`tag-truth ${isEstimate ? 'estimate' : 'proven'}`}>
      {children || source}
    </span>
  );
};

export const ProvenanceNotice: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="provenance-notice mono" style={{ fontSize: '11px', color: 'var(--text-2)' }}>
      {text || 'Derived from graph heuristic propagation.'}
    </div>
  );
};

export default HonestyBadge;
