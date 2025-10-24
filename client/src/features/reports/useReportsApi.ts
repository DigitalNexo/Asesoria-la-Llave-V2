import { useQuery } from '@tanstack/react-query';

export type ReportsFilters = {
  year?: number;
  periodId?: string;
  model?: string;
  assigneeId?: string;
  clientId?: string;
  status?: string;
};

export function useKpis(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/kpis', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.periodId) params.set('periodId', filters.periodId);
      if (filters.model) params.set('model', filters.model);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`/api/tax/reports/kpis?${params.toString()}`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('No se pudieron cargar KPIs');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useSummaryModel(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/summary/model', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.periodId) params.set('periodId', filters.periodId);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`/api/tax/reports/summary/model?${params.toString()}`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('No se pudo cargar resumen por modelo');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useTrends(filters: ReportsFilters & { granularity?: 'month'|'week' }) {
  return useQuery({
    queryKey: ['/api/tax/reports/trends', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.model) params.set('model', filters.model);
      if (filters.granularity) params.set('granularity', filters.granularity);
      const res = await fetch(`/api/tax/reports/trends?${params.toString()}`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('No se pudo cargar tendencias');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useSummaryAssignee(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/summary/assignee', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.periodId) params.set('periodId', filters.periodId);
      if (filters.status) params.set('status', filters.status);
      const res = await fetch(`/api/tax/reports/summary/assignee?${params.toString()}`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('No se pudo cargar resumen por gestor');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useFilings(filters: ReportsFilters & { page?: number; size?: number }) {
  return useQuery<{ items: any[]; total: number }>({
    queryKey: ['/api/tax/reports/filings', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.periodId) params.set('periodId', filters.periodId);
      if (filters.model) params.set('model', filters.model);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      if (filters.status) params.set('status', filters.status);
      params.set('page', String(filters.page ?? 1));
      params.set('size', String(filters.size ?? 50));
      const res = await fetch(`/api/tax/reports/filings?${params.toString()}`, { credentials: 'include', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      if (!res.ok) throw new Error('No se pudo cargar detalle');
      return res.json();
    },
    staleTime: 30_000,
  });
}
