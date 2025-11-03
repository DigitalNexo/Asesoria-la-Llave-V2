import { useQuery } from '@tanstack/react-query';

export type ReportsFilters = {
  year?: number;
  periodId?: string;
  model?: string;
  assigneeId?: string;
  clientId?: string;
  status?: string;
};

const buildParams = (filters: ReportsFilters & { page?: number; size?: number; granularity?: string }) => {
  const params = new URLSearchParams();
  if (filters.year) params.set('year', String(filters.year));
  if (filters.periodId) params.set('periodId', filters.periodId);
  if (filters.model) params.set('model', filters.model);
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
  if (filters.clientId) params.set('clientId', filters.clientId);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.size) params.set('size', String(filters.size));
  if (filters.granularity) params.set('granularity', filters.granularity);
  return params;
};

export function useKpis(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/kpis', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/kpis?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/summary/model?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
      const params = buildParams(filters);
      if (filters.granularity) params.set('granularity', filters.granularity);
      const res = await fetch(`/api/tax/reports/trends?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
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
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/summary/assignee?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar resumen por gestor');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useSummaryClient(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/summary/client', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/summary/client?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar resumen por cliente');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useExceptions(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/exceptions', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/exceptions?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudieron cargar alertas');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useFilings(filters: ReportsFilters & { page?: number; size?: number }) {
  return useQuery<{ items: any[]; total: number }>({
    queryKey: ['/api/tax/reports/filings', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      params.set('page', String(filters.page ?? 1));
      params.set('size', String(filters.size ?? 50));
      const res = await fetch(`/api/tax/reports/filings?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar detalle');
      return res.json();
    },
    staleTime: 30_000,
  });
}

// Nuevos hooks para funcionalidades avanzadas
export function useYearComparison(year1: number, year2: number, filters: Omit<ReportsFilters, 'year'>) {
  return useQuery({
    queryKey: ['/api/tax/reports/year-comparison', year1, year2, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('year1', String(year1));
      params.set('year2', String(year2));
      if (filters.model) params.set('model', filters.model);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      if (filters.clientId) params.set('clientId', filters.clientId);
      const res = await fetch(`/api/tax/reports/year-comparison?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar comparativa');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useProductivityAnalysis(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/productivity', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/productivity?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar análisis de productividad');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function usePredictions(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/predictions', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/predictions?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudieron cargar predicciones');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useTemporalPerformance(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/temporal-performance', filters],
    queryFn: async () => {
      const params = buildParams(filters);
      const res = await fetch(`/api/tax/reports/temporal-performance?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar rendimiento temporal');
      return res.json();
    },
    staleTime: 30_000,
  });
}
