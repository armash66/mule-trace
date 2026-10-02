import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUp, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import './CtaSection.css';

interface CtaSectionProps {
  onOpenPresenter?: () => void;
  pageVisible?: boolean;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenPresenter, pageVisible = true }) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  // Three sequential beats: 1 -> 2 -> 3
  const [beat, setBeat] = useState<number>(prefersReduced ? 3 : 0);

  useEffect(() => {
    if (prefersReduced) {
      setBeat(3);
      return;
    }
    const t1 = setTimeout(() => setBeat(1), 150);
    const t2 = setTimeout(() => setBeat(2), 500);
    const t3 = setTimeout(() => setBeat(3), 850);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [prefersReduced]);

  const handleReplay = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="cta-section" id="cta">
      {/* Ghosted Hero Network SVG at 12% opacity */}
      <div className="cta-ghost-network" aria-hidden="true">
        <svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid slice" className="ghost-svg">
          <g stroke="#FF9F1C" strokeWidth="1" strokeDasharray="3 3">
            <line x1="200" y1="150" x2="600" y2="300" />
            <line x1="150" y1="350" x2="600" y2="300" />
            <line x1="300" y1="480" x2="600" y2="300" />
            <line x1="600" y1="300" x2="900" y2="150" />
            <line x1="600" y1="300" x2="1050" y2="280" />
            <line x1="600" y1="300" x2="950" y2="450" />
            <line x1="900" y1="150" x2="1050" y2="280" />
            <line x1="950" y1="450" x2="1050" y2="280" />
          </g>
          <g fill="#07080A">
            <circle cx="200" cy="150" r="14" stroke="#7C93B8" strokeWidth="2" />
            <circle cx="150" cy="350" r="12" stroke="#7C93B8" strokeWidth="2" />
            <circle cx="300" cy="480" r="16" stroke="#7C93B8" strokeWidth="2" />
            <circle cx="600" cy="300" r="32" stroke="#FF4B4B" strokeWidth="3" />
            <circle cx="900" cy="150" r="18" stroke="#FF9F1C" strokeWidth="2" />
            <circle cx="1050" cy="280" r="16" stroke="#FF9F1C" strokeWidth="2" />
            <circle cx="950" cy="450" r="18" stroke="#FF9F1C" strokeWidth="2" />
          </g>
        </svg>
      </div>

      <div className="god-wrap cta-wrap">
        <div className="cta-content-card">
          <span className="cta-kicker mono">09 · CONVICTION & DEPLOYMENT</span>

          {/* Three Sequential Beats: "FIND THE PATTERN." / "FOLLOW THE MONEY." / "EXPLAIN THE RISK." */}
          <h2 className="cta-beats-heading serif">
            <span className={`beat-line beat-1 ${beat >= 1 ? 'revealed' : 'hidden-beat'}`}>
              FIND THE PATTERN.
            </span>
            <span className={`beat-line beat-2 ${beat >= 2 ? 'revealed' : 'hidden-beat'}`}>
              FOLLOW THE MONEY.
            </span>
            <span className={`beat-line beat-3 ${beat >= 3 ? 'revealed' : 'hidden-beat'}`}>
              <em>EXPLAIN THE RISK.</em>
            </span>
          </h2>

          <p className="cta-subhead">
            Experience MuleTrace across live synthetic banking topologies. Audit flagged mule clusters, test
            sub-second graph traversal, or generate regulatory-ready SAR narratives.
          </p>

          {/* Action Buttons: "LAUNCH MULETRACE" and "Replay the story" */}
          <div className="cta-button-group">
            <button
              className="primary-btn hero-cta-btn"
              onClick={() => navigate('/workspace/ACC_05001')}
            >
              <span>LAUNCH MULETRACE</span>
              <ArrowRight size={15} />
            </button>
            <button className="ghost-btn replay-btn" onClick={handleReplay}>
              <ArrowUp size={14} />
              <span>Replay the story</span>
            </button>
            <button className="ghost-btn overview-btn" onClick={() => navigate('/overview')}>
              <span>Command Center</span>
            </button>
          </div>

          {/* Mandatory Responsible Use Notice */}
          <div className="compliance-disclaimer mono">
            Scores support analyst decisions; MuleTrace does not act on accounts automatically.
          </div>
        </div>
      </div>

      {/* Footer: Wordmark, Nav Links, Mandatory Disclaimer */}
      <footer className="god-footer">
        <div className="god-wrap footer-inner">
          <div className="footer-left">
            <span className="serif logo-foot">MuleTrace</span>
            <span className="mono foot-desc">Autonomous Anti-Money Laundering Graph Intelligence</span>
          </div>
          <div className="footer-links mono">
            <a href="#problem">The Problem</a>
            <a href="#approach">Pipeline</a>
            <a href="#features">Architecture</a>
            <a href="#xai">XAI Decisioning</a>
            <a href="#sar">SAR Reporting</a>
            {onOpenPresenter && (
              <button className="foot-link" onClick={onOpenPresenter}>
                <Sparkles size={11} className="text-signal" />
                <span>Presenter Mode</span>
              </button>
            )}
          </div>
          <div className="footer-copy mono">
            <span>© 2026 MuleTrace. All synthetic test datasets cryptographically anonymized.</span>
            <span className="footer-rule-notice">
              Scores support analyst decisions; MuleTrace does not act on accounts automatically.
            </span>
          </div>
        </div>
      </footer>
    </section>
  );
};
