import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { AccountListItem } from '../api/types';

function limitWords(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

export const Alerts: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedAccountId, showToast } = useStore();

  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'unreviewed' | 'confirmed' | 'cleared'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchAccounts = useCallback(() => {
    setLoading(true);
    api
      .getAccounts({
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: searchQuery,
      })
      .then((res) => {
        setAccounts(res.items);
        if (res.items.length > 0 && selectedIndex >= res.items.length) {
          setSelectedIndex(0);
        }
      })
      .finally(() => setLoading(false));
  }, [statusFilter, searchQuery, selectedIndex]);

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
          note: `Analyst action.`,
          analyst: 'analyst_on_duty',
        });
        showToast(
          status === 'confirmed' ? `Marked ${accId} as mule.` : `Marked ${accId} as cleared.`,
          () => {
            api.submitDecision(accId, {
              status: 'unreviewed' as any,
              note: 'Undo action',
              analyst: 'analyst_on_duty',
            }).then(() => fetchAccounts());
          }
        );
        fetchAccounts();
      } catch {
        showToast(`Failed to update account.`);
      }
    },
    [fetchAccounts, showToast]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  return (
    <div style={{ padding: '0 36px 48px 36px', maxWidth: '1120px', margin: '0 auto', backgroundColor: 'var(--paper)' }}>
      {/* Controls row */}
      <div style={{ padding: '24px 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {(['all', 'unreviewed', 'confirmed', 'cleared'] as const).map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setStatusFilter(filterKey)}
              className="mono"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                color: statusFilter === filterKey ? 'var(--ink)' : 'var(--ink-2)',
                borderBottom: statusFilter === filterKey ? '2px solid var(--ink)' : '2px solid transparent',
              }}
            >
              {filterKey === 'all'
                ? 'All'
                : filterKey === 'unreviewed'
                ? 'Open'
                : filterKey === 'confirmed'
                ? 'Marked as mule'
                : 'Cleared'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search account or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mono"
            style={{
              padding: '6px 10px',
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              outline: 'none',
              width: '240px',
            }}
          />
          <span className="mono" style={{ color: 'var(--ink-2)' }}>
            J/K step · Enter inspect · C mule · X clear
          </span>
        </div>
      </div>

      {/* Header row in .mono ink-2 */}
      <div
        className="rule-top"
        style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 80px 160px',
          padding: '12px 16px',
          alignItems: 'center',
        }}
      >
        <div className="mono" style={{ color: 'var(--ink-2)' }}>
          Account
        </div>
        <div className="mono" style={{ color: 'var(--ink-2)' }}>
          Why
        </div>
        <div className="mono" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>
          Risk
        </div>
        <div className="mono" style={{ color: 'var(--ink-2)', textAlign: 'right' }}>
          Status
        </div>
      </div>

      {/* Table rows */}
      <div>
        {loading ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }} className="mono">
            <span style={{ color: 'var(--ink-2)' }}>Loading alerts...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }} className="mono">
            <span style={{ color: 'var(--ink-2)' }}>No alerts found.</span>
          </div>
        ) : (
          accounts.map((acc, idx) => {
            const isSelected = idx === selectedIndex;
            const plainReason = limitWords(acc.reason || 'Unusual rapid money movement across accounts.', 14);

            return (
              <div
                key={acc.account_id}
                role="row"
                aria-selected={isSelected}
                className="row"
                onClick={() => {
                  setSelectedIndex(idx);
                  inspectAccount(acc.account_id);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr 80px 160px',
                  alignItems: 'center',
                }}
              >
                {/* Account */}
                <div className="mono" style={{ fontWeight: 600 }}>
                  {acc.account_id}
                </div>

                {/* Why (14 words max) */}
                <div style={{ fontSize: '15px', paddingRight: '20px' }}>
                  {plainReason}
                </div>

                {/* Risk */}
                <div
                  className="mono"
                  style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: acc.risk_score > 80 && !isSelected ? 'var(--signal)' : 'inherit',
                  }}
                >
                  {acc.risk_score}
                </div>

                {/* Status (.dot + word) */}
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                  <span
                    className={`dot ${acc.status === 'confirmed' ? 'hot' : ''}`}
                    style={acc.status === 'cleared' ? { background: 'var(--ok)' } : {}}
                  />
                  <span style={{ fontSize: '13px' }}>
                    {acc.status === 'confirmed'
                      ? 'Marked as mule'
                      : acc.status === 'cleared'
                      ? 'Cleared'
                      : 'Open'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
