import React from 'react';
import type { FileInfo } from '../../api/types';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {files.map((file) => {
        const currentType = detectedTypes[file.filename] || file.detected_type;
        const isAmbiguous = file.detected_type === 'ambiguous';

        return (
          <div
            key={file.filename}
            className="row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="mono" style={{ fontWeight: 600 }}>
                {file.filename}
              </span>
              <span className="mono" style={{ color: 'var(--ink-2)' }}>
                {formatBytes(file.size_bytes)}
              </span>
              {file.row_count > 0 && (
                <span className="mono" style={{ color: 'var(--ink-2)' }}>
                  {file.row_count.toLocaleString()} rows
                </span>
              )}
              <span className="mono" style={{ color: 'var(--ink-2)' }}>
                [{currentType}]
              </span>
              {isAmbiguous && (
                <div style={{ display: 'inline-flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onTypeChange(file.filename, 'transactions')}
                    className="mono"
                    style={{
                      border: '1px solid var(--ink)',
                      background: currentType === 'transactions' ? 'var(--ink)' : 'transparent',
                      color: currentType === 'transactions' ? 'var(--paper)' : 'var(--ink)',
                      padding: '1px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Transactions
                  </button>
                  <button
                    type="button"
                    onClick={() => onTypeChange(file.filename, 'accounts')}
                    className="mono"
                    style={{
                      border: '1px solid var(--ink)',
                      background: currentType === 'accounts' ? 'var(--ink)' : 'transparent',
                      color: currentType === 'accounts' ? 'var(--paper)' : 'var(--ink)',
                      padding: '1px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    Accounts
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => onRemoveFile(file.filename)}
              className="mono"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--ink-2)',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: '13px',
              }}
              title="Remove file"
            >
              x
            </button>
          </div>
        );
      })}

      {!hasAccounts && (
        <div className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)', padding: '6px 0' }}>
          Check: No accounts file uploaded. Group detectors will run in reduced mode.
        </div>
      )}
    </div>
  );
};
