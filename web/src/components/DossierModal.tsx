/**
 * Export Legal Dossier Modal
 * Two tabs: (A) Freeze / Information Notice, (B) STR Dossier.
 * Paper-like styling (#EDE8DF), faint DRAFT watermark.
 * Content generated from CaseReport + FreezePlanResponse real data.
 * Tagged as SAMPLE (repo's own demo data).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  Printer,
  Download,
  Copy,
  Check,
  Shield,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import type { CaseReport, FreezePlanResponse } from '../api/types';
import { formatDateTime, formatIndianDate, formatFullINR } from '../lib/utils';
import { useStore } from '../store/store';
import './DossierModal.css';

// ── Props ────────────────────────────────────────────────────
interface Props {
  ringId: string;
  open: boolean;
  onClose: () => void;
}

// ── Focus Trap Hook ──────────────────────────────────────────
function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    first?.focus();
    el.addEventListener('keydown', trap);
    return () => el.removeEventListener('keydown', trap);
  }, [ref, active]);
}

// ── Main Component ───────────────────────────────────────────
export const DossierModal: React.FC<Props> = ({ ringId, open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'freeze' | 'str'>('freeze');
  const [caseReport, setCaseReport] = useState<CaseReport | null>(null);
  const [freezePlan, setFreezePlan] = useState<FreezePlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { showToast } = useStore();

  useFocusTrap(modalRef, open);

  // Load real data from case report and freeze plan endpoints
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    Promise.all([
      api.getCaseReport(ringId),
      api.getRingFreezePlan(ringId),
    ])
      .then(([cr, fp]) => {
        setCaseReport(cr);
        setFreezePlan(fp);
        showToast('Dossier generated');
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load case dossier data.');
      })
      .finally(() => setLoading(false));
  }, [ringId, open, showToast]);

  // Escape key closes modal
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownload = useCallback(() => {
    if (!caseReport) return;
    const content = activeTab === 'freeze'
      ? generateFreezeNoticeText(caseReport, freezePlan)
      : generateSTRText(caseReport, freezePlan);

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'freeze'
      ? `freeze_notice_${ringId}.txt`
      : `str_dossier_${ringId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded legal dossier draft.');
  }, [activeTab, caseReport, freezePlan, ringId, showToast]);

  const handleCopy = useCallback(() => {
    if (!caseReport) return;
    const content = activeTab === 'freeze'
      ? generateFreezeNoticeText(caseReport, freezePlan)
      : generateSTRText(caseReport, freezePlan);
    navigator.clipboard.writeText(content);
    setCopied(true);
    showToast('Copied dossier draft to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  }, [activeTab, caseReport, freezePlan, showToast]);

  if (!open) return null;

  return (
    <div
      className="dossier-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Export Legal Dossier Modal"
    >
      <div className="dossier-modal" ref={modalRef}>
        {/* Modal Header Strip */}
        <div className="dossier-modal-header">
          <div className="dossier-modal-title">
            <FileText size={16} color="#FF9F1C" />
            <span>Export Notice & STR Dossier</span>
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-2, #888)',
                letterSpacing: '0.08em',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '2px 6px',
                borderRadius: '3px',
                marginLeft: '8px',
              }}
            >
              SAMPLE
            </span>
          </div>
          <button
            type="button"
            className="dossier-close-btn"
            onClick={onClose}
            aria-label="Close dossier modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Document Selection Tabs */}
        <div className="dossier-tabs" role="tablist">
          <button
            type="button"
            className={`dossier-tab ${activeTab === 'freeze' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'freeze'}
            onClick={() => setActiveTab('freeze')}
          >
            <Shield size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            <span>Freeze / Information Notice</span>
          </button>
          <button
            type="button"
            className={`dossier-tab ${activeTab === 'str' ? 'active' : ''}`}
            role="tab"
            aria-selected={activeTab === 'str'}
            onClick={() => setActiveTab('str')}
          >
            <AlertTriangle size={13} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            <span>STR Dossier</span>
          </button>
        </div>

        {/* Paper Preview Area */}
        <div className="dossier-scroll">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-2, #888)', fontFamily: 'var(--font-mono, monospace)', fontSize: '13px' }}>
              Compiling real case evidence & freeze plan…
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--signal, #EF4444)', fontSize: '13px' }}>
              <AlertCircle size={20} style={{ display: 'block', margin: '0 auto 8px' }} />
              {error}
            </div>
          ) : !caseReport ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-2, #888)' }}>
              No case data available for Ring #{ringId}.
            </div>
          ) : activeTab === 'freeze' ? (
            <FreezeNotice caseReport={caseReport} freezePlan={freezePlan} />
          ) : (
            <STRDossier caseReport={caseReport} freezePlan={freezePlan} />
          )}
        </div>

        {/* Action Controls */}
        <div className="dossier-actions">
          <button
            type="button"
            className="dossier-action-btn secondary"
            onClick={handleCopy}
            disabled={loading || !caseReport}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <button
            type="button"
            className="dossier-action-btn secondary"
            onClick={handleDownload}
            disabled={loading || !caseReport}
          >
            <Download size={14} />
            <span>Download .txt</span>
          </button>
          <button
            type="button"
            className="dossier-action-btn primary"
            onClick={handlePrint}
            disabled={loading || !caseReport}
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tab A: Freeze / Information Notice ───────────────────────
const FreezeNotice: React.FC<{
  caseReport: CaseReport;
  freezePlan: FreezePlanResponse | null;
}> = ({ caseReport, freezePlan }) => {
  const nowFormatted = `${formatIndianDate()} IST`;
  const recommendedAccounts = caseReport.accounts.filter((a) => a.is_recommended_freeze);
  const otherAccounts = caseReport.accounts.filter((a) => !a.is_recommended_freeze);

  const totalAmount = freezePlan?.rupees_stopped
    ? formatFullINR(freezePlan.rupees_stopped)
    : formatFullINR(caseReport.transfer_timeline.reduce((s, t) => s + t.amount, 0));

  // Time window from timeline
  const timestamps = caseReport.transfer_timeline.map((t) => new Date(t.timestamp).getTime());
  const minTs = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
  const maxTs = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
  const timeWindow = minTs && maxTs
    ? `${formatDateTime(minTs.toISOString())} – ${formatDateTime(maxTs.toISOString())}`
    : 'See attached ledger timeline';

  return (
    <div className="dossier-paper">
      {/* Mandatory Honest Framing Header */}
      <div className="dossier-mandatory-header">
        DRAFT · Analyst review required · Not an official filing
      </div>

      <div className="dossier-doc-header">
        <div className="dossier-doc-title">
          Preventive Freeze / Information Request Notice
        </div>
        <div className="dossier-doc-subtitle">
          Section 17(1A) – Prevention of Money Laundering Act, 2002
        </div>
      </div>

      {/* Required Legal Framework Advisory Note */}
      <div className="dossier-legal-advisory">
        Format modelled on a freeze/information notice (CrPC S.91 was replaced by BNSS S.94 in 2024; confirm the current provision with legal counsel) and on FIU-IND STR content. Verify before use.
      </div>

      {/* Addressee & Case Summary */}
      <div className="dossier-section">
        <p>
          <strong>To:</strong>{' '}
          <span className="dossier-placeholder">[Nodal Officer, Beneficiary Bank]</span>
        </p>
        <p>
          <strong>From:</strong> MuleTrace — Automated Financial Crime Detection Engine
        </p>
        <p>
          <strong>Date:</strong> {nowFormatted}
        </p>
        <p>
          <strong>Case Reference:</strong> Ring {caseReport.ring_id} — {caseReport.pattern} structure
        </p>
      </div>

      {/* Subject */}
      <div className="dossier-section">
        <div className="dossier-section-title">Subject & Requested Action</div>
        <p>
          Request for immediate preventive debit-freeze on{' '}
          {recommendedAccounts.length > 0
            ? `${recommendedAccounts.length} account${recommendedAccounts.length > 1 ? 's' : ''} identified as min-cut bottleneck${recommendedAccounts.length > 1 ? 's' : ''}`
            : `${caseReport.accounts.length} account${caseReport.accounts.length > 1 ? 's' : ''}`}{' '}
          in connection with illicit fund dispersion activity totaling{' '}
          <strong>{totalAmount}</strong>.
        </p>
      </div>

      {/* Accounts to Freeze Table */}
      <div className="dossier-section">
        <div className="dossier-section-title">Accounts Under Freezing Order</div>
        <table className="dossier-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>IFSC</th>
              <th>KYC Phone (masked)</th>
              <th>KYC Address (masked)</th>
              <th>Amount Traced</th>
              <th>Requested Action</th>
            </tr>
          </thead>
          <tbody>
            {[...recommendedAccounts, ...otherAccounts].map((acc) => (
              <tr key={acc.account_id}>
                <td><strong>{acc.account_id}</strong></td>
                <td style={{ color: '#777', fontStyle: 'italic' }}>Not available in dataset</td>
                <td>{acc.kyc_phone_masked || 'Not available in dataset'}</td>
                <td>{acc.kyc_address_masked || 'Not available in dataset'}</td>
                <td>
                  {acc.is_recommended_freeze && freezePlan
                    ? formatFullINR(freezePlan.rupees_stopped)
                    : '₹0 – Monitored'}
                </td>
                <td>
                  {acc.is_recommended_freeze ? (
                    <strong style={{ color: '#C00' }}>DEBIT FREEZE</strong>
                  ) : (
                    'Lien / Monitor'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reason in one factual paragraph generated from real case data */}
      <div className="dossier-section">
        <div className="dossier-section-title">Reason & Grounds for Freezing</div>
        <p>
          {caseReport.summary_sentence} Fund transfers propagated across the subject accounts
          during the time window <strong>{timeWindow}</strong> via coordinated multi-party payments.
          Automated min-cut graph analysis confirms that freezing the {recommendedAccounts.length || 1} identified
          bottleneck account(s) will sever downstream extraction pathways, preserving an estimated{' '}
          <strong>{totalAmount}</strong> prior to off-ramp liquidation.
        </p>
      </div>

      {/* Signature Placeholders */}
      <div className="dossier-sig-block">
        <div>
          <div className="dossier-sig-line">
            <span className="dossier-placeholder">[Officer Name]</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            Investigating Officer / Designation
          </div>
        </div>
        <div>
          <div className="dossier-sig-line">
            <span className="dossier-placeholder">[Date & Signature]</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            Nodal Authority / Authorizing Officer
          </div>
        </div>
      </div>

      {/* Footer Line */}
      <div className="dossier-footer">
        <span>Generated: {nowFormatted}</span>
        <span>Dataset: MuleTrace Sandbox Case Ring #{caseReport.ring_id}</span>
        <span className="prov-tag">SAMPLE</span>
      </div>
    </div>
  );
};

// ── Tab B: STR Dossier ───────────────────────────────────────
const STRDossier: React.FC<{
  caseReport: CaseReport;
  freezePlan: FreezePlanResponse | null;
}> = ({ caseReport, freezePlan }) => {
  const nowFormatted = `${formatIndianDate()} IST`;

  return (
    <div className="dossier-paper">
      {/* Mandatory Honest Framing Header */}
      <div className="dossier-mandatory-header">
        DRAFT · Analyst review required · Not an official filing
      </div>

      <div className="dossier-doc-header">
        <div className="dossier-doc-title">
          Suspicious Transaction Report (STR / SAR) Dossier
        </div>
        <div className="dossier-doc-subtitle">
          Section 12 – Prevention of Money Laundering Act (PMLA), 2002
        </div>
      </div>

      {/* Legal Advisory Note */}
      <div className="dossier-legal-advisory">
        Format modelled on a freeze/information notice (CrPC S.91 was replaced by BNSS S.94 in 2024; confirm the current provision with legal counsel) and on FIU-IND STR content. Verify before use.
      </div>

      {/* Metadata */}
      <div className="dossier-section">
        <p>
          <strong>Reporting Entity:</strong>{' '}
          <span className="dossier-placeholder">[Financial Institution Name]</span>
        </p>
        <p>
          <strong>Report Date:</strong> {nowFormatted}
        </p>
        <p>
          <strong>Ring Identifier:</strong> Ring #{caseReport.ring_id}
        </p>
        <p>
          <strong>Typology / Pattern:</strong> {caseReport.pattern.toUpperCase()}
        </p>
      </div>

      {/* 1. Subject accounts & identifiers */}
      <div className="dossier-section">
        <div className="dossier-section-title">1. Subject Accounts & Identifiers</div>
        <table className="dossier-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>KYC Phone (masked)</th>
              <th>KYC Address (masked)</th>
              <th>PAN / ID Hash (truncated)</th>
              <th>Network Role</th>
            </tr>
          </thead>
          <tbody>
            {caseReport.accounts.map((acc) => (
              <tr key={acc.account_id}>
                <td><strong>{acc.account_id}</strong></td>
                <td>{acc.kyc_phone_masked || 'Not available in dataset'}</td>
                <td>{acc.kyc_address_masked || 'Not available in dataset'}</td>
                <td>{acc.kyc_id_hash_masked ? `${acc.kyc_id_hash_masked}` : 'Not available in dataset'}</td>
                <td>{acc.is_recommended_freeze ? 'Hub / Bottleneck' : 'Layer Node'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontStyle: 'italic' }}>
          * Identifiers: PAN/Aadhaar hashes only, never raw credentials. IFSC and geolocation data are not available in this dataset.
        </p>
      </div>

      {/* 2. Grounds of suspicion */}
      <div className="dossier-section">
        <div className="dossier-section-title">2. Grounds of Suspicion</div>
        <p>{caseReport.summary_sentence}</p>
        {caseReport.draft_str && (
          <div
            style={{
              marginTop: '8px',
              padding: '12px',
              background: 'rgba(0,0,0,0.03)',
              border: '1px solid #C0B9A0',
              whiteSpace: 'pre-wrap',
              fontFamily: "'Courier New', monospace",
              fontSize: '11px',
              lineHeight: '1.6',
            }}
          >
            {caseReport.draft_str}
          </div>
        )}
      </div>

      {/* 3. Transaction log table */}
      <div className="dossier-section">
        <div className="dossier-section-title">3. Chronological Transaction Log</div>
        <table className="dossier-table">
          <thead>
            <tr>
              <th>Date & Time (IST)</th>
              <th>Source Account</th>
              <th>Destination Account</th>
              <th>Amount (₹ en-IN)</th>
              <th>Channel</th>
            </tr>
          </thead>
          <tbody>
            {caseReport.transfer_timeline.map((tx, idx) => (
              <tr key={idx}>
                <td>{formatDateTime(tx.timestamp)}</td>
                <td>{tx.src}</td>
                <td>{tx.dst}</td>
                <td>{formatFullINR(tx.amount)}</td>
                <td>{tx.channel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Graph cut analysis */}
      {freezePlan && (
        <div className="dossier-section">
          <div className="dossier-section-title">4. Graph Cut & Intervention Analysis</div>
          <p>
            Min-cut analysis isolates{' '}
            <strong>
              {freezePlan.recommended_freeze_accounts.length} account
              {freezePlan.recommended_freeze_accounts.length > 1 ? 's' : ''}
            </strong>{' '}
            ({freezePlan.recommended_freeze_accounts.join(', ')}) to halt fund dissipation.
          </p>
          <table className="dossier-table">
            <thead>
              <tr>
                <th>Intervention Parameter</th>
                <th>Calculated Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Tainted Inflow</td>
                <td>{formatFullINR(freezePlan.total_tainted)}</td>
              </tr>
              <tr>
                <td>Funds Stoppable by Cut</td>
                <td>{formatFullINR(freezePlan.rupees_stopped)}</td>
              </tr>
              <tr>
                <td>Funds Dissipated Prior to Cut</td>
                <td>{formatFullINR(freezePlan.rupees_lost)}</td>
              </tr>
              <tr>
                <td>Recommended Freeze Target(s)</td>
                <td>{freezePlan.recommended_freeze_accounts.join(', ')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Analyst notes */}
      {caseReport.analyst_notes && caseReport.analyst_notes.length > 0 && (
        <div className="dossier-section">
          <div className="dossier-section-title">
            {freezePlan ? '5' : '4'}. Analyst Investigation Notes
          </div>
          <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
            {caseReport.analyst_notes.map((note, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signature Block */}
      <div className="dossier-sig-block">
        <div>
          <div className="dossier-sig-line">
            <span className="dossier-placeholder">[Principal Officer / MLRO]</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            Principal Compliance Officer / MLRO
          </div>
        </div>
        <div>
          <div className="dossier-sig-line">
            <span className="dossier-placeholder">[Date & Signature]</span>
          </div>
          <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
            Supervising Regulatory Authority
          </div>
        </div>
      </div>

      {/* Footer Line */}
      <div className="dossier-footer">
        <span>Generated: {nowFormatted}</span>
        <span>Dataset: MuleTrace Sandbox Case Ring #{caseReport.ring_id}</span>
        <span className="prov-tag">SAMPLE</span>
      </div>
    </div>
  );
};

// ── Plaintext Generators (Copy / Download) ───────────────────
function generateFreezeNoticeText(
  cr: CaseReport,
  fp: FreezePlanResponse | null
): string {
  const now = `${formatIndianDate()} IST`;
  const lines: string[] = [
    'DRAFT · Analyst review required · Not an official filing',
    'PREVENTIVE FREEZE / INFORMATION REQUEST NOTICE',
    'Section 17(1A) – Prevention of Money Laundering Act, 2002',
    '═'.repeat(65),
    'Format modelled on a freeze/information notice (CrPC S.91 was replaced',
    'by BNSS S.94 in 2024; confirm the current provision with legal counsel)',
    'and on FIU-IND STR content. Verify before use.',
    '─'.repeat(65),
    `Date: ${now}`,
    `Case Reference: Ring ${cr.ring_id} — ${cr.pattern} structure`,
    '',
    'TO: [Nodal Officer, Beneficiary Bank]',
    'FROM: MuleTrace — Automated Financial Crime Detection Engine',
    '',
    'SUBJECT ACCOUNTS TO FREEZE:',
    ...cr.accounts.map(
      (a) =>
        `  ${a.account_id} | IFSC: Not available in dataset | Phone: ${a.kyc_phone_masked || 'Not available in dataset'} | Address: ${a.kyc_address_masked || 'Not available in dataset'} | Action: ${a.is_recommended_freeze ? 'DEBIT FREEZE' : 'Lien/Monitor'}`
    ),
    '',
    'REASON & GROUNDS FOR FREEZING:',
    cr.summary_sentence,
    '',
  ];

  if (fp) {
    lines.push(
      'MIN-CUT INTERVENTION SUMMARY:',
      `  Recommended Freeze Target(s): ${fp.recommended_freeze_accounts.join(', ')}`,
      `  Funds Stoppable: ${formatFullINR(fp.rupees_stopped)}`,
      `  Funds Dissipated: ${formatFullINR(fp.rupees_lost)}`,
      ''
    );
  }

  lines.push(
    '─'.repeat(35),
    '[Officer Name]                         [Date & Signature]',
    'Investigating Officer / Designation    Nodal Authority / Authorizing Officer',
    '',
    `Footer: Generated ${now} | Dataset: MuleTrace Sandbox Case Ring #${cr.ring_id} | SAMPLE`
  );

  return lines.join('\n');
}

