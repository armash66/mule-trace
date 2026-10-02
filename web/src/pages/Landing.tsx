import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import {
  Play, Upload, Database, Shield, Zap, BarChart3,
  ArrowRight, Sun, Moon, CheckCircle, Search, GitBranch,
} from 'lucide-react';

export default function Landing() {
  const { theme, toggleTheme, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated hero network
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 600;
    const H = 400;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    // Generate network nodes
    const nodes = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: 60 + Math.random() * (W - 120),
      y: 40 + Math.random() * (H - 80),
      r: 4 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      isMule: i < 8,
      risk: i < 3 ? 1 : i < 8 ? 0.7 : 0.1,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    // Generate edges
    const edges: { from: number; to: number; amount: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const from = Math.floor(Math.random() * nodes.length);
      let to = Math.floor(Math.random() * nodes.length);
      while (to === from) to = Math.floor(Math.random() * nodes.length);
      edges.push({ from, to, amount: 500 + Math.random() * 10000 });
    }

    // Particle system for money flow
    interface Particle {
      edge: number;
      t: number;
      speed: number;
      color: string;
    }
    const particles: Particle[] = [];
    let frame = 0;

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Update nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 30 || n.x > W - 30) n.vx *= -1;
        if (n.y < 30 || n.y > H - 30) n.vy *= -1;
      });

      // Draw edges
      edges.forEach((e, ei) => {
        const from = nodes[e.from];
        const to = nodes[e.to];
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = from.isMule || to.isMule
          ? 'rgba(255,77,94,.12)'
          : 'rgba(45,212,191,.06)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Spawn particles
      if (frame % 12 === 0) {
        const ei = Math.floor(Math.random() * edges.length);
        const e = edges[ei];
        const fromNode = nodes[e.from];
        particles.push({
          edge: ei,
          t: 0,
          speed: 0.008 + Math.random() * 0.012,
          color: fromNode.isMule ? '#FF4D5E' : '#2DD4BF',
        });
      }

      // Draw & update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.speed;
        if (p.t > 1) { particles.splice(i, 1); continue; }

        const e = edges[p.edge];
        const from = nodes[e.from];
        const to = nodes[e.to];
        const x = from.x + (to.x - from.x) * p.t;
        const y = from.y + (to.y - from.y) * p.t;

        ctx.beginPath();
        ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 1 - p.t * 0.5;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(frame * 0.02 + n.pulsePhase) * 0.3 + 0.7;

        // Glow for mule nodes
        if (n.isMule) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,77,94,${0.08 * pulse})`;
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        if (n.risk > 0.8) {
          ctx.fillStyle = `rgba(255,77,94,${0.6 + pulse * 0.4})`;
        } else if (n.risk > 0.5) {
          ctx.fillStyle = 'rgba(251,124,60,.6)';
        } else {
          ctx.fillStyle = `rgba(45,212,191,${0.3 + pulse * 0.2})`;
        }
        ctx.fill();
        ctx.strokeStyle = n.isMule ? 'rgba(255,77,94,.5)' : 'rgba(45,212,191,.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Ring outline
      const muleNodes = nodes.filter(n => n.isMule);
      if (muleNodes.length > 2) {
        const cx = muleNodes.reduce((s, n) => s + n.x, 0) / muleNodes.length;
        const cy = muleNodes.reduce((s, n) => s + n.y, 0) / muleNodes.length;
        const maxR = Math.max(...muleNodes.map(n =>
          Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2)
        )) + 20;

        const dashOffset = frame * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,77,94,.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = dashOffset;
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        if (frame % 300 < 200) {
          const alpha = frame % 300 < 20 ? (frame % 300) / 20 : frame % 300 > 180 ? (200 - frame % 300) / 20 : 1;
          ctx.globalAlpha = alpha;
          ctx.font = '11px Inter, sans-serif';
          ctx.fillStyle = '#FF4D5E';
          ctx.fillText('Pass-through · 97% forwarded', cx - 75, cy - maxR - 8);
          ctx.globalAlpha = 1;
        }
      }

      requestAnimationFrame(animate);
    }

    const raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', overflow: 'hidden' }}>
      <div className="atmosphere" />

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 32px',
        background: 'rgba(7,10,16,.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(28,39,64,.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#070A10',
          }}>MT</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1rem' }}>MuleTrace</span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{
            background: 'none', border: 'none', color: 'var(--text-1)',
            cursor: 'pointer', padding: 6,
          }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isAuthenticated ? (
            <Link to="/app" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              Open App <ArrowRight size={14} />
            </Link>
          ) : (
            <Link to="/login" className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              Open App <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        padding: '100px 40px 60px',
        maxWidth: 1400,
        margin: '0 auto',
        gap: 60,
      }}>
        {/* Left: copy */}
        <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 20,
          }}>
            FOLLOW THE MONEY{' '}
            <br />
            <span style={{
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              BEFORE IT DISAPPEARS.
            </span>
          </h1>
          <p style={{
            color: 'var(--text-1)',
            fontSize: '1.1rem',
            lineHeight: 1.7,
            maxWidth: 500,
            marginBottom: 32,
          }}>
            Detect mule networks in minutes, explain every flag in plain words,
            and show exactly which accounts to freeze first to recover the most money.
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
            <Link
              to={isAuthenticated ? '/app/command-center' : '/login'}
              className="btn btn-primary"
              style={{ padding: '12px 24px', fontSize: '0.95rem', fontWeight: 600 }}
            >
              <Play size={16} /> Play guided investigation
            </Link>
            <Link
              to={isAuthenticated ? '/app/upload' : '/login'}
              className="btn"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Upload size={16} /> Upload CSV
            </Link>
            <Link
              to={isAuthenticated ? '/app/command-center' : '/login'}
              className="btn"
              style={{ padding: '12px 24px', fontSize: '0.95rem' }}
            >
              <Database size={16} /> Use demo data
            </Link>
          </div>

          {/* Trust strip */}
          <div style={{
            display: 'flex', gap: 24, flexWrap: 'wrap',
          }}>
            {[
              { icon: CheckCircle, label: 'Explainable', desc: 'Every score traces to evidence' },
              { icon: GitBranch, label: 'Replay the fraud', desc: 'Watch money move in real-time' },
              { icon: Shield, label: 'Freeze-first', desc: 'Recovery plan with every alert' },
            ].map((item) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <item.icon size={16} style={{ color: 'var(--accent)', marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-0)' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: animated network */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <div style={{
            background: 'var(--bg-1)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-lg)',
            padding: 4,
            boxShadow: '0 0 60px rgba(45,212,191,.06)',
          }}>
            <canvas
              ref={canvasRef}
              style={{
                borderRadius: 'var(--radius-md)',
                display: 'block',
              }}
            />
          </div>
        </div>
      </section>

      {/* Features section */}
      <section style={{
        padding: '80px 40px',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <h2 style={{
          textAlign: 'center',
          fontFamily: 'var(--font-display)',
          fontSize: '2rem',
          marginBottom: 48,
        }}>
          How it works
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {[
            {
              icon: Upload,
              title: '1. Ingest',
              desc: 'Upload a transactions CSV. MuleTrace auto-maps columns, validates data, and builds the account graph in seconds.',
            },
            {
              icon: Search,
              title: '2. Detect',
              desc: 'Four specialized detectors find fan-in/fan-out funnels, circular transfers, pass-through chains, and new-account clusters.',
            },
            {
              icon: Zap,
              title: '3. Decide',
              desc: 'Ranked alerts with explainable scores, trace stolen funds to cash-out points, and draft freeze requests with one click.',
            },
          ].map((item) => (
            <div key={item.title} className="card" style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(45,212,191,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <item.icon size={20} style={{ color: 'var(--accent)' }} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)' }}>{item.title}</h3>
              <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '24px 40px',
        borderTop: '1px solid var(--line)',
        textAlign: 'center',
        color: 'var(--text-2)',
        fontSize: '0.75rem',
      }}>
        <p>
          MuleTrace — Scores support a human decision; never auto-freeze customer funds.
          <br />
          Verify all regulatory claims with compliance counsel before production use.
        </p>
      </footer>
    </div>
  );
}
