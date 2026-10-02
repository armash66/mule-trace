import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { FreezeRequest } from '../api/types';
import { formatLakhs, formatDateTime } from '../lib/utils';
import {
  Lock,
  Send,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

const COLUMNS: Array<{ id: FreezeRequest['status']; label: string; icon: any; color: string }> = [
  { id: 'drafted', label: 'Drafted', icon: Clock, color: 'var(--ink-3)' },
  { id: 'sent', label: 'Sent to Bank/Portal', icon: Send, color: 'var(--accent)' },
  { id: 'held', label: 'Funds Held / Lien', icon: Lock, color: 'var(--risk-mid)' },
  { id: 'recovered', label: 'Recovered / Reversed', icon: ShieldCheck, color: 'var(--ok)' },
  { id: 'missed', label: 'Missed / Cashed Out', icon: XCircle, color: 'var(--risk-high)' },
];

export const FreezeTracker: React.FC = () => {
  const { showToast } = useStore();
  const [requests, setRequests] = useState<FreezeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFreezes = () => {
    setLoading(true);
    api
      .getFreezeRequests()
      .then((data) => setRequests(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFreezes();
  }, []);

  const handleUpdateStatus = async (
    reqId: number,
    newStatus: FreezeRequest['status']
  ) => {
    try {
      const prevReq = requests.find((r) => r.id === reqId);
      await api.updateFreezeRequest(reqId, { status: newStatus });
      showToast(
        `Freeze #${reqId} moved to ${newStatus.toUpperCase()}`,
        () => {
          if (prevReq) {
            api.updateFreezeRequest(reqId, { status: prevReq.status }).then(() => fetchFreezes());
          }
        }
      );
      fetchFreezes();
    } catch {
      showToast('Failed to update freeze status.');
    }
  };

  // Metrics
  const totalRecovered = requests
    .filter((r) => r.status === 'recovered')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalMissed = requests
    .filter((r) => r.status === 'missed')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalInFlight = requests
    .filter((r) => ['drafted', 'sent', 'held'].includes(r.status))
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)' }}>
            Freezes Kanban
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginTop: '2px' }}>
            Track end-to-end statutory account freeze workflows from automated min-cut recommendation to recovery.
          </p>
        </div>

        {/* Top Recovered vs Missed Counters */}
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              }}
          >
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>In-Flight Freezes</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>
              {formatLakhs(totalInFlight)}
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              }}
          >
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Total Recovered</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ok)' }}>
              {formatLakhs(totalRecovered)}
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--line)',
              }}
          >
            <div style={{ fontSize: '10px', color: 'var(--ink-3)', }}>Missed / Cash-Out</div>
            <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--risk-high)' }}>
              {formatLakhs(totalMissed)}
            </div>
          </div>
        </div>
      </div>

      {/* 5-Column Kanban Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '14px',
          flex: 1,
          overflowX: 'auto',
          paddingBottom: '16px',
        }}
      >
        {COLUMNS.map((col) => {
          const colItems = requests.filter((r) => r.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                maxHeight: 'calc(100vh - 180px)',
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--surface-raised)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ColIcon size={14} color={col.color} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>{col.label}</span>
                </div>
                <span
                  className="mono"
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--line)',
                    padding: '1px 6px',
                    color: 'var(--ink)',
                  }}
                >
                  {colItems.length}
                </span>
              </div>

              {/* Cards List */}
              <div
                style={{
                  padding: '12px',
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {colItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--surface-raised)',
                      border: '1px solid var(--line)',
                      }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        #{item.id} • {item.ring_id}
                      </span>
                      <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
                        {formatLakhs(item.amount)}
                      </span>
                    </div>

                    <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                      {item.account_ids.join(', ')}
                    </div>

                    {item.note && (
                      <p style={{ fontSize: '11px', color: 'var(--ink-2)', lineHeight: '1.4', marginBottom: '8px' }}>
                        {item.note}
                      </p>
                    )}

                    <div style={{ fontSize: '10px', color: 'var(--ink-3)', marginBottom: '8px' }}>
                      {formatDateTime(item.created_at)}
                    </div>

                    {/* State Transition Actions */}
                    <div style={{ display: 'flex', gap: '4px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                      {item.status === 'drafted' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'sent')}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'var(--accent)',
                            color: 'var(--paper)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Send Request →
                        </button>
                      )}

                      {item.status === 'sent' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'held')}
                            style={{
                              flex: 1,
                              padding: '4px',
                              fontSize: '10px',
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--line)',
                              color: 'var(--ok)',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            Mark Held
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'missed')}
                            style={{
                              flex: 1,
                              padding: '4px',
                              fontSize: '10px',
                              backgroundColor: 'var(--surface)',
                              border: '1px solid var(--line)',
                              color: 'var(--risk-high)',
                              cursor: 'pointer',
                            }}
                          >
                            Missed
                          </button>
                        </>
                      )}

                      {item.status === 'held' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'recovered')}
                          style={{
                            width: '100%',
                            padding: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'var(--ok)',
                            color: 'var(--paper)',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Confirm Recovered ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
