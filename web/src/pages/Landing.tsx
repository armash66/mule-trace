import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const patterns = [
  { name: 'Collect and split', copy: 'Many pay one account. It passes the money on fast.', kind: 'split' },
  { name: 'Round trip', copy: 'Money travels in a circle and ends where it began.', kind: 'round' },
  { name: 'Quick relay', copy: 'Each account passes nearly everything on, within minutes.', kind: 'relay' },
  { name: 'Same-device group', copy: 'New accounts sharing one phone, device or address.', kind: 'device' },
];

const ProductGraph: React.FC = () => (
  <svg className="landing-hero-graph" viewBox="0 0 420 340" role="img" aria-label="Nine accounts send money to one account, which passes it to four new accounts">
    <g className="landing-graph-lines">
      {[40, 100, 160, 220, 290].map((y, index) => <path key={`in-${y}`} style={{ animationDelay: `${index * 100}ms` }} d={`M30 ${y}L190 170`} />)}
      {[50, 125, 210, 290].map((y, index) => <path key={`out-${y}`} style={{ animationDelay: `${900 + index * 100}ms` }} d={`M190 170L380 ${y}`} />)}
    </g>
    <g className="landing-graph-nodes">
      {[40, 100, 160, 220, 290].map((y) => <circle key={`source-${y}`} cx="30" cy={y} r="5" />)}
      <circle className="landing-graph-hot" cx="190" cy="170" r="12" />
      {[50, 125, 210, 290].map((y) => <circle key={`target-${y}`} cx="380" cy={y} r="6" />)}
    </g>
    <text x="150" y="205">ACC-7731</text><text x="150" y="220">Risk 94</text>
    <text x="2" y="14">9 accounts in</text><text x="302" y="322">4 accounts out</text>
  </svg>
);

