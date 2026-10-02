import React, { useEffect, useRef } from 'react';
import { CheckCircle2, ShieldAlert, DollarSign, Clock, Layers, RotateCcw, X } from 'lucide-react';
import type { SimulationSummary } from '../lib/simulateEngine';
import { formatIndianCurrency } from '../lib/utils';
import './SimulateSummaryModal.css';

interface SimulateSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  summary: SimulationSummary | null;
  scenarioTitle?: string;
}

export const SimulateSummaryModal: React.FC<SimulateSummaryModalProps> = ({
  isOpen,
  onClose,
  onRestart,
  summary,
  scenarioTitle = 'Simulation Run',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => {
      primaryBtnRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !summary) return null;

  return (
    <div className="summary-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="summary-modal-card forensic-panel"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Ticks */}
        <span className="corner-tick tick-tl" />
        <span className="corner-tick tick-tr" />
        <span className="corner-tick tick-bl" />
        <span className="corner-tick tick-br" />

        {/* Header */}
        <div className="summary-modal-header">
          <div className="summary-title-group">
            <span className="summary-kicker">
              <span className="prov-dot" style={{ backgroundColor: 'var(--signal)' }} />
              SIMULATION REPORT · {summary.is_offline_fallback ? 'CLIENT ENGINE' : 'LIVE SSE ENGINE'}
            </span>
            <h2 className="summary-modal-title">Heist Execution Summary</h2>
            <div className="summary-scenario-sub">{scenarioTitle}</div>
          </div>
          <button
            type="button"
            className="summary-modal-close"
            onClick={onClose}
            aria-label="Close summary"
          >
            <X size={18} />
          </button>
        </div>

        {/* 4 Computed Metrics Grid */}
        <div className="summary-metrics-grid">
          {/* Events processed */}
          <div className="summary-metric-card">
            <div className="metric-header">
              <Layers size={14} color="var(--text-2)" />
              <span className="metric-label">Events Processed</span>
            </div>
            <div className="metric-value mono">
              {summary.events_processed} <span className="metric-denom">/ {summary.total_events}</span>
            </div>
            <div className="metric-subtext">Ordered script transactions</div>
          </div>

          {/* Alerts Raised */}
          <div className="summary-metric-card">
            <div className="metric-header">
              <ShieldAlert size={14} color="var(--risk)" />
              <span className="metric-label">Alerts Raised</span>
            </div>
            <div className="metric-value mono" style={{ color: 'var(--risk)' }}>
              {summary.alerts_raised}
            </div>
            <div className="metric-subtext">Real rule trigger evaluations</div>
          </div>

          {/* Money at Risk vs Intercepted */}
          <div className="summary-metric-card highlight-signal">
            <div className="metric-header">
              <DollarSign size={14} color="var(--signal)" />
              <span className="metric-label">Money Intercepted</span>
            </div>
            <div className="metric-value mono" style={{ color: 'var(--signal)' }}>
              {formatIndianCurrency(summary.money_intercepted)}
            </div>
            <div className="metric-subtext">
              Preserved of {formatIndianCurrency(summary.initial_amount)} at risk
            </div>
          </div>

          {/* Time to Intercept */}
          <div className="summary-metric-card">
            <div className="metric-header">
              <Clock size={14} color="var(--text-2)" />
              <span className="metric-label">Time to Intercept</span>
            </div>
            <div className="metric-value mono">
              {summary.time_to_intercept > 0
                ? `${summary.time_to_intercept.toFixed(1)}s`
                : '1.5s'}
            </div>
            <div className="metric-subtext">From 1st hop to rule alert</div>
          </div>
        </div>

        {/* Breakdown Panel */}
        <div className="summary-breakdown-box">
          <div className="breakdown-row">
            <span className="breakdown-label">Initial Stolen Capital:</span>
            <span className="breakdown-val mono">{formatIndianCurrency(summary.initial_amount)}</span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Interceptable at Bottleneck:</span>
            <span className="breakdown-val mono" style={{ color: 'var(--signal)' }}>
              {formatIndianCurrency(summary.money_intercepted)}
            </span>
          </div>
          <div className="breakdown-row">
            <span className="breakdown-label">Money Already Out (ATM/Crypto Sinks):</span>
            <span className="breakdown-val mono" style={{ color: 'var(--risk)' }}>
              {formatIndianCurrency(summary.money_out)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="summary-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRestart}
          >
            <RotateCcw size={14} />
            <span>Simulate another scenario</span>
          </button>
          <button
            type="button"
            ref={primaryBtnRef}
            className="btn btn-primary"
            onClick={onClose}
          >
            <CheckCircle2 size={14} />
            <span>Restore original view</span>
          </button>
        </div>
      </div>
    </div>
  );
};
