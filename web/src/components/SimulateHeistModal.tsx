import React, { useEffect, useRef, useState } from 'react';
import { Zap, X, ShieldAlert, Layers, ArrowRight } from 'lucide-react';
import scenariosData from '../data/scenarios.json';
import { formatIndianCurrency } from '../lib/utils';
import './SimulateHeistModal.css';

interface SimulateHeistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSimulation: (scenarioId: string, speed: number) => void;
}

export const SimulateHeistModal: React.FC<SimulateHeistModalProps> = ({
  isOpen,
  onClose,
  onStartSimulation,
}) => {
  const [selectedId, setSelectedId] = useState<string>('digital_arrest');
  const [speed, setSpeed] = useState<number>(1.0);
  const modalRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  const scenarios = Object.values(scenariosData);

  // Focus trap & Escape key handler
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
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

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
    // Focus first focusable element on open
    setTimeout(() => {
      firstButtonRef.current?.focus();
    }, 50);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="heist-modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div
        className="heist-modal-card forensic-panel"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner Ticks */}
        <span className="corner-tick tick-tl" />
        <span className="corner-tick tick-tr" />
        <span className="corner-tick tick-bl" />
        <span className="corner-tick tick-br" />

        {/* Modal Header */}
        <div className="heist-modal-header">
          <div className="heist-modal-title-group">
            <span className="heist-kicker">
              <Zap size={14} color="var(--signal)" />
              LIVE HEIST ADVERSARIAL SANDBOX
            </span>
            <h2 className="heist-modal-title">Select scenario</h2>
          </div>
          <button
            type="button"
            className="heist-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scenario Cards */}
        <div className="heist-scenarios-grid">
          {scenarios.map((sc) => {
            const isSelected = sc.id === selectedId;
            return (
              <div
                key={sc.id}
                className={`heist-scenario-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedId(sc.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedId(sc.id);
                  }
                }}
              >
                <div className="scenario-card-top">
                  <span className="scenario-badge-sim">SIMULATION</span>
                  <span className="scenario-hops-badge">
                    <Layers size={11} />
                    {sc.hops} hops
                  </span>
                </div>

                <div className="scenario-card-title">{sc.title}</div>
                <div className="scenario-card-desc">{sc.description}</div>

                <div className="scenario-card-footer">
                  <span className="scenario-amount-label">Stolen Inflow:</span>
                  <span className="scenario-amount-val mono">
                    {formatIndianCurrency(sc.initial_amount)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Speed Selector */}
        <div className="heist-speed-row">
          <span className="heist-speed-label">Playback Velocity:</span>
          <div className="heist-speed-pills">
            <button
              type="button"
              className={`speed-pill ${speed === 1.0 ? 'active' : ''}`}
              onClick={() => setSpeed(1.0)}
            >
              1x (500ms/step)
            </button>
            <button
              type="button"
              className={`speed-pill ${speed === 2.0 ? 'active' : ''}`}
              onClick={() => setSpeed(2.0)}
            >
              2x (250ms/step)
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="heist-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            ref={firstButtonRef}
            className="btn btn-primary heist-start-btn"
            onClick={() => {
              onStartSimulation(selectedId, speed);
              onClose();
            }}
          >
            <span>Start simulation</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
