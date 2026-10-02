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
  evidence?: {
    observed: Array<{ label: string; value: string; transaction_ids: string[] }>;
    inferences: Array<{ label: string; value: string; note: string }>;
    availability: { device: string; ip: string; kyc: string };
    reason: string;
  };
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
  isTainted?: boolean;
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

export interface FileInfo {
  filename: string;
  size_bytes: number;
  detected_type: 'transactions' | 'accounts' | 'ambiguous';
  row_count: number;
  columns: string[];
}

export interface ColumnMappingItem {
  source_column: string | null;
  confidence: 'Matched' | 'Check' | 'Unmapped';
  sample_values: any[];
}

export interface UploadResponse {
  upload_id: string;
  files: FileInfo[];
  detected_file_types: Record<string, string>;
  suggested_mapping: {
    transactions: Record<string, ColumnMappingItem>;
    accounts: Record<string, ColumnMappingItem>;
  };
  preview: {
    transactions: Record<string, any>[];
    accounts: Record<string, any>[];
  };
  has_accounts: boolean;
  reduced_mode_note?: string | null;
}

export interface ValidationIssue {
  severity: 'info' | 'warn' | 'error';
  field?: string | null;
  message: string;
  effect: string;
  row_index?: number | null;
}

export interface ValidationReport {
  upload_id: string;
  total_rows: number;
  date_range: { start: string; end: string };
  unique_accounts: number;
  duplicates_removed: number;
  out_of_order_fixed: number;
  self_transfers_dropped: number;
  missing_device_pct: number;
  missing_ip_pct: number;
  amount_stats: { min: number; median: number; max: number };
  rejected_rows_count: number;
  issues: ValidationIssue[];
  preview_rows: Record<string, any>[];
  cell_issues: Array<{ row: number; col: string; issue: string }>;
  can_proceed: boolean;
}

export interface RunItem {
  id: string;
  name: string;
  created_at: string;
  source: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  is_active: boolean;
  config_preset: string;
  txn_count: number;
  acct_count: number;
  flagged_count: number;
  duplicates_removed: number;
  out_of_order_fixed: number;
  missing_device_pct: number;
  missing_ip_pct: number;
  self_transfers_dropped: number;
}

export interface RunStatusResponse {
  run_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  stage: 'validate' | 'build_graph' | 'detect' | 'score' | 'trace_money' | 'completed' | 'failed';
  percent: number;
  elapsed_seconds: number;
  stage_timings: Record<string, number>;
  error?: string | null;
  summary?: {
    run_id: string;
    accounts: number;
    transactions: number;
    flagged: number;
    rings_found: number;
    estimated_at_risk: number;
  } | null;
}

export interface SaveMappingRequest {
  transactions: Record<string, ColumnMappingItem>;
  accounts?: Record<string, ColumnMappingItem>;
  timezone?: string;
  date_format?: string;
}

export interface CreateRunRequest {
  upload_id: string;
  name?: string;
  config_preset?: string;
}

export interface PatchRunRequest {
  name?: string;
  is_active?: boolean;
  status?: string;
}

export interface GenerateDatasetRequest {
  seed: number;
  size: 'small' | 'medium' | 'large';
  evasion_level: number;
  include_decoys: boolean;
}
