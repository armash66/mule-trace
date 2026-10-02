import React from 'react';
import type { ColumnMappingItem } from '../../api/types';

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
      <div className="mono" style={{ color: 'var(--ink)', fontWeight: 600 }}>
        {type === 'transactions' ? 'Transactions column mapping' : 'Accounts column mapping'}
      </div>

      <div style={{ borderTop: '2px solid var(--ink)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '200px 220px 120px 1fr',
            padding: '10px 16px',
            alignItems: 'center',
          }}
        >
          <span className="mono" style={{ color: 'var(--ink-2)' }}>Target field</span>
          <span className="mono" style={{ color: 'var(--ink-2)' }}>Source column</span>
          <span className="mono" style={{ color: 'var(--ink-2)' }}>Confidence</span>
          <span className="mono" style={{ color: 'var(--ink-2)' }}>Sample values</span>
        </div>

        {targetFields.map((spec) => {
          const currentItem = mapping[spec.field];
          const currentSourceCol = currentItem?.source_column || '';
          const isMatched = currentItem?.confidence === 'Matched' && currentSourceCol !== '';
          const isCheck = currentItem?.confidence === 'Check' || (!currentSourceCol && spec.required);
          const samples = getSamplesForCol(currentSourceCol || null);

          return (
            <div
              key={spec.field}
              className="row"
              style={{
                display: 'grid',
                gridTemplateColumns: '200px 220px 120px 1fr',
                alignItems: 'center',
                padding: '10px 16px',
              }}
            >
              {/* Target field */}
              <div>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {spec.field}
                </span>
                {spec.required && (
                  <span className="mono" style={{ color: 'var(--signal)', marginLeft: '6px' }}>
                    *
                  </span>
                )}
              </div>

              {/* Source column dropdown */}
              <div>
                <select
                  value={currentSourceCol}
                  onChange={(e) => onMappingChange(spec.field, e.target.value || null)}
                  className="mono"
                  style={{
                    padding: '4px 8px',
                    border: '1px solid var(--rule)',
                    background: 'var(--paper)',
                    color: 'var(--ink)',
                    outline: 'none',
                    width: '180px',
                  }}
                >
                  <option value="">(None)</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Confidence */}
              <div>
                {isMatched ? (
                  <span className="mono" style={{ color: 'var(--ink)' }}>Matched</span>
                ) : isCheck ? (
                  <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span className="dot" />
                    <span>Check</span>
                  </span>
                ) : (
                  <span className="mono" style={{ color: 'var(--ink-2)' }}>—</span>
                )}
              </div>

              {/* Sample values */}
              <div
                className="mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--ink-2)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {samples}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
