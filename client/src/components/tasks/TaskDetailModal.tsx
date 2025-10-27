import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarIcon,
  Save,
  X,
  MessageSquare,
  Paperclip,
  Clock,
  History,
  CheckSquare,
  Palette,
  Tag,
} from "lucide-react";
import type { Task, Client, User } from "@shared/schema";
import { TaskComments } from "./TaskComments";
import { TaskAttachments } from "./TaskAttachments";
import { TimeTracker } from "./TimeTracker";

// Extended task type with Epic Tasks fields (until schema is updated)
interface ExtendedTask extends Task {
  fechaInicio?: Date | string;
  progreso?: number;
  color?: string | null;
  etiquetas?: string[];
  estimatedMinutes?: number | null;
}

interface TaskDetailModalProps {
  task: ExtendedTask | null;
  isOpen: boolean;
  onClose: () => void;
  clients?: Client[];
  users?: User[];
}

const priorityColors = {
  BAJA: "#94a3b8",
  MEDIA: "#f59e0b",
  ALTA: "#ef4444",
};

const statusColors = {
  PENDIENTE: "#64748b",
  EN_PROGRESO: "#3b82f6",
  COMPLETADA: "#10b981",
  CANCELADA: "#ef4444",
};

const customColors = [
  "#ef4444", "#f59e0b", "#10b981", "#3b82f6", 
  "#8b5cf6", "#ec4899", "#06b6d4", "#64748b"
];

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  clients = [],
  users = [],
}: TaskDetailModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("details");
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    titulo: task?.titulo || "",
    descripcion: task?.descripcion || "",
    clienteId: task?.clienteId || "",
    asignadoA: task?.asignadoA || "",
    prioridad: task?.prioridad || "MEDIA",
    estado: task?.estado || "PENDIENTE",
    visibilidad: task?.visibilidad || "GENERAL",
    fechaVencimiento: task?.fechaVencimiento || "",
    progreso: task?.progreso || 0,
    color: task?.color || null,
    etiquetas: task?.etiquetas || [],
    estimatedMinutes: task?.estimatedMinutes || null,
  });

  const [startDate, setStartDate] = useState<Date | undefined>(
    task?.fechaInicio ? new Date(task.fechaInicio) : undefined
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.fechaVencimiento ? new Date(task.fechaVencimiento) : undefined
  );

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      if (!task?.id) throw new Error("No task ID");
      return await apiRequest("PATCH", `/api/tasks/${task.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Tarea actualizada exitosamente" });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error al actualizar tarea",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const updateData: any = {
      ...formData,
      fechaInicio: startDate?.toISOString(),
      fechaVencimiento: dueDate?.toISOString(),
    };
    updateMutation.mutate(updateData);
  };

  const handleCancel = () => {
    if (task) {
      setFormData({
        titulo: task.titulo,
        descripcion: task.descripcion || "",
        clienteId: task.clienteId || "",
        asignadoA: task.asignadoA || "",
        prioridad: task.prioridad,
        estado: task.estado,
        visibilidad: task.visibilidad,
        fechaVencimiento: task.fechaVencimiento || "",
        progreso: task.progreso || 0,
        color: task.color || null,
        etiquetas: task.etiquetas || [],
        estimatedMinutes: task.estimatedMinutes || null,
      });
      setStartDate(task.fechaInicio ? new Date(task.fechaInicio) : undefined);
      setDueDate(task.fechaVencimiento ? new Date(task.fechaVencimiento) : undefined);
    }
    setIsEditing(false);
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={formData.titulo}
                  onChange={(e) =>
                    setFormData({ ...formData, titulo: e.target.value })
                  }
                  className="text-xl font-semibold"
                  placeholder="Título de la tarea"
                />
              ) : (
                <DialogTitle className="text-2xl">{task.titulo}</DialogTitle>
              )}
              <div className="flex gap-2 mt-2">
                <Badge variant="outline">#{task.id.slice(0, 8)}</Badge>
                <Badge
                  style={{
                    backgroundColor:
                      statusColors[task.estado as keyof typeof statusColors] + "20",
                    color: statusColors[task.estado as keyof typeof statusColors],
                  }}
                >
                  {task.estado.replace("_", " ")}
                </Badge>
                <Badge
                  style={{
                    backgroundColor:
                      priorityColors[task.prioridad as keyof typeof priorityColors] + "20",
                    color: priorityColors[task.prioridad as keyof typeof priorityColors],
                  }}
                >
                  {task.prioridad}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} size="sm">
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="details">
              <CheckSquare className="w-4 h-4 mr-2" />
              Detalles
            </TabsTrigger>
            <TabsTrigger value="subtasks">
              <CheckSquare className="w-4 h-4 mr-2" />
              Subtareas
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="w-4 h-4 mr-2" />
              Comentarios
            </TabsTrigger>
            <TabsTrigger value="attachments">
              <Paperclip className="w-4 h-4 mr-2" />
              Adjuntos
            </TabsTrigger>
            <TabsTrigger value="time">
              <Clock className="w-4 h-4 mr-2" />
              Tiempo
            </TabsTrigger>
            <TabsTrigger value="activity">
              <History className="w-4 h-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          {/* Detalles Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Description */}
              <div className="col-span-2">
                <Label>Descripción</Label>
                {isEditing ? (
                  <Textarea
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    rows={4}
                    placeholder="Descripción de la tarea..."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {task.descripcion || "Sin descripción"}
                  </p>
                )}
              </div>

              {/* Client */}
              <div>
                <Label>Cliente</Label>
                {isEditing ? (
                  <Select
                    value={formData.clienteId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, clienteId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin cliente</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.razonSocial}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">
                    {clients.find((c) => c.id === task.clienteId)?.razonSocial ||
                      "Sin cliente"}
                  </p>
                )}
              </div>

              {/* Assigned User */}
              <div>
                <Label>Asignado a</Label>
                {isEditing ? (
                  <Select
                    value={formData.asignadoA}
                    onValueChange={(value) =>
                      setFormData({ ...formData, asignadoA: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sin asignar</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">
                    {users.find((u) => u.id === task.asignadoA)?.username ||
                      "Sin asignar"}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <Label>Prioridad</Label>
                {isEditing ? (
                  <Select
                    value={formData.prioridad}
                    onValueChange={(value) =>
                      setFormData({ ...formData, prioridad: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAJA">Baja</SelectItem>
                      <SelectItem value="MEDIA">Media</SelectItem>
                      <SelectItem value="ALTA">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">{task.prioridad}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <Label>Estado</Label>
                {isEditing ? (
                  <Select
                    value={formData.estado}
                    onValueChange={(value) =>
                      setFormData({ ...formData, estado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                      <SelectItem value="EN_PROGRESO">En Progreso</SelectItem>
                      <SelectItem value="COMPLETADA">Completada</SelectItem>
                      <SelectItem value="CANCELADA">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">{task.estado.replace("_", " ")}</p>
                )}
              </div>

              {/* Start Date */}
              <div>
                <Label>Fecha de Inicio</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-sm mt-1">
                    {task.fechaInicio
                      ? format(new Date(task.fechaInicio), "PPP", { locale: es })
                      : "Sin fecha"}
                  </p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <Label>Fecha de Vencimiento</Label>
                {isEditing ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? (
                          format(dueDate, "PPP", { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        locale={es}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p className="text-sm mt-1">
                    {task.fechaVencimiento
                      ? format(new Date(task.fechaVencimiento), "PPP", {
                          locale: es,
                        })
                      : "Sin fecha"}
                  </p>
                )}
              </div>

              {/* Progress */}
              <div className="col-span-2">
                <Label>Progreso: {formData.progreso}%</Label>
                {isEditing ? (
                  <Slider
                    value={[formData.progreso]}
                    onValueChange={(value) =>
                      setFormData({ ...formData, progreso: value[0] })
                    }
                    max={100}
                    step={5}
                    className="mt-2"
                  />
                ) : (
                  <div className="w-full bg-secondary h-2 rounded-full mt-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progreso || 0}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Color Picker */}
              {isEditing && (
                <div className="col-span-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color de la Tarea
                  </Label>
                  <div className="flex gap-2 mt-2">
                    {customColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            formData.color === color ? "#000" : "transparent",
                        }}
                      />
                    ))}
                    <button
                      onClick={() => setFormData({ ...formData, color: null })}
                      className="w-8 h-8 rounded-full border-2 bg-white transition-all hover:scale-110"
                      style={{
                        borderColor: !formData.color ? "#000" : "#e5e7eb",
                      }}
                    >
                      <X className="w-4 h-4 mx-auto text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Estimated Time */}
              <div>
                <Label>Tiempo Estimado (minutos)</Label>
                {isEditing ? (
                  <Input
                    type="number"
                    value={formData.estimatedMinutes || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estimatedMinutes: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      })
                    }
                    placeholder="0"
                  />
                ) : (
                  <p className="text-sm mt-1">
                    {task.estimatedMinutes
                      ? `${task.estimatedMinutes} min`
                      : "No estimado"}
                  </p>
                )}
              </div>

              {/* Visibility */}
              <div>
                <Label>Visibilidad</Label>
                {isEditing ? (
                  <Select
                    value={formData.visibilidad}
                    onValueChange={(value) =>
                      setFormData({ ...formData, visibilidad: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="PERSONAL">Personal</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">{task.visibilidad}</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Subtasks Tab - Placeholder */}
          <TabsContent value="subtasks">
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Función de subtareas próximamente</p>
            </div>
          </TabsContent>

          {/* Comments Tab - Placeholder */}
          <TabsContent value="comments">
            {task?.id ? (
              <TaskComments taskId={task.id} currentUser={users?.[0]} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se puede cargar la tarea</p>
              </div>
            )}
          </TabsContent>

          {/* Attachments Tab - Placeholder */}
          <TabsContent value="attachments">
            {task?.id ? (
              <TaskAttachments taskId={task.id} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se puede cargar la tarea</p>
              </div>
            )}
          </TabsContent>

          {/* Time Tab - Placeholder */}
          <TabsContent value="time">
            {task?.id ? (
              <TimeTracker 
                taskId={task.id} 
                estimatedMinutes={task.estimatedMinutes}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se puede cargar la tarea</p>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab - Placeholder */}
          <TabsContent value="activity">
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Función de historial próximamente</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
