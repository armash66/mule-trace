import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { CaseReport } from '../api/types';
import { formatLakhs, formatDateTime } from '../lib/utils';
import {
  FileText,
  Printer,
  Copy,
  Check,
  ShieldAlert,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const Cases: React.FC = () => {
  const { ringId: routeRingId } = useParams<{ ringId?: string }>();
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [activeRingId, setActiveRingId] = useState(routeRingId || 'fan_1');
  const [caseReport, setCaseReport] = useState<CaseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (routeRingId && routeRingId !== activeRingId) {
      setActiveRingId(routeRingId);
    }
  }, [routeRingId, activeRingId]);

  useEffect(() => {
    setLoading(true);
    api
      .getCaseReport(activeRingId)
      .then((data) => setCaseReport(data))
      .finally(() => setLoading(false));
  }, [activeRingId]);

  const handleSelectRing = (id: string) => {
    setActiveRingId(id);
    navigate(`/cases/${id}`);
  };

  const handleCopySTR = () => {
    if (caseReport?.draft_str) {
      navigator.clipboard.writeText(caseReport.draft_str);
      setCopied(true);
      showToast('Draft STR copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Non-printed Toolbar */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)' }}>SELECT CASE RING:</span>
          {['fan_1', 'cycle_1', 'chain_1', 'cluster_1', 'dormancy_1'].map((rid) => (
            <button
              key={rid}
              onClick={() => handleSelectRing(rid)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                backgroundColor: activeRingId === rid ? 'var(--accent)' : 'var(--surface)',
                color: activeRingId === rid ? '#ffffff' : 'var(--ink)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {rid}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleCopySTR}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={14} color="var(--ok)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy STR Narrative'}</span>
          </button>

          <button
            onClick={handlePrint}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={14} />
            <span>Export / Print Case File</span>
          </button>
        </div>
      </div>

      {/* Printable Case Dossier Container */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '36px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        }}
      >
        {/* Document Header */}
        <div style={{ borderBottom: '2px solid var(--line-strong)', paddingBottom: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                FIU-IND Suspicious Transaction Investigation Report
              </div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--ink)', marginTop: '4px' }}>
                Case File: Ring #{caseReport?.ring_id || activeRingId}
              </h1>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>CONFIDENTIAL / PRIVILEGED</div>
              <div className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
                {formatDateTime(new Date().toISOString())}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '12px', lineHeight: '1.5' }}>
            {caseReport?.summary_sentence}
          </p>
        </div>

        {/* Section 1: Subject Entities (Masked KYC) */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '10px', textTransform: 'uppercase' }}>
            1. Involved Subject Entities (Masked for Compliance)
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>ACCOUNT ID</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>MASKED PHONE</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>MASKED ADDRESS</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>KYC HASH</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>CUT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {caseReport?.accounts.map((acc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono" style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {acc.account_id}
                  </td>
                  <td className="mono" style={{ padding: '10px 12px', color: 'var(--ink-2)' }}>
                    {acc.kyc_phone_masked}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--ink)' }}>{acc.kyc_address_masked}</td>
                  <td className="mono" style={{ padding: '10px 12px', color: 'var(--ink-3)' }}>
                    {acc.kyc_id_hash_masked}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {acc.is_recommended_freeze ? (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#ffffff',
                          backgroundColor: 'var(--risk-high)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}
                      >
                        MIN-CUT BOTTLENECK
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Layer Node</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Fund Propagation Timeline */}
        <div style={{ marginBottom: '28px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '10px', textTransform: 'uppercase' }}>
            2. Chronological Money Flow Ledger
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>TIMESTAMP (UTC)</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>SOURCE</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>DESTINATION</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>AMOUNT</th>
                <th style={{ padding: '8px 12px', color: 'var(--ink-3)' }}>CHANNEL</th>
              </tr>
            </thead>
            <tbody>
              {caseReport?.transfer_timeline.map((tx, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>
                    {formatDateTime(tx.timestamp)}
                  </td>
                  <td className="mono" style={{ padding: '8px 12px', color: 'var(--ink)' }}>
                    {tx.src}
                  </td>
                  <td className="mono" style={{ padding: '8px 12px', color: 'var(--ink)' }}>
                    {tx.dst}
                  </td>
                  <td className="mono" style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {formatLakhs(tx.amount)}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>{tx.channel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Draft STR Narrative */}
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginBottom: '10px', textTransform: 'uppercase' }}>
            3. Regulatory Suspicious Transaction Report (STR / SAR) Draft
          </h3>
          <pre
            style={{
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink)',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
            {caseReport?.draft_str}
          </pre>
        </div>
      </div>
    </div>
  );
};
