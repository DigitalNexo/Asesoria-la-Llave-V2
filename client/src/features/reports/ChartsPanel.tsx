import { useMemo } from 'react';
import { useSummaryModel, useTrends, useSummaryAssignee, ReportsFilters } from './useReportsApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line, CartesianGrid
} from 'recharts';

export default function ChartsPanel({ filters }: { filters: ReportsFilters }) {
  const models = useSummaryModel(filters);
  const trends = useTrends({ year: filters.year, model: filters.model, granularity: 'month' });
  const assignees = useSummaryAssignee(filters);

  const stackedData = useMemo(()=> (models.data ?? []).map((m:any)=> ({
    model: m.modelCode,
    pendiente: m.pending,
    calculado: m.inProgress,
    presentado: m.presented,
  })), [models.data]);

  const trendData = useMemo(()=> (trends.data?.series ?? []).map((p:any)=> ({
    x: p.x,
    presentados: p.presented,
    lead: p.leadTimeAvg,
  })), [trends.data]);

  const rankingData = useMemo(()=> (assignees.data ?? []).map((a:any)=> ({
    name: a.assigneeName,
    avance: a.advancePct,
  })).sort((a:any,b:any)=> b.avance - a.avance), [assignees.data]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader><CardTitle>Progreso por modelo</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pendiente" stackId="a" fill="#EF4444" />
              <Bar dataKey="calculado" stackId="a" fill="#EAB308" />
              <Bar dataKey="presentado" stackId="a" fill="#22C55E" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Tendencia mensual</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="presentados" stroke="#2563EB" yAxisId="left" />
              <Line type="monotone" dataKey="lead" stroke="#9333EA" yAxisId="right" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader><CardTitle>Ranking de gestores (% avance)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rankingData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0,100]} />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip />
              <Bar dataKey="avance" fill="#0EA5E9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

