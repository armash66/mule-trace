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
  { field: 'opened_date', label: 'Opened Date', required: false, description: 'Account creation date for dormancy and age rules.' },
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

  // Timezone
  const [timezone, setTimezone] = useState('IST');

  // Mappings state
  const [txMapping, setTxMapping] = useState<Record<string, ColumnMappingItem>>({});
  const [acctMapping, setAcctMapping] = useState<Record<string, ColumnMappingItem>>({});
  const [detectedTypes, setDetectedTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    if (stagedFiles && stagedFiles.length > 0) {
      handleFilesSelected(stagedFiles);
      setStagedFiles([]);
    }
  }, [stagedFiles]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
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
    setDetectedTypes((prev) => ({ ...prev, [filename]: newType }));
  };

  const handleRemoveFile = (filename: string) => {
    if (!uploadData) return;
    const remaining = uploadData.files.filter((f) => f.filename !== filename);
    if (remaining.length === 0) {
      setUploadData(null);
      setStep('select');
    } else {
      setUploadData({ ...uploadData, files: remaining });
    }
  };

  const handleTxMappingChange = (targetField: string, sourceCol: string | null) => {
    setTxMapping((prev) => ({
      ...prev,
      [targetField]: {
        target_field: targetField,
        source_column: sourceCol,
        confidence: 'Matched',
        sample_values: prev[targetField]?.sample_values || [],
      },
    }));
  };

  const handleAcctMappingChange = (targetField: string, sourceCol: string | null) => {
    setAcctMapping((prev) => ({
      ...prev,
      [targetField]: {
        target_field: targetField,
        source_column: sourceCol,
        confidence: 'Matched',
        sample_values: prev[targetField]?.sample_values || [],
      },
    }));
  };

  const isRequiredTxMapped = () => {
    const required = ['timestamp', 'src_account', 'dst_account', 'amount'];
    return required.every((f) => !!txMapping[f]?.source_column);
  };

  const handleProceedToValidation = async () => {
    if (!uploadData) return;
    setIsValidating(true);
    try {
      await api.saveMapping(uploadData.upload_id, {
        transactions: txMapping,
        accounts: acctMapping,
        timezone,
      });

      const report = await api.validateUpload(uploadData.upload_id);
      setValidationReport(report);
      setStep('validate');
    } catch {
      showToast('Validation failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleProceedToRunConfig = () => {
    setStep('run');
  };

  const handleStartPipeline = async (runName: string, configPreset: string) => {
    if (!uploadData) return;
    setIsStartingRun(true);
    try {
      const res = await api.createRun({
        name: runName,
        upload_id: uploadData.upload_id,
        config_preset: configPreset,
      });
      setActivePipelineRunId(res.run_id);
      setActiveRunId(res.run_id);
      setStep('progress');
    } catch {
      showToast('Failed to start run.');
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

  const txFile = uploadData?.files.find((f) => (detectedTypes[f.filename] || f.detected_type) === 'transactions');
  const acctFile = uploadData?.files.find((f) => (detectedTypes[f.filename] || f.detected_type) === 'accounts');

  const availableTxCols = txFile?.columns || [];
  const availableAcctCols = acctFile?.columns || [];
  const defaultRunName = `Upload ${formatDate(new Date().toISOString())}`;

  return (
    <div style={{ padding: '0 36px 48px 36px', maxWidth: '1120px', margin: '0 auto', backgroundColor: 'var(--paper)' }}>
      {/* Header & Step List */}
      <div style={{ padding: '32px 0 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <div className="t-head" style={{ color: 'var(--ink)' }}>
              Data
            </div>
            <p style={{ fontSize: '15px', color: 'var(--ink-2)', marginTop: '4px' }}>
              Upload bank files, check schema, and run detection.
            </p>
          </div>

          {activeRunId && (
            <div className="mono" style={{ color: 'var(--ink-2)' }}>
              Active run: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{runs.find((r) => r.id === activeRunId)?.name || activeRunId}</span>
            </div>
          )}
        </div>

        {/* Step list shown as plain text "1 Select  2 Match  3 Check  4 Run" in .mono with current step underlined 2px ink */}
        <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid var(--rule)' }}>
          {[
            { key: 'select', label: '1 Select' },
            { key: 'map', label: '2 Match' },
            { key: 'validate', label: '3 Check' },
            { key: 'run', label: '4 Run' },
          ].map((s) => {
            const isCurrent = currentStep === s.key || (s.key === 'run' && currentStep === 'progress');
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  if (s.key === 'select') setStep('select');
                  if (s.key === 'map' && uploadData) setStep('map');
                  if (s.key === 'validate' && validationReport) setStep('validate');
                  if (s.key === 'run' && uploadData) setStep('run');
                }}
                className="mono"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px 0',
                  color: isCurrent ? 'var(--ink)' : 'var(--ink-2)',
                  borderBottom: isCurrent ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: '-1px',
                  fontSize: '13px',
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: SELECT FILES */}
      {currentStep === 'select' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
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
                  className="btn"
                  onClick={() => setStep('map')}
                >
                  Continue to match
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: MAP COLUMNS */}
      {currentStep === 'map' && uploadData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <FileChips
            files={uploadData.files}
            detectedTypes={detectedTypes}
            onTypeChange={handleTypeChange}
            onRemoveFile={handleRemoveFile}
            hasAccounts={uploadData.has_accounts}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>Timezone:</span>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mono"
              style={{
                padding: '4px 8px',
                border: '1px solid var(--rule)',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
                outline: 'none',
              }}
            >
              <option value="IST">IST (UTC+05:30)</option>
              <option value="UTC">UTC (+00:00)</option>
            </select>
          </div>

          <MappingTable
            type="transactions"
            targetFields={TRANSACTION_FIELDS}
            availableColumns={availableTxCols}
            mapping={txMapping}
            onMappingChange={handleTxMappingChange}
            rawSampleRows={uploadData.preview.transactions}
          />

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

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--rule)' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setStep('select')}
              style={{ padding: '8px 16px', cursor: 'pointer' }}
            >
              Back
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {!isRequiredTxMapped() && (
                <span className="mono" style={{ color: 'var(--signal)' }}>
                  Fix: Map all required transaction fields.
                </span>
              )}

              <button
                type="button"
                className="btn"
                onClick={handleProceedToValidation}
                disabled={!isRequiredTxMapped() || isValidating}
                style={{
                  opacity: !isRequiredTxMapped() || isValidating ? 0.4 : 1,
                  cursor: !isRequiredTxMapped() || isValidating ? 'not-allowed' : 'pointer',
                }}
              >
                {isValidating ? 'Validating...' : 'Continue to check'}
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
        <div>
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

      {/* INTAKE CARDS */}
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
