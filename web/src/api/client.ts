import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('muletrace_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap envelope
api.interceptors.response.use(
  (response) => {
    if (response.data?.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('muletrace_token');
      localStorage.removeItem('muletrace_refresh');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  refresh: (refresh_token: string) =>
    api.post('/auth/refresh', { refresh_token }),
  me: () => api.get('/auth/me'),
};

// Ingest
export const ingestApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/ingest', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  listRuns: () => api.get('/runs'),
  getRun: (id: string) => api.get(`/runs/${id}`),
  cancelRun: (id: string) => api.post(`/runs/${id}/cancel`),
};

// Alerts
export const alertsApi = {
  list: (params?: Record<string, any>) => api.get('/alerts', { params }),
  getAccount: (id: string, runId?: string) =>
    api.get(`/accounts/${id}`, { params: { run_id: runId } }),
  revealPii: (id: string, reason: string) =>
    api.post(`/accounts/${id}/reveal`, { reason }),
  getNetwork: (id: string, params?: Record<string, any>) =>
    api.get(`/accounts/${id}/network`, { params }),
};

// Cases
export const casesApi = {
  list: (params?: Record<string, any>) => api.get('/cases', { params }),
  get: (id: string) => api.get(`/cases/${id}`),
  create: (data: any) => api.post('/cases', data),
  update: (id: string, data: any) => api.patch(`/cases/${id}`, data),
  addNote: (id: string, content: string) =>
    api.post(`/cases/${id}/notes`, { content }),
};

// Decisions
export const decisionsApi = {
  create: (data: { account_id: string; action: string; note?: string; case_id?: string }) =>
    api.post('/decisions', data),
  undo: (id: string) => api.post(`/decisions/${id}/undo`),
};

// Freeze
export const freezeApi = {
  create: (data: any) => api.post('/freeze-requests', data),
  approve: (id: string, note?: string) =>
    api.post(`/freeze-requests/${id}/approve`, { note }),
  reject: (id: string, note?: string) =>
    api.post(`/freeze-requests/${id}/reject`, { note }),
};

// Rings
export const ringsApi = {
  list: (params?: Record<string, any>) => api.get('/rings', { params }),
  get: (id: string) => api.get(`/rings/${id}`),
};

// Trace
export const traceApi = {
  run: (data: any) => api.post('/trace', data),
  getFrames: (id: string) => api.get(`/trace/${id}/frames`),
};

// Watchlist
export const watchlistApi = {
  list: () => api.get('/watchlist'),
  add: (data: any) => api.post('/watchlist', data),
};

// Config
export const configApi = {
  getThresholds: () => api.get('/config/thresholds'),
  updateThresholds: (data: any) => api.put('/config/thresholds', data),
  preview: (data: any) => api.post('/config/preview', data),
};

// Metrics
export const metricsApi = {
  summary: () => api.get('/metrics/summary'),
  benchmark: () => api.get('/metrics/benchmark'),
};

// Learned weights
export const weightsApi = {
  get: () => api.get('/learned-weights'),
  apply: () => api.post('/learned-weights/apply'),
  reset: () => api.post('/learned-weights/reset'),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, any>) => api.get('/audit', { params }),
  verify: () => api.get('/audit/verify'),
};

// Reports
export const reportsApi = {
  create: (data: any) => api.post('/reports', data),
  get: (id: string) => api.get(`/reports/${id}`),
};

// Synthetic
export const syntheticApi = {
  generate: (params?: any) => api.post('/synthetic/generate', params),
};

// SSE helper
export function connectSSE(runId: string, onEvent: (event: any) => void): EventSource {
  const token = localStorage.getItem('muletrace_token');
  const url = `${API_BASE}/api/v1/runs/${runId}/events`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {}
  };

  es.onerror = () => {
    onEvent({ stage: 'error', data: { message: 'Connection lost' } });
  };

  return es;
}
