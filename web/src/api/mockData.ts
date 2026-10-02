import type {
  AccountDetail,
  AccountListItem,
  CaseReport,
  DataHealthReport,
  DiscoveredRing,
  ExplainResponse,
  FreezePlanResponse,
  FreezeRequest,
  NetworkResponse,
  ReplayResponse,
  StatsResponse,
  TaintAccountResult,
} from './types';

export const mockStats: StatsResponse = {
  total_accounts: 5044,
  flagged_count: 44,
  confirmed_count: 8,
  cleared_count: 2,
  precision: 0.971,
  run_id: 'run_seed_42_latest',
};

export const mockAccounts: AccountListItem[] = [
  {
    account_id: 'ACC_05001',
    risk_score: 96,
    patterns: ['fan', 'community'],
    reason: 'Received ₹4.24L from 11 distinct accounts within 18 min; forwarded 94.2% (₹3.99L) within 14 min to 6 destination accounts.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05008',
    risk_score: 94,
    patterns: ['cycle'],
    reason: 'Participated in a 3-hop closed circular money flow (₹1.62L -> ₹1.56L -> ₹1.53L) returning to origin in 31.3 min.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05016',
    risk_score: 91,
    patterns: ['chain'],
    reason: 'High-speed pass-through chain: forwarded 98.4% of ₹2.10L inflow within 4.2 min, retaining under 2% end balance.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05026',
    risk_score: 88,
    patterns: ['cluster'],
    reason: 'Synthetic identity cluster: account opened 14 days ago sharing physical hardware device DEV_MULE_99 with 5 other new accounts.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05044',
    risk_score: 86,
    patterns: ['dormancy'],
    reason: 'Dormancy sudden awakening: zero activity for 142 days followed by a concentrated burst of ₹3.50L moved in 1.8 hours.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05011',
    risk_score: 84,
    patterns: ['cycle'],
    reason: 'Part of a 4-hop circular layer with 4 accounts completing in 35.6 min with ₹1.17L starting volume.',
    status: 'confirmed',
  },
  {
    account_id: 'ACC_05021',
    risk_score: 82,
    patterns: ['chain'],
    reason: 'Layer 2 transit mule: forwarded 97.1% of ₹1.85L within 6.1 min with near-zero retained balance.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05030',
    risk_score: 79,
    patterns: ['cluster'],
    reason: 'Device collision cluster: linked to 4 accounts opened in same 48h window with matching residential KYC address hash.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_05002',
    risk_score: 76,
    patterns: ['fan'],
    reason: 'Layer 2 disperser receiving ₹70,000 from hub ACC_05001 and splitting into cash-out UPI endpoints.',
    status: 'unreviewed',
  },
  {
    account_id: 'ACC_00042',
    risk_score: 18,
    patterns: [],
    reason: 'High volume corporate payroll distribution; regular weekly disbursements to 200 distinct recipient salary accounts.',
    status: 'cleared',
  },
];

