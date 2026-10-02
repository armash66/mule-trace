import React, { useState } from 'react';
import { api } from '../../api/client';
import { useStore } from '../../store/store';

interface IntakeCardsProps {
  onPastedTextSubmit: (text: string) => void;
  onRunCreated: (runId: string) => void;
}

export const IntakeCards: React.FC<IntakeCardsProps> = ({
  onPastedTextSubmit,
  onRunCreated,
}) => {
  const { showToast, fetchRuns } = useStore();

  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pastedContent, setPastedContent] = useState('');

  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [seed, setSeed] = useState(42);
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small');
  const [evasion, setEvasion] = useState(0.0);
  const [includeDecoys, setIncludeDecoys] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const handleUseDemo = async () => {
    setIsResettingDemo(true);
    try {
      await api.resetDemo();
      await fetchRuns();
      showToast('Seeded demo dataset loaded.');
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
      showToast(`Generated synthetic dataset (${res.txn_count || 5000} rows).`);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
      <div className="mono" style={{ color: 'var(--ink-2)' }}>
        Other data sources
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Card 1: Paste CSV */}
        <div
          onClick={() => setPasteModalOpen(true)}
          style={{
            padding: '16px',
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
            cursor: 'pointer',
          }}
        >
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
            Paste CSV ⌘V
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 500 }}>
            Paste raw text
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Directly from clipboard
          </div>
        </div>

        {/* Card 2: Demo Dataset */}
        <div
          onClick={handleUseDemo}
          style={{
            padding: '16px',
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
            cursor: isResettingDemo ? 'wait' : 'pointer',
          }}
        >
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
            Demo
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 500 }}>
            {isResettingDemo ? 'Loading demo...' : 'Use demo dataset'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Seed 42 with 62k transactions
          </div>
        </div>

        {/* Card 3: Generate Synthetic */}
        <div
          onClick={() => setGeneratorOpen(true)}
          style={{
            padding: '16px',
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
            cursor: 'pointer',
          }}
        >
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
            Synthetic
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 500 }}>
            Generate synthetic
          </div>
          <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
            Configurable seed and scale
          </div>
        </div>

        {/* Card 4: Download Templates */}
        <div
          style={{
            padding: '16px',
            border: '1px solid var(--rule)',
            backgroundColor: 'var(--paper)',
          }}
        >
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
            Templates
          </div>
          <div style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 500, marginBottom: '6px' }}>
            Download CSV
          </div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
            <a
              href={api.getTemplateUrl('transactions')}
              download="transactions_template.csv"
              style={{ color: 'var(--ink)', textDecoration: 'underline' }}
            >
              transactions.csv
            </a>
            <span style={{ color: 'var(--ink-2)' }}>·</span>
            <a
              href={api.getTemplateUrl('accounts')}
              download="accounts_template.csv"
              style={{ color: 'var(--ink)', textDecoration: 'underline' }}
            >
              accounts.csv
            </a>
          </div>
        </div>
      </div>

      {/* Disabled Roadmap Connectors */}
      <div>
        <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
          Direct connectors (roadmap)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ padding: '12px 16px', border: '1px solid var(--rule)', opacity: 0.5 }}>
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>Core banking API</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>Roadmap</div>
          </div>

          <div style={{ padding: '12px 16px', border: '1px solid var(--rule)', opacity: 0.5 }}>
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>Automated SFTP ingest</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>Roadmap</div>
          </div>

          <div style={{ padding: '12px 16px', border: '1px solid var(--rule)', opacity: 0.5 }}>
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>Kafka stream</div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)' }}>Roadmap</div>
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
            backgroundColor: 'rgba(17, 17, 17, 0.5)',
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
              backgroundColor: 'var(--paper)',
              border: '2px solid var(--ink)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="t-head" style={{ color: 'var(--ink)' }}>
                Paste CSV data
              </div>
              <button
                type="button"
                onClick={() => setPasteModalOpen(false)}
                className="mono"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}
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
                border: '1px solid var(--rule)',
                backgroundColor: 'var(--paper-2)',
                color: 'var(--ink)',
                outline: 'none',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setPasteModalOpen(false)}
                style={{ padding: '6px 14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handlePasteSubmit}
                disabled={!pastedContent.trim()}
              >
                Parse data
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
            backgroundColor: 'rgba(17, 17, 17, 0.5)',
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
              backgroundColor: 'var(--paper)',
              border: '2px solid var(--ink)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="t-head" style={{ color: 'var(--ink)' }}>
                Generate synthetic dataset
              </div>
              <button
                type="button"
                onClick={() => setGeneratorOpen(false)}
                className="mono"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="mono" style={{ color: 'var(--ink-2)' }}>Random seed</label>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="mono"
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--rule)',
                  backgroundColor: 'var(--paper-2)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="mono" style={{ color: 'var(--ink-2)' }}>Dataset size</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className="mono"
                    style={{
                      padding: '8px',
                      border: size === s ? '2px solid var(--ink)' : '1px solid var(--rule)',
                      backgroundColor: size === s ? 'var(--ink)' : 'transparent',
                      color: size === s ? 'var(--paper)' : 'var(--ink)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    <div>{s}</div>
                    <div style={{ fontSize: '11px', color: size === s ? 'var(--paper-2)' : 'var(--ink-2)' }}>
                      {s === 'small' ? '5k txns' : s === 'medium' ? '60k txns' : '250k txns'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="mono" style={{ color: 'var(--ink-2)' }}>
                Evasion level: {evasion.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={evasion}
                onChange={(e) => setEvasion(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--ink)' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="decoys-toggle"
                checked={includeDecoys}
                onChange={(e) => setIncludeDecoys(e.target.checked)}
              />
              <label htmlFor="decoys-toggle" style={{ fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                Include decoy traffic (payroll, merchant, family)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setGeneratorOpen(false)}
                disabled={isGenerating}
                style={{ padding: '6px 14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate & run'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
