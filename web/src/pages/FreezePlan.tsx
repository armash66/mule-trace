import React, { useEffect, useState } from 'react';
import {
  listAccounts,
  getFreezeRecommendation,
  type FreezeRecommendation,
  type AccountListItem,
  type AccountListResponse,
} from '../api/client';
import { HonestyBadge } from '../components/honesty';
import { FreezeTracker } from './FreezeTracker';

export const FreezePlan: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<FreezeRecommendation | null>(null);
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listAccounts({ page_size: 10 }),
      getFreezeRecommendation('fan_1').catch(() => null),
    ])
      .then(([accts, rec]) => {
        if (accts && (accts as AccountListResponse).items) {
          setAccounts((accts as AccountListResponse).items);
        }
        if (rec) {
          setRecommendation(rec);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid var(--rule)' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Proactive Freeze Execution Plan</h2>
          <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
            Targeted Min-Cut bottleneck accounts to halt syndicate cash dissipation
          </span>
        </div>
        <HonestyBadge source="ESTIMATE" isEstimate={true} />
      </div>

      {recommendation && (
        <div style={{ padding: '12px 18px', backgroundColor: 'var(--panel)', border: '1px solid var(--rule)', margin: '0 18px' }}>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--signal)' }}>
            Target accounts: {recommendation.recommended_freeze_accounts.join(', ')} · Stops ₹{(recommendation.rupees_stopped / 100000).toFixed(1)}L
          </span>
        </div>
      )}

      {/* Render full interactive Freeze Tracker Kanban */}
      <FreezeTracker />
    </div>
  );
};

export default FreezePlan;
