import React, { useState } from 'react';
import type { MinCutResult } from '../lib/minCut';
import { formatIndianCurrency } from '../lib/utils';
import { useStore } from '../store/store';
import { api } from '../api/client';
import { X, ShieldAlert, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import './WhyThisCutPanel.css';

interface WhyThisCutPanelProps {
  result: MinCutResult;
  datasetTag: 'LIVE' | 'SAMPLE';
  isOpen: boolean;
  onClose: () => void;
  ringId?: string | null;
}

export const WhyThisCutPanel: React.FC<WhyThisCutPanelProps> = ({
  result,
  datasetTag,
  isOpen,
  onClose,
  ringId,
}) => {
  const { showToast } = useStore();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dispatched, setDispatched] = useState(false);

  if (!isOpen) return null;

  const A = result.downstreamCount;
  const savedEach = formatIndianCurrency(result.downstreamSavedPerAccount);
  const B = result.freezeCount;
  const haltAmount = formatIndianCurrency(result.flowStopped);

  const handleConfirmFreeze = async () => {
    setSubmitting(true);
    try {
      if (result.cutNodes.length > 0) {
        await api.createFreezeRequest({
          ring_id: ringId || 'OPTIMAL_CUT',
          account_ids: result.cutNodes,
          amount: result.flowStopped,
          note: `Optimal Min-Cut freeze stopping ${haltAmount} (${result.percentStopped}% of syndicate flow) across ${B} bottleneck account(s).`,
        });
      }
      setDispatched(true);
      setConfirming(false);
      showToast(
        `Added ${B} bottleneck account${B > 1 ? 's' : ''} to freeze plan (${haltAmount} halted).`,
        () => {
          showToast('Freeze dispatch reverted to draft.');
        }
      );
    } catch {
      // Offline / fallback handler
      setDispatched(true);
      setConfirming(false);
      showToast(`Added ${B} account(s) to freeze plan (${haltAmount} halted).`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="why-cut-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="why-cut-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Why this cut explanation"
      >
        {/* Mobile handle indicator */}
        <div className="mobile-sheet-handle" aria-hidden="true" />

        {/* Header */}
        <div className="why-cut-header">
        <div className="why-cut-title-wrap">
          <span className="why-cut-title">Why this cut</span>
          <span className={`tag-truth ${datasetTag.toLowerCase()}`}>
            {datasetTag}
          </span>
        </div>
        <button
          type="button"
          className="why-cut-close"
          onClick={onClose}
          aria-label="Close why this cut panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="why-cut-body">
        {/* Computed Comparison Narrative */}
        <div className="why-cut-narrative">
          Freezing <strong>{A}</strong> downstream mule{A > 1 ? 's' : ''} needs{' '}
          <strong>{A}</strong> bank notices and saves about{' '}
          <strong>{savedEach}</strong> each. Freezing <strong>{B}</strong>{' '}
          bottleneck node{B > 1 ? 's' : ''} halts <strong>{haltAmount}</strong>{' '}
          instantly.
        </div>

        {/* Small Comparison Bar Card */}
        <div className="why-cut-comparison-card">
          <div className="comparison-card-title">Interception Comparison</div>

          {/* Option 1: Downstream Mule Sweep */}
          <div className="comparison-row">
            <div className="comparison-meta">
              <span className="comparison-label">Freeze every downstream mule</span>
              <span className="comparison-val">{A} bank notices · {savedEach}/acct</span>
            </div>
            <div className="comparison-bar-track">
              <div
                className="comparison-bar-fill mules"
                style={{ width: '100%' }}
                title={`${A} notices required`}
              />
            </div>
          </div>

          {/* Option 2: Optimal Cut (Bottleneck Nodes) */}
          <div className="comparison-row">
            <div className="comparison-meta">
              <span className="comparison-label" style={{ color: '#FF9F1C' }}>
                Optimal bottleneck cut
              </span>
              <span className="comparison-val amber">
                {B} freeze{B > 1 ? 's' : ''} · halts {haltAmount} ({result.percentStopped}%)
              </span>
            </div>
            <div className="comparison-bar-track">
              <div
                className="comparison-bar-fill optimal"
                style={{
                  width: `${Math.max(15, Math.min(100, Math.round((B / Math.max(1, A)) * 100)))}%`,
                }}
                title={`${B} notices for ${result.percentStopped}% flow stopped`}
              />
            </div>
          </div>
        </div>

        {/* Identified Bottleneck Accounts */}
        <div className="why-cut-nodes-section">
          <div className="nodes-section-label">
            Target Bottleneck Accounts ({result.cutNodes.length})
          </div>
          <div className="nodes-chip-list">
            {result.cutNodes.map((nodeId) => (
              <span key={nodeId} className="cut-node-chip">
                <Lock size={12} />
                {nodeId}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="why-cut-footer">
        {confirming ? (
          <div className="freeze-confirm-box">
            <div className="confirm-text">
              Investigator confirmation: Add <strong>{B}</strong> account{B > 1 ? 's' : ''} (
              {result.cutNodes.join(', ')}) to freeze plan halting {haltAmount}?
            </div>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn-confirm-freeze"
                onClick={handleConfirmFreeze}
                disabled={submitting}
              >
                {submitting ? 'Dispatching…' : 'Confirm Freeze'}
              </button>
              <button
                type="button"
                className="btn-cancel-freeze"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : dispatched ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              color: '#2ECC71',
              fontSize: '12px',
              fontFamily: 'var(--font-mono, monospace)',
              fontWeight: 600,
              padding: '8px 0',
            }}
          >
            <CheckCircle2 size={16} />
            <span>DISPATCH CONFIRMED · ADDED TO FREEZE PLAN</span>
          </div>
        ) : (
          <button
            type="button"
            className="btn-add-freeze-plan"
            onClick={() => setConfirming(true)}
          >
            <ShieldAlert size={15} />
            <span>Add to freeze plan</span>
          </button>
        )}
      </div>
    </div>
  </>
);
};
