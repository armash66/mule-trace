import React, { useState } from 'react';
import { api } from '../../api/client';
import { useStore } from '../../store/store';
import {
  Clipboard,
  Database,
  Sliders,
  Download,
  Server,
  Radio,
  FileCode,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface IntakeCardsProps {
  onPastedTextSubmit: (text: string) => void;
  onRunCreated: (runId: string) => void;
}

export const IntakeCards: React.FC<IntakeCardsProps> = ({
  onPastedTextSubmit,
  onRunCreated,
}) => {
  const { showToast, fetchRuns } = useStore();

  // Paste CSV Modal / Drawer state
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedContent, setPastedContent] = useState('');

  // Synthetic Generator state
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small');
  const [evasion, setEvasion] = useState(0.0);
  const [includeDecoys, setIncludeDecoys] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Demo loading
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const handleUseDemo = async () => {
    setIsResettingDemo(true);
    try {
      await api.resetDemo();
      await fetchRuns();
      showToast('Seeded demo dataset loaded (62,218 transactions, 5 planted rings).');
      onRunCreated('run_seed_42_latest');
    } catch {
      showToast('Failed to load demo dataset.');
    } finally {
      setIsResettingDemo(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await api.generateDataset({
        seed,
        size,
        evasion_level: evasion,
        include_decoys: includeDecoys,
      });
      await fetchRuns();
      showToast(`Generated ${size.toUpperCase()} synthetic dataset (${res.txn_count || 5000} rows).`);
      setGeneratorOpen(false);
      if (res.run_id) {
        onRunCreated(res.run_id);
      }
    } catch {
      showToast('Failed to generate synthetic dataset.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedContent.trim()) return;
    onPastedTextSubmit(pastedContent);
    setPastedContent('');
    setPasteModalOpen(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)', }}>
        Alternative Intake & Data Sources
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {/* Card 1: Paste CSV */}
        <div
          onClick={() => setPasteModalOpen(true)}
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'border-color 120ms ease, background-color 120ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Clipboard size={18} color="var(--ink)" />
            <kbd className="mono" style={{ fontSize: '10px', color: 'var(--ink-3)', padding: '1px 5px', border: '1px solid var(--line)', }}>
              ⌘V
            </kbd>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Paste Raw CSV</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Paste tab or comma separated text directly from clipboard.
            </div>
          </div>
        </div>

        {/* Card 2: 1-Click Demo Dataset */}
        <div
          onClick={handleUseDemo}
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            cursor: isResettingDemo ? 'wait' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'border-color 120ms ease, background-color 120ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Database size={18} color="var(--accent)" />
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)', }}>
              Instant
            </span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              {isResettingDemo ? 'Loading Demo...' : 'Use Demo Dataset'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Seed 42 with 62k transactions and 5 planted rings.
            </div>
          </div>
        </div>

        {/* Card 3: Generate Synthetic */}
        <div
          onClick={() => setGeneratorOpen(true)}
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            transition: 'border-color 120ms ease, background-color 120ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--line-strong)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Sliders size={18} color="var(--ink)" />
            <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Parametric</span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Generate Synthetic</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Configure custom seeds, scale, evasion factor and decoys.
            </div>
          </div>
        </div>

        {/* Card 4: Download Templates */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Download size={18} color="var(--ink)" />
            <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>CSV Spec</span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Download Templates</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <a
                href={api.getTemplateUrl('transactions')}
                download="transactions_template.csv"
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                transactions.csv
              </a>
              <span style={{ color: 'var(--line-strong)' }}>•</span>
              <a
                href={api.getTemplateUrl('accounts')}
                download="accounts_template.csv"
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                }}
              >
                accounts.csv
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Disabled Roadmap Connectors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink-3)', }}>
          Direct Feeds & Connectors (Roadmap)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              opacity: 0.55,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={16} color="var(--ink-3)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Core Banking API</div>
                <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Finacle, TCS BaNCS, Flexcube</div>
              </div>
            </div>
            <span className="mono" style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: 'var(--surface-raised)', color: 'var(--ink-3)' }}>
              ROADMAP
            </span>
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              opacity: 0.55,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileCode size={16} color="var(--ink-3)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Automated SFTP Ingest</div>
                <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Scheduled daily batch drop</div>
              </div>
            </div>
            <span className="mono" style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: 'var(--surface-raised)', color: 'var(--ink-3)' }}>
              ROADMAP
            </span>
          </div>

          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              opacity: 0.55,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio size={16} color="var(--ink-3)" />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Kafka / Event Stream</div>
                <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Real-time sub-second ingestion</div>
              </div>
            </div>
            <span className="mono" style={{ fontSize: '9px', padding: '2px 6px', backgroundColor: 'var(--surface-raised)', color: 'var(--ink-3)' }}>
              ROADMAP
            </span>
          </div>
        </div>
      </div>

      {/* Paste Modal */}
      {pasteModalOpen && (
        <div
          onClick={() => setPasteModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 17, 19, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '600px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Paste CSV or Tab-Separated Data
              </h3>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <textarea
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              placeholder="txn_id,timestamp,src_account,dst_account,amount&#10;TXN_001,2026-10-01T10:00:00Z,ACC_01,ACC_02,50000"
              rows={10}
              className="mono"
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '12px',
                border: '1px solid var(--line-strong)',
                backgroundColor: 'var(--surface-raised)',
                color: 'var(--ink)',
                outline: 'none',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--line)',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePasteSubmit}
                disabled={!pastedContent.trim()}
                style={{
                  padding: '6px 18px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--paper)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: !pastedContent.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                Parse & Ingest
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Synthetic Dataset Generator Modal */}
      {generatorOpen && (
        <div
          onClick={() => setGeneratorOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(17, 17, 19, 0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <form
            onSubmit={handleGenerate}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
                Generate Synthetic Benchmark Dataset
              </h3>
              <button
                type="button"
                onClick={() => setGeneratorOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--ink-3)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Seed */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Random Seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="mono"
                style={{
                  padding: '6px 10px',
                  fontSize: '12px',
                  border: '1px solid var(--line-strong)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                Deterministic seed generates byte-identical dataset reproduction.
              </div>
            </div>

            {/* Size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Dataset Size</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    style={{
                      padding: '8px',
                      border: size === s ? '2px solid var(--accent)' : '1px solid var(--line)',
                      backgroundColor: size === s ? 'var(--accent-muted)' : 'var(--surface)',
                      fontSize: '12px',
                      fontWeight: size === s ? 600 : 400,
                      color: 'var(--ink)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    <div>{s}</div>
                    <div className="mono" style={{ fontSize: '10px', color: 'var(--ink-3)' }}>
                      {s === 'small' ? '5k txns' : s === 'medium' ? '60k txns' : '250k txns'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Evasion Slider */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                  Evasion Level: <span className="mono">{evasion.toFixed(2)}</span>
                </label>
                <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                  {evasion === 0 ? 'Standard syndicates' : evasion < 0.5 ? 'Moderate timing jitter' : 'Adversarial evasion'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={evasion}
                onChange={(e) => setEvasion(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                Higher levels slow hops, split transfer amounts, and rotate device identifiers.
              </div>
            </div>

            {/* Decoys toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="decoys-toggle"
                checked={includeDecoys}
                onChange={(e) => setIncludeDecoys(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <label htmlFor="decoys-toggle" style={{ fontSize: '12px', color: 'var(--ink)', cursor: 'pointer' }}>
                Include benign decoy traffic (corporate payroll, high-velocity merchant, family devices)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setGeneratorOpen(false)}
                disabled={isGenerating}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--line)',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating}
                style={{
                  padding: '6px 18px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--paper)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isGenerating ? 'wait' : 'pointer',
                }}
              >
                {isGenerating ? 'Generating...' : 'Generate & Run'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
