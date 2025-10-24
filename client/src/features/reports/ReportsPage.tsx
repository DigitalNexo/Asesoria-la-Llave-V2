import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useKpis, useSummaryModel, useTrends, useSummaryAssignee } from './useReportsApi';
import DetailTable from './DetailTable';
import { TAX_MODEL_METADATA } from '@shared/tax-rules';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanSquare, FileText, BarChart2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<{ year: number; model?: string; status?: string }>({ year: currentYear });

  useEffect(() => {
    const saved = localStorage.getItem('reports.filters');
    if (saved) {
      try { setFilters(JSON.parse(saved)); } catch {}
    }
  }, []);
  useEffect(() => { localStorage.setItem('reports.filters', JSON.stringify(filters)); }, [filters]);

  const kpis = useKpis(filters);
  const summary = useSummaryModel(filters);
  const trends = useTrends({ year: filters.year, model: filters.model, granularity: 'month' });
  const byAssignee = useSummaryAssignee(filters);

  const modelsList = useMemo(() => Object.entries(TAX_MODEL_METADATA).map(([code, meta]) => ({ code, name: meta.name })), []);

  const [location, navigate] = useLocation();
  const currentTab = location?.startsWith('/impuestos/calendario') ? 'calendar' : location?.startsWith('/impuestos/control') ? 'control' : 'reports';

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Reportes de Impuestos</h1>
        <p className="text-muted-foreground mt-1">Resumen analítico y operativo</p>
      </div>

      <Tabs value={currentTab} className="">
        <TabsList className="h-auto grid grid-cols-3 gap-1 p-1">
          <TabsTrigger value="control" onClick={() => navigate('/impuestos/control')}>
            <KanbanSquare className="h-4 w-4 mr-2" /> Control de impuestos
          </TabsTrigger>
          <TabsTrigger value="calendar" onClick={() => navigate('/impuestos/calendario')}>
            <FileText className="h-4 w-4 mr-2" /> Calendario fiscal
          </TabsTrigger>
          <TabsTrigger value="reports" onClick={() => navigate('/impuestos/reportes')}>
            <BarChart2 className="h-4 w-4 mr-2" /> Reportes
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
          <CardDescription>Define el alcance del informe</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Año</span>
            <Input className="w-24 h-9" type="number" value={filters.year} onChange={(e)=> setFilters((f)=>({ ...f, year: Number(e.target.value) }))} />
          </div>
          <Select value={filters.model ?? 'ALL'} onValueChange={(v)=> setFilters((f)=>({ ...f, model: v === 'ALL' ? undefined : v }))}>
            <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Modelo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {modelsList.map((m) => (<SelectItem key={m.code} value={m.code}>{m.code} · {m.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filters.status ?? 'ALL'} onValueChange={(v)=> setFilters((f)=>({ ...f, status: v === 'ALL' ? undefined : v }))}>
            <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">Calculado</SelectItem>
              <SelectItem value="PRESENTED">Presentado</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={()=>{ /* ya refetchan por estado del key */ }}>Aplicar</Button>
            <Button variant="outline" onClick={()=> setFilters({ year: currentYear })}>Limpiar</Button>
            <Button variant="outline" onClick={()=> window.open(`/api/tax/reports/export?year=${filters.year}&model=${filters.model??''}&status=${filters.status??''}`, '_blank') }>Exportar</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi title="Pendientes" value={kpis.data?.pending ?? 0} color="bg-red-50" />
        <Kpi title="Calculados" value={kpis.data?.inProgress ?? 0} color="bg-amber-50" />
        <Kpi title="Presentados" value={kpis.data?.presented ?? 0} color="bg-emerald-50" />
        <Kpi title="% Avance" value={`${kpis.data?.advancePct ?? 0}%`} color="bg-blue-50" />
        <Kpi title="Lead Time Medio" value={`${kpis.data?.leadTimeAvg ?? 0} d`} color="bg-purple-50" />
        <Kpi title="Vencen ≤3 días" value={kpis.data?.dueIn3 ?? 0} color="bg-orange-50" />
      </div>

      {/* Contenido */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Resumen por modelo</CardTitle>
          </CardHeader>
          <CardContent>
            {(summary.data ?? []).map((s: any) => (
              <div key={s.modelCode} className="flex items-center justify-between py-1 border-b text-sm">
                <div className="font-medium">{s.modelCode}</div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-100 text-red-700">P {s.pending}</Badge>
                  <Badge className="bg-amber-100 text-amber-700">C {s.inProgress}</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">PR {s.presented}</Badge>
                  <span className="text-muted-foreground">Avance {s.advancePct}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tendencia mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {(trends.data?.series ?? []).map((p: any) => (
                <div key={p.x} className="flex items-center justify-between py-1 border-b">
                  <span>{p.x}</span>
                  <span>{p.presented} presentados · LT {p.leadTimeAvg}d</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Ranking gestores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {(byAssignee.data ?? []).map((a: any) => (
                <div key={a.assigneeId ?? 'none'} className="flex items-center justify-between py-1 border-b">
                  <span>{a.assigneeName}</span>
                  <span>{a.advancePct}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Detalle de presentaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailTable filters={filters} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ title, value, color }: { title: string; value: any; color: string }) {
  return (
    <Card className={`${color}`}>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{title}</div>
        <div className="text-2xl font-display font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
