import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useYearComparison, ReportsFilters } from './useReportsApi';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function ComparisonPanel({ currentYear, filters }: { currentYear: number; filters: Omit<ReportsFilters, 'year'> }) {
  const [year1, setYear1] = useState(currentYear - 1);
  const [year2, setYear2] = useState(currentYear);

  const { data, isLoading } = useYearComparison(year1, year2, filters);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativa Temporal</CardTitle>
          <CardDescription>Análisis año contra año</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Cargando comparativa...</div>
        </CardContent>
      </Card>
    );
  }

  const comparison = data?.comparison ?? {};
  const y1Data = data?.year1 ?? {};
  const y2Data = data?.year2 ?? {};

  const MetricComparison = ({ label, value1, value2, change, changePct, format = '' }: any) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const isNeutral = change === 0;

    // Para algunas métricas, negativo es bueno (ej: leadTime, overdue)
    const reverseLogic = label.includes('Lead') || label.includes('Atrasados');
    const isGood = reverseLogic ? isNegative : isPositive;
    const isBad = reverseLogic ? isPositive : isNegative;

    return (
      <div className="rounded-lg border p-4 bg-white">
        <div className="text-sm text-muted-foreground mb-2">{label}</div>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{year1}</div>
            <div className="text-2xl font-bold text-slate-700">{value1}{format}</div>
          </div>
          <div className="flex items-center">
            {isNeutral ? (
              <Minus className="h-5 w-5 text-slate-400" />
            ) : isGood ? (
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-rose-500" />
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{year2}</div>
            <div className="text-2xl font-bold text-slate-900">{value2}{format}</div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t">
          <Badge className={`text-xs ${
            isNeutral ? 'bg-slate-100 text-slate-700' :
            isGood ? 'bg-emerald-100 text-emerald-700' :
            'bg-rose-100 text-rose-700'
          }`}>
            {isPositive && '+'}{change}{format} ({isPositive && '+'}{changePct}%)
          </Badge>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativa Temporal</CardTitle>
        <CardDescription>Análisis año contra año de rendimiento</CardDescription>
        <div className="flex items-center gap-2 mt-4">
          <Select value={String(year1)} onValueChange={(v) => setYear1(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">vs</span>
          <Select value={String(year2)} onValueChange={(v) => setYear2(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <MetricComparison
            label="Total de declaraciones"
            value1={y1Data.total}
            value2={y2Data.total}
            change={comparison.totalChange}
            changePct={comparison.totalChangePct}
          />
          <MetricComparison
            label="Presentadas"
            value1={y1Data.presented}
            value2={y2Data.presented}
            change={comparison.presentedChange}
            changePct={comparison.presentedChangePct}
          />
          <MetricComparison
            label="Eficiencia"
            value1={y1Data.efficiencyScore}
            value2={y2Data.efficiencyScore}
            change={comparison.efficiencyChange}
            changePct={0}
            format="%"
          />
          <MetricComparison
            label="Lead Time promedio"
            value1={y1Data.leadTimeAvg}
            value2={y2Data.leadTimeAvg}
            change={comparison.leadTimeChange}
            changePct={0}
            format="d"
          />
          <MetricComparison
            label="Cumplimiento (a tiempo)"
            value1={y1Data.onTimePct}
            value2={y2Data.onTimePct}
            change={comparison.onTimeChange}
            changePct={0}
            format="%"
          />
          <MetricComparison
            label="Atrasados"
            value1={y1Data.overdue}
            value2={y2Data.overdue}
            change={y2Data.overdue - y1Data.overdue}
            changePct={0}
          />
        </div>

        {/* Resumen */}
        <div className="rounded-lg bg-slate-50 p-4 border">
          <div className="text-sm font-medium mb-2">📊 Resumen de cambios</div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              {comparison.totalChangePct > 0 ? '📈' : comparison.totalChangePct < 0 ? '📉' : '➡️'}
              {' '}Volumen de trabajo: {comparison.totalChangePct > 0 ? 'incrementó' : comparison.totalChangePct < 0 ? 'disminuyó' : 'se mantuvo'} {Math.abs(comparison.totalChangePct)}%
            </div>
            <div>
              {comparison.efficiencyChange > 0 ? '✅' : comparison.efficiencyChange < 0 ? '⚠️' : '➡️'}
              {' '}Eficiencia: {comparison.efficiencyChange > 0 ? 'mejoró' : comparison.efficiencyChange < 0 ? 'empeoró' : 'se mantuvo'} {Math.abs(comparison.efficiencyChange).toFixed(1)} puntos
            </div>
            <div>
              {comparison.leadTimeChange < 0 ? '⚡' : comparison.leadTimeChange > 0 ? '🐌' : '➡️'}
              {' '}Lead time: {comparison.leadTimeChange < 0 ? 'mejoró' : comparison.leadTimeChange > 0 ? 'empeoró' : 'se mantuvo'} ({Math.abs(comparison.leadTimeChange).toFixed(1)} días)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
