import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '../api/client';
import { Eye, Plus, Shield } from 'lucide-react';

export default function Watchlist() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newAccount, setNewAccount] = useState('');
  const [newSource, setNewSource] = useState('');
  const [newReason, setNewReason] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.list().then((r: any) => r.data),
  });

  const addMut = useMutation({
    mutationFn: (data: any) => watchlistApi.add(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      setShowAdd(false);
      setNewAccount(''); setNewSource(''); setNewReason('');
    },
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: ''Instrument Serif'', marginBottom: 4 }}>Watchlist</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '0.85rem' }}>
            Known mule accounts matched against future uploads.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={14} /> Add Entry
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input className="input" placeholder="Account ID" value={newAccount} onChange={e => setNewAccount(e.target.value)} />
            <input className="input" placeholder="Source (e.g. Law enforcement)" value={newSource} onChange={e => setNewSource(e.target.value)} />
          </div>
          <input className="input" placeholder="Reason" value={newReason} onChange={e => setNewReason(e.target.value)} style={{ marginBottom: 12 }} />
          <button className="btn btn-primary" onClick={() => addMut.mutate({ account_id: newAccount, source: newSource, reason: newReason })}>
            Add to Watchlist
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--ink-2)' }}>
          <Eye size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>Watchlist is empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map((e: any) => (
            <div key={e.id} className="card" style={{
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Shield size={16} style={{ color: 'var(--signal)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span className="mono" style={{ fontWeight: 500, fontSize: '0.85rem' }}>{e.account_id}</span>
                <div style={{ fontSize: '0.75rem', color: 'var(--ink-2)', marginTop: 2 }}>
                  {e.source} — {e.reason}
                </div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--ink-2)' }}>
                {e.added_at ? new Date(e.added_at).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
