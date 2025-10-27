import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { Task, Client, User } from "@shared/schema";

interface ExtendedTask extends Task {
  fechaInicio?: Date | string;
  progreso?: number;
  color?: string | null;
  etiquetas?: string[];
  estimatedMinutes?: number | null;
  client?: Client;
  assignedUser?: User;
}

interface KanbanBoardProps {
  onTaskClick?: (task: ExtendedTask) => void;
  clients?: Client[];
  users?: User[];
}

const statusConfig = {
  PENDIENTE: { label: "Pendiente", color: "bg-slate-100", icon: AlertCircle },
  EN_PROGRESO: {
    label: "En Progreso",
    color: "bg-blue-100",
    icon: Clock,
  },
  COMPLETADA: {
    label: "Completada",
    color: "bg-green-100",
    icon: CheckCircle2,
  },
  CANCELADA: { label: "Cancelada", color: "bg-red-100", icon: AlertCircle },
};

interface SortableTaskProps {
  task: ExtendedTask;
  onTaskClick?: (task: ExtendedTask) => void;
  users?: User[];
}

function SortableTask({
  task,
  onTaskClick,
  users,
}: SortableTaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    BAJA: "text-slate-500",
    MEDIA: "text-amber-500",
    ALTA: "text-red-500",
  };

  const assignedUser = users?.find((u) => u.id === task.asignadoA);
  const isOverdue =
    task.fechaVencimiento &&
    new Date(task.fechaVencimiento) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="mb-3 cursor-grab active:cursor-grabbing"
    >
      <Card
        className={`border-l-4 hover:shadow-md transition-all ${
          isDragging ? "shadow-lg" : ""
        }`}
        style={{
          borderLeftColor: task.color || "#cbd5e1",
          backgroundColor: task.color
            ? `${task.color}15`
            : undefined,
        }}
        onClick={() => onTaskClick?.(task)}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm flex-1 break-words">
              {task.titulo}
            </h3>
            {task.progreso !== undefined && task.progreso > 0 && (
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {task.progreso}%
              </Badge>
            )}
          </div>

          {task.descripcion && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.descripcion}
            </p>
          )}

          <div className="flex items-center gap-1 flex-wrap">
            <Badge
              variant="secondary"
              className={`text-xs ${priorityColors[task.prioridad as keyof typeof priorityColors]}`}
            >
              {task.prioridad}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive" className="text-xs">
                Vencida
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {task.fechaVencimiento && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {format(new Date(task.fechaVencimiento), "dd MMM", {
                    locale: es,
                  })}
                </span>
              </div>
            )}
            {assignedUser && (
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                {assignedUser.username[0]}
              </span>
            )}
          </div>

          {task.progreso !== undefined && (
            <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full transition-all"
                style={{ width: `${task.progreso}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({
  onTaskClick,
  clients = [],
  users = [],
}: KanbanBoardProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);

  // Fetch tasks
  const { isLoading, data: fetchedTasks } = useQuery<ExtendedTask[]>({
    queryKey: ["/api/tasks"],
  });

  // Update local state when data changes
  useEffect(() => {
    if (fetchedTasks) {
      setTasks(fetchedTasks);
    }
  }, [fetchedTasks]);

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      taskId,
      estado,
    }: {
      taskId: string;
      estado: string;
    }) => {
      return await apiRequest("PATCH", `/api/tasks/${taskId}`, { estado });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: () => {
      toast({
        title: "Error al actualizar tarea",
        variant: "destructive",
      });
      // Revert optimistic update by refetching
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    return {
      PENDIENTE: tasks.filter((t) => t.estado === "PENDIENTE"),
      EN_PROGRESO: tasks.filter((t) => t.estado === "EN_PROGRESO"),
      COMPLETADA: tasks.filter((t) => t.estado === "COMPLETADA"),
    };
  }, [tasks]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overStatus = over.id;

    if (!activeTask || !Object.keys(statusConfig).includes(overStatus)) {
      return;
    }

    if (activeTask.estado === overStatus) {
      return;
    }

    // Optimistic update
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === activeTask.id ? { ...t, estado: overStatus } : t
      )
    );

    // Make API request
    updateStatusMutation.mutate({
      taskId: activeTask.id,
      estado: overStatus,
    });
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-8 bg-secondary rounded-lg animate-pulse" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-24 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const statusTasks =
            groupedTasks[status as keyof typeof groupedTasks] || [];
          const Icon = config.icon;

          return (
            <Card key={status} className={`${config.color} min-h-96`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{config.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {statusTasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <SortableContext
                  items={statusTasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {statusTasks.length > 0 ? (
                      statusTasks.map((task) => (
                        <SortableTask
                          key={task.id}
                          task={task}
                          onTaskClick={onTaskClick}
                          users={users}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-xs">Sin tareas</p>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </DndContext>
  );
}
