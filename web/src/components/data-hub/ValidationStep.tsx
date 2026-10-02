import React from 'react';
import type { ValidationReport } from '../../api/types';
import { api } from '../../api/client';
import { formatLakhs } from '../../lib/utils';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  Download,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ValidationStepProps {
  report: ValidationReport;
  onProceed: () => void;
  onBack: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({ report, onProceed, onBack }) => {
  const hasErrors = report.issues.some((i) => i.severity === 'error') || !report.can_proceed;

  // Helper to test if a cell in preview has an issue
  const getCellIssue = (rowIdx: number, colName: string) => {
    return report.cell_issues?.find((ci) => ci.row === rowIdx && ci.col === colName);
  };

  const previewCols = report.preview_rows.length > 0 ? Object.keys(report.preview_rows[0]) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 9-Box Data Health Summary KPI Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--ink)" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              Data Health & Hygiene Summary
            </h3>
          </div>

          {report.rejected_rows_count > 0 && (
            <a
              href={api.getRejectsCsvUrl(report.upload_id)}
              download={`rejects_${report.upload_id}.csv`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--ink)',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                textDecoration: 'none',
              }}
            >
              <Download size={12} />
              <span>Download {report.rejected_rows_count} rejected rows (CSV)</span>
            </a>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '10px',
          }}
        >
          {/* Card 1: Total Rows */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Clean Ingested Rows</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {report.total_rows.toLocaleString()}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              {report.unique_accounts.toLocaleString()} unique accounts
            </div>
          </div>

          {/* Card 2: Date Range */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Observed Window</div>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {report.date_range.start ? `${report.date_range.start.slice(0, 10)} → ${report.date_range.end.slice(0, 10)}` : 'N/A'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Chronologically sorted</div>
          </div>

          {/* Card 3: Duplicates Removed */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Duplicates Deduplicated</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {report.duplicates_removed}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Prevents flow amplification</div>
          </div>

          {/* Card 4: Out-of-Order Fixed */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Out-of-Order Re-sequenced</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {report.out_of_order_fixed}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Ordered by UTC timestamp</div>
          </div>

          {/* Card 5: Self-Transfers Dropped */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Self-Transfers Dropped</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {report.self_transfers_dropped}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Self-loops removed</div>
          </div>

          {/* Card 6: Missing Device / IP % */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Missing Telemetry</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
              {report.missing_device_pct}% <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>dev</span> / {report.missing_ip_pct}% <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>IP</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Fallback graph clustering</div>
          </div>

          {/* Card 7: Amount Min/Median/Max */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Transfer Amount Range</div>
            <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginTop: '4px' }}>
              {formatLakhs(report.amount_stats.min)} • {formatLakhs(report.amount_stats.median)} (med)
            </div>
            <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
              Max: {formatLakhs(report.amount_stats.max)}
            </div>
          </div>

          {/* Card 8: Rejected Rows */}
          <div style={{ padding: '12px', backgroundColor: 'var(--surface)', border: '1px solid var(--line)', }}>
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Rejected Rows</div>
            <div className="mono" style={{ fontSize: '17px', fontWeight: 700, color: report.rejected_rows_count > 0 ? 'var(--risk-mid)' : 'var(--ink)', marginTop: '2px' }}>
              {report.rejected_rows_count}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>Invalid amounts/dates dropped</div>
          </div>
        </div>
      </div>

      {/* Validation Issues with Plain Language Effect */}
      {report.issues.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Hygiene & Data Quality Annotations
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {report.issues.map((issue, idx) => {
              const isError = issue.severity === 'error';
              const isWarn = issue.severity === 'warn';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ marginTop: '1px' }}>
                    {isError ? (
                      <AlertCircle size={14} color="var(--risk-high)" />
                    ) : isWarn ? (
                      <AlertTriangle size={14} color="var(--risk-mid)" />
                    ) : (
                      <Info size={14} color="var(--ink-3)" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: '10px', color: isError ? 'var(--risk-high)' : isWarn ? 'var(--risk-mid)' : 'var(--ink-3)' }}>
                        {issue.severity}
                      </span>
                      {issue.field && (
                        <span className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
                          [{issue.field}]
                        </span>
                      )}
                      <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{issue.message}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
                      <strong>Effect on detection:</strong> {issue.effect}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview Table: First 20 Rows (No red fills, issue icons with hover tooltip) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
            Cleaned Ingest Preview (First 20 rows)
          </div>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
            Hover problem icons for cell-level hygiene details
          </span>
        </div>

        <div
          style={{
            maxHeight: '320px',
            overflow: 'auto',
            border: '1px solid var(--line)',
            backgroundColor: 'var(--surface)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--ink-3)', width: '40px' }}>#</th>
                {previewCols.map((col) => (
                  <th key={col} className="mono" style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--ink-2)' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.preview_rows.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    backgroundColor: rowIdx % 2 === 0 ? 'var(--surface)' : 'var(--surface-raised)',
                  }}
                >
                  <td className="mono" style={{ padding: '6px 10px', color: 'var(--ink-3)', fontSize: '11px' }}>
                    {rowIdx + 1}
                  </td>
                  {previewCols.map((col) => {
                    const issue = getCellIssue(rowIdx, col);
                    const val = row[col];

                    return (
                      <td
                        key={col}
                        style={{
                          padding: '6px 10px',
                          color: 'var(--ink)',
                          fontSize: '12px',
                          verticalAlign: 'middle',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {issue && (
                            <span title={issue.issue} style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}>
                              <AlertCircle size={12} color="var(--risk-mid)" />
                            </span>
                          )}
                          <span
                            className={col.includes('id') || col.includes('amount') || col.includes('timestamp') ? 'mono' : ''}
                            style={{
                              maxWidth: '220px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col === 'amount' && typeof val === 'number'
                              ? `₹${val.toLocaleString('en-IN')}`
                              : String(val !== undefined && val !== null ? val : '—')}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
          onClick={onBack}
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
          Back to Mapping
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {hasErrors && (
            <span style={{ fontSize: '12px', color: 'var(--risk-high)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={14} />
              <span>Blocking errors detected in dataset. Correct issues to proceed.</span>
            </span>
          )}

          <button
            type="button"
            onClick={onProceed}
            disabled={hasErrors}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 20px',
              backgroundColor: hasErrors ? 'var(--line-strong)' : 'var(--accent)',
              color: 'var(--paper)',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: hasErrors ? 'not-allowed' : 'pointer',
            }}
          >
            <span>Configure & Run Pipeline</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
