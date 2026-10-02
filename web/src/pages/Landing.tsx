import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Lock,
  ArrowRight,
  Network,
  CheckCircle,
  FileText,
  Sliders,
  Play,
} from 'lucide-react';

export const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
            }}
          >
            MT
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em' }}>MuleTrace</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/patterns')}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Typology Guide
          </button>
          <button
            onClick={() => navigate('/performance')}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '13px',
              color: 'var(--ink-2)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Model Performance
          </button>
          <button
            onClick={() => navigate('/workspace')}
            style={{
              padding: '7px 14px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Launch Investigation →
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div style={{ padding: '60px 32px 40px', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        {/* Synthetic Honest Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            fontSize: '11px',
            color: 'var(--ink-2)',
            marginBottom: '20px',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--ok)' }} />
          <span>Tested on 62,218 transactions • 0 / 9 decoys false flagged</span>
        </div>

        <h1
          style={{
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: '1.15',
            color: 'var(--ink)',
            marginBottom: '16px',
          }}
        >
          Follow the Money.<br />Stop the Syndicate.
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: 'var(--ink-2)',
            maxWidth: '680px',
            margin: '0 auto 28px',
            lineHeight: '1.6',
          }}
        >
          MuleTrace detects multi-hop money mule networks across Indian banking channels (UPI, IMPS, NEFT), quantifies stolen funds taint in rupees, and computes optimal min-cut freeze interventions before cash-out.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/workspace')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Live Workspace Demo</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => navigate('/replay/fan_1')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 20px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            <Play size={14} />
            <span>Interactive Replay</span>
          </button>
        </div>
      </div>

      {/* 4-Step Story (Detect, Quantify, Act, Comply) */}
      <div style={{ padding: '40px 32px 60px', maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {/* Step 1 */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              01 • DETECT
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Graph Typologies & ML Anomaly
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Pure algorithms detect fan hubs, cycles, pass-through chains, and device clusters. Paired with IsolationForest and SHAP explainability.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              02 • QUANTIFY
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Haircut Taint Tracing
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Time-respecting haircut propagation tracks stolen funds through partial forwards and mergers, calculating exact rupee exposure per account.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              03 • ACT
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Min-Cut Freeze Optimizer
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Time-expanded flow network and minimum s-t cut compute the cheapest set of accounts to freeze that stops the maximum money.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              04 • COMPLY
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Regulatory STR / SAR
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              One-click generation of FIU-IND compliant case files with masked PII and evidentiary money flow timelines for law enforcement handoff.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
