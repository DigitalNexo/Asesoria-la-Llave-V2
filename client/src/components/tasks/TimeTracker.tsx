import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Play,
  Pause,
  Square,
  Plus,
  Trash2,
  Clock,
  Loader,
} from "lucide-react";

interface TimeEntry {
  id: string;
  taskId: string;
  duration: number; // in minutes
  description: string;
  startTime: Date | string;
  endTime?: Date | string;
  createdAt: Date | string;
}

interface TimeTrackerProps {
  taskId: string;
  estimatedMinutes?: number | null;
}

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export function TimeTracker({
  taskId,
  estimatedMinutes = null,
}: TimeTrackerProps) {
  const { toast } = useToast();
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualDescription, setManualDescription] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch time entries
  const { data: timeEntries, isLoading } = useQuery<TimeEntry[]>({
    queryKey: [`/api/tasks/${taskId}/time-entries`],
    enabled: !!taskId,
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Add time entry mutation
  const addEntryMutation = useMutation({
    mutationFn: async (data: {
      duration: number;
      description?: string;
    }) => {
      return await apiRequest("POST", `/api/tasks/${taskId}/time-entries`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/time-entries`],
      });
      toast({ title: "Tiempo registrado exitosamente" });
      resetManualEntry();
    },
    onError: () => {
      toast({
        title: "Error al registrar tiempo",
        variant: "destructive",
      });
    },
  });

  // Delete time entry mutation
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${taskId}/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/tasks/${taskId}/time-entries`],
      });
      toast({ title: "Tiempo eliminado exitosamente" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({
        title: "Error al eliminar tiempo",
        variant: "destructive",
      });
    },
  });

  const handleStartStop = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const handleStopTimer = () => {
    if (timerSeconds === 0) {
      toast({
        title: "El temporizador está en cero",
        variant: "destructive",
      });
      return;
    }

    const minutes = Math.round(timerSeconds / 60);
    addEntryMutation.mutate({
      duration: minutes,
      description: "Tiempo registrado desde el temporizador",
    });

    setIsTimerRunning(false);
    setTimerSeconds(0);
  };

  const handleAddManualTime = () => {
    if (!manualMinutes || parseInt(manualMinutes) <= 0) {
      toast({
        title: "Ingresa una cantidad válida de minutos",
        variant: "destructive",
      });
      return;
    }

    addEntryMutation.mutate({
      duration: parseInt(manualMinutes),
      description: manualDescription || "Tiempo registrado manualmente",
    });
  };

  const resetManualEntry = () => {
    setManualMinutes("");
    setManualDescription("");
    setIsManualEntryOpen(false);
  };

  const totalMinutes = (timeEntries || []).reduce(
    (sum, entry) => sum + entry.duration,
    0
  );

  const percentageOfEstimated =
    estimatedMinutes && estimatedMinutes > 0
      ? Math.round((totalMinutes / estimatedMinutes) * 100)
      : 0;

  const isOvertime = estimatedMinutes && totalMinutes > estimatedMinutes;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-secondary rounded-lg animate-pulse" />
        <div className="h-48 bg-secondary rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer Section */}
      <Card>
        <CardHeader>
          <CardTitle>Temporizador</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-6xl font-mono font-bold">
              {String(Math.floor(timerSeconds / 3600)).padStart(2, "0")}:
              {String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, "0")}:
              {String(timerSeconds % 60).padStart(2, "0")}
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={handleStartStop}
              size="sm"
              variant={isTimerRunning ? "destructive" : "default"}
            >
              {isTimerRunning ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Iniciar
                </>
              )}
            </Button>
            <Button
              onClick={handleStopTimer}
              size="sm"
              variant="outline"
              disabled={timerSeconds === 0 || addEntryMutation.isPending}
            >
              {addEntryMutation.isPending && (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              )}
              <Square className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Time Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tiempo Total:</span>
            <span className="text-2xl font-bold">{formatTime(totalMinutes)}</span>
          </div>

          {estimatedMinutes && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Tiempo Estimado:
                </span>
                <span className="text-lg font-semibold">
                  {formatTime(estimatedMinutes)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Progreso:</span>
                <Badge
                  variant={isOvertime ? "destructive" : "default"}
                  className="text-xs"
                >
                  {percentageOfEstimated}%
                  {isOvertime && " (+exceso)"}
                </Badge>
              </div>

              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isOvertime ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{
                    width: `${Math.min(percentageOfEstimated, 100)}%`,
                  }}
                />
              </div>

              {isOvertime && (
                <p className="text-xs text-destructive">
                  Has excedido el tiempo estimado por{" "}
                  {formatTime(totalMinutes - estimatedMinutes)}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Button */}
      <Dialog open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Agregar Tiempo Manualmente
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Tiempo Manualmente</DialogTitle>
            <DialogDescription>
              Registra tiempo que hayas trabajado fuera del temporizador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="minutes">Minutos</Label>
              <Input
                id="minutes"
                type="number"
                value={manualMinutes}
                onChange={(e) => setManualMinutes(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Input
                id="description"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Describe qué hiciste..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => resetManualEntry()}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddManualTime}
                disabled={addEntryMutation.isPending}
              >
                {addEntryMutation.isPending && (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                )}
                Agregar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Time Entries List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Historial de Tiempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeEntries && timeEntries.length > 0 ? (
            <div className="space-y-2">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {formatTime(entry.duration)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(entry.createdAt), "PPp", { locale: es })}
                    </p>
                  </div>
                  <Button
                    onClick={() => setDeleteConfirm(entry.id)}
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No hay registros de tiempo</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar registro de tiempo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este registro? Esta acción
              no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteEntryMutation.mutate(deleteConfirm)}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteEntryMutation.isPending}
            >
              {deleteEntryMutation.isPending && (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
