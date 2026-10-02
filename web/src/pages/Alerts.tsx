import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { AccountListItem } from '../api/types';
import {
  Search,
  Filter,
  Check,
  X as CloseIcon,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedAccountId, showToast } = useStore();

  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [patternFilter, setPatternFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    api
      .getAccounts({
        pattern: patternFilter,
        status: statusFilter,
        min_score: minScore,
        q: searchQuery,
      })
      .then((res) => {
        setAccounts(res.items);
        if (res.items.length > 0 && selectedIndex >= res.items.length) {
          setSelectedIndex(0);
        }
      })
      .finally(() => setLoading(false));
  }, [patternFilter, statusFilter, minScore, searchQuery, selectedIndex]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const inspectAccount = useCallback(
    (accId: string) => {
      setSelectedAccountId(accId);
      navigate(`/workspace/${accId}`);
    },
    [navigate, setSelectedAccountId]
  );

  const handleDecision = useCallback(
    async (accId: string, status: 'confirmed' | 'cleared') => {
      try {
        await api.submitDecision(accId, {
          status,
          note: `Analyst triage action from alerts queue.`,
          analyst: 'analyst_on_duty',
        });
        showToast(
          `Account ${accId} marked as ${status.toUpperCase()}`,
          () => {
            api.submitDecision(accId, {
              status: 'unreviewed' as any,
              note: 'Undo triage action',
              analyst: 'analyst_on_duty',
            }).then(() => fetchAccounts());
          }
        );
        fetchAccounts();
      } catch {
        showToast(`Failed to update account ${accId}.`);
      }
    },
    [fetchAccounts, showToast]
  );

  // Keyboard navigation (J / K / Enter / C / X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, accounts.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (accounts[selectedIndex]) {
          inspectAccount(accounts[selectedIndex].account_id);
        }
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (accounts[selectedIndex]) {
          handleDecision(accounts[selectedIndex].account_id, 'confirmed');
        }
      } else if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        if (accounts[selectedIndex]) {
          handleDecision(accounts[selectedIndex].account_id, 'cleared');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accounts, selectedIndex, inspectAccount, handleDecision]);

  const toggleSelectRow = (accId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(accId)) next.delete(accId);
    else next.add(accId);
    setSelectedIds(next);
  };

  const handleBulkConfirm = async () => {
    for (const id of Array.from(selectedIds)) {
      await api.submitDecision(id, {
        status: 'confirmed',
        note: 'Bulk confirmed by analyst',
        analyst: 'analyst_on_duty',
      });
    }
    showToast(`Bulk confirmed ${selectedIds.size} accounts.`);
    setSelectedIds(new Set());
    fetchAccounts();
  };

  const handleBulkClear = async () => {
    for (const id of Array.from(selectedIds)) {
      await api.submitDecision(id, {
        status: 'cleared',
        note: 'Bulk cleared by analyst',
        analyst: 'analyst_on_duty',
      });
    }
    showToast(`Bulk cleared ${selectedIds.size} accounts.`);
    setSelectedIds(new Set());
    fetchAccounts();
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header & Shortcut info */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            Alerts Triage Queue
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Rapidpay-style triage queue. Use <kbd className="mono" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: '3px' }}>J</kbd>/<kbd className="mono" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: '3px' }}>K</kbd> to step, <kbd className="mono" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: '3px' }}>Enter</kbd> to inspect, <kbd className="mono" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: '3px' }}>C</kbd> confirm, <kbd className="mono" style={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)', padding: '1px 5px', borderRadius: '3px' }}>X</kbd> clear.
          </p>
        </div>

        {/* Selected count / Bulk action strip */}
        {selectedIds.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{selectedIds.size} selected</span>
            <button
              onClick={handleBulkConfirm}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--confirmed)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Bulk Confirm Mule
            </button>
            <button
              onClick={handleBulkClear}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Bulk Clear
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          backgroundColor: 'var(--surface)',
          padding: '10px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--line)',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={15} color="var(--ink-3)" />
          <input
            type="text"
            placeholder="Filter by Account ID or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              color: 'var(--ink)',
            }}
          />
        </div>

        <div style={{ height: '20px', width: '1px', backgroundColor: 'var(--line)' }} />

        {/* Pattern Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>PATTERN:</span>
          <select
            value={patternFilter}
            onChange={(e) => setPatternFilter(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          >
            <option value="all">All Patterns</option>
            <option value="fan">Fan-In / Fan-Out</option>
            <option value="cycle">Cycle Layering</option>
            <option value="chain">Pass-Through Chain</option>
            <option value="cluster">Identity Cluster</option>
            <option value="dormancy">Dormancy Burst</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>STATUS:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          >
            <option value="all">All Statuses</option>
            <option value="unreviewed">Unreviewed</option>
            <option value="confirmed">Confirmed Mule</option>
            <option value="cleared">Cleared</option>
          </select>
        </div>

        {/* Min Score Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600 }}>MIN SCORE:</span>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--ink)', width: '24px' }}>
            {minScore}
          </span>
          <input
            type="range"
            min={0}
            max={90}
            step={10}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--accent)' }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-raised)', borderBottom: '1px solid var(--line)' }}>
              <th style={{ width: '40px', padding: '10px 14px' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === accounts.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(accounts.map((a) => a.account_id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', width: '130px' }}>
                ACCOUNT ID
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', width: '100px' }}>
                RISK SCORE
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', width: '160px' }}>
                PATTERNS
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px' }}>
                PLAIN-LANGUAGE REASON SUMMARY
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', width: '120px' }}>
                STATUS
              </th>
              <th style={{ padding: '10px 14px', color: 'var(--ink-3)', fontWeight: 600, fontSize: '11px', textAlign: 'right', width: '160px' }}>
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  Loading flagged accounts...
                </td>
              </tr>
            ) : accounts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-3)' }}>
                  No accounts match the selected filters.
                </td>
              </tr>
            ) : (
              accounts.map((acc, idx) => {
                const isSelectedRow = idx === selectedIndex;
                const isChecked = selectedIds.has(acc.account_id);
                const scoreColor =
                  acc.risk_score >= 75 ? 'var(--risk-high)' : acc.risk_score >= 40 ? 'var(--risk-mid)' : 'var(--risk-low)';

                return (
                  <tr
                    key={acc.account_id}
                    onClick={() => {
                      setSelectedIndex(idx);
                      inspectAccount(acc.account_id);
                    }}
                    style={{
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                      backgroundColor: isSelectedRow
                        ? 'var(--surface-hover)'
                        : isChecked
                        ? 'var(--accent-muted)'
                        : 'transparent',
                      borderLeft: isSelectedRow ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'background-color 0.12s ease',
                    }}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '12px 14px' }} onClick={(e) => toggleSelectRow(acc.account_id, e)}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Account ID */}
                    <td className="mono" style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--ink)' }}>
                      {acc.account_id}
                    </td>

                    {/* Risk Score */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontWeight: 700, color: scoreColor, width: '24px' }}>
                          {acc.risk_score}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: '5px',
                            backgroundColor: 'var(--line)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${acc.risk_score}%`,
                              height: '100%',
                              backgroundColor: scoreColor,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Patterns */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {acc.patterns.length > 0 ? (
                          acc.patterns.map((p, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '10px',
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-pill)',
                                backgroundColor: 'var(--surface-raised)',
                                border: '1px solid var(--line)',
                                color: 'var(--ink-2)',
                                fontWeight: 600,
                              }}
                            >
                              {p}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>None</span>
                        )}
                      </div>
                    </td>

                    {/* Reason Summary */}
                    <td style={{ padding: '12px 14px', color: 'var(--ink)', lineHeight: '1.4' }}>
                      {acc.reason}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      {acc.status === 'confirmed' ? (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--confirmed)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={12} /> Confirmed
                        </span>
                      ) : acc.status === 'cleared' ? (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--ok)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Check size={12} /> Cleared
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Flagged for review</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecision(acc.account_id, 'confirmed');
                          }}
                          title="Confirm as Mule (C)"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--confirmed)',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDecision(acc.account_id, 'cleared');
                          }}
                          title="Clear Account (X)"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--ok)',
                            cursor: 'pointer',
                          }}
                        >
                          Clear
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            inspectAccount(acc.account_id);
                          }}
                          title="Inspect in Workspace (Enter)"
                          style={{
                            padding: '4px 8px',
                            fontSize: '11px',
                            backgroundColor: 'var(--surface-raised)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                        >
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
