import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon,
  Plus,
  Edit2,
  Trash2,
  Filter,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Periodicidad = "MENSUAL" | "TRIMESTRAL" | "ANUAL";

interface CalendarioAEAT {
  id: string;
  modelo: string;
  periodicidad: Periodicidad;
  periodoContable: string;
  fechaInicio: string;
  fechaFin: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Impuesto {
  id: string;
  modelo: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

const periodicidadColors: Record<Periodicidad, string> = {
  MENSUAL: "bg-blue-500",
  TRIMESTRAL: "bg-green-500",
  ANUAL: "bg-purple-500",
};

export default function CalendarioAEATPage() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedModelo, setSelectedModelo] = useState<string>("all");
  const [selectedPeriodicidad, setSelectedPeriodicidad] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<CalendarioAEAT | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    modelo: "",
    periodicidad: "MENSUAL" as Periodicidad,
    periodoContable: "",
    fechaInicio: "",
    fechaFin: "",
  });

  // Query para obtener impuestos (para el selector de modelo)
  const { data: impuestos = [], isLoading: loadingImpuestos } = useQuery<Impuesto[]>({
    queryKey: ["/api/impuestos"],
  });

  // Query para obtener calendarios AEAT con filtros
  const { data: calendarios = [], isLoading: loadingCalendarios } = useQuery<CalendarioAEAT[]>({
    queryKey: ["/api/calendario-aeat", selectedYear, selectedModelo, selectedPeriodicidad],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedYear && selectedYear !== "all") params.append("anio", selectedYear);
      if (selectedModelo && selectedModelo !== "all") params.append("modelo", selectedModelo);
      if (selectedPeriodicidad && selectedPeriodicidad !== "all") params.append("periodicidad", selectedPeriodicidad);
      
      const url = `/api/calendario-aeat${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Error al cargar calendarios");
      return response.json();
    },
  });

  const isLoading = loadingImpuestos || loadingCalendarios;

  // Mutation para crear calendario
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("/api/calendario-aeat", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendario-aeat"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "Calendario creado",
        description: "El período del calendario AEAT ha sido creado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el calendario",
        variant: "destructive",
      });
    },
  });

  // Mutation para actualizar calendario
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest(`/api/calendario-aeat/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendario-aeat"] });
      setDialogOpen(false);
      setEditingCalendar(null);
      resetForm();
      toast({
        title: "Calendario actualizado",
        description: "Las fechas del calendario han sido actualizadas correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el calendario",
        variant: "destructive",
      });
    },
  });

  // Mutation para eliminar calendario
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/calendario-aeat/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendario-aeat"] });
      setDeleteDialogOpen(false);
      setDeletingId(null);
      toast({
        title: "Calendario eliminado",
        description: "El período del calendario ha sido eliminado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el calendario",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      modelo: "",
      periodicidad: "MENSUAL",
      periodoContable: "",
      fechaInicio: "",
      fechaFin: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.modelo || !formData.periodoContable || !formData.fechaInicio || !formData.fechaFin) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (editingCalendar) {
      updateMutation.mutate({
        id: editingCalendar.id,
        data: {
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin,
        },
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (calendario: CalendarioAEAT) => {
    setEditingCalendar(calendario);
    setFormData({
      modelo: calendario.modelo,
      periodicidad: calendario.periodicidad,
      periodoContable: calendario.periodoContable,
      fechaInicio: calendario.fechaInicio.split('T')[0],
      fechaFin: calendario.fechaFin.split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingId) {
      deleteMutation.mutate(deletingId);
    }
  };

  const handleDialogOpen = () => {
    setEditingCalendar(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCalendar(null);
    resetForm();
  };

  // Generar array de años (últimos 5 y próximos 5)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => (currentYear - 5 + i).toString());

  // Obtener nombre del impuesto por modelo
  const getImpuestoNombre = (modelo: string) => {
    const impuesto = impuestos.find((i) => i.modelo === modelo);
    return impuesto ? `${modelo} - ${impuesto.nombre}` : modelo;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <CalendarIcon className="h-8 w-8" />
          Calendario AEAT
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestión de períodos fiscales y fechas límite oficiales de la AEAT
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel de filtros */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="filter-year">Ejercicio Fiscal</Label>
              <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
              >
                <SelectTrigger id="filter-year" data-testid="select-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los años</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-modelo">Modelo</Label>
              <Select
                value={selectedModelo}
                onValueChange={setSelectedModelo}
              >
                <SelectTrigger id="filter-modelo" data-testid="select-modelo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los modelos</SelectItem>
                  {impuestos
                    .filter((i) => i.activo)
                    .map((impuesto) => (
                      <SelectItem key={impuesto.id} value={impuesto.modelo}>
                        {impuesto.modelo} - {impuesto.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-periodicidad">Periodicidad</Label>
              <Select
                value={selectedPeriodicidad}
                onValueChange={setSelectedPeriodicidad}
              >
                <SelectTrigger id="filter-periodicidad" data-testid="select-periodicidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="MENSUAL">Mensual</SelectItem>
                  <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                  <SelectItem value="ANUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedYear(currentYear.toString());
                setSelectedModelo("all");
                setSelectedPeriodicidad("all");
              }}
              data-testid="button-reset-filters"
            >
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>

        {/* Panel principal de calendarios */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Períodos del Calendario</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleDialogOpen}
                    data-testid="button-create-periodo"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Período
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCalendar ? "Editar Período" : "Nuevo Período del Calendario"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="modelo">Modelo *</Label>
                      <Select
                        value={formData.modelo}
                        onValueChange={(value) =>
                          setFormData({ ...formData, modelo: value })
                        }
                        disabled={!!editingCalendar}
                      >
                        <SelectTrigger id="modelo" data-testid="input-modelo">
                          <SelectValue placeholder="Seleccionar modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {impuestos
                            .filter((i) => i.activo)
                            .map((impuesto) => (
                              <SelectItem key={impuesto.id} value={impuesto.modelo}>
                                {impuesto.modelo} - {impuesto.nombre}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="periodicidad">Periodicidad *</Label>
                      <Select
                        value={formData.periodicidad}
                        onValueChange={(value: Periodicidad) =>
                          setFormData({ ...formData, periodicidad: value })
                        }
                        disabled={!!editingCalendar}
                      >
                        <SelectTrigger id="periodicidad" data-testid="input-periodicidad">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MENSUAL">Mensual</SelectItem>
                          <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                          <SelectItem value="ANUAL">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="periodoContable">Período Contable *</Label>
                      <Input
                        id="periodoContable"
                        data-testid="input-periodo-contable"
                        value={formData.periodoContable}
                        onChange={(e) =>
                          setFormData({ ...formData, periodoContable: e.target.value })
                        }
                        placeholder="Ej: 2025-Q1, 2025-04, 2025"
                        disabled={!!editingCalendar}
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Formato: YYYY-QN (trimestral), YYYY-MM (mensual), YYYY (anual)
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
                      <Input
                        id="fechaInicio"
                        data-testid="input-fecha-inicio"
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) =>
                          setFormData({ ...formData, fechaInicio: e.target.value })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="fechaFin">Fecha Límite de Presentación *</Label>
                      <Input
                        id="fechaFin"
                        data-testid="input-fecha-fin"
                        type="date"
                        value={formData.fechaFin}
                        onChange={(e) =>
                          setFormData({ ...formData, fechaFin: e.target.value })
                        }
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDialogClose}
                        data-testid="button-cancel"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit"
                      >
                        {editingCalendar ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : calendarios.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No hay períodos</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No se encontraron períodos del calendario con los filtros seleccionados
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {calendarios.map((calendario) => (
                  <Card key={calendario.id} data-testid={`card-calendario-${calendario.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {getImpuestoNombre(calendario.modelo)}
                            </h3>
                            <Badge
                              className={`${periodicidadColors[calendario.periodicidad]} text-white`}
                              data-testid={`badge-periodicidad-${calendario.id}`}
                            >
                              {calendario.periodicidad}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div>
                              <p className="text-sm text-muted-foreground">Período</p>
                              <p className="font-medium" data-testid={`text-periodo-${calendario.id}`}>
                                {calendario.periodoContable}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Inicio</p>
                              <p className="font-medium" data-testid={`text-inicio-${calendario.id}`}>
                                {format(new Date(calendario.fechaInicio), "dd/MM/yyyy", { locale: es })}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Límite Presentación</p>
                              <p className="font-medium text-red-600" data-testid={`text-limite-${calendario.id}`}>
                                {format(new Date(calendario.fechaFin), "dd/MM/yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(calendario)}
                            data-testid={`button-edit-${calendario.id}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(calendario.id)}
                            data-testid={`button-delete-${calendario.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmación para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar período del calendario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El período será eliminado permanentemente del calendario AEAT.
              <br /><br />
              <strong className="text-yellow-600">Advertencia:</strong> Si existen declaraciones asociadas a este período, podrían quedar huérfanas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
