import React from 'react';
import type { ValidationReport } from '../../api/types';
import { api } from '../../api/client';

interface ValidationStepProps {
  report: ValidationReport;
  onProceed: () => void;
  onBack: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ report, onProceed, onBack }) => {
  const hasErrors = report.issues.some((i) => i.severity === 'error') || !report.can_proceed;
  const previewCols = report.preview_rows.length > 0 ? Object.keys(report.preview_rows[0]) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 4-Box Summary Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div className="t-head" style={{ color: 'var(--ink)' }}>
            Data health summary
          </div>

          {report.rejected_rows_count > 0 && (
            <a
              href={api.getRejectsCsvUrl(report.upload_id)}
              download={`rejects_${report.upload_id}.csv`}
              className="mono"
              style={{
                color: 'var(--ink)',
                textDecoration: 'underline',
              }}
            >
              Download {report.rejected_rows_count} rejected rows (CSV)
            </a>
          )}
        </div>

        <div
          className="rule-top"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            paddingTop: '16px',
          }}
        >
          {/* Card 1: Clean Rows */}
          <div>
            <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
              Clean rows
            </div>
            <div className="t-hero" style={{ fontSize: '40px', color: 'var(--ink)' }}>
              {report.total_rows.toLocaleString()}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
              {report.unique_accounts.toLocaleString()} unique accounts
            </div>
          </div>

          {/* Card 2: Date Range */}
          <div>
            <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
              Observed window
            </div>
            <div className="mono" style={{ fontSize: '15px', color: 'var(--ink)', fontWeight: 600, marginTop: '8px' }}>
              {report.date_range.start ? `${report.date_range.start.slice(0, 10)} → ${report.date_range.end.slice(0, 10)}` : 'N/A'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
              Sorted in time
            </div>
          </div>

          {/* Card 3: Duplicates Removed */}
          <div>
            <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
              Duplicates removed
            </div>
            <div className="t-hero" style={{ fontSize: '40px', color: 'var(--ink)' }}>
              {report.duplicates_removed}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
              Deduplicated
            </div>
          </div>

          {/* Card 4: Rejected Rows */}
          <div>
            <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
              Rejected rows
            </div>
            <div className="t-hero" style={{ fontSize: '40px', color: report.rejected_rows_count > 0 ? 'var(--signal)' : 'var(--ink)' }}>
              {report.rejected_rows_count}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '4px' }}>
              Excluded from run
            </div>
          </div>
        </div>
      </div>

      {/* Validation Issues with plain text Warning/Error */}
      {report.issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
            Quality annotations
          </div>
          <div style={{ borderTop: '1px solid var(--rule)' }}>
            {report.issues.map((issue, idx) => {
              const isError = issue.severity === 'error';
              return (
                <div
                  key={idx}
                  className="row"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    padding: '8px 12px',
                  }}
                >
                  <div style={{ width: '80px', flexShrink: 0 }}>
                    {isError ? (
                      <span className="mono" style={{ color: 'var(--signal)', fontWeight: 700 }}>
                        Fix
                      </span>
                    ) : (
                      <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <span className="dot" />
                        <span>Check</span>
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, fontSize: '14px' }}>
                    <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{issue.message}</span>
                    {issue.effect && (
                      <span style={{ color: 'var(--ink-2)', marginLeft: '8px' }}>
                        — {issue.effect}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Table: First 20 Rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
          Preview (first 20 rows)
        </div>

        <div style={{ overflowX: 'auto', borderTop: '2px solid var(--ink)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)', width: '40px' }}>#</th>
                {previewCols.map((col) => (
                  <th key={col} className="mono" style={{ padding: '8px 12px', color: 'var(--ink-2)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.preview_rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="row">
                  <td className="mono" style={{ padding: '6px 12px', color: 'var(--ink-2)' }}>
                    {rowIdx + 1}
                  </td>
                  {previewCols.map((col) => (
                    <td key={col} className="mono" style={{ padding: '6px 12px' }}>
                      {String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--rule)' }}>
        <button type="button" className="btn-ghost" onClick={onBack} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Back to map
        </button>

        <button
          type="button"
          className="btn"
          onClick={onProceed}
          disabled={hasErrors}
          style={{
            opacity: hasErrors ? 0.4 : 1,
            cursor: hasErrors ? 'not-allowed' : 'pointer',
          }}
        >
          {hasErrors ? 'Fix errors to proceed' : 'Continue to configure'}
        </button>
      </div>
    </div>
  );
};
