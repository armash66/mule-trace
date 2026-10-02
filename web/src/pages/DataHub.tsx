import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type {
  UploadResponse,
  ValidationReport,
  ColumnMappingItem,
  RunItem,
} from '../api/types';
import { Dropzone } from '../components/data-hub/Dropzone';
import { FileChips } from '../components/data-hub/FileChips';
import { MappingTable } from '../components/data-hub/MappingTable';
import { ValidationStep } from '../components/data-hub/ValidationStep';
import { RunConfigStep } from '../components/data-hub/RunConfigStep';
import { RunProgress } from '../components/data-hub/RunProgress';
import { IntakeCards } from '../components/data-hub/IntakeCards';
import { RunHistoryTable } from '../components/data-hub/RunHistoryTable';
import { formatDate } from '../lib/utils';
import {
  UploadCloud,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Sliders,
  RotateCcw,
} from 'lucide-react';

const TRANSACTION_FIELDS = [
  { field: 'txn_id', label: 'Transaction ID', required: false, description: 'Unique identifier for transaction (auto-generated if omitted).' },
  { field: 'timestamp', label: 'Timestamp', required: true, description: 'ISO8601 UTC timestamp or date-time string.' },
  { field: 'src_account', label: 'Source Account', required: true, description: 'Debited sender account number or ID.' },
  { field: 'dst_account', label: 'Destination Account', required: true, description: 'Credited beneficiary account number or ID.' },
  { field: 'amount', label: 'Amount (INR)', required: true, description: 'Numerical amount in rupees (supports commas & lakh notation).' },
  { field: 'channel', label: 'Channel', required: false, description: 'Transfer mechanism (UPI, IMPS, NEFT, RTGS).' },
  { field: 'device_id', label: 'Device ID', required: false, description: 'Hardware fingerprint or mobile UUID.' },
  { field: 'ip', label: 'IP Address', required: false, description: 'Client network IP address.' },
];

const ACCOUNT_FIELDS = [
  { field: 'account_id', label: 'Account ID', required: true, description: 'Unique account identifier.' },
  { field: 'opened_date', label: 'Opened Date', required: false, description: 'Account creation date for dormancy/age heuristics.' },
  { field: 'kyc_phone', label: 'KYC Phone', required: false, description: 'Customer phone number (masked in UI/logs).' },
  { field: 'kyc_address', label: 'KYC Address', required: false, description: 'Residential address (masked in UI/logs).' },
  { field: 'kyc_id_hash', label: 'KYC ID Hash', required: false, description: 'Hashed Aadhaar/PAN identifier.' },
  { field: 'balance_after', label: 'Balance After', required: false, description: 'Ledger balance snapshot.' },
];

