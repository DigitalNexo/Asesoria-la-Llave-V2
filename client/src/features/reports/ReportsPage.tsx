import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  useKpis,
  useSummaryModel,
  useSummaryAssignee,
  useSummaryClient,
  useExceptions,
} from './useReportsApi';
import DetailTable from './DetailTable';
import { TAX_MODEL_METADATA } from '@shared/tax-rules';
import { KanbanSquare, FileText, BarChart2 } from 'lucide-react';
import { TaxesNav } from '@/components/taxes-nav';
import { getTaxModels, type TaxModel } from '@/features/tax-models/api';
import { useQuery } from '@tanstack/react-query';
import ChartsPanel from './ChartsPanel';
import AlertsPanel from './AlertsPanel';
import ProductivityPanel from './ProductivityPanel';
import PredictionsPanel from './PredictionsPanel';
import ComparisonPanel from './ComparisonPanel';
import TemporalPerformancePanel from './TemporalPerformancePanel';
import GoalsPanel from './GoalsPanel';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<{ year: number; model?: string; status?: string; assigneeId?: string }>({ year: currentYear });

  useEffect(() => {
    const saved = localStorage.getItem('reports.filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.year) setFilters(parsed);
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('reports.filters', JSON.stringify(filters));
  }, [filters]);

  const kpis = useKpis(filters);
  const summaryModel = useSummaryModel(filters);
  const summaryClients = useSummaryClient(filters);
  const byAssignee = useSummaryAssignee(filters);
  const exceptions = useExceptions(filters);

  // Cargar modelos fiscales dinámicamente desde la API
  const { data: taxModelsData = [] } = useQuery<TaxModel[]>({
    queryKey: ["/api/tax-models"],
    queryFn: getTaxModels,
  });

  const modelsList = useMemo(() => {
    // Combinar modelos de la BD con los estáticos para compatibilidad
    const dbModels = taxModelsData.map(m => ({ code: m.code, name: m.name }));
    const staticModels = Object.entries(TAX_MODEL_METADATA).map(([code, meta]) => ({ code, name: meta.name }));
    
    // Crear un mapa para evitar duplicados (priorizar BD)
    const modelsMap = new Map<string, { code: string; name: string }>();
    staticModels.forEach(m => modelsMap.set(m.code, m));
    dbModels.forEach(m => modelsMap.set(m.code, m));
    
    return Array.from(modelsMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [taxModelsData]);

  const assigneeOptions = useMemo(() => {
    const data = byAssignee.data ?? [];
    return data
      .filter((a: any) => a.assigneeId || a.assigneeName)
      .map((a: any) => ({ id: a.assigneeId ?? 'none', name: a.assigneeName ?? 'Sin asignar' }));
  }, [byAssignee.data]);

  // Reports page uses the shared TaxesNav for internal navigation

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('year', String(filters.year));
    if (filters.model) params.set('model', filters.model);
    if (filters.status) params.set('status', filters.status);
    if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
    return `/api/tax/reports/export?${params.toString()}`;
  }, [filters]);

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Reportes de Impuestos</h1>
        <p className="text-muted-foreground mt-1">Analiza el avance y los riesgos fiscales</p>
      </div>

      <TaxesNav />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Define el alcance del informe</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Año</span>
            <Input
              className="w-24 h-9"
              type="number"
              min={2000}
              value={filters.year}
              onChange={(e) => setFilters((f) => ({ ...f, year: Number(e.target.value) }))}
            />
          </div>
          <Select
            value={filters.model ?? 'ALL'}
            onValueChange={(v) => setFilters((f) => ({ ...f, model: v === 'ALL' ? undefined : v }))}
          >
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {modelsList.map((m) => (
                <SelectItem key={m.code} value={m.code}>
                  {m.code} · {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? 'ALL'}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v === 'ALL' ? undefined : v }))}
          >
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">Calculado</SelectItem>
              <SelectItem value="PRESENTED">Presentado</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.assigneeId ?? 'ALL'}
            onValueChange={(v) => setFilters((f) => ({ ...f, assigneeId: v === 'ALL' ? undefined : v }))}
          >
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="Gestor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los gestores</SelectItem>
              {assigneeOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => setFilters({ year: currentYear })}>
              Limpiar
            </Button>
            <Button variant="outline" onClick={() => window.open(exportUrl, '_blank')}>
              📄 CSV
            </Button>
            <Button variant="default" onClick={() => {
              const params = new URLSearchParams();
              params.set('year', String(filters.year));
              if (filters.model) params.set('model', filters.model);
              if (filters.status) params.set('status', filters.status);
              if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
              window.open(`/api/tax/reports/export-excel?${params.toString()}`, '_blank');
            }}>
              📊 Excel Avanzado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs principales */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
                <div className="text-3xl font-display font-bold">{kpis.data?.pending ?? 0}</div>
              </div>
              <div className="text-red-500 text-4xl">⏳</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Calculados</div>
                <div className="text-3xl font-display font-bold">{kpis.data?.inProgress ?? 0}</div>
              </div>
              <div className="text-amber-500 text-4xl">⚙️</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Presentados</div>
                <div className="text-3xl font-display font-bold">{kpis.data?.presented ?? 0}</div>
              </div>
              <div className="text-emerald-500 text-4xl">✅</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-3xl font-display font-bold">{kpis.data?.total ?? 0}</div>
              </div>
              <div className="text-slate-500 text-4xl">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs de rendimiento */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi title="% Completado" value={`${kpis.data?.completionRate ?? 0}%`} color="bg-blue-50" subtitle={`${kpis.data?.workload ?? 0} en curso`} />
        <Kpi title="Score de Eficiencia" value={`${kpis.data?.efficiencyScore ?? 0}%`} color="bg-purple-50" subtitle="Calidad global" />
        <Kpi title="Cumplimiento" value={`${kpis.data?.onTimePct ?? 0}%`} color="bg-green-50" subtitle={`${kpis.data?.onTimeFilings ?? 0} a tiempo`} />
        <Kpi title="Lead Time" value={`${kpis.data?.leadTimeAvg ?? 0}d`} color="bg-indigo-50" subtitle="Tiempo medio" />
        <Kpi title="Procesamiento" value={`${kpis.data?.processingTimeAvg ?? 0}d`} color="bg-cyan-50" subtitle="Tiempo medio" />
        <Kpi title="Atrasadas" value={kpis.data?.lateFilings ?? 0} color="bg-orange-50" subtitle="Fuera de plazo" />
      </div>

      {/* Alertas críticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-rose-50 border-rose-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-rose-700">🚨 Atrasados</div>
                <div className="text-2xl font-bold text-rose-900">{kpis.data?.overdue ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-orange-700">⚠️ Vencen en ≤3 días</div>
                <div className="text-2xl font-bold text-orange-900">{kpis.data?.dueIn3 ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-amber-700">⏰ Vencen en ≤7 días</div>
                <div className="text-2xl font-bold text-amber-900">{kpis.data?.dueIn7 ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChartsPanel filters={filters} />

      <GoalsPanel filters={filters} />

      <PredictionsPanel filters={filters} />

      <ProductivityPanel filters={filters} />

      <ComparisonPanel currentYear={currentYear} filters={{ model: filters.model, assigneeId: filters.assigneeId }} />

      <TemporalPerformancePanel filters={filters} />

      <div className="grid gap-4 xl:grid-cols-3">
        <TopClientsCard data={summaryClients.data ?? []} isLoading={summaryClients.isLoading} />
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Desglose por modelo</CardTitle>
            <CardDescription>Seguimiento del estado por modelo AEAT</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(summaryModel.data ?? []).length === 0 ? (
              <div className="rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground">
                Sin datos para los filtros seleccionados
              </div>
            ) : (
              (summaryModel.data ?? []).map((model: any) => (
                <div key={model.modelCode} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <div className="font-medium text-foreground">{model.modelCode}</div>
                    <div className="text-xs text-muted-foreground">Total {model.total}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge className="bg-red-100 text-red-700">P {model.pending}</Badge>
                    <Badge className="bg-amber-100 text-amber-700">C {model.inProgress}</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700">PR {model.presented}</Badge>
                    <Badge className="bg-orange-100 text-orange-700">AT {model.overdue}</Badge>
                    <span className="text-muted-foreground">Avance {model.advancePct}%</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AlertsPanel data={exceptions.data} isLoading={exceptions.isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Detalle de presentaciones</CardTitle>
          <CardDescription>Listado paginado de declaraciones</CardDescription>
        </CardHeader>
        <CardContent>
          <DetailTable filters={filters} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ title, value, color, subtitle }: { title: string; value: any; color: string; subtitle?: string }) {
  return (
    <Card className={`${color}`}>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-2xl font-display font-bold">{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

function TopClientsCard({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes prioritarios</CardTitle>
        <CardDescription>Clientes con más modelos activos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {isLoading ? (
          <div>Cargando…</div>
        ) : data.length === 0 ? (
          <div className="rounded-md border border-dashed px-3 py-4 text-center text-muted-foreground">
            Sin clientes en los filtros actuales
          </div>
        ) : (
          data
            .slice()
            .sort((a: any, b: any) => (b.overdue ?? 0) - (a.overdue ?? 0) || b.modelsActive - a.modelsActive)
            .slice(0, 6)
            .map((client: any) => (
              <div key={client.clientId} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="font-medium text-foreground">{client.clientName}</div>
                  <div className="text-xs text-muted-foreground">
                    {client.modelsActive} modelo(s) · avance {Math.round(client.advancePct ?? 0)}%
                  </div>
                </div>
                <Badge className={client.overdue ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-700'}>
                  {client.overdue ?? 0} atrasos
                </Badge>
              </div>
            ))
        )}
      </CardContent>
    </Card>
  );
}
