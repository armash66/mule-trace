/**
 * MuleTrace API Client with REST endpoints and mock data fallback.
 */

import axios from 'axios';
import type {
  AccountDetail,
  AccountListResponse,
  CaseReport,
  DataHealthReport,
  Decision,
  DiscoveredRing,
  ExplainResponse,
  FreezePlanResponse,
  FreezeRequest,
  NetworkResponse,
  ReplayResponse,
  StatsResponse,
  TaintAccountResult,
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

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  // Runs & Health
  getRuns: async (): Promise<any[]> => {
    try {
      const res = await apiClient.get<any[]>('/runs');
      return res.data;
    } catch {
      return [{ id: 'run_seed_42_latest', created_at: new Date().toISOString(), total_accounts: 5044 }];
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
