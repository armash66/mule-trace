import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import { formatLakhs } from '../lib/utils';
import {
  ShieldAlert,
  Lock,
  CheckCircle2,
  Fingerprint,
  ArrowRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export const MobileOnCall: React.FC = () => {
  const { ringId: routeRingId } = useParams<{ ringId?: string }>();
  const activeRing = routeRingId || 'fan_1';
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [biometricOpen, setBiometricOpen] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTriggerBiometric = () => {
    setBiometricOpen(true);
  };

  const handleConfirmBiometric = async () => {
    setLoading(true);
    try {
      await api.createFreezeRequest({
        ring_id: activeRing,
        account_ids: ['ACC_05001'],
        amount: 424089.49,
        note: 'Emergency mobile on-call freeze authorized via biometric signature.',
      });
      setFrozen(true);
      setBiometricOpen(false);
      showToast('Emergency freeze dispatched successfully.');
    } catch {
      showToast('Freeze authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Mobile Frame Container (Max 420px) */}
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line-strong)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface-raised)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: 8,
                height: 8,
                backgroundColor: 'var(--risk-high)',
                animation: 'subtlePulse 1s infinite',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
              MuleTrace On-Call Triage
            </span>
          </div>

          <span
            className="mono"
            style={{
              fontSize: '11px',
              backgroundColor: 'var(--accent-muted)',
              color: 'var(--accent)',
              padding: '2px 6px',
              fontWeight: 600,
            }}
          >
            P1 HIGH
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px' }}>
          {/* Status Alert Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--accent-muted)',
              border: '1px solid var(--line)',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>
              Urgent Incident #{activeRing}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              Fan-In/Out Mule Syndicate
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
              Detected 14 min ago • 11 victim complaints aggregated.
            </div>
          </div>

          {/* Rupees at Risk */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>At Risk</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--risk-high)', marginTop: '2px' }}>
                ₹4.24 Lakhs
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Bottleneck Node</div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
                ACC_05001
              </div>
            </div>
          </div>

          {/* Action Recommendation */}
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              fontSize: '12px',
              color: 'var(--ink-2)',
              marginBottom: '20px',
              lineHeight: '1.4',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Recommended Action: </span>
            Debit-freeze primary bottleneck node ACC_05001 to prevent ₹3.99L dispersion to 6 layered beneficiary accounts.
          </div>

          {/* Action Button */}
          {frozen ? (
            <div
              style={{
                padding: '14px',
                backgroundColor: 'rgba(47, 143, 91, 0.1)',
                border: '1px solid var(--ok)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: 'var(--ok)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Emergency Freeze Dispatched</span>
            </div>
          ) : (
            <button
              onClick={handleTriggerBiometric}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: 'var(--accent)',
                color: 'var(--paper)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                }}
            >
              <Lock size={16} />
              <span>Authorize Freeze (₹4.24L)</span>
            </button>
          )}

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              onClick={() => navigate('/workspace/ACC_05001')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--ink-2)',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Open Full Desktop Investigate →
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Biometric Modal */}
      {biometricOpen && (
        <div
          onClick={() => setBiometricOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '320px',
              backgroundColor: 'var(--surface)',
              padding: '24px',
              textAlign: 'center',
              }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'var(--accent-muted)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Fingerprint size={36} />
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', marginBottom: '6px' }}>
              Confirm Freeze Authorization
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '20px' }}>
              Touch sensor or use Face ID to authorize statutory freeze on ACC_05001.
            </p>

            <button
              onClick={handleConfirmBiometric}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: 'var(--accent)',
                color: 'var(--paper)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {loading ? 'Authorizing...' : 'Authorize with Biometrics'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
