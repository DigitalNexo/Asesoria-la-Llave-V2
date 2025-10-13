import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Lock, Clock, TrendingUp, CheckCircle2, LayoutList, LayoutGrid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import type { Task, Client, User } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Tareas() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    clienteId: "",
    asignadoA: "",
    prioridad: "MEDIA",
    estado: "PENDIENTE",
    visibilidad: "GENERAL",
    fechaVencimiento: "",
  });

  const { data: tasks, isLoading } = useQuery<(Task & { client?: Client; assignedUser?: User })[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Tarea creada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
  });

  const updateEstadoMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}`, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const visibleTasks = tasks?.filter((task) => {
    if (task.visibilidad === "GENERAL") return true;
    if (task.visibilidad === "PERSONAL") {
      return user?.role === "ADMIN" || task.asignadoA === user?.id;
    }
    return false;
  }) || [];

  const resetForm = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      clienteId: "",
      asignadoA: "",
      prioridad: "MEDIA",
      estado: "PENDIENTE",
      visibilidad: "GENERAL",
      fechaVencimiento: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getPrioridadBadge = (prioridad: string) => {
    const variants = {
      BAJA: "text-muted-foreground bg-muted",
      MEDIA: "text-chart-2 bg-chart-2/10",
      ALTA: "text-destructive bg-destructive/10",
    };
    return (
      <Badge variant="outline" className={variants[prioridad as keyof typeof variants]}>
        {prioridad}
      </Badge>
    );
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      PENDIENTE: { color: "text-muted-foreground bg-muted", icon: Clock },
      EN_PROGRESO: { color: "text-chart-2 bg-chart-2/10", icon: TrendingUp },
      COMPLETADA: { color: "text-chart-3 bg-chart-3/10", icon: CheckCircle2 },
    };
    const variant = variants[estado as keyof typeof variants] || variants.PENDIENTE;
    const Icon = variant.icon;
    return (
      <Badge variant="outline" className={variant.color}>
        <Icon className="h-3 w-3 mr-1" />
        {estado.replace("_", " ")}
      </Badge>
    );
  };

  const kanbanColumns = [
    { id: "PENDIENTE", title: "Pendientes" },
    { id: "EN_PROGRESO", title: "En Progreso" },
    { id: "COMPLETADA", title: "Completadas" },
  ];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Tareas</h1>
          <p className="text-muted-foreground mt-1">Gestión de tareas generales y personales</p>
        </div>
        <div className="flex gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
            <TabsList>
              <TabsTrigger value="table" data-testid="button-view-table">
                <LayoutList className="h-4 w-4 mr-2" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="kanban" data-testid="button-view-kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} data-testid="button-add-task">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva Tarea</DialogTitle>
                <DialogDescription>
                  Crea una nueva tarea general o personal
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="titulo">Título *</Label>
                    <Input
                      id="titulo"
                      value={formData.titulo}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                      required
                      data-testid="input-titulo"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      data-testid="textarea-descripcion"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cliente">Cliente</Label>
                    <Select value={formData.clienteId || "none"} onValueChange={(value) => setFormData({ ...formData, clienteId: value === "none" ? "" : value })}>
                      <SelectTrigger data-testid="select-cliente">
                        <SelectValue placeholder="Sin cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin cliente</SelectItem>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.razonSocial}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asignado">Asignado a</Label>
                    <Select value={formData.asignadoA || "none"} onValueChange={(value) => setFormData({ ...formData, asignadoA: value === "none" ? "" : value })}>
                      <SelectTrigger data-testid="select-asignado">
                        <SelectValue placeholder="Sin asignar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin asignar</SelectItem>
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>{user.username}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prioridad">Prioridad</Label>
                    <Select value={formData.prioridad} onValueChange={(value) => setFormData({ ...formData, prioridad: value })}>
                      <SelectTrigger data-testid="select-prioridad">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja</SelectItem>
                        <SelectItem value="MEDIA">Media</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visibilidad">Visibilidad</Label>
                    <Select value={formData.visibilidad} onValueChange={(value) => setFormData({ ...formData, visibilidad: value })}>
                      <SelectTrigger data-testid="select-visibilidad">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GENERAL">General</SelectItem>
                        <SelectItem value="PERSONAL">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
                    <Input
                      id="fechaVencimiento"
                      type="date"
                      value={formData.fechaVencimiento}
                      onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                      data-testid="input-fecha-vencimiento"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" data-testid="button-submit-task">
                    Crear Tarea
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Lista de Tareas ({visibleTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Asignado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay tareas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleTasks.map((task) => (
                    <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {task.visibilidad === "PERSONAL" && <Lock className="h-3 w-3 text-muted-foreground" />}
                          {task.titulo}
                        </div>
                      </TableCell>
                      <TableCell>{task.client?.razonSocial || "-"}</TableCell>
                      <TableCell>{task.assignedUser?.username || "-"}</TableCell>
                      <TableCell>{getPrioridadBadge(task.prioridad)}</TableCell>
                      <TableCell>{getEstadoBadge(task.estado)}</TableCell>
                      <TableCell>
                        {task.fechaVencimiento ? new Date(task.fechaVencimiento).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select value={task.estado} onValueChange={(value) => updateEstadoMutation.mutate({ id: task.id, estado: value })}>
                          <SelectTrigger className="w-[140px]" data-testid={`select-estado-${task.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                            <SelectItem value="EN_PROGRESO">En Progreso</SelectItem>
                            <SelectItem value="COMPLETADA">Completada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {kanbanColumns.map((column) => {
            const columnTasks = visibleTasks.filter((task) => task.estado === column.id);
            return (
              <Card key={column.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {column.title}
                    <Badge variant="secondary">{columnTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hay tareas
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <Card key={task.id} className="hover-elevate cursor-pointer" data-testid={`card-task-${task.id}`}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium flex items-center gap-2">
                              {task.visibilidad === "PERSONAL" && <Lock className="h-3 w-3" />}
                              {task.titulo}
                            </h4>
                            {getPrioridadBadge(task.prioridad)}
                          </div>
                          {task.descripcion && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{task.descripcion}</p>
                          )}
                          {task.client && (
                            <p className="text-xs text-muted-foreground">Cliente: {task.client.razonSocial}</p>
                          )}
                          {task.assignedUser && (
                            <p className="text-xs text-muted-foreground">Asignado: {task.assignedUser.username}</p>
                          )}
                          {task.fechaVencimiento && (
                            <p className="text-xs text-muted-foreground">
                              Vence: {new Date(task.fechaVencimiento).toLocaleDateString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
