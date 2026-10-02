import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type {
  AccountDetail,
  AccountListItem,
  NetworkResponse,
  TaintAccountResult,
} from '../api/types';
import { CytoscapeGraph } from '../components/CytoscapeGraph';
import { FreezePlanModal } from '../components/FreezePlanModal';
import { formatLakhs, formatCurrency } from '../lib/utils';
import {
  Search,
  Lock,
  PlaySquare,
  HelpCircle,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  User,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

export const Investigate: React.FC = () => {
  const { accountId: routeAccountId } = useParams<{ accountId?: string }>();
  const navigate = useNavigate();

  const {
    selectedAccountId,
    setSelectedAccountId,
    currentHops,
    setCurrentHops,
    setWhyScoreDrawerOpen,
    showToast,
  } = useStore();

  const activeId = routeAccountId || selectedAccountId || 'ACC_05001';

  // State
  const [accountList, setAccountList] = useState<AccountListItem[]>([]);
  const [listSearch, setListSearch] = useState('');
  const [accountDetail, setAccountDetail] = useState<AccountDetail | null>(null);
  const [network, setNetwork] = useState<NetworkResponse>({ nodes: [], edges: [] });
  const [taint, setTaint] = useState<TaintAccountResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'evidence' | 'features' | 'history'>('evidence');
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);

  // Sync route
  useEffect(() => {
    if (routeAccountId && routeAccountId !== selectedAccountId) {
      setSelectedAccountId(routeAccountId);
    }
  }, [routeAccountId, selectedAccountId, setSelectedAccountId]);

  // Load account list for left pane
  useEffect(() => {
    api.getAccounts().then((res) => setAccountList(res.items));
  }, []);

  // Load selected account data
  const loadAccountData = useCallback((id: string, hops: number) => {
    setLoading(true);
    Promise.all([
      api.getAccountDetail(id),
      api.getAccountNetwork(id, hops, 60),
      api.getAccountTaint(id),
    ])
      .then(([det, net, tnt]) => {
        setAccountDetail(det);
        setNetwork(net);
        setTaint(tnt);
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
    try {
      await api.submitDecision(activeId, {
        status,
        note: `Analyst triage in Investigate hero view.`,
        analyst: 'analyst_on_duty',
      });
      showToast(`Account ${activeId} marked as ${status.toUpperCase()}`, () => {
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

  // Keyboard triage (J/K/C/X/F/W/R)
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
      } else if (e.key.toLowerCase() === 'w') {
        e.preventDefault();
        setWhyScoreDrawerOpen(true);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        navigate(`/replay/fan_1`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [accountList, activeId, handleDecision, navigate, setWhyScoreDrawerOpen]);

  const filteredList = accountList.filter(
    (a) =>
      a.account_id.toLowerCase().includes(listSearch.toLowerCase()) ||
      a.reason.toLowerCase().includes(listSearch.toLowerCase())
  );

  const scoreColor =
    (accountDetail?.risk_score || 0) >= 75
      ? 'var(--risk-high)'
      : (accountDetail?.risk_score || 0) >= 40
      ? 'var(--risk-mid)'
      : 'var(--risk-low)';

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      <FreezePlanModal
        ringId="fan_1"
        isOpen={freezeModalOpen}
        onClose={() => setFreezeModalOpen(false)}
      />

      {/* Pane 1: Left Compact Queue (260px) */}
      <div
        style={{
          width: '260px',
          minWidth: '260px',
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              padding: '6px 8px',
            }}
          >
            <Search size={14} color="var(--ink-3)" />
            <input
              type="text"
              placeholder="Search queue..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: 'var(--ink)',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredList.map((item) => {
            const isSelected = item.account_id === activeId;
            const itemColor =
              item.risk_score >= 75 ? 'var(--risk-high)' : item.risk_score >= 40 ? 'var(--risk-mid)' : 'var(--risk-low)';

            return (
              <div
                key={item.account_id}
                onClick={() => selectAccount(item.account_id)}
                style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--surface-raised)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background-color 0.12s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                    {item.account_id}
                  </span>
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: itemColor }}>
                    {item.risk_score}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                  {item.patterns.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '9px',
                        padding: '1px 5px',
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--line)',
                        color: 'var(--ink-2)',
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pane 2: Center Interactive Cytoscape Graph (flex: 1) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg)',
          position: 'relative',
          height: '100%',
        }}
      >
        {/* Top Graph Controls Bar */}
        <div
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              Network Flow Graph
            </span>
            <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>•</span>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
              {network.nodes.length} nodes, {network.edges.length} edges
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Hops selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                padding: '2px',
              }}
            >
              {[1, 2, 3].map((h) => (
                <button
                  key={h}
                  onClick={() => setCurrentHops(h)}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    border: 'none',
                    backgroundColor: currentHops === h ? 'var(--accent)' : 'transparent',
                    color: currentHops === h ? 'var(--paper)' : 'var(--ink-2)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {h} Hop{h > 1 ? 's' : ''}
                </button>
              ))}
            </div>

            {/* Quick Freeze Button */}
            <button
              onClick={() => setFreezeModalOpen(true)}
              title="Compute Min-Cut Freeze Plan (F)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: 'var(--accent-muted)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Lock size={13} />
              <span>Freeze Plan (F)</span>
            </button>

            {/* Replay Button */}
            <button
              onClick={() => navigate('/replay/fan_1')}
              title="Open Replay Simulator (R)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <PlaySquare size={13} />
              <span>Replay</span>
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
          backgroundColor: 'var(--surface)',
          borderLeft: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
        }}
      >
        {/* Header with masked PII */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', }}>
                Account Dossier
              </div>
              <h2 className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {activeId}
              </h2>
            </div>

            {/* Risk Pill */}
            <div style={{ textAlign: 'right' }}>
              <div className="mono" style={{ fontSize: '20px', fontWeight: 800, color: scoreColor }}>
                {accountDetail?.risk_score || 0}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>
                Risk / 100
              </div>
            </div>
          </div>

          {/* Masked PII details */}
          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              backgroundColor: 'var(--surface-raised)',
              border: '1px solid var(--line)',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>KYC Phone:</span>
              <span className="mono" style={{ color: 'var(--ink)' }}>+91 98••••12</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>KYC Address:</span>
              <span style={{ color: 'var(--ink)' }}>Flat 4••, Andheri West, Mumbai</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Device ID Hash:</span>
              <span className="mono" style={{ color: 'var(--ink)' }}>a8••••4f</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--ink-3)' }}>Account Age:</span>
              <span className="mono" style={{ color: 'var(--ink)' }}>
                {accountDetail?.age_days ? `${accountDetail.age_days} days` : '22 days'}
              </span>
            </div>
          </div>

          {/* Decision Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
            <button
              onClick={() => handleDecision('confirmed')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'var(--confirmed)',
                color: 'var(--paper)',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <CheckCircle size={14} />
              <span>Confirm Mule (C)</span>
            </button>
            <button
              onClick={() => handleDecision('cleared')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px',
                backgroundColor: 'var(--surface-raised)',
                border: '1px solid var(--line)',
                color: 'var(--ink)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <XCircle size={14} />
              <span>Not a mule (X)</span>
            </button>
          </div>
        </div>

        {/* Plain-Language Reason Card */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, }}>
              Plain-Language Reason
            </span>
            <button
              onClick={() => setWhyScoreDrawerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: 'var(--accent)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <HelpCircle size={12} />
              <span>Why this risk? (W)</span>
            </button>
          </div>

          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--accent-muted)',
              border: '1px solid var(--line)',
              fontSize: '12px',
              color: 'var(--ink)',
              lineHeight: '1.5',
            }}
          >
            {accountDetail?.reasons?.[0] ||
              'Received ₹4.24L from 11 victim accounts in 18 min window; forwarded 94.2% within 14 min to 6 layered receivers.'}
          </div>
        </div>

        {/* Taint Tracking Rupee Box */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontWeight: 600, marginBottom: '10px' }}>
            Stolen Funds Taint Tracing
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
            }}
          >
            <div style={{ padding: '10px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Tainted Inflow</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink)', marginTop: '2px' }}>
                {formatLakhs(taint?.tainted_in || 424089.49)}
              </div>
            </div>
            <div style={{ padding: '10px', backgroundColor: 'var(--surface-raised)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Trapped Balance</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ok)', marginTop: '2px' }}>
                {formatLakhs(taint?.tainted_balance_remaining || 24469.49)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Evidence / Features / History */}
        <div style={{ borderBottom: '1px solid var(--line)', display: 'flex', backgroundColor: 'var(--surface-raised)' }}>
          {(['evidence', 'features', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                border: 'none',
                backgroundColor: 'transparent',
                borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--ink)' : 'var(--ink-3)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          {activeTab === 'evidence' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {accountDetail?.findings?.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid var(--line)',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                      {f.pattern} Pattern
                    </span>
                    <span className="mono" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      Strength: {(f.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <pre
                    className="mono"
                    style={{
                      fontSize: '11px',
                      backgroundColor: 'var(--surface-raised)',
                      padding: '8px',
                      overflowX: 'auto',
                      color: 'var(--ink-2)',
                    }}
                  >
                    {JSON.stringify(f.evidence, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'features' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(accountDetail?.features || {}).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    padding: '6px 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <span style={{ color: 'var(--ink-2)' }}>{k.replace(/_/g, ' ')}</span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {typeof v === 'number' && v > 1000 ? formatCurrency(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Clock size={13} />
                <span>Audit trail for this account</span>
              </div>
              <p>No previous analyst flags recorded for this account. Decision will be logged in append-only audit trail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
