/**
 * MuleTrace API Client with REST endpoints and mock data fallback.
 */

import axios from 'axios';
import type {
  AccountDetail,
  AccountListResponse,
  CaseReport,
  CreateRunRequest,
  DataHealthReport,
  Decision,
  DiscoveredRing,
  ExplainResponse,
  FreezePlanResponse,
  FreezeRequest,
  GenerateDatasetRequest,
  NetworkResponse,
  PatchRunRequest,
  ReplayResponse,
  RunItem,
  RunStatusResponse,
  SaveMappingRequest,
  StatsResponse,
  TaintAccountResult,
  UploadResponse,
  ValidationReport,
} from './types';
import {
  mockStats,
  mockAccounts,
  mockAccountDetails,
  mockNetworks,
  mockTaint,
  mockFreezePlan,
  mockReplay,
  mockExplain,
  mockDiscoveredRings,
  mockFreezeRequests,
  mockHealthReport,
  mockCaseReport,
} from './mockData';

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  timeout: 5000,
});

export const api = {
  // Stats & KPIs
  getStats: async (): Promise<StatsResponse> => {
    try {
      const res = await apiClient.get<StatsResponse>('/stats');
      return res.data;
    } catch {
      return mockStats;
    }
  },

  // Accounts & Queue
  getAccounts: async (params?: {
    page?: number;
    page_size?: number;
    min_score?: number;
    pattern?: string;
    status?: string;
    q?: string;
    sort_by?: string;
  }): Promise<AccountListResponse> => {
    try {
      const res = await apiClient.get<AccountListResponse>('/accounts', { params });
      return res.data;
    } catch {
      let filtered = [...mockAccounts];
      if (params?.min_score) {
        filtered = filtered.filter((a) => a.risk_score >= (params.min_score || 0));
      }
      if (params?.pattern && params.pattern !== 'all') {
        filtered = filtered.filter((a) => a.patterns.includes(params.pattern as any));
      }
      if (params?.status && params.status !== 'all') {
        filtered = filtered.filter((a) => a.status === params.status);
      }
      if (params?.q) {
        const qLower = params.q.toLowerCase();
        filtered = filtered.filter(
          (a) => a.account_id.toLowerCase().includes(qLower) || a.reason.toLowerCase().includes(qLower)
        );
      }
      return {
        items: filtered,
        total: filtered.length,
        page: params?.page || 1,
        page_size: params?.page_size || 25,
      };
    }
  },

  getAccountDetail: async (accountId: string): Promise<AccountDetail> => {
    try {
      const res = await apiClient.get<AccountDetail>(`/accounts/${accountId}`);
      return res.data;
    } catch {
      return (
        mockAccountDetails[accountId] || {
          ...mockAccountDetails['ACC_05001'],
          account_id: accountId,
        }
      );
    }
  },

  getAccountNetwork: async (accountId: string, hops = 1, maxNodes = 60): Promise<NetworkResponse> => {
    try {
      const res = await apiClient.get<NetworkResponse>(`/accounts/${accountId}/network`, {
        params: { hops, max_nodes: maxNodes },
      });
      return res.data;
    } catch {
      return (
        mockNetworks[accountId] ||
        mockNetworks['ACC_05001'] || {
          nodes: [{ id: accountId, score: 85, patterns: ['fan'], age_days: 30 }],
          edges: [],
        }
      );
    }
  },

  getAccountTaint: async (accountId: string): Promise<TaintAccountResult> => {
    try {
      const res = await apiClient.get<TaintAccountResult>(`/accounts/${accountId}/taint`);
      return res.data;
    } catch {
      return {
        ...mockTaint,
        account_id: accountId,
      };
    }
  },

  getAccountExplain: async (accountId: string): Promise<ExplainResponse> => {
    try {
      const res = await apiClient.get<ExplainResponse>(`/accounts/${accountId}/explain`);
      return res.data;
    } catch {
      return {
        ...mockExplain,
        account_id: accountId,
      };
    }
  },

  submitDecision: async (
    accountId: string,
    decision: { status: 'confirmed' | 'cleared'; note: string; analyst: string }
  ): Promise<Decision> => {
    try {
      const res = await apiClient.post<Decision>(`/accounts/${accountId}/decision`, decision);
      return res.data;
    } catch {
      return {
        ...decision,
        timestamp: new Date().toISOString(),
      };
    }
  },

  // Rings & Analytics
  getRings: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>('/rings');
      return res.data;
    } catch {
      return mockDiscoveredRings;
    }
  },

  getDiscoveredRings: async (): Promise<DiscoveredRing[]> => {
    try {
      const res = await apiClient.get<DiscoveredRing[]>('/rings/discovered');
      return res.data;
    } catch {
      return mockDiscoveredRings;
    }
  },

  getRingFreezePlan: async (ringId: string): Promise<FreezePlanResponse> => {
    try {
      const res = await apiClient.get<FreezePlanResponse>(`/rings/${ringId}/freeze-plan`);
      return res.data;
    } catch {
      return {
        ...mockFreezePlan,
        ring_id: ringId,
      };
    }
  },

  getRingReplay: async (ringId: string, frozenAccount?: string): Promise<ReplayResponse> => {
    try {
      const res = await apiClient.get<ReplayResponse>(`/rings/${ringId}/replay`, {
        params: { frozen_account: frozenAccount },
      });
      return res.data;
    } catch {
      return {
        ...mockReplay,
        ring_id: ringId,
      };
    }
  },

  // Freezes Kanban
  getFreezeRequests: async (): Promise<FreezeRequest[]> => {
    try {
      const res = await apiClient.get<FreezeRequest[]>('/freeze-requests');
      return res.data;
    } catch {
      return mockFreezeRequests;
    }
  },

  createFreezeRequest: async (data: { ring_id: string; account_ids: string[]; amount: number; note?: string }): Promise<FreezeRequest> => {
    try {
      const res = await apiClient.post<FreezeRequest>('/freeze-requests', data);
      return res.data;
    } catch {
      return {
        id: Math.floor(Math.random() * 9000) + 1000,
        ...data,
        status: 'drafted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  updateFreezeRequest: async (
    requestId: number,
    data: { status: 'drafted' | 'sent' | 'held' | 'recovered' | 'missed'; note?: string }
  ): Promise<FreezeRequest> => {
    try {
      const res = await apiClient.patch<FreezeRequest>(`/freeze-requests/${requestId}`, data);
      return res.data;
    } catch {
      const found = mockFreezeRequests.find((f) => f.id === requestId);
      return {
        ...(found || mockFreezeRequests[0]),
        id: requestId,
        status: data.status,
        note: data.note || found?.note,
        updated_at: new Date().toISOString(),
      };
    }
  },

  // Case File & SAR
  getCaseReport: async (ringId: string): Promise<CaseReport> => {
    try {
      const res = await apiClient.get<CaseReport>(`/cases/${ringId}/report`);
      return res.data;
    } catch {
      return {
        ...mockCaseReport,
        ring_id: ringId,
      };
    }
  },

  // Data & Uploads
  uploadFiles: async (files: File[]): Promise<UploadResponse> => {
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      const res = await apiClient.post<UploadResponse>('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch {
      // Mock fallback for offline / standalone preview
      return {
        upload_id: `upload_${Date.now()}`,
        files: files.map((f) => ({
          filename: f.name,
          size_bytes: f.size,
          detected_type: f.name.includes('acct') || f.name.includes('account') ? 'accounts' : 'transactions',
          row_count: 120,
          columns: ['txn_id', 'timestamp', 'src_account', 'dst_account', 'amount', 'channel'],
        })),
        detected_file_types: { [files[0]?.name || 'data.csv']: 'transactions' },
        suggested_mapping: {
          transactions: {
            src_account: { source_column: 'src_account', confidence: 'Matched', sample_values: ['ACC_01094', 'ACC_01429', 'ACC_01592'] },
            dst_account: { source_column: 'dst_account', confidence: 'Matched', sample_values: ['ACC_05001', 'ACC_05002', 'ACC_05003'] },
            timestamp: { source_column: 'timestamp', confidence: 'Matched', sample_values: ['2026-10-01T10:14:00Z', '2026-10-01T10:16:30Z'] },
            amount: { source_column: 'amount', confidence: 'Matched', sample_values: ['₹45,000', '₹38,500', '1.5 Lakhs'] },
            txn_id: { source_column: 'txn_id', confidence: 'Matched', sample_values: ['TXN_1001', 'TXN_1002'] },
            channel: { source_column: 'channel', confidence: 'Matched', sample_values: ['UPI', 'IMPS'] },
            device_id: { source_column: null, confidence: 'Unmapped', sample_values: [] },
            ip: { source_column: null, confidence: 'Unmapped', sample_values: [] },
          },
          accounts: {
            account_id: { source_column: 'account_id', confidence: 'Matched', sample_values: ['ACC_05001'] },
            opened_date: { source_column: 'opened_date', confidence: 'Matched', sample_values: ['2026-09-08'] },
            kyc_phone: { source_column: 'kyc_phone', confidence: 'Matched', sample_values: ['+91 9876543210'] },
            kyc_address: { source_column: 'kyc_address', confidence: 'Matched', sample_values: ['Flat 402 Andheri West'] },
            kyc_id_hash: { source_column: 'kyc_id_hash', confidence: 'Matched', sample_values: ['hash_a8721bf4'] },
            balance_after: { source_column: 'balance_after', confidence: 'Matched', sample_values: ['24469.49'] },
          },
        },
        preview: {
          transactions: [
            { txn_id: 'TXN_1001', timestamp: '2026-10-01T10:14:00Z', src_account: 'ACC_01094', dst_account: 'ACC_05001', amount: 45000, channel: 'UPI' },
            { txn_id: 'TXN_1002', timestamp: '2026-10-01T10:16:30Z', src_account: 'ACC_01429', dst_account: 'ACC_05001', amount: 38500, channel: 'IMPS' },
            { txn_id: 'TXN_1003', timestamp: '2026-10-01T10:28:00Z', src_account: 'ACC_05001', dst_account: 'ACC_05002', amount: 72000, channel: 'UPI' },
          ],
          accounts: [],
        },
        has_accounts: files.some((f) => f.name.includes('acct') || f.name.includes('account')),
        reduced_mode_note: files.some((f) => f.name.includes('acct') || f.name.includes('account'))
          ? null
          : 'No accounts file provided. Cluster and dormancy detectors will run in reduced mode.',
      };
    }
  },

  saveMapping: async (uploadId: string, data: SaveMappingRequest): Promise<any> => {
    try {
      const res = await apiClient.put(`/uploads/${uploadId}/mapping`, data);
      return res.data;
    } catch {
      return { status: 'ok' };
    }
  },

  validateUpload: async (uploadId: string): Promise<ValidationReport> => {
    try {
      const res = await apiClient.post<ValidationReport>(`/uploads/${uploadId}/validate`);
      return res.data;
    } catch {
      return {
        upload_id: uploadId,
        total_rows: 62218,
        date_range: { start: '2026-10-01T00:00:00Z', end: '2026-10-07T23:59:59Z' },
        unique_accounts: 5044,
        duplicates_removed: 622,
        out_of_order_fixed: 124,
        self_transfers_dropped: 31,
        missing_device_pct: 4.9,
        missing_ip_pct: 5.0,
        amount_stats: { min: 100, median: 24500, max: 424089.49 },
        rejected_rows_count: 0,
        issues: [
          { severity: 'info', field: 'txn_id', message: '622 duplicate rows removed.', effect: 'Deduplicated to prevent flow amplification.' },
          { severity: 'info', field: 'timestamp', message: 'Timestamps re-ordered chronologically.', effect: 'Strict time-ordering enforced for windowing.' },
          { severity: 'warn', field: 'device_id', message: '4.9% missing device IDs.', effect: 'Cluster detector will operate with reduced coverage.' },
        ],
        preview_rows: [
          { txn_id: 'TXN_1001', timestamp: '2026-10-01T10:14:00Z', src_account: 'ACC_01094', dst_account: 'ACC_05001', amount: 45000, channel: 'UPI' },
          { txn_id: 'TXN_1002', timestamp: '2026-10-01T10:16:30Z', src_account: 'ACC_01429', dst_account: 'ACC_05001', amount: 38500, channel: 'IMPS' },
          { txn_id: 'TXN_1003', timestamp: '2026-10-01T10:28:00Z', src_account: 'ACC_05001', dst_account: 'ACC_05002', amount: 72000, channel: 'UPI' },
        ],
        cell_issues: [],
        can_proceed: true,
      };
    }
  },

  createRun: async (data: CreateRunRequest): Promise<{ run_id: string; status: string; name: string }> => {
    try {
      const res = await apiClient.post('/runs', data);
      return res.data;
    } catch {
      return {
        run_id: `run_${Date.now()}`,
        status: 'running',
        name: data.name || 'Pipeline Run',
      };
    }
  },

  getRunStatus: async (runId: string): Promise<RunStatusResponse> => {
    try {
      const res = await apiClient.get<RunStatusResponse>(`/runs/${runId}/status`);
      return res.data;
    } catch {
      return {
        run_id: runId,
        status: 'completed',
        stage: 'completed',
        percent: 100,
        elapsed_seconds: 4.8,
        stage_timings: { validate: 0.3, build_graph: 0.4, detect: 1.8, score: 1.2, trace_money: 1.1 },
        summary: {
          run_id: runId,
          accounts: 5044,
          transactions: 62218,
          flagged: 44,
          rings_found: 5,
          estimated_at_risk: 1340000.0,
        },
      };
    }
  },

  cancelRun: async (runId: string): Promise<any> => {
    try {
      const res = await apiClient.post(`/runs/${runId}/cancel`);
      return res.data;
    } catch {
      return { status: 'ok' };
    }
  },

  updateRun: async (runId: string, data: PatchRunRequest): Promise<any> => {
    try {
      const res = await apiClient.patch(`/runs/${runId}`, data);
      return res.data;
    } catch {
      return { status: 'ok' };
    }
  },

  deleteRun: async (runId: string): Promise<any> => {
    try {
      const res = await apiClient.delete(`/runs/${runId}`);
      return res.data;
    } catch {
      return { status: 'ok' };
    }
  },

  generateDataset: async (data: GenerateDatasetRequest): Promise<any> => {
    try {
      const res = await apiClient.post('/datasets/generate', data);
      return res.data;
    } catch {
      return {
        status: 'ok',
        run_id: `run_synthetic_${Date.now()}`,
        name: `Synthetic ${data.size.toUpperCase()}`,
        txn_count: 5000,
        acct_count: 1000,
        flagged_count: 12,
      };
    }
  },

  getRejectsCsvUrl: (uploadId: string): string => `${API_BASE}/api/v1/uploads/${uploadId}/rejects.csv`,
  getFlaggedCsvUrl: (runId: string): string => `${API_BASE}/api/v1/runs/${runId}/flagged.csv`,
  getTemplateUrl: (type: 'transactions' | 'accounts'): string => `${API_BASE}/api/v1/templates/${type}.csv`,

  // Runs & Health
  getRuns: async (): Promise<RunItem[]> => {
    try {
      const res = await apiClient.get<RunItem[]>('/runs');
      return res.data;
    } catch {
      return [
        {
          id: 'run_seed_42_latest',
          name: 'Seeded Demo Run (Seed 42)',
          created_at: new Date().toISOString(),
          source: 'Demo Seed 42',
          status: 'completed',
          is_active: true,
          config_preset: 'default',
          txn_count: 62218,
          acct_count: 5044,
          flagged_count: 44,
          duplicates_removed: 622,
          out_of_order_fixed: 124,
          missing_device_pct: 4.9,
          missing_ip_pct: 5.0,
          self_transfers_dropped: 31,
        },
      ];
    }
  },

  getRunHealth: async (runId: string): Promise<DataHealthReport> => {
    try {
      const res = await apiClient.get<DataHealthReport>(`/runs/${runId}/health`);
      return res.data;
    } catch {
      return mockHealthReport;
    }
  },

  // Model & Simulation
  getModelPerformance: async (): Promise<any> => {
    try {
      const res = await apiClient.get('/model/performance');
      return res.data;
    } catch {
      return {
        overall_recall: 0.971,
        precision: 0.958,
        decoy_false_positive_count: 0,
        by_pattern: {
          fan: { recall: 0.94, precision: 0.95 },
          cycle: { recall: 1.0, precision: 1.0 },
          chain: { recall: 1.0, precision: 0.96 },
          cluster: { recall: 1.0, precision: 0.97 },
          dormancy: { recall: 1.0, precision: 0.91 },
        },
      };
    }
  },

  getAuditLog: async (params?: { action?: string; limit?: number }): Promise<any[]> => {
    try {
      const res = await apiClient.get('/audit', { params });
      return res.data;
    } catch {
      return [
        { id: 1, action: 'CONFIRM_ACCOUNT', entity_id: 'ACC_05001', analyst: 'analyst_arun', note: 'Victim complaints corroborated', timestamp: '2026-10-01T11:05:00Z' },
        { id: 2, action: 'FREEZE_REQUEST_DRAFTED', entity_id: 'fan_1', analyst: 'analyst_arun', note: '₹4.24L min-cut bottleneck', timestamp: '2026-10-01T11:06:12Z' },
        { id: 3, action: 'CLEAR_ACCOUNT', entity_id: 'ACC_00042', analyst: 'analyst_neha', note: 'Verified corporate payroll disbursement', timestamp: '2026-10-01T10:15:00Z' },
      ];
    }
  },

  simulateEvasion: async (level: number): Promise<any> => {
    try {
      const res = await apiClient.post('/simulate/evasion', null, { params: { level } });
      return res.data;
    } catch {
      return {
        level,
        recall: Math.max(0.65, 0.98 - level * 0.32),
        active_rings: Math.round(5 * (1 - level * 0.2)),
        detected_rings: Math.round(5 * (1 - level * 0.2) * (0.98 - level * 0.32)),
      };
    }
  },

  resetDemo: async (): Promise<any> => {
    try {
      const res = await apiClient.post('/demo/reset');
      return res.data;
    } catch {
      return { status: 'ok', message: 'Demo reset completed.' };
    }
  },
};
