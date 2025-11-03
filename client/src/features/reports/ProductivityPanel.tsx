import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductivityAnalysis, ReportsFilters } from './useReportsApi';
import { Progress } from '@/components/ui/progress';

export default function ProductivityPanel({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useProductivityAnalysis(filters);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Productividad por Gestor</CardTitle>
          <CardDescription>Rendimiento individual y métricas de eficiencia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Cargando análisis...</div>
        </CardContent>
      </Card>
    );
  }

  const gestores = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análisis de Productividad por Gestor</CardTitle>
        <CardDescription>Rendimiento individual y métricas de eficiencia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {gestores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            Sin datos para mostrar
          </div>
        ) : (
          gestores.map((gestor: any) => (
            <div key={gestor.gestorId ?? 'none'} className="rounded-lg border p-4 space-y-3 bg-white hover:shadow-sm transition-shadow">
              {/* Header con nombre y score */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-base">{gestor.gestorName}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {gestor.total} declaraciones asignadas
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    gestor.efficiencyScore >= 80 ? 'text-emerald-600' :
                    gestor.efficiencyScore >= 60 ? 'text-amber-600' :
                    'text-rose-600'
                  }`}>
                    {gestor.efficiencyScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Score eficiencia</div>
                </div>
              </div>

              {/* Métricas en grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Completadas</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-emerald-600">{gestor.completed}</span>
                    <span className="text-xs text-muted-foreground">/ {gestor.total}</span>
                  </div>
                  <Progress value={gestor.completionRate} className="h-1" />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">A tiempo</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-blue-600">{gestor.onTime}</span>
                    <span className="text-xs text-muted-foreground">({gestor.onTimeRate}%)</span>
                  </div>
                  <Progress value={gestor.onTimeRate} className="h-1" />
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">En progreso</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-amber-600">{gestor.inProgress}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Pendientes</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-slate-600">{gestor.pending}</span>
                  </div>
                </div>
              </div>

              {/* Tiempos y alertas */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Badge variant="outline" className="text-xs">
                  ⏱️ Proc: {gestor.avgProcessingTime}d
                </Badge>
                <Badge variant="outline" className="text-xs">
                  📅 Lead: {gestor.avgLeadTime}d
                </Badge>
                {gestor.overdue > 0 && (
                  <Badge className="bg-rose-100 text-rose-700 text-xs">
                    🚨 {gestor.overdue} atrasadas
                  </Badge>
                )}
                {gestor.late > 0 && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs">
                    ⚠️ {gestor.late} tarde
                  </Badge>
                )}
                {gestor.workloadScore > 10 && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    📊 Carga: {gestor.workloadScore}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