const PatternDiagram: React.FC<{ kind: string }> = ({ kind }) => {
  if (kind === 'round') return <svg viewBox="0 0 160 84" aria-hidden="true"><path className="landing-pattern-line" d="M50 18H110V66H50Z" /><circle className="landing-pattern-hot" cx="50" cy="18" r="6" /><circle className="landing-pattern-dot" cx="110" cy="18" r="3" /><circle className="landing-pattern-dot" cx="110" cy="66" r="3" /><circle className="landing-pattern-dot" cx="50" cy="66" r="3" /></svg>;
  if (kind === 'relay') return <svg viewBox="0 0 160 84" aria-hidden="true"><path className="landing-pattern-line" d="M12 42H148" /><circle className="landing-pattern-hot" cx="12" cy="42" r="6" />{[48, 84, 120, 148].map((x) => <circle className="landing-pattern-dot" key={x} cx={x} cy="42" r="3" />)}</svg>;
  if (kind === 'device') return <svg viewBox="0 0 160 84" aria-hidden="true"><rect x="62" y="30" width="36" height="24" fill="none" stroke="var(--signal)" strokeWidth="1.5" /><path className="landing-pattern-line" d="M20 14L62 36M20 70L62 48M140 14L98 36M140 70L98 48" />{[[20, 14], [20, 70], [140, 14], [140, 70]].map(([cx, cy]) => <circle className="landing-pattern-dot" key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />)}</svg>;
  return <svg viewBox="0 0 160 84" aria-hidden="true"><path className="landing-pattern-line" d="M10 12L70 42M10 42L70 42M10 72L70 42M70 42L150 14M70 42L150 42M70 42L150 70" />{[[10, 12], [10, 42], [10, 72], [150, 14], [150, 42], [150, 70]].map(([cx, cy]) => <circle className="landing-pattern-dot" key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />)}<circle className="landing-pattern-hot" cx="70" cy="42" r="6" /></svg>;
};

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);

  return (
    <main className="landing-page">
      <div className="landing-wrap">
        <nav className="landing-nav">
          <span className="landing-logo serif">MuleTrace</span>
          <div className="landing-nav-links"><a href="#how">How it works</a><a href="#patterns">Patterns</a><button className="landing-button" onClick={() => go('/workspace')}>Try the demo</button></div>
        </nav>
        <section className="landing-hero">
          <div><span className="mono">Mule account detection for banks</span><h1 className="serif">Follow stolen money <em>before it disappears.</em></h1><p className="landing-lead">MuleTrace finds the accounts passing money along, shows the whole ring, and says why it was flagged.</p><div className="landing-actions"><button className="landing-button" onClick={() => go('/workspace')}>Try the demo</button><a className="landing-button landing-button-ghost" href="#how">How it works</a></div></div>
          <ProductGraph />
        </section>
      </div>
      <section className="landing-proof"><div className="landing-wrap landing-proof-grid"><div><div className="landing-stat serif landing-stat-hot">₹4.8L</div><p>moved in one example ring (demo data)</p></div><div><div className="landing-stat serif">11 min</div><p>from first deposit to the last transfer</p></div><div><div className="landing-stat serif">9 → 4</div><p>accounts paying in, then accounts paid out</p></div></div></section>
      <section className="landing-section" id="preview"><div className="landing-wrap"><span className="mono">The product</span><h2 className="serif">One screen. The ring, the reason, the decision.</h2><div className="landing-product-window"><div className="landing-window-bar"><i /><i /><i /></div><div className="landing-product-grid"><div className="landing-product-nav"><strong>Overview</strong><span>Alerts</span><span>Investigate</span><span>Freezes</span><span>Cases</span><span>Data</span></div><div className="landing-alert-preview"><h3 className="serif">Alerts</h3>{['ACC-7731', 'ACC-9014', 'ACC-3312', 'ACC-1108'].map((id, index) => <div className={`landing-alert-row ${index === 0 ? 'selected' : ''}`} key={id}><span>{id}</span><span>{94 - index * 6}</span></div>)}</div><div className="landing-mini-graph"><svg viewBox="0 0 220 220" aria-hidden="true"><g className="landing-mini-lines"><path d="M20 40L100 110M20 110L100 110M20 180L100 110M100 110L200 40M100 110L200 90M100 110L200 140M100 110L200 190" /></g><circle cx="100" cy="110" r="10" className="landing-graph-hot" /><text x="54" y="142">Cut here · saves ₹4.1L</text></svg></div><div className="landing-decision"><span className="mono">ACC-7731</span><p className="serif">Received ₹4.8L from 9 accounts. Passed 96% on within 11 minutes.</p><div className="landing-risk serif">94</div><span className="mono">Risk</span><div className="landing-actions"><button className="landing-button" onClick={() => go('/workspace/ACC_05001')}>Confirm</button><button className="landing-button landing-button-ghost" onClick={() => go('/alerts')}>Clear</button></div></div></div></div></div></section>
      <section className="landing-section" id="how"><div className="landing-wrap"><span className="mono">How it works</span><h2 className="serif">Three steps. No training needed.</h2><div className="landing-steps">{[['01', 'Drop your data', 'Add a transactions file. MuleTrace checks it and builds the account map.'], ['02', 'See the ring', 'Flagged accounts come with a score and one clear sentence.'], ['03', 'Decide', 'Confirm or clear. Every choice is logged for review.']].map(([number, title, copy]) => <div key={number}><span className="mono">{number}</span><h3 className="serif">{title}</h3><p>{copy}</p></div>)}</div></div></section>
      <section className="landing-section" id="patterns"><div className="landing-wrap"><span className="mono">What it looks for</span><h2 className="serif">Four ways stolen money moves.</h2><div className="landing-patterns">{patterns.map((pattern) => <div key={pattern.name}><PatternDiagram kind={pattern.kind} /><h3 className="serif">{pattern.name}</h3><p>{pattern.copy}</p></div>)}</div></div></section>
      <section className="landing-cta"><div className="landing-wrap"><h2 className="serif">Spot it. Trace it. <em>Stop it.</em></h2><button className="landing-button" onClick={() => go('/workspace')}>Try the demo</button></div></section>
      <footer className="landing-footer"><div className="landing-wrap mono">Demo data. Nothing here is real. A person confirms every action.</div></footer>
    </main>
  );
};
