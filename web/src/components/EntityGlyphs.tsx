import React from 'react';

export type EntityType = 'ACCOUNT' | 'TRANSACTION' | 'DEVICE' | 'IP' | 'CASHOUT';

export interface GlyphProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

/**
 * ACCOUNT glyph: rounded square (1.5px stroke)
 */
export const AccountGlyph: React.FC<GlyphProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`glyph glyph-account ${className}`}
    aria-label="Account Entity"
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="14"
      height="14"
      rx="3.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * TRANSACTION glyph: diamond (1.5px stroke)
 */
export const TransactionGlyph: React.FC<GlyphProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`glyph glyph-transaction ${className}`}
    aria-label="Transaction Entity"
    {...props}
  >
    <polygon
      points="10,2.5 17.5,10 10,17.5 2.5,10"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * DEVICE glyph: rectangle with top notch (1.5px stroke)
 */
export const DeviceGlyph: React.FC<GlyphProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`glyph glyph-device ${className}`}
    aria-label="Device Entity"
    {...props}
  >
    {/* Body rectangle */}
    <rect
      x="4.5"
      y="2.5"
      width="11"
      height="15"
      rx="2.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Top speaker notch */}
    <line
      x1="8"
      y1="4.5"
      x2="12"
      y2="4.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * IP glyph: regular hexagon (1.5px stroke)
 */
export const IpGlyph: React.FC<GlyphProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`glyph glyph-ip ${className}`}
    aria-label="IP Address Entity"
    {...props}
  >
    <polygon
      points="10,2.5 16.5,6.25 16.5,13.75 10,17.5 3.5,13.75 3.5,6.25"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * CASHOUT glyph: square with outward exit arrow (1.5px stroke)
 */
export const CashoutGlyph: React.FC<GlyphProps> = ({
  size = 18,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`glyph glyph-cashout ${className}`}
    aria-label="Cash-Out Exit Entity"
    {...props}
  >
    {/* Square base with open top-right for exit */}
    <path
      d="M11 3.5H5.5A2 2 0 0 0 3.5 5.5V14.5A2 2 0 0 0 5.5 16.5H14.5A2 2 0 0 0 16.5 14.5V9"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Outward arrow pointing up-right */}
    <polyline
      points="11.5 3.5 16.5 3.5 16.5 8.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="8.5"
      y1="11.5"
      x2="16.5"
      y2="3.5"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Unified EntityGlyph component dispatching by entity type
 */
export interface EntityGlyphProps extends GlyphProps {
  type: EntityType | 'account' | 'transaction' | 'device' | 'ip' | 'cashout';
}

export const EntityGlyph: React.FC<EntityGlyphProps> = ({ type, ...props }) => {
  const norm = (type.toUpperCase() as EntityType);
  switch (norm) {
    case 'ACCOUNT':
      return <AccountGlyph {...props} />;
    case 'TRANSACTION':
      return <TransactionGlyph {...props} />;
    case 'DEVICE':
      return <DeviceGlyph {...props} />;
    case 'IP':
      return <IpGlyph {...props} />;
    case 'CASHOUT':
      return <CashoutGlyph {...props} />;
    default:
      return <AccountGlyph {...props} />;
  }
};

/**
 * SVG symbols definition bundle for SVG <use href="#glyph-..." /> inclusion
 */
export const EntityGlyphsDefs: React.FC = () => (
  <svg style={{ display: 'none', position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <symbol id="glyph-account" viewBox="0 0 20 20">
        <rect x="3" y="3" width="14" height="14" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </symbol>
      <symbol id="glyph-transaction" viewBox="0 0 20 20">
        <polygon points="10,2.5 17.5,10 10,17.5 2.5,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </symbol>
      <symbol id="glyph-device" viewBox="0 0 20 20">
        <rect x="4.5" y="2.5" width="11" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8" y1="4.5" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </symbol>
      <symbol id="glyph-ip" viewBox="0 0 20 20">
        <polygon points="10,2.5 16.5,6.25 16.5,13.75 10,17.5 3.5,13.75 3.5,6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </symbol>
      <symbol id="glyph-cashout" viewBox="0 0 20 20">
        <path d="M11 3.5H5.5A2 2 0 0 0 3.5 5.5V14.5A2 2 0 0 0 5.5 16.5H14.5A2 2 0 0 0 16.5 14.5V9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points="11.5 3.5 16.5 3.5 16.5 8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8.5" y1="11.5" x2="16.5" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </symbol>
    </defs>
  </svg>
);

export default EntityGlyph;
