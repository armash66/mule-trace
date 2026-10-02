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
    <div style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header
        style={{
          height: '60px',
          borderBottom: '1px solid var(--rule)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          backgroundColor: 'var(--paper)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              backgroundColor: 'var(--signal)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--paper)',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: ''JetBrains Mono'',
            }}
          >
            MT
          </div>
          <span style={{ fontSize: '16px', fontWeight: 800, }}>MuleTrace</span>
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
            How it works
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
            Accuracy
          </button>
          <button
            onClick={() => navigate('/workspace')}
            style={{
              padding: '7px 14px',
              backgroundColor: 'var(--signal)',
              color: 'var(--paper)',
              border: 'none',
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
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--rule)',
            padding: '4px 12px',
            fontSize: '11px',
            color: 'var(--ink-2)',
            marginBottom: '20px',
          }}
        >
          <span style={{ width: 6, height: 6, backgroundColor: 'var(--ok)' }} />
          <span>Tested on 62,218 transactions • 0 / 9 decoys false flagged</span>
        </div>

        <h1
          style={{
            fontSize: '44px',
            fontWeight: 800,
            lineHeight: '1.15',
            color: 'var(--ink)',
            marginBottom: '16px',
          }}
        >
          Follow the money.<br />Stop the ring.
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
          MuleTrace detects multi-hop money mule networks across Indian banking channels, quantifies traced money in rupees, and computes the cheapest set of accounts to freeze.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/workspace')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 22px',
              backgroundColor: 'var(--signal)',
              color: 'var(--paper)',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>Live Investigate Demo</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={() => navigate('/replay/fan_1')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '11px 20px',
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--rule)',
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
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--rule)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--signal)', fontWeight: 700, marginBottom: '8px' }}>
              01 • DETECT
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Four ways stolen money moves
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Four simple patterns reveal money that moves in unusual ways.
            </p>
          </div>

          {/* Step 2 */}
          <div
            style={{
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--rule)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--signal)', fontWeight: 700, marginBottom: '8px' }}>
              02 • QUANTIFY
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Trace the money
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Follow stolen money through each account and see the amount at risk.
            </p>
          </div>

          {/* Step 3 */}
          <div
            style={{
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--rule)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--signal)', fontWeight: 700, marginBottom: '8px' }}>
              03 • ACT
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Cut here
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Find the fewest accounts to freeze and stop the most money.
            </p>
          </div>

          {/* Step 4 */}
          <div
            style={{
              backgroundColor: 'var(--paper)',
              border: '1px solid var(--rule)',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--signal)', fontWeight: 700, marginBottom: '8px' }}>
              04 • COMPLY
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>
              Case report
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: '1.5' }}>
              Create a clear report with masked details and a money flow timeline.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
