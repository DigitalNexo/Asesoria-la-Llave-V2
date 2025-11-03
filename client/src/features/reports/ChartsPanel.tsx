import { useMemo, useState } from 'react';
import { useSummaryModel, useTrends, useSummaryAssignee, ReportsFilters } from './useReportsApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell
} from 'recharts';

export default function ChartsPanel({ filters }: { filters: ReportsFilters }) {
  const models = useSummaryModel(filters);
  const trends = useTrends({ year: filters.year, model: filters.model, granularity: 'month' });
  const assignees = useSummaryAssignee(filters);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedGestor, setSelectedGestor] = useState<string | null>(null);

  const stackedData = useMemo(()=> (models.data ?? []).map((m:any)=> ({
    model: m.modelCode,
    pendiente: m.pending,
    calculado: m.inProgress,
    presentado: m.presented,
    total: m.total,
  })), [models.data]);

  const trendData = useMemo(()=> (trends.data?.series ?? []).map((p:any)=> ({
    x: p.x,
    presentados: p.presented,
    lead: p.leadTimeAvg,
  })), [trends.data]);

  const rankingData = useMemo(()=> (assignees.data ?? []).map((a:any)=> ({
    name: a.assigneeName,
    avance: a.advancePct,
    total: a.assigned,
    completed: a.presented,
  })).sort((a:any,b:any)=> b.avance - a.avance), [assignees.data]);

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}: {entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Progreso por modelo (Interactivo)</CardTitle>
          <CardDescription>Haz clic en una barra para ver detalles</CardDescription>
          {selectedModel && (
            <Badge className="mt-2" onClick={() => setSelectedModel(null)}>
              Filtrando: {selectedModel} ✕
            </Badge>
          )}
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stackedData}
              onClick={(data) => {
                if (data && data.activeLabel) {
                  setSelectedModel(data.activeLabel === selectedModel ? null : data.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="pendiente" stackId="a" fill="#EF4444" name="Pendientes" cursor="pointer">
                {stackedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} opacity={selectedModel === null || selectedModel === entry.model ? 1 : 0.3} />
                ))}
              </Bar>
              <Bar dataKey="calculado" stackId="a" fill="#EAB308" name="Calculados" cursor="pointer">
                {stackedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} opacity={selectedModel === null || selectedModel === entry.model ? 1 : 0.3} />
                ))}
              </Bar>
              <Bar dataKey="presentado" stackId="a" fill="#22C55E" name="Presentados" cursor="pointer">
                {stackedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} opacity={selectedModel === null || selectedModel === entry.model ? 1 : 0.3} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {selectedModel && (
            <div className="mt-3 p-3 bg-blue-50 rounded-md text-sm">
              <div className="font-semibold mb-1">📊 Detalle de {selectedModel}</div>
              {stackedData.filter(d => d.model === selectedModel).map((data) => (
                <div key={data.model} className="grid grid-cols-4 gap-2 text-xs">
                  <div>Total: <strong>{data.total}</strong></div>
                  <div>Presentados: <strong className="text-emerald-600">{data.presentado}</strong></div>
                  <div>Calculados: <strong className="text-amber-600">{data.calculado}</strong></div>
                  <div>Pendientes: <strong className="text-rose-600">{data.pendiente}</strong></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Tendencia mensual</CardTitle>
          <CardDescription>Presentaciones y lead time</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" angle={-45} textAnchor="end" height={60} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="presentados" stroke="#2563EB" yAxisId="left" strokeWidth={2} dot={{ r: 4 }} name="Presentadas" />
              <Line type="monotone" dataKey="lead" stroke="#9333EA" yAxisId="right" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="5 5" name="Lead Time (días)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Ranking de gestores (Interactivo)</CardTitle>
          <CardDescription>Haz clic en una barra para destacar un gestor</CardDescription>
          {selectedGestor && (
            <Badge className="mt-2" onClick={() => setSelectedGestor(null)}>
              Filtrando: {selectedGestor} ✕
            </Badge>
          )}
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rankingData}
              layout="vertical"
              onClick={(data) => {
                if (data && data.activeLabel) {
                  setSelectedGestor(data.activeLabel === selectedGestor ? null : data.activeLabel);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0,100]} />
              <YAxis type="category" dataKey="name" width={150} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avance" name="% Avance" cursor="pointer">
                {rankingData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={selectedGestor === null || selectedGestor === entry.name ? 1 : 0.3}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {selectedGestor && (
            <div className="mt-3 p-3 bg-purple-50 rounded-md text-sm">
              <div className="font-semibold mb-1">👤 Detalle de {selectedGestor}</div>
              {rankingData.filter(d => d.name === selectedGestor).map((data) => (
                <div key={data.name} className="grid grid-cols-3 gap-2 text-xs">
                  <div>Total asignado: <strong>{data.total}</strong></div>
                  <div>Completadas: <strong className="text-emerald-600">{data.completed}</strong></div>
                  <div>% Avance: <strong className="text-blue-600">{data.avance.toFixed(1)}%</strong></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

