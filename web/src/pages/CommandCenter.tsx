import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useStore } from '../store/store';
import { alertsApi, decisionsApi, casesApi, ringsApi, metricsApi } from '../api/client';
import {
  AlertTriangle, Shield, Hexagon, TrendingUp, Eye, Search,
  ChevronDown, ChevronUp, CheckCircle, XCircle, HelpCircle,
  ArrowRight, Filter, BarChart3, Zap, Clock, Undo2, X,
} from 'lucide-react';

// Risk band color map
const bandColor: Record<string, string> = {
  CRITICAL: 'var(--risk-crit)',
  HIGH: 'var(--risk-high)',
  MEDIUM: 'var(--risk-med)',
  LOW: 'var(--risk-low)',
};
const bandBg: Record<string, string> = {
  CRITICAL: 'rgba(255,77,94,.12)',
  HIGH: 'rgba(251,124,60,.12)',
  MEDIUM: 'rgba(245,184,61,.12)',
  LOW: 'rgba(34,197,94,.12)',
};

export default function CommandCenter() {
  const { currentRunId } = useStore();
  const queryClient = useQueryClient();

  // Filters
  const [bandFilter, setBandFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQ, setSearchQ] = useState('');
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [undoId, setUndoId] = useState<string | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Queries
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', currentRunId, bandFilter, statusFilter, searchQ],
    queryFn: () => alertsApi.list({
      run_id: currentRunId || undefined,
      band: bandFilter || undefined,
      status: statusFilter || undefined,
      q: searchQ || undefined,
      limit: 100,
    }).then(r => r.data),
    enabled: true,
  });

  const { data: metrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => metricsApi.summary().then(r => r.data),
  });

  // Decision mutation
  const decisionMut = useMutation({
    mutationFn: (data: { account_id: string; action: string; note?: string }) =>
      decisionsApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      const id = res.data?.id;
      if (id) {
        setUndoId(id);
        const timer = setTimeout(() => setUndoId(null), 8000);
        setUndoTimer(timer);
      }
    },
  });

  const undoMut = useMutation({
    mutationFn: (id: string) => decisionsApi.undo(id),
    onSuccess: () => {
      setUndoId(null);
      if (undoTimer) clearTimeout(undoTimer);
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Stats from current alerts
  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a: any) => a.risk_band === 'CRITICAL').length;
    const high = alerts.filter((a: any) => a.risk_band === 'HIGH').length;
    const unreviewed = alerts.filter((a: any) => a.status === 'UNREVIEWED').length;
    return { total, critical, high, unreviewed };
  }, [alerts]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 4 }}>Command Center</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>
            Review flagged accounts, confirm or clear, and escalate to cases.
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {[
          { label: 'Total Alerts', value: stats.total, icon: AlertTriangle, color: 'var(--text-0)' },
          { label: 'Critical', value: stats.critical, icon: Zap, color: 'var(--risk-crit)' },
          { label: 'High', value: stats.high, icon: TrendingUp, color: 'var(--risk-high)' },
          { label: 'Unreviewed', value: stats.unreviewed, icon: Clock, color: 'var(--accent)' },
        ].map((kpi) => (
          <div key={kpi.label} className="card" style={{
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: `${kpi.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <kpi.icon size={18} style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 600, color: kpi.color }}>
                {kpi.value}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: 'var(--text-2)',
          }} />
          <input
            className="input"
            placeholder="Search account ID..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            style={{ paddingLeft: 32 }}
          />
        </div>
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((band) => (
          <button
            key={band}
            className="btn"
            onClick={() => setBandFilter(bandFilter === band ? '' : band)}
            style={{
              fontSize: '0.75rem',
              padding: '6px 12px',
              background: bandFilter === band ? bandBg[band] : undefined,
              color: bandFilter === band ? bandColor[band] : 'var(--text-1)',
              borderColor: bandFilter === band ? bandColor[band] : undefined,
            }}
          >
            {band}
          </button>
        ))}
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="">All statuses</option>
          <option value="UNREVIEWED">Unreviewed</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CLEARED">Cleared</option>
          <option value="NEEDS_INFO">Needs Info</option>
        </select>
      </div>

      {/* Alerts list + detail split */}
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Alert table */}
        <div style={{ flex: selectedAlert ? '0 0 55%' : 1, minWidth: 0 }}>
          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 64 }} />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="card" style={{
              padding: 48, textAlign: 'center', color: 'var(--text-2)',
            }}>
              <Shield size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No alerts found. Upload data or adjust filters.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {alerts.map((alert: any) => (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlert(alert)}
                  className="card"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderColor: selectedAlert?.id === alert.id ? 'var(--accent)' : undefined,
                    boxShadow: selectedAlert?.id === alert.id ? 'var(--glow-accent)' : undefined,
                  }}
                >
                  {/* Risk score */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-sm)',
                    background: bandBg[alert.risk_band] || bandBg.LOW,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span className="tabular-nums" style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: bandColor[alert.risk_band] || 'var(--text-0)',
                    }}>
                      {Math.round(alert.risk_score)}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mono" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        {alert.account_id}
                      </span>
                      <span className="badge" style={{
                        background: bandBg[alert.risk_band],
                        color: bandColor[alert.risk_band],
                      }}>
                        {alert.risk_band}
                      </span>
                      {alert.ring_id && (
                        <span className="badge" style={{
                          background: 'rgba(124,92,255,.12)',
                          color: 'var(--accent-2)',
                        }}>
                          <Hexagon size={10} /> {alert.ring_id}
                        </span>
                      )}
                      {alert.status !== 'UNREVIEWED' && (
                        <span className="badge" style={{
                          background: alert.status === 'CONFIRMED' ? 'rgba(255,77,94,.12)' :
                                     alert.status === 'CLEARED' ? 'rgba(34,197,94,.12)' :
                                     'rgba(245,184,61,.12)',
                          color: alert.status === 'CONFIRMED' ? 'var(--danger)' :
                                alert.status === 'CLEARED' ? 'var(--ok)' :
                                'var(--warn)',
                        }}>
                          {alert.status}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      color: 'var(--text-2)',
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {alert.reason_simple || alert.reason}
                    </div>
                  </div>

                  {/* Signal tags */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(alert.signal_types || []).slice(0, 3).map((s: string) => (
                      <span key={s} style={{
                        fontSize: '0.6rem',
                        padding: '2px 6px',
                        borderRadius: 10,
                        background: 'var(--bg-3)',
                        color: 'var(--text-2)',
                      }}>
                        {s.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  <ChevronDown size={14} style={{ color: 'var(--text-2)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedAlert && (
          <div style={{
            flex: '0 0 44%',
            position: 'sticky',
            top: 0,
            maxHeight: 'calc(100vh - 140px)',
            overflow: 'auto',
          }}>
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 className="mono" style={{ fontSize: '1rem' }}>
                    {selectedAlert.account_id_raw || selectedAlert.account_id}
                  </h3>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span className="badge" style={{
                      background: bandBg[selectedAlert.risk_band],
                      color: bandColor[selectedAlert.risk_band],
                    }}>
                      Score: {Math.round(selectedAlert.risk_score)}
                    </span>
                    <span className="badge" style={{
                      background: 'var(--bg-3)', color: 'var(--text-1)',
                    }}>
                      {selectedAlert.confidence} confidence
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Reason */}
              <div style={{
                padding: 12,
                background: 'var(--bg-2)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 16,
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: 'var(--text-1)',
              }}>
                {selectedAlert.reason}
              </div>

              {/* Innocent reason */}
              {selectedAlert.innocent_reason && (
                <div style={{
                  padding: 12,
                  background: 'rgba(34,197,94,.06)',
                  border: '1px solid rgba(34,197,94,.15)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 16,
                  fontSize: '0.8rem',
                  color: 'var(--ok)',
                }}>
                  <strong>Why this might be innocent:</strong> {selectedAlert.innocent_reason}
                </div>
              )}

              {/* Next action */}
              {selectedAlert.next_action && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(45,212,191,.06)',
                  border: '1px solid rgba(45,212,191,.15)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 16,
                  fontSize: '0.8rem',
                  color: 'var(--accent)',
                }}>
                  <strong>Suggested:</strong> {selectedAlert.next_action}
                </div>
              )}

              {/* Signal breakdown */}
              <h4 style={{ fontSize: '0.85rem', marginBottom: 8 }}>Signal Breakdown</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {(selectedAlert.signals || []).map((sig: any, i: number) => (
                  <div key={i} style={{
                    padding: '8px 12px',
                    background: 'var(--bg-2)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-0)' }}>
                        {sig.signal_type.replace('_', ' ')}
                      </span>
                      <span className="tabular-nums" style={{ color: 'var(--accent)' }}>
                        +{sig.weighted_score?.toFixed(1) || 0}
                      </span>
                    </div>
                    {/* Score bar */}
                    <div style={{
                      height: 3, background: 'var(--bg-3)', borderRadius: 2,
                      marginBottom: 4,
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min(sig.weighted_score || 0, 40) / 40 * 100}%`,
                        background: 'var(--accent)',
                        borderRadius: 2,
                      }} />
                    </div>
                    <div style={{ color: 'var(--text-2)', fontSize: '0.75rem' }}>
                      {sig.reason}
                    </div>
                    {sig.guard_reason && (
                      <div style={{ color: 'var(--ok)', fontSize: '0.7rem', marginTop: 2 }}>
                        Guard: −{sig.guard_penalty} ({sig.guard_reason})
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Decision buttons */}
              {selectedAlert.status === 'UNREVIEWED' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const note = prompt('Reason for confirming as mule:');
                      if (note) {
                        decisionMut.mutate({
                          account_id: selectedAlert.account_id_raw || selectedAlert.account_id,
                          action: 'CONFIRM',
                          note,
                        });
                      }
                    }}
                  >
                    <CheckCircle size={14} /> Confirm Mule
                  </button>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={() => decisionMut.mutate({
                      account_id: selectedAlert.account_id_raw || selectedAlert.account_id,
                      action: 'CLEAR',
                    })}
                  >
                    <XCircle size={14} /> Clear
                  </button>
                  <button
                    className="btn"
                    onClick={() => decisionMut.mutate({
                      account_id: selectedAlert.account_id_raw || selectedAlert.account_id,
                      action: 'NEEDS_INFO',
                    })}
                  >
                    <HelpCircle size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Undo toast */}
      {undoId && (
        <div className="toast" style={{
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span>Decision recorded</span>
          <button
            className="btn"
            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
            onClick={() => undoMut.mutate(undoId)}
          >
            <Undo2 size={12} /> Undo (8s)
          </button>
        </div>
      )}
    </div>
  );
}
