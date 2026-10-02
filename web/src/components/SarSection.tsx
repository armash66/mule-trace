import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  FileText,
  Copy,
  Check,
  Download,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ProvenanceBadge } from './ProvenanceBadge';
import { api } from '../api/client';
import { mockCaseReport } from '../api/mockData';
import type { CaseReport } from '../api/types';
import './SarSection.css';

interface SarSectionProps {
  pageVisible?: boolean;
}

export const SarSection: React.FC<SarSectionProps> = ({ pageVisible = true }) => {
  const prefersReduced = useReducedMotion();

  // State: 'empty' | 'loading' | 'success' | 'error'
  const [sarState, setSarState] = useState<'empty' | 'loading' | 'success' | 'error'>('empty');
  const [reportData, setReportData] = useState<CaseReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activePipelineStep, setActivePipelineStep] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const pipelineStages = [
    { id: 'detect', label: 'DETECT', desc: '11 rapid inflows flagged' },
    { id: 'trace', label: 'TRACE', desc: '94.2% fan-out money trail' },
    { id: 'analyze', label: 'ANALYZE', desc: 'Min-cut bottleneck cut' },
    { id: 'explain', label: 'EXPLAIN', desc: 'SHAP +0.38 pass-through' },
    { id: 'report', label: 'REPORT', desc: 'Section 12 PMLA draft' },
  ];

  const handleGenerateSar = async () => {
    setSarState('loading');
    setErrorMessage('');
    setActivePipelineStep(0);

    // Progressive pipeline step advance during generation
    if (!prefersReduced) {
      setTimeout(() => setActivePipelineStep(1), 250);
      setTimeout(() => setActivePipelineStep(2), 500);
      setTimeout(() => setActivePipelineStep(3), 750);
      setTimeout(() => setActivePipelineStep(4), 1000);
    }

    try {
      // Calls existing SAR generation endpoint (or mock fallback)
      const data = await api.getCaseReport('fan_1');
      // Hold briefly so user observes the condensation
      setTimeout(() => {
        setReportData(data);
        setSarState('success');
      }, prefersReduced ? 50 : 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to synthesize SAR report.');
      setSarState('error');
    }
  };

  const handleCopy = () => {
    const textToCopy = reportData?.draft_str || mockCaseReport.draft_str;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const textToDownload = reportData?.draft_str || mockCaseReport.draft_str;
    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `muletrace_sar_draft_${reportData?.ring_id || 'fan_1'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="sar-section" id="sar">
      <div className="god-wrap">
        {/* Section Head */}
        <div className="section-head">
          <div className="section-meta-row">
            <span className="head-kicker mono">08 · EVIDENCE CONDENSATION & REPORTING</span>
            <ProvenanceBadge source="sample" label="SAMPLE · RING fan_1 SAR" />
          </div>
          <h2 className="head-title serif">Evidence condenses into action.</h2>
          <p className="head-sub">
            Compliance teams cannot file raw graph matrices. MuleTrace transforms multi-hop graph cuts and attribution
            scores into standardized SAR narrative drafts ready for regulatory review.
          </p>
        </div>

        {/* Pipeline Strip: DETECT → TRACE → ANALYZE → EXPLAIN → REPORT */}
        <div className="sar-pipeline-strip mono">
          {pipelineStages.map((stage, idx) => {
            const isCompleted = sarState === 'success' || (sarState === 'loading' && activePipelineStep >= idx);
            const isCurrent = sarState === 'loading' && activePipelineStep === idx;

            return (
              <div
                key={stage.id}
                className={`pipeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="step-bar">
                  <div className="step-indicator">
                    <span className="step-num">0{idx + 1}</span>
                    <span className="step-label">{stage.label}</span>
                  </div>
                  <span className="step-desc">{stage.desc}</span>
                </div>
                {idx < pipelineStages.length - 1 && <span className="step-arrow">→</span>}
              </div>
            );
          })}
        </div>

        {/* Outer Dark Frame */}
        <div className="sar-dark-frame">
          {/* EMPTY STATE: Button that calls existing SAR generation */}
          {sarState === 'empty' && (
            <div className="sar-empty-card">
              <div className="empty-icon-wrap">
                <FileText size={32} className="text-signal" />
              </div>
              <h3 className="serif empty-title">Ready to compile SAR draft for Ring fan_1</h3>
              <p className="empty-sub">
                Synthesize forensic findings from 11 counterparty accounts, 5 structuring transactions, and the
                min-cut bottleneck into an auditable draft narrative.
              </p>
              <button className="primary-btn generate-sar-btn" onClick={handleGenerateSar}>
                <FileText size={15} />
                <span>Generate SAR Draft (Ring fan_1)</span>
                <ArrowRight size={14} />
              </button>
              <span className="mono empty-notice">
                NO AUTOMATIC FILINGS · DRAFT STRICTLY REQUIRES HUMAN ANALYST REVIEW
              </span>
            </div>
          )}

          {/* LOADING STATE: Compilation indicator */}
          {sarState === 'loading' && (
            <div className="sar-loading-card">
              <div className="loading-spinner-wrap">
                <RotateCw size={28} className="spinner-icon text-signal" />
              </div>
              <h3 className="serif loading-title">Condensing forensic evidence...</h3>
              <p className="loading-sub mono">
                {activePipelineStep === 0 && 'STAGE 1/5: Querying transaction sequence for ACC_05001...'}
                {activePipelineStep === 1 && 'STAGE 2/5: Tracing downstream fan-out across 6 destination nodes...'}
                {activePipelineStep === 2 && 'STAGE 3/5: Isolating min-cut bottleneck accounts...'}
                {activePipelineStep === 3 && 'STAGE 4/5: Computing SHAP attribution values...'}
                {activePipelineStep >= 4 && 'STAGE 5/5: Assembling Section 12 PMLA narrative draft...'}
              </p>
              <div className="loading-track">
                <div
                  className="loading-bar"
                  style={{ width: `${((activePipelineStep + 1) / 5) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ERROR STATE: Fail banner with retry */}
          {sarState === 'error' && (
            <div className="sar-error-card">
              <AlertTriangle size={32} className="text-risk" />
              <h3 className="serif error-title">Failed to compile draft</h3>
              <p className="error-sub">{errorMessage || 'An error occurred while compiling the case file.'}</p>
              <button className="primary-btn retry-btn" onClick={handleGenerateSar}>
                <RotateCw size={14} />
                <span>Retry Generation</span>
              </button>
            </div>
          )}

          {/* SUCCESS STATE: Warm off-white paper surface (#EDE8DF) in dark frame */}
          {sarState === 'success' && (
            <div className="sar-success-container">
              {/* Document Actions Bar */}
              <div className="sar-actions-bar mono">
                <div className="sar-status-tag">
                  <span className="live-dot text-ok">●</span>
                  <span>DRAFT COMPILED · RING ID: {reportData?.ring_id || 'fan_1'}</span>
                </div>
                <div className="sar-btn-group">
                  <button className="ghost-btn action-btn" onClick={handleCopy} title="Copy draft text">
                    {copied ? (
                      <>
                        <Check size={13} className="text-ok" />
                        <span>Copied to Clipboard</span>
                      </>
                    ) : (
                      <>
                        <Copy size={13} />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                  <button className="ghost-btn action-btn" onClick={handleDownload} title="Download as text file">
                    <Download size={13} />
                    <span>Download .TXT</span>
                  </button>
                  <button className="ghost-btn action-btn" onClick={handleGenerateSar} title="Regenerate draft">
                    <RotateCw size={13} />
                    <span>Regenerate</span>
                  </button>
                </div>
              </div>

              {/* Warm Paper Surface (#EDE8DF) */}
              <div className="sar-paper-surface">
                {/* Faint DRAFT Watermark */}
                <div className="sar-draft-watermark" aria-hidden="true">
                  DRAFT
                </div>

                {/* Header: SAR DRAFT · ANALYST REVIEW REQUIRED */}
                <div className="sar-paper-header">
                  <div className="header-badge mono">
                    <AlertTriangle size={14} className="header-alert-icon" />
                    <span>SAR DRAFT · ANALYST REVIEW REQUIRED</span>
                  </div>
                  <div className="header-rule" />
                </div>

                {/* Paper Body Content (Exact system text from mockCaseReport) */}
                <div className="sar-paper-body">
                  <div className="legal-title-block mono">
                    <div className="pmla-header">CONFIDENTIAL SUSPICIOUS TRANSACTION REPORT (STR / SAR)</div>
                    <div className="pmla-sub">Section 12 of the Prevention of Money Laundering Act (PMLA), 2002.</div>
                    <div className="pmla-sub">Reporting Entity: FinTech Bank Fraud Ops Unit</div>
                  </div>

                  <div className="sar-section-block">
                    <div className="sar-block-title mono">SUBJECT OF REPORT</div>
                    <p className="sar-block-text mono">
                      Mule ring identified under Ring Identifier [<strong>{reportData?.ring_id || 'fan_1'}</strong>].
                      Primary nexus account: <strong>ACC_05001</strong>.
                    </p>
                  </div>

                  <div className="sar-section-block">
                    <div className="sar-block-title mono">NARRATIVE SUMMARY</div>
                    <p className="sar-block-text serif">
                      Between 2026-10-01 10:14:00 UTC and 10:35:00 UTC, account ACC_05001 received 11 rapid inbound
                      credits totaling ₹4,24,089.49 from disparate sender accounts across multiple jurisdictions.
                      In less than 15 minutes following receipt, approximately 94.2% (₹3,99,620.00) was systematically
                      fragmented and layered out to 6 secondary beneficiary accounts.
                    </p>
                    <p className="sar-block-text serif">
                      Money tracing confirms funds originated from unauthorized access/social engineering complaints.
                      Graph cut optimization identifies ACC_05001 as the pivotal min-cut bottleneck.
                    </p>
                  </div>

                  <div className="sar-section-block">
                    <div className="sar-block-title mono">RECOMMENDED ACTIONS</div>
                    <ol className="sar-ordered-list mono">
                      <li>
                        Immediate preventive debit-freeze on primary node ACC_05001 to stop residual and circulating funds.
                      </li>
                      <li>
                        Lien placement on downstream beneficiary accounts [ACC_05002 through ACC_05007].
                      </li>
                      <li>
                        Forwarding of case packet to the Indian Cyber Crime Coordination Centre (I4C / 1930 Helpline).
                      </li>
                    </ol>
                  </div>

                  {/* Analyst Notes from mockCaseReport */}
                  {mockCaseReport.analyst_notes && mockCaseReport.analyst_notes.length > 0 && (
                    <div className="sar-section-block">
                      <div className="sar-block-title mono">EVIDENTIARY AUDIT NOTES</div>
                      <ul className="sar-bullet-list mono">
                        {mockCaseReport.analyst_notes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="sar-paper-footer mono">
                    <span>MULETRACE AUDIT TRAIL: VALIDATED BY HUMAN ANALYST PRIOR TO EXTERNAL SUBMISSION</span>
                    <span>NO CLAIMS OF REGULATORY FINALITY UNTIL HUMAN COMPLIANCE OFFICER SIGN-OFF</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
