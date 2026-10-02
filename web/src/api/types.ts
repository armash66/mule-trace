/**
 * TypeScript contract matching FastAPI backend models.
 */

export interface Finding {
  account_id: string;
  pattern: 'fan' | 'cycle' | 'chain' | 'cluster' | 'dormancy' | 'community';
  strength: number;
  evidence: Record<string, any>;
  related_accounts: string[];
}

export interface Decision {
  status: 'confirmed' | 'cleared';
  note: string;
  analyst: string;
  timestamp: string;
}

export interface AccountListItem {
  account_id: string;
  risk_score: number;
  patterns: string[];
  reason: string;
  status: 'confirmed' | 'cleared' | 'unreviewed' | null;
}

export interface AccountListResponse {
  items: AccountListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AccountDetail {
  account_id: string;
  risk_score: number;
  patterns: string[];
  reasons: string[];
  findings: Finding[];
  features: Record<string, number>;
  decisions: Decision[];
  age_days: number | null;
}

export interface NetworkNode {
  id: string;
  score: number;
  patterns: string[];
  age_days: number;
}

export interface NetworkEdge {
  src: string;
  dst: string;
  total_amount: number;
  count: number;
  first_time: string;
}

export interface NetworkResponse {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface TaintAccountResult {
  account_id: string;
  tainted_in: number;
  tainted_out: number;
  tainted_balance_remaining: number;
  cashed_out: number;
}

export interface FreezeAlternative {
  account_ids: string[];
  rupees_stopped: number;
  rupees_lost: number;
  efficiency: number;
}

export interface FreezePlanResponse {
  ring_id: string;
  recommended_freeze_accounts: string[];
  rupees_stopped: number;
  rupees_lost: number;
  total_tainted: number;
  alternatives: FreezeAlternative[];
}

export interface ReplayEvent {
  timestamp: string;
  src: string;
  dst: string;
  amount: number;
  tainted_amount: number;
  status: 'transferred' | 'stopped';
  is_freeze_point: boolean;
}

export interface ReplayResponse {
  ring_id: string;
  events: ReplayEvent[];
  total_amount: number;
  total_tainted: number;
  stoppable_rupees: number;
  accounts: string[];
}

export interface DiscoveredRing {
  ring_id: string;
  pattern: string;
  accounts: string[];
  mean_risk: number;
  internal_flow_ratio: number;
  density: number;
  estimated_at_risk: number;
  explanation: string;
}

export interface TopFeature {
  feature: string;
  label: string;
  value: number;
  shap_value: number;
  direction: 'increases_risk' | 'reduces_risk';
}

export interface ExplainResponse {
  account_id: string;
  risk_score: number;
  top_features: TopFeature[];
  counterfactual: string;
  shap_values: Record<string, number>;
}

export interface StatsResponse {
  total_accounts: number;
  flagged_count: number;
  confirmed_count: number;
  cleared_count: number;
  precision: number | null;
  run_id: string | null;
}

export interface DataHealthReport {
  run_id: string;
  duplicates_removed: number;
  out_of_order_fixed: number;
  missing_device_pct: number;
  missing_ip_pct: number;
  self_transfers_dropped: number;
  total_transactions: number;
  total_accounts: number;
}

export interface FreezeRequest {
  id: number;
  ring_id: string;
  account_ids: string[];
  amount: number;
  status: 'drafted' | 'sent' | 'held' | 'recovered' | 'missed';
  note?: string;
  created_at: string;
  updated_at: string;
}

export interface CaseReport {
  ring_id: string;
  pattern: string;
  summary_sentence: string;
  accounts: Array<{
    account_id: string;
    kyc_phone_masked: string;
    kyc_address_masked: string;
    kyc_id_hash_masked: string;
    is_recommended_freeze: boolean;
  }>;
  transfer_timeline: Array<{
    timestamp: string;
    src: string;
    dst: string;
    amount: number;
    channel: string;
  }>;
  freeze_plan: FreezePlanResponse | null;
  draft_str: string;
  analyst_notes: string[];
}
