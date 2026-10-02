import React from 'react';
import type { FileInfo } from '../../api/types';
import { FileText, FileSpreadsheet, AlertTriangle, X, Info } from 'lucide-react';

interface FileChipsProps {
  files: FileInfo[];
  detectedTypes: Record<string, string>;
  onTypeChange: (filename: string, newType: 'transactions' | 'accounts') => void;
  onRemoveFile: (filename: string) => void;
  hasAccounts: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileChips: React.FC<FileChipsProps> = ({
  files,
  detectedTypes,
  onTypeChange,
  onRemoveFile,
  hasAccounts,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {files.map((file) => {
          const currentType = detectedTypes[file.filename] || file.detected_type;
          const isAmbiguous = file.detected_type === 'ambiguous';

          return (
            <div
              key={file.filename}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface-raised)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {currentType === 'transactions' ? (
                    <FileText size={16} color="var(--ink)" />
                  ) : (
                    <FileSpreadsheet size={16} color="var(--ink)" />
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      {file.filename}
                    </span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                      {formatBytes(file.size_bytes)}
                    </span>
                    {file.row_count > 0 && (
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        • {file.row_count.toLocaleString()} rows
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    {isAmbiguous ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--risk-mid)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} />
                          <span>Ambiguous headers. Treat as:</span>
                        </span>
                        <div style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                          <button
                            type="button"
                            onClick={() => onTypeChange(file.filename, 'transactions')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: currentType === 'transactions' ? 600 : 400,
                              backgroundColor: currentType === 'transactions' ? 'var(--surface-raised)' : 'transparent',
                              color: currentType === 'transactions' ? 'var(--ink)' : 'var(--ink-3)',
                              border: 'none',
                              cursor: 'pointer',
                              borderRight: '1px solid var(--line)',
                            }}
                          >
                            Transactions
                          </button>
                          <button
                            type="button"
                            onClick={() => onTypeChange(file.filename, 'accounts')}
                            style={{
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: currentType === 'accounts' ? 600 : 400,
                              backgroundColor: currentType === 'accounts' ? 'var(--surface-raised)' : 'transparent',
                              color: currentType === 'accounts' ? 'var(--ink)' : 'var(--ink-3)',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            Accounts
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span
                        className="mono"
                        style={{
                          fontSize: '11px',
                          color: 'var(--ink-2)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Identified as: <strong>{currentType}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemoveFile(file.filename)}
                title="Remove file"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-3)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {!hasAccounts && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'var(--surface-raised)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: 'var(--ink-2)',
            lineHeight: 1.5,
          }}
        >
          <Info size={15} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--ink-3)' }} />
          <div>
            <strong>Accounts file omitted:</strong> Graph detectors (Fan-in/Fan-out, Cycles, Multi-hop Chains) will run at full strength.
            Cluster (shared KYC/device) and dormancy detectors will operate in reduced mode.
          </div>
        </div>
      )}
    </div>
  );
};
