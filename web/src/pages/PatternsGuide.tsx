import React from 'react';
import { useNavigate } from 'react-router-dom';

export const PatternsGuide: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '48px 36px', maxWidth: '1080px', margin: '0 auto', backgroundColor: 'var(--paper)' }}>
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '40px' }}>
        <h1 className="t-head" style={{ color: 'var(--ink)', fontSize: '28px', marginBottom: '8px' }}>
          Four ways stolen money moves
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--ink-2)' }}>
          Each one looks normal alone. Together they give it away.
        </p>
      </div>

      {/* 4 ROWS */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* ROW 1: Collect and split */}
        <div className="rule-top" style={{ padding: '32px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 260px', gap: '24px', alignItems: 'start' }}>
            <div className="t-hero" style={{ color: 'var(--ink)', lineHeight: 0.9 }}>
              1
            </div>

            <div>
              <h2 className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
                Collect and split
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.5, marginBottom: '6px' }}>
                Many people pay one account. It sends the money on within minutes.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginBottom: '14px' }}>
                Not fraud when: It is payroll. Money only goes out.
              </p>

              <details className="mono" style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
                <summary style={{ outline: 'none' }}>Settings</summary>
                <div style={{ marginTop: '6px', color: 'var(--ink)' }}>
                  30 min window · 6 senders minimum · 80% forwarded
                </div>
              </details>
            </div>

            <div>
              <svg viewBox="0 0 240 100" style={{ width: '100%', height: '100px' }}>
                <defs>
                  <marker id="arrow1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ink)" />
                  </marker>
                </defs>
                {/* 5 dots left */}
                {[12, 31, 50, 69, 88].map((y, i) => (
                  <g key={`in-${i}`}>
                    <circle cx="30" cy={y} r="5" fill="var(--ink)" />
                    <line x1="35" y1={y} x2="110" y2="50" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow1)" />
                  </g>
                ))}
                {/* 1 signal dot in middle */}
                <circle cx="120" cy="50" r="7" fill="var(--signal)" />
                {/* 4 dots right */}
                {[20, 40, 60, 80].map((y, i) => (
                  <g key={`out-${i}`}>
                    <line x1="128" y1="50" x2="200" y2={y} stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow1)" />
                    <circle cx="208" cy={y} r="5" fill="var(--ink)" />
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* ROW 2: Round trip */}
        <div className="rule-top" style={{ padding: '32px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 260px', gap: '24px', alignItems: 'start' }}>
            <div className="t-hero" style={{ color: 'var(--ink)', lineHeight: 0.9 }}>
              2
            </div>

            <div>
              <h2 className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
                Round trip
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.5, marginBottom: '6px' }}>
                Money travels in a circle and ends where it started.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginBottom: '14px' }}>
                Not fraud when: It is a refund days later.
              </p>

              <details className="mono" style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
                <summary style={{ outline: 'none' }}>Settings</summary>
                <div style={{ marginTop: '6px', color: 'var(--ink)' }}>
                  3 to 5 hops · 45 min duration · Shrinking amounts
                </div>
              </details>
            </div>

            <div>
              <svg viewBox="0 0 240 100" style={{ width: '100%', height: '100px' }}>
                <defs>
                  <marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ink)" />
                  </marker>
                </defs>
                {/* 4 dots in a square loop */}
                <circle cx="70" cy="25" r="7" fill="var(--signal)" />
                <circle cx="170" cy="25" r="5" fill="var(--ink)" />
                <circle cx="170" cy="75" r="5" fill="var(--ink)" />
                <circle cx="70" cy="75" r="5" fill="var(--ink)" />

                <line x1="78" y1="25" x2="160" y2="25" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="170" y1="32" x2="170" y2="66" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="162" y1="75" x2="80" y2="75" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow2)" />
                <line x1="70" y1="67" x2="70" y2="34" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow2)" />
              </svg>
            </div>
          </div>
        </div>

        {/* ROW 3: Quick relay */}
        <div className="rule-top" style={{ padding: '32px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 260px', gap: '24px', alignItems: 'start' }}>
            <div className="t-hero" style={{ color: 'var(--ink)', lineHeight: 0.9 }}>
              3
            </div>

            <div>
              <h2 className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
                Quick relay
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.5, marginBottom: '6px' }}>
                Each account passes nearly all the money on, fast.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginBottom: '14px' }}>
                Not fraud when: The account keeps a normal balance.
              </p>

              <details className="mono" style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
                <summary style={{ outline: 'none' }}>Settings</summary>
                <div style={{ marginTop: '6px', color: 'var(--ink)' }}>
                  4 hops · 8 min transit · 95% forwarded
                </div>
              </details>
            </div>

            <div>
              <svg viewBox="0 0 240 100" style={{ width: '100%', height: '100px' }}>
                <defs>
                  <marker id="arrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="var(--ink)" />
                  </marker>
                </defs>
                {/* 5 dots in a row joined by arrows */}
                <circle cx="28" cy="50" r="7" fill="var(--signal)" />
                <line x1="36" y1="50" x2="68" y2="50" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow3)" />

                <circle cx="76" cy="50" r="5" fill="var(--ink)" />
                <line x1="82" y1="50" x2="114" y2="50" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow3)" />

                <circle cx="122" cy="50" r="5" fill="var(--ink)" />
                <line x1="128" y1="50" x2="160" y2="50" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow3)" />

                <circle cx="168" cy="50" r="5" fill="var(--ink)" />
                <line x1="174" y1="50" x2="204" y2="50" stroke="var(--ink)" strokeWidth="1.5" markerEnd="url(#arrow3)" />

                <circle cx="212" cy="50" r="5" fill="var(--ink)" />
              </svg>
            </div>
          </div>
        </div>

        {/* ROW 4: Same-device group */}
        <div className="rule-top" style={{ padding: '32px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 260px', gap: '24px', alignItems: 'start' }}>
            <div className="t-hero" style={{ color: 'var(--ink)', lineHeight: 0.9 }}>
              4
            </div>

            <div>
              <h2 className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
                Same-device group
              </h2>
              <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.5, marginBottom: '6px' }}>
                New accounts that share one phone, device or address.
              </p>
              <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginBottom: '14px' }}>
                Not fraud when: It is a family on one home Wi-Fi.
              </p>

              <details className="mono" style={{ color: 'var(--ink-2)', cursor: 'pointer' }}>
                <summary style={{ outline: 'none' }}>Settings</summary>
                <div style={{ marginTop: '6px', color: 'var(--ink)' }}>
                  Under 30 days old · 3+ linked accounts
                </div>
              </details>
            </div>

            <div>
              <svg viewBox="0 0 240 100" style={{ width: '100%', height: '100px' }}>
                {/* 4 dots around rectangle */}
                <circle cx="120" cy="14" r="5" fill="var(--ink)" />
                <line x1="120" y1="20" x2="120" y2="34" stroke="var(--ink)" strokeWidth="1.5" />

                <circle cx="120" cy="86" r="5" fill="var(--ink)" />
                <line x1="120" y1="80" x2="120" y2="66" stroke="var(--ink)" strokeWidth="1.5" />

                <circle cx="44" cy="50" r="5" fill="var(--ink)" />
                <line x1="50" y1="50" x2="84" y2="50" stroke="var(--ink)" strokeWidth="1.5" />

                <circle cx="196" cy="50" r="5" fill="var(--ink)" />
                <line x1="190" y1="50" x2="156" y2="50" stroke="var(--ink)" strokeWidth="1.5" />

                {/* Rectangle labelled 1 device in signal */}
                <rect x="85" y="35" width="70" height="30" fill="transparent" stroke="var(--signal)" strokeWidth="1.5" />
                <text x="120" y="54" textAnchor="middle" fill="var(--signal)" className="mono" style={{ fontSize: '11px' }}>
                  1 device
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Bottom Action: Try the demo linking to Overview */}
        <div className="rule-top" style={{ paddingTop: '28px' }}>
          <button type="button" className="btn" onClick={() => navigate('/')}>
            Try the demo
          </button>
        </div>
      </div>
    </div>
  );
};