export const DataHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    runs,
    fetchRuns,
    showToast,
    stagedFiles,
    setStagedFiles,
    activeRunId,
    setActiveRunId,
  } = useStore();

  const currentStep = searchParams.get('step') || 'select';

  // Upload & Session state
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [activePipelineRunId, setActivePipelineRunId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isStartingRun, setIsStartingRun] = useState(false);

  // Timezone and format selections
  const [timezone, setTimezone] = useState('IST');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD HH:mm:ss');

  // Mappings state
  const [txMapping, setTxMapping] = useState<Record<string, ColumnMappingItem>>({});
  const [acctMapping, setAcctMapping] = useState<Record<string, ColumnMappingItem>>({});
  const [detectedTypes, setDetectedTypes] = useState<Record<string, string>>({});

  // Fetch initial run list
  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  // Handle staged files from global drag-and-drop
  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      handleFilesSelected(stagedFiles);
      setStagedFiles([]);
    }
  }, [stagedFiles]);

  // Listen for Ctrl+V / Cmd+V paste globally on the page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const text = e.clipboardData?.getData('text');
      if (text && (text.includes(',') || text.includes('\t'))) {
        handlePastedCsvText(text);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const setStep = (step: string) => {
    setSearchParams({ step });
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsUploading(true);
    try {
      const res = await api.uploadFiles(files);
      setUploadData(res);
      setDetectedTypes(res.detected_file_types || {});
      setTxMapping(res.suggested_mapping?.transactions || {});
      setAcctMapping(res.suggested_mapping?.accounts || {});
      showToast(`Analyzed ${files.length} file(s). Auto-detected column mappings.`);
      setStep('map');
    } catch {
      showToast('Failed to upload and parse files.');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePastedCsvText = (text: string) => {
    const blob = new Blob([text], { type: 'text/csv' });
    const file = new File([blob], 'pasted_transactions.csv', { type: 'text/csv' });
    handleFilesSelected([file]);
  };

  const handleTypeChange = (filename: string, newType: 'transactions' | 'accounts') => {
    setDetectedTypes((prev) => ({
      ...prev,
      [filename]: newType,
    }));
  };

  const handleRemoveFile = (filename: string) => {
    if (!uploadData) return;
    const remaining = uploadData.files.filter((f) => f.filename !== filename);
    if (remaining.length === 0) {
      setUploadData(null);
      setStep('select');
    } else {
      setUploadData({
        ...uploadData,
        files: remaining,
      });
    }
  };

  const handleTxMappingChange = (targetField: string, sourceCol: string | null) => {
    setTxMapping((prev) => ({
      ...prev,
      [targetField]: {
        source_column: sourceCol,
        confidence: sourceCol ? 'Matched' : 'Unmapped',
        sample_values: prev[targetField]?.sample_values || [],
      },
    }));
  };

  const handleAcctMappingChange = (targetField: string, sourceCol: string | null) => {
    setAcctMapping((prev) => ({
      ...prev,
      [targetField]: {
        source_column: sourceCol,
        confidence: sourceCol ? 'Matched' : 'Unmapped',
        sample_values: prev[targetField]?.sample_values || [],
      },
    }));
  };

  // Check required transactions mapping
  const isRequiredTxMapped = () => {
    return (
      !!txMapping.timestamp?.source_column &&
      !!txMapping.src_account?.source_column &&
      !!txMapping.dst_account?.source_column &&
      !!txMapping.amount?.source_column
    );
  };

  const handleProceedToValidation = async () => {
    if (!uploadData) return;
    setIsValidating(true);
    try {
      // 1. Save mapping
      await api.saveMapping(uploadData.upload_id, {
        transactions: txMapping,
        accounts: uploadData.has_accounts ? acctMapping : {},
        timezone,
        date_format: dateFormat,
      });

      // 2. Validate
      const report = await api.validateUpload(uploadData.upload_id);
      setValidationReport(report);
      setStep('validate');
    } catch {
      showToast('Validation failed. Please verify column selections.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceedToRunConfig = () => {
    setStep('run');
  };

  const handleStartPipeline = async (name: string, configPreset: string) => {
    if (!uploadData) return;
    setIsStartingRun(true);
    try {
      const res = await api.createRun({
        upload_id: uploadData.upload_id,
        name,
        config_preset: configPreset,
      });
      setActivePipelineRunId(res.run_id);
      setActiveRunId(res.run_id);
      await fetchRuns();
      setStep('progress');
      showToast(`Pipeline "${name}" initiated.`);
    } catch {
      showToast('Failed to start pipeline execution.');
    } finally {
      setIsStartingRun(false);
    }
  };

  const handleRunCreatedFromCard = (runId: string) => {
    setActivePipelineRunId(runId);
    setActiveRunId(runId);
    setStep('progress');
  };

  const handleRerun = (run: RunItem) => {
    setActivePipelineRunId(run.id);
    setStep('run');
  };

  // Get available columns from files
  const txFile = uploadData?.files.find((f) => (detectedTypes[f.filename] || f.detected_type) === 'transactions');
  const acctFile = uploadData?.files.find((f) => (detectedTypes[f.filename] || f.detected_type) === 'accounts');

  const availableTxCols = txFile?.columns || [];
  const availableAcctCols = acctFile?.columns || [];

  const defaultRunName = `Upload ${formatDate(new Date().toISOString())}`;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', }}>
            Data & Intake Pipeline
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Upload transaction logs and account registries, validate data hygiene, and execute graph syndicate detection.
          </p>
        </div>

        {/* Active Run Chip */}
        {activeRunId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              padding: '6px 12px',
              fontSize: '12px',
            }}
          >
            <span style={{ width: 7, height: 7, backgroundColor: 'var(--ok)' }} />
            <span style={{ color: 'var(--ink-2)' }}>Active Run:</span>
            <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
              {runs.find((r) => r.id === activeRunId)?.name || activeRunId}
            </span>
          </div>
        )}
      </div>

      {/* Stepper Navigation Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          padding: '4px',
        }}
      >
        {[
          { key: 'select', label: '1. Select Data' },
          { key: 'map', label: '2. Map Columns' },
          { key: 'validate', label: '3. Validate & Health' },
          { key: 'run', label: '4. Configure Run' },
          { key: 'progress', label: '5. Execution & Results' },
        ].map((s) => {
          const isActive = currentStep === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                if (s.key === 'select') setStep('select');
                if (s.key === 'map' && uploadData) setStep('map');
                if (s.key === 'validate' && validationReport) setStep('validate');
                if (s.key === 'run' && uploadData) setStep('run');
                if (s.key === 'progress' && activePipelineRunId) setStep('progress');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                border: 'none',
                backgroundColor: isActive ? 'var(--surface-raised)' : 'transparent',
                color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                textAlign: 'center',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* STEP 1: SELECT FILES */}
      {currentStep === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Dropzone onFilesSelected={handleFilesSelected} isUploading={isUploading} />

          {uploadData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <FileChips
                files={uploadData.files}
                detectedTypes={detectedTypes}
                onTypeChange={handleTypeChange}
                onRemoveFile={handleRemoveFile}
                hasAccounts={uploadData.has_accounts}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setStep('map')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 20px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--paper)',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>Proceed to Column Mapping</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAP COLUMNS */}
      {currentStep === 'map' && uploadData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* File chips summary */}
          <FileChips
            files={uploadData.files}
            detectedTypes={detectedTypes}
            onTypeChange={handleTypeChange}
            onRemoveFile={handleRemoveFile}
            hasAccounts={uploadData.has_accounts}
          />

          {/* Timezone and Date Format Configuration */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              padding: '12px 16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Source Timezone:</span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid var(--line-strong)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              >
                <option value="IST">IST (UTC+05:30) [Default Indian Standard Time]</option>
                <option value="UTC">UTC (+00:00)</option>
                <option value="EST">EST (UTC-05:00)</option>
                <option value="PST">PST (UTC-08:00)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>Date Parsing:</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                Auto-detected ISO8601 / DD-MM-YYYY
              </span>
            </div>
          </div>

          {/* Transactions Mapping Table */}
          <MappingTable
            type="transactions"
            targetFields={TRANSACTION_FIELDS}
            availableColumns={availableTxCols}
            mapping={txMapping}
            onMappingChange={handleTxMappingChange}
            rawSampleRows={uploadData.preview.transactions}
          />

          {/* Accounts Mapping Table (if accounts file uploaded) */}
          {uploadData.has_accounts && (
            <MappingTable
              type="accounts"
              targetFields={ACCOUNT_FIELDS}
              availableColumns={availableAcctCols}
              mapping={acctMapping}
              onMappingChange={handleAcctMappingChange}
              rawSampleRows={uploadData.preview.accounts}
            />
          )}

          {/* Stepper Navigation Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: '16px',
              borderTop: '1px solid var(--line)',
            }}
          >
            <button
              type="button"
              onClick={() => setStep('select')}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid var(--line)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--ink)',
                cursor: 'pointer',
              }}
            >
              Back to Files
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {!isRequiredTxMapped() && (
                <span style={{ fontSize: '12px', color: 'var(--risk-high)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} />
                  <span>Map all required transaction fields (timestamp, src_account, dst_account, amount).</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleProceedToValidation}
                disabled={!isRequiredTxMapped() || isValidating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  backgroundColor: !isRequiredTxMapped() ? 'var(--line-strong)' : 'var(--accent)',
                  color: 'var(--paper)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !isRequiredTxMapped() || isValidating ? 'not-allowed' : 'pointer',
                }}
              >
                <span>{isValidating ? 'Validating Hygiene...' : 'Validate & Preview'}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: VALIDATE & HEALTH */}
      {currentStep === 'validate' && validationReport && (
        <ValidationStep
          report={validationReport}
          onProceed={handleProceedToRunConfig}
          onBack={() => setStep('map')}
        />
      )}

      {/* STEP 4: CONFIGURE RUN */}
      {currentStep === 'run' && (
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--line)',
            }}
        >
          <RunConfigStep
            defaultName={defaultRunName}
            onStart={handleStartPipeline}
            onBack={() => setStep(validationReport ? 'validate' : 'select')}
            isStarting={isStartingRun}
          />
        </div>
      )}

      {/* STEP 5: EXECUTION PROGRESS */}
      {currentStep === 'progress' && activePipelineRunId && (
        <RunProgress
          runId={activePipelineRunId}
          onCancel={() => {
            fetchRuns();
            setStep('select');
          }}
        />
      )}

      {/* ALTERNATIVE INTAKE CARDS */}
      <IntakeCards
        onPastedTextSubmit={handlePastedCsvText}
        onRunCreated={handleRunCreatedFromCard}
      />

      {/* RUN HISTORY TABLE */}
      <RunHistoryTable
        runs={runs}
        onRefresh={fetchRuns}
        onRerun={handleRerun}
      />
    </div>
  );
};
