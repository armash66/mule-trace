import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type {
  AccountDetail,
  AccountListItem,
  NetworkResponse,
} from '../api/types';
import { CytoscapeGraph } from '../components/CytoscapeGraph';
import { FreezePlanModal } from '../components/FreezePlanModal';

function limitWords(text: string, maxWords: number): string {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

export const Investigate: React.FC = () => {
  const { accountId: routeAccountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();

  const {
    selectedAccountId,
    setSelectedAccountId,
    currentHops,
    setCurrentHops,
    showToast,
  } = useStore();

  const activeId = routeAccountId || selectedAccountId || 'ACC_05001';

  const [accountList, setAccountList] = useState<AccountListItem[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [network, setNetwork] = useState<NetworkResponse>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'details' | 'history'>('evidence');
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [latestDecision, setLatestDecision] = useState<'confirmed' | 'cleared' | null>(null);

  // Sync route
  useEffect(() => {
    if (routeAccountId && routeAccountId !== selectedAccountId) {
      setSelectedAccountId(routeAccountId);
    }
  }, [routeAccountId, selectedAccountId, setSelectedAccountId]);

  // Load account list
  useEffect(() => {
    api.getAccounts().then((res) => setAccountList(res.items));
  }, []);

  // Load selected account data
  const loadAccountData = useCallback((id: string, hops: number) => {
    setLoading(true);
    Promise.all([
      api.getAccountDetail(id),
      api.getAccountNetwork(id, hops, 60),
    ])
      .then(([det, net]) => {
        setAccountDetail(det);
        setNetwork(net);
        if (det.decisions && det.decisions.length > 0) {
          const last = det.decisions[det.decisions.length - 1];
          setLatestDecision(last.status as 'confirmed' | 'cleared');
        } else {
          setLatestDecision(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAccountData(activeId, currentHops);
  }, [activeId, currentHops, loadAccountData]);

  const selectAccount = (id: string) => {
    setSelectedAccountId(id);
    navigate(`/workspace/${id}`);
  };

  const handleDecision = async (status: 'confirmed' | 'cleared') => {
    const note = decisionNote.trim() || (status === 'confirmed' ? 'Marked as mule by analyst' : 'Cleared by analyst');
    try {
      await api.submitDecision(activeId, {
        status,
        note,
        analyst: 'analyst_on_duty',
      });
      setLatestDecision(status);
      showToast(status === 'confirmed' ? `Marked ${activeId} as mule.` : `Marked ${activeId} as cleared.`, () => {
        api.submitDecision(activeId, {
          status: 'unreviewed' as any,
          note: 'Reverted action',
          analyst: 'analyst_on_duty',
        }).then(() => loadAccountData(activeId, currentHops));
      });
      loadAccountData(activeId, currentHops);
    } catch {
      showToast('Failed to record decision.');
    }
  };

  // Keyboard triage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        const curIdx = accountList.findIndex((a) => a.account_id === activeId);
        if (curIdx >= 0 && curIdx < accountList.length - 1) {
          selectAccount(accountList[curIdx + 1].account_id);
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        const curIdx = accountList.findIndex((a) => a.account_id === activeId);
        if (curIdx > 0) {
          selectAccount(accountList[curIdx - 1].account_id);
        }
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleDecision('confirmed');
      } else if (e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleDecision('cleared');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFreezeModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountList, activeId, handleDecision]);

  const filteredList = accountList.filter(
    (a) =>
      a.account_id.toLowerCase().includes(listSearch.toLowerCase()) ||
      a.reason.toLowerCase().includes(listSearch.toLowerCase())
  );

  const headlineWhy = limitWords(
    accountDetail?.reasons?.[0] || 'Unusual rapid money movement across accounts.',
    14
  );

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', backgroundColor: 'var(--paper)' }}>
      <FreezePlanModal
        ringId="fan_1"
        isOpen={freezeModalOpen}
        onClose={() => setFreezeModalOpen(false)}
      />

      {/* Pane 1: Left accounts list (240px) */}
      <div
        style={{
          width: '240px',
          minWidth: '240px',
          borderRight: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          backgroundColor: 'var(--paper)',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--rule)' }}>
          <input
            type="text"
            placeholder="Search accounts..."
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            className="mono"
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredList.map((item) => {
            const isSelected = item.account_id === activeId;
            return (
              <div
                key={item.account_id}
                role="row"
                aria-selected={isSelected}
                className="row"
                onClick={() => selectAccount(item.account_id)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span className="mono" style={{ fontWeight: 600 }}>
                  {item.account_id}
                </span>
                <span
                  className="mono"
                  style={{
                    color: item.risk_score > 80 && !isSelected ? 'var(--signal)' : 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {item.risk_score}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pane 2: Center Interactive Cytoscape Graph */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          height: '100%',
          backgroundColor: 'var(--paper)',
        }}
      >
        {/* Graph top bar */}
        <div
          style={{
            padding: '10px 18px',
            borderBottom: '1px solid var(--rule)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="mono" style={{ color: 'var(--ink)' }}>
              Network graph
            </span>
            <span className="mono" style={{ color: 'var(--ink-2)' }}>
              {network.nodes.length} nodes · {network.edges.length} edges
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setCurrentHops(h)}
                  className="mono"
                  style={{
                    padding: '3px 8px',
                    border: '1px solid var(--ink)',
                    background: currentHops === h ? 'var(--ink)' : 'transparent',
                    color: currentHops === h ? 'var(--paper)' : 'var(--ink)',
                    cursor: 'pointer',
                  }}
                >
                  {h} hop{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn"
              onClick={() => setFreezeModalOpen(true)}
              style={{ padding: '4px 10px', fontSize: '13px' }}
            >
              Cut plan
            </button>
          </div>
        </div>

        {/* Cytoscape Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <CytoscapeGraph
            nodes={network.nodes}
            edges={network.edges}
            selectedId={activeId}
            recommendedFreezeId="ACC_05001"
            onNodeClick={(clickedId) => selectAccount(clickedId)}
          />
        </div>
      </div>

      {/* Pane 3: Right Details & Action Inspector (380px) */}
      <div
        style={{
          width: '380px',
          minWidth: '380px',
          borderLeft: '1px solid var(--rule)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: 'var(--paper)',
          padding: '28px 24px',
        }}
      >
        {/* Plain sentence in .t-head at the top (largest text on the panel) */}
        <div className="t-head" style={{ color: 'var(--ink)', marginBottom: '16px' }}>
          {headlineWhy}
        </div>

        {/* Account ID & Stamp */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="mono" style={{ color: 'var(--ink-2)', fontSize: '14px' }}>
            {activeId}
          </span>
          {latestDecision === 'confirmed' && (
            <span className="stamp">MARKED AS MULE</span>
          )}
          {latestDecision === 'cleared' && (
            <span className="stamp ok">Cleared</span>
          )}
        </div>

        {/* Risk as "Risk 94" in .t-hero at 56px signal colour */}
        <div className="t-hero" style={{ fontSize: '56px', color: 'var(--signal)', margin: '12px 0 20px 0' }}>
          Risk {accountDetail?.risk_score ?? 85}
        </div>

        {/* Action input & two buttons */}
        <div style={{ marginBottom: '28px' }}>
          <input
            type="text"
            placeholder="Reason note (required)..."
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            className="mono"
            style={{
              width: '100%',
              padding: '6px 10px',
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              outline: 'none',
              marginBottom: '10px',
            }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleDecision('confirmed')}
              style={{ flex: 1 }}
            >
              Mark as mule
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => handleDecision('cleared')}
              style={{ flex: 1, padding: '8px 14px', cursor: 'pointer' }}
            >
              Not a mule
            </button>
          </div>
        </div>

        {/* Three plain text tabs: Evidence, Details, History with 2px ink underline */}
        <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid var(--rule)', marginBottom: '18px' }}>
          {(['evidence', 'details', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none',
                border: 'none',
                padding: '6px 0',
                cursor: 'pointer',
                fontSize: '15px',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-2)',
                borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent',
                marginBottom: '-1px',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'evidence' ? 'Evidence' : tab === 'details' ? 'Details' : 'History'}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <div>
          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {accountDetail?.findings && accountDetail.findings.length > 0 ? (
                accountDetail.findings.map((f, i) => (
                  <div key={i} style={{ borderTop: '1px solid var(--rule)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{f.pattern}</span>
                      <span className="mono" style={{ color: 'var(--ink-2)' }}>
                        {(f.strength * 100).toFixed(0)}%
                      </span>
                    </div>
                    <pre
                      className="mono"
                      style={{
                        fontSize: '11px',
                        background: 'var(--paper-2)',
                        padding: '8px',
                        overflowX: 'auto',
                        color: 'var(--ink-2)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {JSON.stringify(f.evidence, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="mono" style={{ color: 'var(--ink-2)' }}>
                  No findings recorded.
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>KYC phone</span>
                <span className="mono">+91 98••••12</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>KYC address</span>
                <span className="mono">Flat 4••, Andheri West, Mumbai</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>Device hash</span>
                <span className="mono">a8••••4f</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--ink-2)' }}>Account age</span>
                <span className="mono">
                  {accountDetail?.age_days ? `${accountDetail.age_days} days` : '22 days'}
                </span>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {accountDetail?.decisions && accountDetail.decisions.length > 0 ? (
                accountDetail.decisions.map((d, i) => (
                  <div key={i} style={{ borderBottom: '1px solid var(--rule)', paddingBottom: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {d.status === 'confirmed' ? 'Marked as mule' : 'Cleared'}
                      </span>
                      <span className="mono" style={{ color: 'var(--ink-2)' }}>
                        {d.analyst}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>{d.note}</div>
                  </div>
                ))
              ) : (
                <div className="mono" style={{ color: 'var(--ink-2)' }}>
                  No previous decisions recorded.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
