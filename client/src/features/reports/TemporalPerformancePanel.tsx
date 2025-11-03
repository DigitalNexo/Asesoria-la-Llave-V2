import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useTemporalPerformance, ReportsFilters } from './useReportsApi';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';

export default function TemporalPerformancePanel({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = useTemporalPerformance(filters);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Temporal</CardTitle>
          <CardDescription>Evolución mensual de métricas clave</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Cargando datos temporales...</div>
        </CardContent>
      </Card>
    );
  }

  const series = data?.series ?? [];

  if (series.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Temporal</CardTitle>
          <CardDescription>Evolución mensual de métricas clave</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            No hay suficientes datos para mostrar tendencias
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular estadísticas
  const avgPresented = series.reduce((sum, s) => sum + s.presented, 0) / series.length;
  const avgOnTimeRate = series.reduce((sum, s) => sum + s.onTimeRate, 0) / series.length;
  const avgLeadTime = series.reduce((sum, s) => sum + s.avgLeadTime, 0) / series.length;

  const lastMonth = series[series.length - 1];
  const prevMonth = series[series.length - 2];

  const presentedTrend = prevMonth ? ((lastMonth.presented - prevMonth.presented) / prevMonth.presented * 100).toFixed(1) : 0;
  const onTimeTrend = prevMonth ? (lastMonth.onTimeRate - prevMonth.onTimeRate).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento Temporal</CardTitle>
        <CardDescription>Evolución mensual de métricas clave</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estadísticas de resumen */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border bg-blue-50 p-4">
            <div className="text-xs text-muted-foreground">Promedio mensual</div>
            <div className="text-2xl font-bold text-blue-700">{avgPresented.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground mt-1">declaraciones</div>
          </div>
          <div className="rounded-lg border bg-emerald-50 p-4">
            <div className="text-xs text-muted-foreground">Cumplimiento promedio</div>
            <div className="text-2xl font-bold text-emerald-700">{avgOnTimeRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">entregas a tiempo</div>
          </div>
          <div className="rounded-lg border bg-purple-50 p-4">
            <div className="text-xs text-muted-foreground">Lead time promedio</div>
            <div className="text-2xl font-bold text-purple-700">{avgLeadTime.toFixed(1)}d</div>
            <div className="text-xs text-muted-foreground mt-1">días de ciclo</div>
          </div>
        </div>

        {/* Tendencias del último mes */}
        {prevMonth && (
          <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border text-sm">
            <div className="flex-1">
              <span className="font-medium">Último mes vs anterior:</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Presentadas:</span>
              <span className={`font-semibold ${Number(presentedTrend) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Number(presentedTrend) >= 0 ? '+' : ''}{presentedTrend}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Cumplimiento:</span>
              <span className={`font-semibold ${Number(onTimeTrend) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Number(onTimeTrend) >= 0 ? '+' : ''}{onTimeTrend}%
              </span>
            </div>
          </div>
        )}

        {/* Gráfico combinado */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="presented" fill="#3B82F6" name="Presentadas" />
              <Bar yAxisId="left" dataKey="onTime" fill="#10B981" name="A tiempo" stackId="status" />
              <Bar yAxisId="left" dataKey="late" fill="#F59E0B" name="Tarde" stackId="status" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgLeadTime"
                stroke="#9333EA"
                strokeWidth={2}
                name="Lead Time (días)"
                dot={{ r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="onTimeRate"
                stroke="#059669"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="% Cumplimiento"
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Análisis de tendencias */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="text-sm font-medium mb-2">📈 Mejor mes</div>
            {(() => {
              const best = series.reduce((max, s) => s.onTimeRate > max.onTimeRate ? s : max, series[0]);
              return (
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{best.month}</div>
                  <div>{best.presented} declaraciones</div>
                  <div className="text-emerald-600">{best.onTimeRate}% a tiempo</div>
                </div>
              );
            })()}
          </div>
          <div>
            <div className="text-sm font-medium mb-2">⚠️ Mes con más desafíos</div>
            {(() => {
              const worst = series.reduce((min, s) => s.onTimeRate < min.onTimeRate ? s : min, series[0]);
              return (
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">{worst.month}</div>
                  <div>{worst.presented} declaraciones</div>
                  <div className="text-amber-600">{worst.onTimeRate}% a tiempo</div>
                </div>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
