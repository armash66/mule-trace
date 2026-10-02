/**
 * Identity & Device Fingerprint Card
 * Displays phone links, address/ID links, device reuse, and IP velocity
 * for the selected account. All values derived from real CaseReport/CSV data — no
 * numbers are fabricated. Tagged as SAMPLE (repo's own demo data).
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Phone,
  Smartphone,
  Globe,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import type { CaseReport, AccountListItem } from '../api/types';
import {
  computeIdentityFingerprint,
  type IdentityFingerprintResult,
  type LinkedAccount,
  DEVICE_ALERT_THRESHOLD,
  IP_ALERT_THRESHOLD,
  PHONE_ALERT_THRESHOLD,
} from '../lib/identityAdapter';
import { ProvenanceLabel } from './ProvenanceLabel';
import { useStore } from '../store/store';
import './IdentityFingerprintCard.css';

// ── SVG Fingerprint Glyph ────────────────────────────────────
const FingerprintIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 14,
  color = 'currentColor',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
    <path d="M5 19.5C5.5 18 6 15 6 12c0-3.5 2.5-6 6-6a6 6 0 0 1 5.13 2.88" />
    <path d="M12 12v.01" />
    <path d="M12 18c0-1.5.5-3 1.5-4" />
    <path d="M10 22c.5-3 1-6.5 1-10" />
    <path d="M17 22c-.5-3-1-6.5-1-10" />
    <path d="M20 15c-1 0-2 .5-3 1.5" />
    <path d="M22 12c0 2.5-.5 5-1 7.5" />
  </svg>
);

// ── Props ────────────────────────────────────────────────────
export interface IdentityFingerprintCardProps {
  accountId: string;
  caseReport?: CaseReport | null;
  allAccounts?: AccountListItem[];
  loading?: boolean;
  error?: string | null;
  onAccountClick?: (accountId: string) => void;
  onShowOnGraph?: (result: IdentityFingerprintResult) => void;
}

// ── Row Component ────────────────────────────────────────────
interface RowProps {
  id: string;
  icon: React.ReactNode;
  glyphClass: string;
  label: string;
  headlineSentence: string;
  count: number;
  isSevere: boolean;
  severityText: string;
  linkedAccounts: LinkedAccount[];
  geoNote?: string;
  expanded: boolean;
  onToggle: () => void;
  onAccountClick?: (accountId: string) => void;
}

const IdentityRow: React.FC<RowProps> = ({
  icon,
  glyphClass,
  label,
  headlineSentence,
  count,
  isSevere,
  severityText,
  linkedAccounts,
  geoNote,
  expanded,
  onToggle,
  onAccountClick,
}) => {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onToggle();
      }
    },
    [onToggle]
  );

  return (
    <div className="idf-row">
      <div
        className="idf-row-header"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
      >
        <div className={`idf-glyph ${glyphClass}`}>{icon}</div>
        <div className="idf-row-content">
          <div className="idf-row-label">{label}</div>
          <div className="idf-row-sublabel">{headlineSentence}</div>
        </div>
        <div className="idf-row-right">
          <span className={`idf-badge ${isSevere ? 'severe' : 'normal'}`}>
            {count}
          </span>
          {isSevere && (
            <span className="idf-severity">
              <AlertTriangle size={11} />
              <span>{severityText}</span>
            </span>
          )}
          <ChevronDown
            size={14}
            className={`idf-chevron ${expanded ? 'expanded' : ''}`}
          />
        </div>
      </div>

      {expanded && (
        <div className="idf-expand">
          {linkedAccounts.length > 0 ? (
            <div className="idf-chips-wrap">
              {linkedAccounts.map((la) => (
                <button
                  key={la.accountId}
                  className="idf-chip"
                  type="button"
                  title={`Focus ${la.accountId} in investigation`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAccountClick?.(la.accountId);
                  }}
                >
                  <span>{la.maskedId}</span>
                  <ExternalLink size={10} />
                </button>
              ))}
            </div>
          ) : (
            <div className="idf-geo-notice">No linked counterpart accounts.</div>
          )}
          {geoNote && (
            <div className="idf-geo-notice">
              <MapPin size={11} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              <span>{geoNote}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────
export const IdentityFingerprintCard: React.FC<IdentityFingerprintCardProps> = ({
  accountId,
  caseReport = null,
  allAccounts = [],
  loading = false,
  error = null,
  onAccountClick,
  onShowOnGraph,
}) => {
  const { showToast } = useStore();
  const [revealed, setRevealed] = useState(false);
  const [activeAccordionId, setActiveAccordionId] = useState<string | null>(null);

  // Compute identity fingerprint adapter result
  const result = useMemo(
    () => computeIdentityFingerprint(accountId, caseReport || null, allAccounts),
    [accountId, caseReport, allAccounts]
  );

  const toggleReveal = useCallback(() => {
    setRevealed((prev) => {
      const next = !prev;
      if (next) {
        showToast('Audit Trail: Analyst unmasked KYC PII identifiers');
      } else {
        showToast('Privacy: KYC PII identifiers re-masked');
      }
      return next;
    });
  }, [showToast]);

  const toggleRow = useCallback((rowId: string) => {
    setActiveAccordionId((current) => (current === rowId ? null : rowId));
  }, []);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="idf-card">
        <span className="corner-tick tick-tl" />
        <span className="corner-tick tick-tr" />
        <span className="corner-tick tick-bl" />
        <span className="corner-tick tick-br" />
        <div className="idf-header">
          <div className="idf-title-wrap">
            <FingerprintIcon size={14} color="#FF9F1C" />
            <span className="idf-title">IDENTITY & DEVICE FINGERPRINT</span>
          </div>
          <ProvenanceLabel source="SAMPLE" size="sm" />
        </div>
        <div className="idf-skeleton">
          <div className="idf-skeleton-row" />
          <div className="idf-skeleton-row" />
          <div className="idf-skeleton-row" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="idf-card">
        <span className="corner-tick tick-tl" />
        <span className="corner-tick tick-tr" />
        <span className="corner-tick tick-bl" />
        <span className="corner-tick tick-br" />
        <div className="idf-header">
          <div className="idf-title-wrap">
            <FingerprintIcon size={14} color="#FF9F1C" />
            <span className="idf-title">IDENTITY & DEVICE FINGERPRINT</span>
          </div>
          <ProvenanceLabel source="SAMPLE" size="sm" />
        </div>
        <div className="idf-empty" style={{ color: 'var(--signal, #EF4444)' }}>
          <AlertCircle size={14} style={{ display: 'inline', marginRight: '6px' }} />
          Failed to load fingerprint: {error}
        </div>
      </div>
    );
  }

  // Empty state
  if (!result.hasAnyLinks) {
    return (
      <div className="idf-card">
        <span className="corner-tick tick-tl" />
        <span className="corner-tick tick-tr" />
        <span className="corner-tick tick-bl" />
        <span className="corner-tick tick-br" />
        <div className="idf-header">
          <div className="idf-title-wrap">
            <FingerprintIcon size={14} color="#FF9F1C" />
            <span className="idf-title">IDENTITY & DEVICE FINGERPRINT</span>
          </div>
          <ProvenanceLabel source="SAMPLE" size="sm" />
        </div>
        <div className="idf-empty">
          No shared identifiers found for this account.
        </div>
      </div>
    );
  }

  // Templated sentences
  const phoneSentence = result.phone
    ? `Shares phone ${revealed ? (result.phone.phoneRaw || result.phone.phoneMasked) : result.phone.phoneMasked} with ${result.phone.count} other account${result.phone.count > 1 ? 's' : ''}`
    : 'No phone linkage detected';

  const deviceSentence = result.device
    ? `${result.device.count} accounts used device ${revealed ? (result.device.deviceIdRaw || result.device.deviceId) : result.device.deviceIdMasked} within ${result.device.timeSpanFormatted}`
    : 'No device reuse detected';

  const ipSentence = result.ip
    ? `${result.ip.count} accounts accessed from IP ${revealed ? (result.ip.ipRaw || result.ip.ip) : result.ip.ipMasked}`
    : 'No IP correlation detected';

  return (
    <div className="idf-card">
      <span className="corner-tick tick-tl" />
      <span className="corner-tick tick-tr" />
      <span className="corner-tick tick-bl" />
      <span className="corner-tick tick-br" />

      {/* Header */}
      <div className="idf-header">
        <div className="idf-title-wrap">
          <FingerprintIcon size={14} color="#FF9F1C" />
          <span className="idf-title">IDENTITY & DEVICE FINGERPRINT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="idf-reveal-btn"
            onClick={toggleReveal}
            title={revealed ? 'Mask PII fields' : 'Reveal unmasked KYC PII (audit logged)'}
          >
            {revealed ? <EyeOff size={11} /> : <Eye size={11} />}
            <span>{revealed ? 'Mask PII' : 'Reveal'}</span>
          </button>
          <ProvenanceLabel source="SAMPLE" size="sm" />
        </div>
      </div>

      {/* Three rows with entity glyphs */}
      <div className="idf-rows">
        {/* Row 1: Phone link */}
        {result.phone && (
          <IdentityRow
            id="phone"
            icon={<Phone size={14} />}
            glyphClass="phone"
            label="Phone Link"
            headlineSentence={phoneSentence}
            count={result.phone.count}
            isSevere={result.phone.isSevere}
            severityText={`≥${PHONE_ALERT_THRESHOLD} ACCOUNTS`}
            linkedAccounts={result.phone.linkedAccounts}
            expanded={activeAccordionId === 'phone'}
            onToggle={() => toggleRow('phone')}
            onAccountClick={onAccountClick}
          />
        )}

        {/* Row 2: Device reuse */}
        {result.device && (
          <IdentityRow
            id="device"
            icon={<Smartphone size={14} />}
            glyphClass="device"
            label="Device Reuse"
            headlineSentence={deviceSentence}
            count={result.device.count}
            isSevere={result.device.isSevere}
            severityText={`≥${DEVICE_ALERT_THRESHOLD} ACCOUNTS`}
            linkedAccounts={result.device.linkedAccounts}
            expanded={activeAccordionId === 'device'}
            onToggle={() => toggleRow('device')}
            onAccountClick={onAccountClick}
          />
        )}

        {/* Row 3: IP velocity */}
        {result.ip && (
          <IdentityRow
            id="ip"
            icon={<Globe size={14} />}
            glyphClass="ip"
            label="IP Velocity"
            headlineSentence={ipSentence}
            count={result.ip.count}
            isSevere={result.ip.isSevere}
            severityText={`≥${IP_ALERT_THRESHOLD} ACCOUNTS`}
            linkedAccounts={result.ip.linkedAccounts}
            geoNote={result.ip.geoMismatchNote}
            expanded={activeAccordionId === 'ip'}
            onToggle={() => toggleRow('ip')}
            onAccountClick={onAccountClick}
          />
        )}
      </div>

      {/* Show on graph button */}
      {onShowOnGraph && (
        <button
          type="button"
          className="idf-show-graph-btn"
          onClick={() => onShowOnGraph(result)}
        >
          <ExternalLink size={12} />
          <span>Show shared identifiers on graph</span>
        </button>
      )}
    </div>
  );
};
