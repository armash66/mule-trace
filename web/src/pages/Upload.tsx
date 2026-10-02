import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { DataHealthReport } from '../api/types';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const Upload: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useStore();

  const [txFile, setTxFile] = useState<File | null>(null);
  const [acctFile, setAcctFile] = useState<File | null>(null);
  const [healthReport, setHealthReport] = useState<DataHealthReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUseDemo = async () => {
    setIsProcessing(true);
    try {
      const health = await api.getRunHealth('run_seed_42_latest');
      setHealthReport(health);
      showToast('Seeded dataset loaded successfully (62,218 transactions).');
    } catch {
      showToast('Failed to load demo dataset.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunPipeline = () => {
    showToast('Run complete. Redirecting to Alerts.');
    navigate('/alerts');
  };

  return (
    <div style={{ padding: '28px 36px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
          Ingest Transaction & Account Records
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
          Upload banking CSV records for full automated network ingestion, cleaning, and graph anomaly detection.
        </p>
      </div>

      {/* Demo Seeded Dataset Banner */}
      <div
        style={{
          marginBottom: '24px',
          padding: '16px 20px',
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--signal)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={20} color="var(--signal)" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              1-Click Demo Seeded Dataset
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              62,218 transactions, 5,044 accounts, 5 planted rings (Fan, Cycle, Chain, Cluster, Dormancy), and 9 unflagged decoys.
            </div>
          </div>
        </div>

        <button
          onClick={handleUseDemo}
          disabled={isProcessing}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--signal)',
            color: 'var(--paper)',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
          }}
        >
          {isProcessing ? 'Loading Demo...' : 'Load Seeded Dataset'}
        </button>
      </div>

      {/* Upload Dropzones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Transactions CSV Dropzone */}
        <div
          style={{
            backgroundColor: 'var(--paper)',
            border: '2px dashed var(--rule)',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <UploadCloud size={32} color="var(--ink-2)" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            transactions.csv
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '12px' }}>
            Columns: txn_id, timestamp, src_account, dst_account, amount, channel
          </div>
          <label
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {txFile ? txFile.name : 'Select CSV'}
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && setTxFile(e.target.files[0])}
            />
          </label>
        </div>

        {/* Accounts CSV Dropzone */}
        <div
          style={{
            backgroundColor: 'var(--paper)',
            border: '2px dashed var(--rule)',
            padding: '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FileSpreadsheet size={32} color="var(--ink-2)" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
            accounts.csv
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginBottom: '12px' }}>
            Columns: account_id, opened_date, kyc_phone, kyc_address, kyc_id_hash
          </div>
          <label
            style={{
              padding: '6px 14px',
              backgroundColor: 'var(--paper-2)',
              border: '1px solid var(--rule)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
          >
            {acctFile ? acctFile.name : 'Select CSV'}
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && setAcctFile(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {/* Data Health Report Preview */}
      {healthReport && (
        <div
          style={{
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--rule)',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={18} color="var(--ok)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
              Data Health & Hygiene Report
            </h3>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}
          >
            <div style={{ padding: '12px', backgroundColor: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-2)', }}>Duplicates Dropped</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {healthReport.duplicates_removed}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-2)', }}>Out-of-Order Fixed</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {healthReport.out_of_order_fixed}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-2)', }}>Missing Device/IP</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {healthReport.missing_device_pct}% / {healthReport.missing_ip_pct}%
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--paper-2)', border: '1px solid var(--rule)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-2)', }}>Self-Transfers Dropped</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {healthReport.self_transfers_dropped}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={handleRunPipeline}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                backgroundColor: 'var(--ok)',
                color: 'var(--paper)',
                border: 'none',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <span>Explore Ingested Alerts</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
