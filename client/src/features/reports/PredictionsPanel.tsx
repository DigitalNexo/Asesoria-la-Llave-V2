import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePredictions, ReportsFilters } from './useReportsApi';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function PredictionsPanel({ filters }: { filters: ReportsFilters }) {
  const { data, isLoading } = usePredictions(filters);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas Inteligentes y Predicciones</CardTitle>
          <CardDescription>Sistema de detección temprana de riesgos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Analizando riesgos...</div>
        </CardContent>
      </Card>
    );
  }

  const predictions = data ?? { atRiskCount: 0, criticalCount: 0, alerts: [], riskLevel: 'low' };

  const riskConfig = {
    high: {
      color: 'bg-rose-50 border-rose-200',
      textColor: 'text-rose-900',
      icon: AlertTriangle,
      label: 'Riesgo Alto',
      badgeClass: 'bg-rose-100 text-rose-700'
    },
    medium: {
      color: 'bg-amber-50 border-amber-200',
      textColor: 'text-amber-900',
      icon: AlertCircle,
      label: 'Riesgo Medio',
      badgeClass: 'bg-amber-100 text-amber-700'
    },
    low: {
      color: 'bg-emerald-50 border-emerald-200',
      textColor: 'text-emerald-900',
      icon: Info,
      label: 'Riesgo Bajo',
      badgeClass: 'bg-emerald-100 text-emerald-700'
    },
  };

  const config = riskConfig[predictions.riskLevel as keyof typeof riskConfig] || riskConfig.low;
  const RiskIcon = config.icon;

  return (
    <Card className={config.color}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RiskIcon className="h-5 w-5" />
              Alertas Inteligentes y Predicciones
            </CardTitle>
            <CardDescription>Sistema de detección temprana de riesgos</CardDescription>
          </div>
          <Badge className={config.badgeClass}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumen de riesgos */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-muted-foreground">Situaciones críticas</div>
            <div className="text-3xl font-bold text-rose-600 mt-1">{predictions.criticalCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm text-muted-foreground">En riesgo</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">{predictions.atRiskCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Necesitan seguimiento</div>
          </div>
        </div>

        {/* Lista de alertas */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Alertas detectadas</div>
          {predictions.alerts.length === 0 ? (
            <div className="rounded-md border border-dashed bg-white px-4 py-8 text-center text-sm text-muted-foreground">
              ✅ No se detectaron alertas críticas. Todo en orden.
            </div>
          ) : (
            <div className="space-y-2">
              {predictions.alerts.map((alert: any, idx: number) => (
                <Alert
                  key={idx}
                  className={`${
                    alert.type === 'critical'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.type === 'critical' ? '🚨' : '⚠️'}
                    </div>
                    <div className="flex-1">
                      <AlertDescription className="text-sm">
                        {alert.message}
                      </AlertDescription>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {alert.status}
                        </Badge>
                        {alert.daysRemaining !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {alert.daysRemaining >= 0
                              ? `${alert.daysRemaining} días restantes`
                              : `${Math.abs(alert.daysRemaining)} días de retraso`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Alert>
              ))}
              {predictions.alerts.length >= 10 && (
                <div className="text-xs text-center text-muted-foreground">
                  Mostrando las 10 alertas más críticas
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recomendaciones */}
        {predictions.riskLevel === 'high' && (
          <Alert className="bg-rose-50 border-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <AlertDescription className="text-sm text-rose-900">
              <strong>Acción requerida:</strong> Se detectaron múltiples situaciones críticas.
              Recomendamos priorizar las declaraciones con vencimiento inmediato y redistribuir
              la carga de trabajo si es necesario.
            </AlertDescription>
          </Alert>
        )}

        {predictions.riskLevel === 'medium' && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-sm text-amber-900">
              <strong>Seguimiento recomendado:</strong> Hay declaraciones que requieren atención.
              Mantén un seguimiento cercano para evitar retrasos.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
