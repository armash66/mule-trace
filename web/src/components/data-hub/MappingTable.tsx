import React from 'react';
import type { ColumnMappingItem } from '../../api/types';
import { Check, AlertCircle, HelpCircle } from 'lucide-react';

interface MappingTableProps {
  type: 'transactions' | 'accounts';
  targetFields: Array<{
    field: string;
    label: string;
    required: boolean;
    description: string;
  }>;
  availableColumns: string[];
  mapping: Record<string, ColumnMappingItem>;
  onMappingChange: (targetField: string, sourceCol: string | null) => void;
  rawSampleRows?: Record<string, any>[];
}

export const MappingTable: React.FC<MappingTableProps> = ({
  type,
  targetFields,
  availableColumns,
  mapping,
  onMappingChange,
  rawSampleRows = [],
}) => {
  const getSamplesForCol = (colName: string | null): string => {
    if (!colName) return '—';
    if (mapping[colName]?.sample_values && mapping[colName].sample_values.length > 0) {
      return mapping[colName].sample_values.slice(0, 3).map(String).join(', ');
    }
    const samples = rawSampleRows
      .map((r) => r[colName])
      .filter((v) => v !== undefined && v !== null && v !== '')
      .slice(0, 3);
    return samples.length > 0 ? samples.map(String).join(', ') : '—';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textTransform: 'capitalize' }}>
        {type} Column Schema Mapping
      </div>

      <div
        style={{
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '22%' }}>Target Field</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '28%' }}>Source Column</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)', width: '16%' }}>Confidence</th>
              <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--ink-2)' }}>Sample Values (First 3)</th>
            </tr>
          </thead>
          <tbody>
            {targetFields.map((spec) => {
              const currentItem = mapping[spec.field];
              const currentSourceCol = currentItem?.source_column || '';
              const isMatched = currentItem?.confidence === 'Matched' && currentSourceCol !== '';
              const isCheck = currentItem?.confidence === 'Check' || (!currentSourceCol && spec.required);

              return (
                <tr
                  key={spec.field}
                  style={{
                    borderBottom: '1px solid var(--line)',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  {/* Field & Requirement */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {spec.field}
                      </span>
                      {spec.required ? (
                        <span style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>
                          Req
                        </span>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>opt</span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
                      {spec.description}
                    </div>
                  </td>

                  {/* Dropdown selector */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                    <select
                      value={currentSourceCol}
                      onChange={(e) => onMappingChange(spec.field, e.target.value || null)}
                      style={{
                        width: '100%',
                        padding: '5px 8px',
                        fontSize: '12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--line-strong)',
                        backgroundColor: 'var(--surface)',
                        color: 'var(--ink)',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="">-- Ignore / Unmapped --</option>
                      {availableColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Confidence Badge */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                    {currentSourceCol ? (
                      isMatched ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: 'var(--ok)',
                            fontWeight: 500,
                          }}
                        >
                          <Check size={12} />
                          <span>Matched</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: 'var(--risk-mid)',
                            fontWeight: 500,
                          }}
                        >
                          <AlertCircle size={12} />
                          <span>Check</span>
                        </span>
                      )
                    ) : spec.required ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--risk-high)',
                          fontWeight: 500,
                        }}
                      >
                        <AlertCircle size={12} />
                        <span>Missing</span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Omitted</span>
                    )}
                  </td>

                  {/* Sample values */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '11px',
                        color: 'var(--ink-2)',
                        display: 'block',
                        maxWidth: '320px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={getSamplesForCol(currentSourceCol)}
                    >
                      {getSamplesForCol(currentSourceCol)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
