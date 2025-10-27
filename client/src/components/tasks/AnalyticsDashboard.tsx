import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import type { Task, User } from "@shared/schema";

interface ExtendedTask extends Task {
  assignedUser?: User;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  averageCompletionTime: number;
  tasksByPriority: Record<string, number>;
  tasksByUser: Record<string, number>;
  completionRate: number;
}

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

export function AnalyticsDashboard() {
  const { data: tasks, isLoading } = useQuery<ExtendedTask[]>({
    queryKey: ["/api/tasks"],
  });

  // Calculate statistics
  const stats: TaskStats = tasks
    ? {
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.estado === "COMPLETADA").length,
        pendingTasks: tasks.filter((t) => t.estado === "PENDIENTE").length,
        inProgressTasks: tasks.filter((t) => t.estado === "EN_PROGRESO").length,
        overdueTasks: tasks.filter(
          (t) =>
            t.fechaVencimiento &&
            new Date(t.fechaVencimiento) < new Date() &&
            t.estado !== "COMPLETADA"
        ).length,
        averageCompletionTime: 0, // Would need time tracking data
        tasksByPriority: {
          BAJA: tasks.filter((t) => t.prioridad === "BAJA").length,
          MEDIA: tasks.filter((t) => t.prioridad === "MEDIA").length,
          ALTA: tasks.filter((t) => t.prioridad === "ALTA").length,
        },
        tasksByUser: tasks.reduce(
          (acc, task) => {
            const username = task.assignedUser?.username || "Sin asignar";
            acc[username] = (acc[username] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
        completionRate:
          tasks.length > 0
            ? Math.round((tasks.filter((t) => t.estado === "COMPLETADA").length / tasks.length) * 100)
            : 0,
      }
    : {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
        averageCompletionTime: 0,
        tasksByPriority: {},
        tasksByUser: {},
        completionRate: 0,
      };

  // Prepare chart data
  const statusData = [
    {
      name: "Pendiente",
      value: stats.pendingTasks,
      color: "#64748b",
    },
    {
      name: "En Progreso",
      value: stats.inProgressTasks,
      color: "#3b82f6",
    },
    {
      name: "Completada",
      value: stats.completedTasks,
      color: "#10b981",
    },
  ];

  const priorityData = [
    {
      name: "Baja",
      value: stats.tasksByPriority.BAJA || 0,
    },
    {
      name: "Media",
      value: stats.tasksByPriority.MEDIA || 0,
    },
    {
      name: "Alta",
      value: stats.tasksByPriority.ALTA || 0,
    },
  ];

  const userTasksData = Object.entries(stats.tasksByUser)
    .map(([username, count]) => ({
      name: username.length > 10 ? username.substring(0, 10) + "..." : username,
      fullName: username,
      tasks: count,
    }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Total de Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats.completedTasks}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.completionRate}% completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {stats.inProgressTasks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-600">
              {stats.pendingTasks}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Vencidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats.overdueTasks}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks by Status - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tareas por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: ${value}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by Priority - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tareas por Prioridad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={priorityData}
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Users - Bar Chart */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Top 5 Usuarios por Tareas Asignadas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={userTasksData}
                margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis />
                <Tooltip 
                  content={({ payload }) => {
                    if (payload && payload[0]) {
                      return (
                        <div className="bg-white p-2 border rounded shadow-lg">
                          <p className="text-sm font-medium">{payload[0].payload.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Tareas: {payload[0].value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="tasks" fill="#10b981" name="Tareas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Completion Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribución de Tareas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Pendientes</p>
              <div className="text-3xl font-bold text-slate-600">
                {stats.pendingTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalTasks > 0
                  ? Math.round((stats.pendingTasks / stats.totalTasks) * 100)
                  : 0}
                %
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">En Progreso</p>
              <div className="text-3xl font-bold text-blue-600">
                {stats.inProgressTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.totalTasks > 0
                  ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100)
                  : 0}
                %
              </p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Completadas</p>
              <div className="text-3xl font-bold text-green-600">
                {stats.completedTasks}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.completionRate}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de Estado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: "Completadas a tiempo",
                value: stats.completedTasks - Math.max(0, stats.overdueTasks),
                color: "bg-green-500",
              },
              {
                label: "En progreso",
                value: stats.inProgressTasks,
                color: "bg-blue-500",
              },
              {
                label: "Pendientes",
                value: stats.pendingTasks,
                color: "bg-slate-500",
              },
              {
                label: "Vencidas",
                value: stats.overdueTasks,
                color: "bg-red-500",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <Badge variant="outline">{item.value}</Badge>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div
                    className={`${item.color} h-full transition-all`}
                    style={{
                      width: `${
                        stats.totalTasks > 0
                          ? Math.round((item.value / stats.totalTasks) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
