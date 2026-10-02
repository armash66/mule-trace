import React, { useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { api } from '../api/client';
import type { FreezePlanResponse } from '../api/types';
import { formatLakhs } from '../lib/utils';
import { X, Lock, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

interface FreezePlanModalProps {
  ringId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const FreezePlanModal: React.FC<FreezePlanModalProps> = ({ ringId, isOpen, onClose }) => {
  const { showToast } = useStore();
  const [plan, setPlan] = useState<FreezePlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (isOpen && ringId) {
      setLoading(true);
      api
        .getRingFreezePlan(ringId)
        .then((data) => setPlan(data))
        .finally(() => setLoading(false));
    }
  }, [isOpen, ringId]);

  if (!isOpen) return null;

  const handleDispatch = async () => {
    if (!plan) return;
    setDispatching(true);
    try {
      await api.createFreezeRequest({
        ring_id: plan.ring_id,
        account_ids: plan.recommended_freeze_accounts,
        amount: plan.rupees_stopped,
        note: `Min-cut recommended bottleneck freeze stopping ${formatLakhs(plan.rupees_stopped)}.`,
      });
      showToast(
        `Freeze request dispatched for ${plan.recommended_freeze_accounts.join(', ')} (${formatLakhs(plan.rupees_stopped)})`,
        () => {
          showToast('Freeze dispatch reverted to draft.');
        }
      );
      onClose();
    } catch {
      showToast('Failed to dispatch freeze request.');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '540px',
          maxWidth: '92vw',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              Min-Cut Freeze Optimizer
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ink-3)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton" style={{ height: '40px' }} />
              <div className="skeleton" style={{ height: '80px' }} />
              <div className="skeleton" style={{ height: '60px' }} />
            </div>
          ) : plan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Top summary box */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                    Stoppable Funds (Min-Cut)
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ok)', marginTop: '2px' }}
                  >
                    {formatLakhs(plan.rupees_stopped)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
                    Already Lost / Escaped
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: plan.rupees_lost > 0 ? 'var(--risk-high)' : 'var(--ink-3)',
                      marginTop: '2px',
                    }}
                  >
                    {formatLakhs(plan.rupees_lost)}
                  </div>
                </div>
              </div>

              {/* Recommended Bottleneck Node */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '8px', fontWeight: 600 }}>
                  RECOMMENDED ACTION: FREEZE 1 BOTTLENECK ACCOUNT
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    backgroundColor: 'var(--accent-muted)',
                    border: '1px solid var(--accent)',
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  <div>
                    <div className="mono" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                      {plan.recommended_freeze_accounts.join(', ')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
                      Cuts 100% of forward propagation with single freeze order.
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      backgroundColor: 'var(--accent)',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-pill)',
                      fontWeight: 600,
                    }}
                  >
                    Optimal Cut
                  </span>
                </div>
              </div>

              {/* Alternative Cuts */}
              {plan.alternatives && plan.alternatives.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '6px', fontWeight: 600 }}>
                    ALTERNATIVE FREEZE STRATEGIES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {plan.alternatives.map((alt, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          border: '1px solid var(--line)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {alt.account_ids.length} accounts:
                          </span>{' '}
                          <span style={{ color: 'var(--ink-2)' }}>{alt.account_ids.slice(0, 3).join(', ')}{alt.account_ids.length > 3 ? '...' : ''}</span>
                        </div>
                        <div className="mono" style={{ color: 'var(--ink-2)' }}>
                          Stops {formatLakhs(alt.rupees_stopped)} ({(alt.efficiency * 100).toFixed(0)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '11px',
                  color: 'var(--ink-3)',
                  lineHeight: '1.4',
                }}
              >
                <AlertTriangle size={14} color="var(--risk-mid)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Freeze recommendation computed via NetworkX Edmonds-Karp min-cut on synthetic flow graph.
                  Requires human fraud investigator sign-off prior to FinTech API transmission.
                </span>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--ink-3)', fontSize: '13px' }}>No freeze plan computed.</div>
          )}
        </div>

        {/* Footer actions */}
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--surface-raised)',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 14px',
              backgroundColor: 'transparent',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink-2)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            disabled={!plan || dispatching}
            onClick={handleDispatch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: dispatching ? 'not-allowed' : 'pointer',
              opacity: dispatching ? 0.7 : 1,
            }}
          >
            <CheckCircle size={14} />
            {dispatching ? 'Dispatching...' : 'Dispatch Freeze Request'}
          </button>
        </div>
      </div>
    </div>
  );
};