function generateSTRText(
  cr: CaseReport,
  fp: FreezePlanResponse | null
): string {
  const now = `${formatIndianDate()} IST`;
  const lines: string[] = [
    'DRAFT · Analyst review required · Not an official filing',
    'SUSPICIOUS TRANSACTION REPORT (STR / SAR) DOSSIER',
    'Section 12 – Prevention of Money Laundering Act (PMLA), 2002',
    '═'.repeat(65),
    'Format modelled on a freeze/information notice (CrPC S.91 was replaced',
    'by BNSS S.94 in 2024; confirm the current provision with legal counsel)',
    'and on FIU-IND STR content. Verify before use.',
    '─'.repeat(65),
    `Report Date: ${now}`,
    `Ring Identifier: Ring #${cr.ring_id}`,
    `Typology / Pattern: ${cr.pattern.toUpperCase()}`,
    '',
    '1. SUBJECT ACCOUNTS & IDENTIFIERS:',
    ...cr.accounts.map(
      (a) =>
        `  ${a.account_id} | Phone: ${a.kyc_phone_masked || 'Not available in dataset'} | PAN Hash: ${a.kyc_id_hash_masked || 'Not available in dataset'} | Role: ${a.is_recommended_freeze ? 'Hub / Bottleneck' : 'Layer Node'}`
    ),
    '  * Note: PAN/Aadhaar hashes only, never raw credentials. IFSC and geolocation not available in dataset.',
    '',
    '2. GROUNDS OF SUSPICION:',
    cr.summary_sentence,
    '',
  ];

  if (cr.draft_str) {
    lines.push(cr.draft_str, '');
  }

  lines.push(
    '3. CHRONOLOGICAL TRANSACTION LOG:',
    ...cr.transfer_timeline.map(
      (tx) =>
        `  ${formatDateTime(tx.timestamp)} IST | ${tx.src} → ${tx.dst} | ${formatFullINR(tx.amount)} | ${tx.channel}`
    ),
    ''
  );

  if (fp) {
    lines.push(
      '4. GRAPH CUT & INTERVENTION ANALYSIS:',
      `  Total Tainted Inflow: ${formatFullINR(fp.total_tainted)}`,
      `  Funds Stoppable: ${formatFullINR(fp.rupees_stopped)}`,
      `  Funds Dissipated: ${formatFullINR(fp.rupees_lost)}`,
      `  Recommended Freeze: ${fp.recommended_freeze_accounts.join(', ')}`,
      ''
    );
  }

  if (cr.analyst_notes && cr.analyst_notes.length > 0) {
    lines.push(
      `${fp ? '5' : '4'}. ANALYST INVESTIGATION NOTES:`,
      ...cr.analyst_notes.map((n) => `  • ${n}`),
      ''
    );
  }

  lines.push(
    '─'.repeat(35),
    '[Principal Officer / MLRO]             [Date & Signature]',
    'Principal Compliance Officer / MLRO    Supervising Regulatory Authority',
    '',
    `Footer: Generated ${now} | Dataset: MuleTrace Sandbox Case Ring #${cr.ring_id} | SAMPLE`
  );

  return lines.join('\n');
}
