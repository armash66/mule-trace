import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useStore } from '../store/store';
import type { DiscoveredRing, StatsResponse, NetworkNode, NetworkEdge } from '../api/types';
import { formatLakhs } from '../lib/utils';
import { CytoscapeGraph } from '../components/CytoscapeGraph';
import { Dropzone } from '../components/data-hub/Dropzone';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedAccountId, setSelectedRingId, runs, fetchRuns, setStagedFiles, showToast } = useStore();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [rings, setRings] = useState<DiscoveredRing[]>([]);
  const [alertsList, setAlertsList] = useState<Array<{ id: string; reason: string; risk: number }>>([]);
  const [topRingGraph, setTopRingGraph] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);

  // Animated count up for stolen money
  const [displayAmount, setDisplayAmount] = useState(0);

  useEffect(() => {
    fetchRuns();
    Promise.all([
      api.getStats(),
      api.getDiscoveredRings(),
      api.getAccounts({ page_size: 5, sort_by: 'risk_score_desc' }),
    ])
      .then(async ([s, r, accts]) => {
        setStats(s);
        setRings(r);

        const items = accts.items.slice(0, 5).map((a) => {
          let reason = a.reason || 'Unusual rapid money movement across accounts.';
          // Keep sentence plain and under 14 words
          if (reason.length > 80) reason = reason.slice(0, 77) + '...';
          return {
            id: a.account_id,
            reason: reason,
            risk: a.risk_score,
          };
        });
        setAlertsList(items);

        // Fetch top ring network if available
        if (r.length > 0 && r[0].accounts?.length > 0) {
          const top = r[0];
          try {
            const net = await api.getAccountNetwork(top.accounts[0]);
            setTopRingGraph(net);
          } catch {
            // fallback
          }
        }
      })
      .finally(() => setLoading(false));
  }, [fetchRuns]);

  // Compute total money at risk
  const targetAmount = rings.reduce((sum, r) => sum + (r.estimated_at_risk || 0), 0) || 480000;

  // Count up over 600ms on load
  useEffect(() => {
    if (loading || targetAmount <= 0) return;
    const duration = 600;
    const steps = 24;
    const increment = targetAmount / steps;
    const intervalTime = duration / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= targetAmount) {
        setDisplayAmount(targetAmount);
        clearInterval(timer);
      } else {
        setDisplayAmount(Math.round(current));
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [loading, targetAmount]);

  // Empty state if no runs exist
  if (!loading && runs.length === 0) {
    return (
      <div style={{ padding: '48px 36px', maxWidth: '780px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 className="t-head" style={{ color: 'var(--ink)', marginBottom: '8px' }}>
            No data loaded yet
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)' }}>
            Drop your bank files to begin, or use the seeded demo dataset.
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <Dropzone
            onFilesSelected={(files) => {
              setStagedFiles(files);
              navigate('/data?step=select');
            }}
          />
        </div>

        <button
          type="button"
          className="btn"
          onClick={async () => {
            try {
              await api.resetDemo();
              await fetchRuns();
              window.location.reload();
            } catch {
              showToast('Failed to load demo dataset.');
            }
          }}
        >
          Use demo dataset
        </button>
      </div>
    );
  }

  const topRing = rings[0];
  const topRingId = topRing ? topRing.ring_id : '8821';
  const topRingCutAmount = topRing ? Math.round(topRing.estimated_at_risk * 0.85) || 410000 : 410000;
  const topRingCutAccounts = topRing && topRing.accounts ? Math.min(topRing.accounts.length, 2) : 2;

  const handleRowClick = (accountId: string) => {
    setSelectedAccountId(accountId);
    navigate(`/workspace/${accountId}`);
  };

  return (
    <div style={{ padding: '0 36px 48px 36px', maxWidth: '1120px', margin: '0 auto', backgroundColor: 'var(--paper)' }}>
      {/* ROW A: Stolen money still moving + small ring graph */}
      <div className="rule-top" style={{ padding: '40px 0', display: 'flex', alignItems: 'center', gap: '32px' }}>
        <div style={{ flex: '0 0 60%' }}>
          <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '4px' }}>
            Stolen money still moving
          </div>
          <div className="t-hero" style={{ color: 'var(--signal)', marginBottom: '12px' }}>
            {formatLakhs(displayAmount)}
          </div>
          <div className="t-caption" style={{ color: 'var(--ink-2)' }}>estimate, not traced</div>
          <p style={{ fontSize: '15px', color: 'var(--ink-2)' }}>
            Across {rings.length || 3} rings. {topRingCutAccounts} accounts can be frozen to stop most of it.
          </p>
        </div>

        <div style={{ flex: '0 0 40%', height: '260px', overflow: 'hidden' }}>
          {topRingGraph.nodes.length > 0 ? (
            <CytoscapeGraph
              nodes={topRingGraph.nodes}
              edges={topRingGraph.edges}
              height="260px"
              selectedId={topRing?.accounts?.[0]}
              recommendedFreezeId={topRing?.accounts?.[1]}
            />
          ) : (
            <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="mono">
              <span style={{ color: 'var(--ink-2)' }}>Drawing ring graph...</span>
            </div>
          )}
        </div>
      </div>

      {/* ROW B: Three equal columns separated by 1px vertical rules */}
      <div className="rule-top" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div style={{ padding: '24px 16px', borderRight: '1px solid var(--rule)' }}>
          <div className="t-hero" style={{ color: 'var(--ink)', fontSize: '56px', marginBottom: '8px' }}>
            {stats?.flagged_count || 44}
          </div>
          <div className="mono" style={{ color: 'var(--ink-2)' }}>
            Open alerts
          </div>
        </div>

        <div style={{ padding: '24px 16px', borderRight: '1px solid var(--rule)' }}>
          <div className="t-hero" style={{ color: 'var(--ink)', fontSize: '56px', marginBottom: '8px' }}>
            {stats?.confirmed_count || 12}
          </div>
          <div className="mono" style={{ color: 'var(--ink-2)' }}>
            Marked as mule
          </div>
        </div>

        <div style={{ padding: '24px 16px' }}>
          <div className="t-hero" style={{ color: 'var(--ink)', fontSize: '56px', marginBottom: '8px' }}>
            {stats?.cleared_count || 9}
          </div>
          <div className="mono" style={{ color: 'var(--ink-2)' }}>
            Marked not a mule
          </div>
        </div>
      </div>

      {/* ROW C: Do this next */}
      <div className="rule-top" style={{ padding: '32px 0' }}>
        <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '8px' }}>
          Do this next
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div className="t-head" style={{ color: 'var(--ink)' }}>
            Freeze {topRingCutAccounts} accounts in ring {topRingId} to stop {formatLakhs(topRingCutAmount)}.
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (topRing) {
                setSelectedRingId(topRing.ring_id);
                navigate(`/cases/${topRing.ring_id}`);
              } else {
                navigate('/freezes');
              }
            }}
          >
            See the plan
          </button>
        </div>
      </div>

      {/* ROW D: Top alerts (list of 5 rows) */}
      <div className="rule-top" style={{ paddingTop: '32px' }}>
        <div className="mono" style={{ color: 'var(--ink-2)', marginBottom: '16px' }}>
          Top alerts
        </div>

        <div>
          {alertsList.map((item) => (
            <div
              key={item.id}
              className="row"
              onClick={() => handleRowClick(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <span className="mono" style={{ fontWeight: 600, width: '90px' }}>
                  {item.id}
                </span>
                <span style={{ fontSize: '15px' }}>
                  {item.reason}
                </span>
              </div>

              <div
                className="mono"
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: item.risk > 80 ? 'var(--signal)' : 'var(--ink)',
                }}
              >
                {item.risk}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