export const mockAccountDetails: Record<string, AccountDetail> = {
  ACC_05001: {
    account_id: 'ACC_05001',
    risk_score: 96,
    patterns: ['fan', 'community'],
    reasons: [
      'Fan-in/Fan-out hub: Received ₹4,24,089 from 11 victim accounts in 18 min window.',
      'Forwarded 94.2% of total funds to 6 distinct receiver accounts within 14 min of initial deposit.',
      'Louvain community density 0.74 exceeds baseline threshold (0.25).',
    ],
    findings: [
      {
        account_id: 'ACC_05001',
        pattern: 'fan',
        strength: 0.96,
        evidence: {
          senders_count: 11,
          receivers_count: 6,
          total_inflow: 424089.49,
          total_outflow: 399620.0,
          forward_ratio: 0.9423,
          window_in_minutes: 18.5,
          window_out_minutes: 14.2,
        },
        related_accounts: [
          'ACC_01094', 'ACC_01429', 'ACC_01592', 'ACC_01883',
          'ACC_05002', 'ACC_05003', 'ACC_05004', 'ACC_05005', 'ACC_05006', 'ACC_05007'
        ],
      },
      {
        account_id: 'ACC_05001',
        pattern: 'community',
        strength: 0.82,
        evidence: {
          community_id: 3,
          internal_flow_ratio: 0.88,
          density: 0.74,
          member_count: 7,
        },
        related_accounts: ['ACC_05002', 'ACC_05003', 'ACC_05004', 'ACC_05005'],
      },
    ],
    features: {
      in_degree: 11,
      out_degree: 6,
      total_inflow: 424089.49,
      total_outflow: 399620.0,
      forward_ratio: 0.9423,
      retained_balance: 24469.49,
      hourly_velocity: 18.4,
      account_age_days: 22,
      share_new_counterparties: 0.85,
    },
    decisions: [],
    age_days: 22,
  },
  ACC_05008: {
    account_id: 'ACC_05008',
    risk_score: 94,
    patterns: ['cycle'],
    reasons: [
      'Circular flow detected: 3 accounts circulating funds over 31.3 min.',
      'Successive transfer decay rate is 3.5%, matching synthetic layering shrinkage.',
    ],
    findings: [
      {
        account_id: 'ACC_05008',
        pattern: 'cycle',
        strength: 0.94,
        evidence: {
          cycle_length: 3,
          duration_minutes: 31.28,
          start_amount: 161994.57,
          end_amount: 152775.03,
          accounts_in_cycle: ['ACC_05008', 'ACC_05009', 'ACC_05010', 'ACC_05008'],
        },
        related_accounts: ['ACC_05009', 'ACC_05010'],
      },
    ],
    features: {
      in_degree: 2,
      out_degree: 2,
      total_inflow: 161994.57,
      total_outflow: 161994.57,
      forward_ratio: 1.0,
      retained_balance: 0.0,
      hourly_velocity: 6.2,
      account_age_days: 45,
      share_new_counterparties: 0.5,
    },
    decisions: [],
    age_days: 45,
  },
  ACC_05016: {
    account_id: 'ACC_05016',
    risk_score: 91,
    patterns: ['chain'],
    reasons: [
      'Pass-through chain hop 1: forwarded 98.4% of ₹2,10,000 within 4.2 min.',
      'Zero terminal balance maintained across consecutive transaction hops.',
    ],
    findings: [
      {
        account_id: 'ACC_05016',
        pattern: 'chain',
        strength: 0.91,
        evidence: {
          chain_length: 5,
          transit_time_minutes: 4.2,
          forward_ratio: 0.984,
          inflow_amount: 210000.0,
        },
        related_accounts: ['ACC_05017', 'ACC_05018', 'ACC_05019'],
      },
    ],
    features: {
      in_degree: 1,
      out_degree: 1,
      total_inflow: 210000.0,
      total_outflow: 206640.0,
      forward_ratio: 0.984,
      retained_balance: 3360.0,
      hourly_velocity: 8.5,
      account_age_days: 19,
      share_new_counterparties: 1.0,
    },
    decisions: [],
    age_days: 19,
  },
};

export const mockNetworks: Record<string, NetworkResponse> = {
  ACC_05001: {
    nodes: [
      { id: 'ACC_05001', score: 96, patterns: ['fan', 'community'], age_days: 22 },
      { id: 'ACC_01094', score: 12, patterns: [], age_days: 410 },
      { id: 'ACC_01429', score: 15, patterns: [], age_days: 320 },
      { id: 'ACC_01592', score: 9, patterns: [], age_days: 580 },
      { id: 'ACC_01883', score: 14, patterns: [], age_days: 290 },
      { id: 'ACC_02183', score: 11, patterns: [], age_days: 740 },
      { id: 'ACC_05002', score: 76, patterns: ['fan'], age_days: 16 },
      { id: 'ACC_05003', score: 74, patterns: ['fan'], age_days: 14 },
      { id: 'ACC_05004', score: 71, patterns: ['fan'], age_days: 18 },
      { id: 'ACC_05005', score: 68, patterns: ['fan'], age_days: 20 },
      { id: 'ACC_05006', score: 65, patterns: ['fan'], age_days: 24 },
      { id: 'ACC_05007', score: 62, patterns: ['fan'], age_days: 27 },
    ],
    edges: [
      { src: 'ACC_01094', dst: 'ACC_05001', total_amount: 45000, count: 1, first_time: '2026-10-01T10:14:00Z' },
      { src: 'ACC_01429', dst: 'ACC_05001', total_amount: 38500, count: 1, first_time: '2026-10-01T10:16:30Z' },
      { src: 'ACC_01592', dst: 'ACC_05001', total_amount: 52000, count: 1, first_time: '2026-10-01T10:18:10Z' },
      { src: 'ACC_01883', dst: 'ACC_05001', total_amount: 49000, count: 1, first_time: '2026-10-01T10:20:00Z' },
      { src: 'ACC_02183', dst: 'ACC_05001', total_amount: 42000, count: 1, first_time: '2026-10-01T10:22:45Z' },
      { src: 'ACC_05001', dst: 'ACC_05002', total_amount: 72000, count: 1, first_time: '2026-10-01T10:28:00Z' },
      { src: 'ACC_05001', dst: 'ACC_05003', total_amount: 68000, count: 1, first_time: '2026-10-01T10:29:15Z' },
      { src: 'ACC_05001', dst: 'ACC_05004', total_amount: 65000, count: 1, first_time: '2026-10-01T10:30:40Z' },
      { src: 'ACC_05001', dst: 'ACC_05005', total_amount: 64000, count: 1, first_time: '2026-10-01T10:32:00Z' },
      { src: 'ACC_05001', dst: 'ACC_05006', total_amount: 65000, count: 1, first_time: '2026-10-01T10:33:30Z' },
      { src: 'ACC_05001', dst: 'ACC_05007', total_amount: 65620, count: 1, first_time: '2026-10-01T10:35:00Z' },
    ],
  },
  ACC_05008: {
    nodes: [
      { id: 'ACC_05008', score: 94, patterns: ['cycle'], age_days: 45 },
      { id: 'ACC_05009', score: 90, patterns: ['cycle'], age_days: 48 },
      { id: 'ACC_05010', score: 89, patterns: ['cycle'], age_days: 42 },
    ],
    edges: [
      { src: 'ACC_05008', dst: 'ACC_05009', total_amount: 161994.57, count: 1, first_time: '2026-10-01T11:00:00Z' },
      { src: 'ACC_05009', dst: 'ACC_05010', total_amount: 156259.64, count: 1, first_time: '2026-10-01T11:14:40Z' },
      { src: 'ACC_05010', dst: 'ACC_05008', total_amount: 152775.03, count: 1, first_time: '2026-10-01T11:24:12Z' },
    ],
  },
};

