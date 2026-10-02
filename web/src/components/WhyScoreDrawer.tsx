import React, { useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { api } from '../api/client';
import type { ExplainResponse } from '../api/types';
import { X, HelpCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const WhyScoreDrawer: React.FC = () => {
  const { whyScoreDrawerOpen, setWhyScoreDrawerOpen, selectedAccountId } = useStore();
  const [explain, setExplain] = useState<ExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (whyScoreDrawerOpen && selectedAccountId) {
      setLoading(true);
      api
        .getAccountExplain(selectedAccountId)
        .then((data) => setExplain(data))
        .finally(() => setLoading(false));
    }
  }, [whyScoreDrawerOpen, selectedAccountId]);

  if (!whyScoreDrawerOpen) return null;

  return (
    <div
      onClick={() => setWhyScoreDrawerOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(2px)',
        zIndex: 10000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px',
          maxWidth: '100vw',
          height: '100%',
          backgroundColor: 'var(--paper)',
          borderLeft: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={16} color="var(--signal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>Explainable AI (SHAP)</h3>
          </div>
          <button
            onClick={() => setWhyScoreDrawerOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton" style={{ height: '32px' }} />
              <div className="skeleton" style={{ height: '120px' }} />
              <div className="skeleton" style={{ height: '60px' }} />
            </div>
          ) : explain ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)', }}>
                  Target Account
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                    {explain.account_id}
                  </span>
                  <span
                    className="mono"
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: explain.risk_score >= 75 ? 'var(--signal)' : 'var(--signal)',
                    }}
                  >
                    Risk {explain.risk_score}/100
                  </span>
                </div>
              </div>

              {/* Feature Importance Table */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '10px', fontWeight: 600 }}>
                  TOP SHAP ATTRIBUTIONS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {explain.top_features.map((f, i) => {
                    const isPositive = f.direction === 'increases_risk';
                    return (
                      <div
                        key={i}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--paper-2)',
                          border: '1px solid var(--rule)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{f.label}</span>
                          <span
                            className="mono"
                            style={{
                              fontWeight: 600,
                              color: isPositive ? 'var(--signal)' : 'var(--ok)',
                            }}
                          >
                            {isPositive ? `+${f.shap_value.toFixed(2)}` : f.shap_value.toFixed(2)}
                          </span>
                        </div>
                        {/* Attribution bar */}
                        <div
                          style={{
                            height: '4px',
                            backgroundColor: 'var(--rule)',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.min(100, Math.abs(f.shap_value) * 200)}%`,
                              backgroundColor: isPositive ? 'var(--signal)' : 'var(--ok)',
                              }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Counterfactual Statement */}
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--paper-2)',
                  border: '1px solid var(--rule)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--signal)', marginBottom: '6px' }}>
                  <ArrowRight size={14} />
                  Counterfactual What-If
                </div>
                <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: '1.5' }}>
                  {explain.counterfactual}
                </p>
              </div>

              {/* Synthetic Attribution Note */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--ink-2)' }}>
                <CheckCircle2 size={13} color="var(--ink-2)" />
                <span>SHAP TreeExplainer run on 5,044 synthetic accounts</span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--ink-2)', fontSize: '13px' }}>No explanation available for this account.</div>
          )}
        </div>
      </div>
    </div>
  );
};
