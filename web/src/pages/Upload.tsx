import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/store';
import { ingestApi, syntheticApi, connectSSE } from '../api/client';
import {
  Upload as UploadIcon, FileText, CheckCircle, AlertCircle,
  Loader, Database, ArrowRight, Zap,
} from 'lucide-react';

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [stages, setStages] = useState<{ stage: string; data: any; progress: number }[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { setCurrentRunId, setPipelineState } = useStore();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.name.endsWith('.csv')) {
      setFile(dropped);
      setError('');
    } else {
      setError('Please upload a .csv file');
    }
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setStages([]);

    try {
      const res = await ingestApi.upload(file);
      const id = res.data.run_id;
      setRunId(id);
      setCurrentRunId(id);

      // Connect SSE
      const es = connectSSE(id, (event) => {
        setStages(prev => [...prev, event]);
        setPipelineState(event.stage, event.progress || 0);

        if (event.stage === 'done') {
          es.close();
          setUploading(false);
          setTimeout(() => navigate('/app/command-center'), 1500);
        }
        if (event.stage === 'error') {
          es.close();
          setUploading(false);
          setError(event.data?.message || 'Pipeline failed');
        }
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
      setUploading(false);
    }
  };

  const handleGenerateDemo = async () => {
    setGenLoading(true);
    setError('');
    try {
      await syntheticApi.generate({ num_accounts: 5000, num_rings: 10 });
      // Now upload the generated file
      const res = await fetch('/api/v1/synthetic/generate', { method: 'POST' });
      navigate('/app/command-center');
    } catch (err: any) {
      setError('Demo data generated. You can now upload data/transactions.csv from the backend.');
    } finally {
      setGenLoading(false);
    }
  };

  const latestProgress = stages.length > 0 ? stages[stages.length - 1].progress : 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        marginBottom: 8,
      }}>
        Upload Transactions
      </h2>
      <p style={{ color: 'var(--text-1)', fontSize: '0.9rem', marginBottom: 24 }}>
        Upload a CSV file to analyze. MuleTrace auto-detects columns and validates data.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--line)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: 48,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(45,212,191,.05)' : 'var(--bg-1)',
          transition: 'all var(--dur) var(--ease)',
          marginBottom: 20,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); setError(''); }
          }}
        />

        {file ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <FileText size={32} style={{ color: 'var(--accent)' }} />
            <div style={{ fontWeight: 500 }}>{file.name}</div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <UploadIcon size={32} style={{ color: 'var(--text-2)' }} />
            <div style={{ color: 'var(--text-1)', fontWeight: 500 }}>
              Drag & drop your CSV here
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: '0.8rem' }}>
              or click to browse · Max 50 MB
            </div>
          </div>
        )}
      </div>

      {/* Required columns hint */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--bg-2)',
        borderRadius: 'var(--radius-sm)',
        marginBottom: 20,
        fontSize: '0.8rem',
        color: 'var(--text-2)',
      }}>
        <strong style={{ color: 'var(--text-1)' }}>Required columns:</strong>{' '}
        txn_id, timestamp, sender_account, receiver_account, amount
        <br />
        <strong style={{ color: 'var(--text-1)' }}>Optional:</strong>{' '}
        currency, channel, device_id, ip_address, sender_balance_after, receiver_balance_after, is_victim_report
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button
          className="btn btn-primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{ flex: 1, padding: '12px' }}
        >
          {uploading ? (
            <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
          ) : (
            <><Zap size={16} /> Analyze</>
          )}
        </button>
        <button
          className="btn"
          onClick={handleGenerateDemo}
          disabled={genLoading}
          style={{ padding: '12px 16px' }}
        >
          <Database size={16} /> {genLoading ? 'Generating...' : 'Demo Data'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px',
          background: 'rgba(255,77,94,.1)',
          border: '1px solid rgba(255,77,94,.2)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)',
          fontSize: '0.85rem',
          marginBottom: 20,
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Pipeline progress */}
      {stages.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 12, alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '0.95rem' }}>Analysis Pipeline</h3>
            <span className="mono" style={{ fontSize: '0.8rem', color: 'var(--accent)' }}>
              {Math.round(latestProgress * 100)}%
            </span>
          </div>

          {/* Progress bar */}
          <div style={{
            height: 4,
            background: 'var(--bg-3)',
            borderRadius: 2,
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${latestProgress * 100}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              borderRadius: 2,
              transition: 'width var(--dur) var(--ease)',
            }} />
          </div>

          {/* Stage list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stages.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: '0.8rem',
              }}>
                {s.stage === 'done' ? (
                  <CheckCircle size={14} style={{ color: 'var(--ok)' }} />
                ) : s.stage === 'error' ? (
                  <AlertCircle size={14} style={{ color: 'var(--danger)' }} />
                ) : (
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: '2px solid var(--accent)',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                )}
                <span style={{ color: 'var(--text-1)' }}>{formatStage(s)}</span>
              </div>
            ))}
          </div>

          {stages.some(s => s.stage === 'done') && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/app/command-center')}
              style={{ marginTop: 16, width: '100%' }}
            >
              View Results <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function formatStage(s: { stage: string; data: any }): string {
  switch (s.stage) {
    case 'parsed':
      return `Parsed ${s.data?.rows?.toLocaleString()} valid rows`;
    case 'graph':
      return `Built graph: ${s.data?.nodes?.toLocaleString()} nodes, ${s.data?.edges?.toLocaleString()} edges`;
    case 'detector':
      return `${s.data?.name?.replace('_', ' ')} detector: ${s.data?.alerts} alerts`;
    case 'scored':
      return `Scored: ${s.data?.total_alerts} alerts (${s.data?.critical} critical, ${s.data?.high} high)`;
    case 'done':
      return `Complete — ${s.data?.total_alerts} alerts, ${s.data?.total_rings} rings`;
    case 'error':
      return `Error: ${s.data?.message}`;
    default:
      return s.stage;
  }
}