export const mockTaint: TaintAccountResult = {
  account_id: 'ACC_05001',
  tainted_in: 424089.49,
  tainted_out: 399620.0,
  tainted_balance_remaining: 24469.49,
  cashed_out: 399620.0,
};

export const mockFreezePlan: FreezePlanResponse = {
  ring_id: 'fan_1',
  recommended_freeze_accounts: ['ACC_05001'],
  rupees_stopped: 424089.49,
  rupees_lost: 0,
  total_tainted: 424089.49,
  alternatives: [
    {
      account_ids: ['ACC_05002', 'ACC_05003', 'ACC_05004', 'ACC_05005', 'ACC_05006', 'ACC_05007'],
      rupees_stopped: 399620.0,
      rupees_lost: 24469.49,
      efficiency: 0.942,
    },
    {
      account_ids: ['ACC_05002', 'ACC_05003'],
      rupees_stopped: 140000.0,
      rupees_lost: 284089.49,
      efficiency: 0.33,
    },
  ],
};

export const mockReplay: ReplayResponse = {
  ring_id: 'fan_1',
  accounts: ['ACC_05001', 'ACC_05002', 'ACC_05003', 'ACC_05004', 'ACC_05005', 'ACC_05006', 'ACC_05007'],
  total_amount: 424089.49,
  total_tainted: 424089.49,
  stoppable_rupees: 424089.49,
  events: [
    { timestamp: '2026-10-01T10:14:00Z', src: 'ACC_01094', dst: 'ACC_05001', amount: 45000, tainted_amount: 45000, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:16:30Z', src: 'ACC_01429', dst: 'ACC_05001', amount: 38500, tainted_amount: 38500, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:18:10Z', src: 'ACC_01592', dst: 'ACC_05001', amount: 52000, tainted_amount: 52000, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:20:00Z', src: 'ACC_01883', dst: 'ACC_05001', amount: 49000, tainted_amount: 49000, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:25:00Z', src: 'ACC_05001', dst: 'ACC_05001', amount: 0, tainted_amount: 184500, status: 'transferred', is_freeze_point: true },
    { timestamp: '2026-10-01T10:28:00Z', src: 'ACC_05001', dst: 'ACC_05002', amount: 72000, tainted_amount: 72000, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:29:15Z', src: 'ACC_05001', dst: 'ACC_05003', amount: 68000, tainted_amount: 68000, status: 'transferred', is_freeze_point: false },
    { timestamp: '2026-10-01T10:30:40Z', src: 'ACC_05001', dst: 'ACC_05004', amount: 65000, tainted_amount: 65000, status: 'transferred', is_freeze_point: false },
  ],
};

export const mockExplain: ExplainResponse = {
  account_id: 'ACC_05001',
  risk_score: 96,
  counterfactual: 'Score drops below review threshold (50) if forward velocity decreases by 75% and retained balance exceeds ₹1.5L.',
  top_features: [
    { feature: 'forward_ratio', label: 'Forward Ratio (94.2%)', value: 0.942, shap_value: 0.38, direction: 'increases_risk' },
    { feature: 'hourly_velocity', label: 'Hourly Velocity (18.4 tx/h)', value: 18.4, shap_value: 0.29, direction: 'increases_risk' },
    { feature: 'account_age_days', label: 'New Account Age (22 days)', value: 22, shap_value: 0.19, direction: 'increases_risk' },
    { feature: 'retained_balance', label: 'Retained Balance (₹24.4K)', value: 24469.49, shap_value: -0.05, direction: 'reduces_risk' },
  ],
  shap_values: {
    forward_ratio: 0.38,
    hourly_velocity: 0.29,
    account_age_days: 0.19,
    share_new_counterparties: 0.12,
    retained_balance: -0.05,
  },
};

export const mockDiscoveredRings: DiscoveredRing[] = [
  {
    ring_id: 'fan_1',
    pattern: 'fan',
    accounts: ['ACC_05001', 'ACC_05002', 'ACC_05003', 'ACC_05004', 'ACC_05005', 'ACC_05006', 'ACC_05007'],
    mean_risk: 74.3,
    internal_flow_ratio: 0.94,
    density: 0.74,
    estimated_at_risk: 424089.49,
    explanation: 'Rapid accumulation hub pooling ₹4.24L from 11 victim accounts before immediate dispersion.',
  },
  {
    ring_id: 'cycle_1',
    pattern: 'cycle',
    accounts: ['ACC_05008', 'ACC_05009', 'ACC_05010'],
    mean_risk: 91.0,
    internal_flow_ratio: 1.0,
    density: 1.0,
    estimated_at_risk: 161994.57,
    explanation: 'Tight 3-node cycle circulating funds within 31 minutes with 5.7% total volume erosion.',
  },
  {
    ring_id: 'chain_1',
    pattern: 'chain',
    accounts: ['ACC_05016', 'ACC_05017', 'ACC_05018', 'ACC_05019'],
    mean_risk: 87.5,
    internal_flow_ratio: 0.98,
    density: 0.67,
    estimated_at_risk: 210000.0,
    explanation: 'High-speed pass-through transit chain forwarding >98% between hops in under 5 minutes.',
  },
  {
    ring_id: 'cluster_1',
    pattern: 'cluster',
    accounts: ['ACC_05026', 'ACC_05027', 'ACC_05028', 'ACC_05029', 'ACC_05030'],
    mean_risk: 83.2,
    internal_flow_ratio: 0.45,
    density: 0.85,
    estimated_at_risk: 185000.0,
    explanation: 'Synthetic identity cluster sharing device DEV_MULE_99 and KYC address hash.',
  },
  {
    ring_id: 'dormancy_1',
    pattern: 'dormancy',
    accounts: ['ACC_05044'],
    mean_risk: 86.0,
    internal_flow_ratio: 0.82,
    density: 0.5,
    estimated_at_risk: 350000.0,
    explanation: 'Sudden awakening of account dormant for 142 days moving ₹3.50L in 1.8 hours.',
  },
];

export const mockFreezeRequests: FreezeRequest[] = [
  {
    id: 1,
    ring_id: 'fan_1',
    account_ids: ['ACC_05001'],
    amount: 424089.49,
    status: 'drafted',
    note: 'Min-cut recommended single bottleneck freeze.',
    created_at: '2026-10-01T11:05:00Z',
    updated_at: '2026-10-01T11:05:00Z',
  },
  {
    id: 2,
    ring_id: 'cycle_1',
    account_ids: ['ACC_05008', 'ACC_05009'],
    amount: 161994.57,
    status: 'sent',
    note: 'Emergency freeze request sent to FinTech Node Ops via Cyber Crime Portal (NCRP).',
    created_at: '2026-10-01T11:30:00Z',
    updated_at: '2026-10-01T11:35:00Z',
  },
  {
    id: 3,
    ring_id: 'chain_1',
    account_ids: ['ACC_05016'],
    amount: 210000.0,
    status: 'held',
    note: 'Account temporarily held pending LEA confirmation.',
    created_at: '2026-10-01T09:15:00Z',
    updated_at: '2026-10-01T09:45:00Z',
  },
  {
    id: 4,
    ring_id: 'cluster_1',
    account_ids: ['ACC_05026', 'ACC_05027'],
    amount: 185000.0,
    status: 'recovered',
    note: 'Funds reversed to origin bank before cash-out.',
    created_at: '2026-09-30T14:20:00Z',
    updated_at: '2026-10-01T08:00:00Z',
  },
  {
    id: 5,
    ring_id: 'dormancy_1',
    account_ids: ['ACC_05044'],
    amount: 95000.0,
    status: 'missed',
    note: 'Cash out occurred at ATM prior to freeze dispatch.',
    created_at: '2026-09-29T16:00:00Z',
    updated_at: '2026-09-29T17:15:00Z',
  },
];

export const mockHealthReport: DataHealthReport = {
  run_id: 'run_seed_42_latest',
  duplicates_removed: 622,
  out_of_order_fixed: 124,
  missing_device_pct: 4.88,
  missing_ip_pct: 5.02,
  self_transfers_dropped: 31,
  total_transactions: 62218,
  total_accounts: 5044,
};

export const mockCaseReport: CaseReport = {
  ring_id: 'fan_1',
  pattern: 'fan',
  summary_sentence: 'Aggregated mule dispersion network: ₹4.24L extracted from 11 victim accounts and forwarded through ACC_05001 within 32 minutes.',
  accounts: [
    { account_id: 'ACC_05001', kyc_phone_masked: '+91 98••••12', kyc_address_masked: 'Flat 4••, Andheri West, Mumbai, MH', kyc_id_hash_masked: 'a8••••4f', is_recommended_freeze: true },
    { account_id: 'ACC_05002', kyc_phone_masked: '+91 97••••88', kyc_address_masked: 'Plot 1••, Sector 15, Noida, UP', kyc_id_hash_masked: 'b3••••9c', is_recommended_freeze: false },
    { account_id: 'ACC_05003', kyc_phone_masked: '+91 94••••33', kyc_address_masked: 'Door 2••, T Nagar, Chennai, TN', kyc_id_hash_masked: 'c1••••7d', is_recommended_freeze: false },
    { account_id: 'ACC_05004', kyc_phone_masked: '+91 91••••09', kyc_address_masked: 'House 5••, Salt Lake, Kolkata, WB', kyc_id_hash_masked: 'd9••••2e', is_recommended_freeze: false },
  ],
  transfer_timeline: [
    { timestamp: '2026-10-01T10:14:00Z', src: 'ACC_01094', dst: 'ACC_05001', amount: 45000, channel: 'UPI' },
    { timestamp: '2026-10-01T10:16:30Z', src: 'ACC_01429', dst: 'ACC_05001', amount: 38500, channel: 'IMPS' },
    { timestamp: '2026-10-01T10:18:10Z', src: 'ACC_01592', dst: 'ACC_05001', amount: 52000, channel: 'UPI' },
    { timestamp: '2026-10-01T10:28:00Z', src: 'ACC_05001', dst: 'ACC_05002', amount: 72000, channel: 'IMPS' },
    { timestamp: '2026-10-01T10:29:15Z', src: 'ACC_05001', dst: 'ACC_05003', amount: 68000, channel: 'UPI' },
  ],
  freeze_plan: mockFreezePlan,
  draft_str: `CONFIDENTIAL SUSPICIOUS TRANSACTION REPORT (STR / SAR)
Section 12 of the Prevention of Money Laundering Act (PMLA), 2002.
Reporting Entity: FinTech Bank Fraud Ops Unit

SUBJECT OF REPORT:
Mule ring identified under Ring Identifier [fan_1]. Primary nexus account: ACC_05001.

NARRATIVE SUMMARY:
Between 2026-10-01 10:14:00 UTC and 10:35:00 UTC, account ACC_05001 received 11 rapid inbound credits totaling ₹4,24,089.49 from disparate sender accounts across multiple jurisdictions. In less than 15 minutes following receipt, approximately 94.2% (₹3,99,620.00) was systematically fragmented and layered out to 6 secondary beneficiary accounts.
Money tracing confirms funds originated from unauthorized access/social engineering complaints.
Graph cut optimization identifies ACC_05001 as the pivotal min-cut bottleneck.

RECOMMENDED ACTION:
1. Immediate preventive debit-freeze on primary node ACC_05001 to stop residual and circulating funds.
2. Lien placement on downstream beneficiary accounts [ACC_05002 through ACC_05007].
3. Forwarding of case packet to the Indian Cyber Crime Coordination Centre (I4C / 1930 Helpline).`,
  analyst_notes: [
    'Victim accounts confirmed unauthorized UPI pull requests.',
    'IP address geo-located to proxy server in Bangalore.',
    'KYC phone number activated under 15 days ago with no telecom recharge history.',
  ],
};
