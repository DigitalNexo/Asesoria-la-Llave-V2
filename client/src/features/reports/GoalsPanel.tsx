import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { ReportsFilters } from './useReportsApi';
import { Target, TrendingUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

function useGoals(filters: ReportsFilters) {
  return useQuery({
    queryKey: ['/api/tax/reports/goals', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.year) params.set('year', String(filters.year));
      if (filters.model) params.set('model', filters.model);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      const res = await fetch(`/api/tax/reports/goals?${params.toString()}`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('No se pudieron cargar las metas');
      return res.json();
    },
    staleTime: 30_000,
  });
}

export default function GoalsPanel({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useGoals(filters);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Metas y Objetivos
          </CardTitle>
          <CardDescription>Seguimiento de objetivos del periodo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Cargando metas...</div>
        </CardContent>
      </Card>
    );
  }

  const goals = data ?? [];
  const achieved = goals.filter((g: any) => g.achieved).length;
  const total = goals.length;
  const achievementRate = total > 0 ? (achieved / total) * 100 : 0;

  const statusConfig = {
    achieved: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: 'Lograda' },
    'on-track': { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', label: 'En camino' },
    'at-risk': { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'En riesgo' },
    'off-track': { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-700', label: 'Fuera de meta' },
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      efficiency: 'Eficiencia',
      completion: 'Completitud',
      onTime: 'Cumplimiento',
      leadTime: 'Lead Time',
      volume: 'Volumen',
    };
    return labels[type] || type;
  };

  const getUnit = (type: string) => {
    const units: Record<string, string> = {
      efficiency: '%',
      completion: '%',
      onTime: '%',
      leadTime: 'd',
      volume: '',
    };
    return units[type] || '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas y Objetivos
            </CardTitle>
            <CardDescription>Seguimiento de objetivos del periodo</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{achieved}/{total}</div>
            <div className="text-xs text-muted-foreground">Metas logradas</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de logro general */}
        <div className="rounded-lg border p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Logro General</span>
            <span className="text-2xl font-bold text-blue-600">{achievementRate.toFixed(0)}%</span>
          </div>
          <Progress value={achievementRate} className="h-3" />
        </div>

        {/* Lista de metas */}
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            No hay metas definidas para este periodo
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal: any, idx: number) => {
              const config = statusConfig[goal.status as keyof typeof statusConfig] || statusConfig['off-track'];
              const StatusIcon = config.icon;
              const isLeadTime = goal.type === 'leadTime';

              return (
                <div key={idx} className={`rounded-lg border p-4 ${config.bg} transition-all hover:shadow-sm`}>
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <StatusIcon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div>
                        <div className="font-semibold text-foreground">
                          {getTypeLabel(goal.type)}
                        </div>
                        {goal.description && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {goal.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge className={config.badge}>
                      {config.label}
                    </Badge>
                  </div>

                  {/* Métricas */}
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Actual</div>
                      <div className="text-lg font-bold">
                        {goal.currentValue}{getUnit(goal.type)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Meta</div>
                      <div className="text-lg font-bold">
                        {isLeadTime ? '≤' : '≥'} {goal.targetValue}{getUnit(goal.type)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Progreso</div>
                      <div className="text-lg font-bold">
                        {goal.progress}%
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <Progress value={goal.progress} className="h-2" />

                  {/* Análisis */}
                  <div className="mt-3 text-xs text-muted-foreground">
                    {goal.achieved ? (
                      <span className="text-emerald-700 font-medium">✓ Meta alcanzada exitosamente</span>
                    ) : goal.status === 'on-track' ? (
                      <span className="text-blue-700 font-medium">
                        → Vas bien, faltan {isLeadTime
                          ? `${(goal.currentValue - goal.targetValue).toFixed(1)}${getUnit(goal.type)} por reducir`
                          : `${(goal.targetValue - goal.currentValue).toFixed(1)}${getUnit(goal.type)} para alcanzar la meta`}
                      </span>
                    ) : goal.status === 'at-risk' ? (
                      <span className="text-amber-700 font-medium">
                        ⚠ Requiere atención para alcanzar la meta
                      </span>
                    ) : (
                      <span className="text-rose-700 font-medium">
                        ✗ Lejos de la meta, se requiere acción correctiva
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resumen */}
        {goals.length > 0 && (
          <div className="grid grid-cols-4 gap-2 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {goals.filter((g: any) => g.status === 'achieved').length}
              </div>
              <div className="text-xs text-muted-foreground">Logradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {goals.filter((g: any) => g.status === 'on-track').length}
              </div>
              <div className="text-xs text-muted-foreground">En camino</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {goals.filter((g: any) => g.status === 'at-risk').length}
              </div>
              <div className="text-xs text-muted-foreground">En riesgo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-rose-600">
                {goals.filter((g: any) => g.status === 'off-track').length}
              </div>
              <div className="text-xs text-muted-foreground">Fuera meta</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
