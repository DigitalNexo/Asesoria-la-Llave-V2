import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Calendar, Building2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Tipos
interface Client {
  id: string;
  razonSocial: string;
  nifCif: string;
  tipo: "AUTONOMO" | "EMPRESA";
}

interface Impuesto {
  id: string;
  modelo: string;
  nombre: string;
  tipo: string;
  periodicidad: string;
  descripcion: string | null;
  activo: boolean;
}

interface ObligacionFiscal {
  id: string;
  clienteId: string;
  impuestoId: string;
  periodicidad: "MENSUAL" | "TRIMESTRAL" | "ANUAL";
  diaVencimiento: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  activo: boolean;
  impuesto?: Impuesto;
}

export default function ControlImpuestos() {
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingObligacion, setEditingObligacion] = useState<ObligacionFiscal | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [obligacionToDelete, setObligacionToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    impuestoId: string;
    periodicidad: "MENSUAL" | "TRIMESTRAL" | "ANUAL";
    diaVencimiento: string;
    fechaInicio: string;
    fechaFin: string;
    activo: boolean;
  }>({
    impuestoId: "",
    periodicidad: "TRIMESTRAL",
    diaVencimiento: "",
    fechaInicio: new Date().toISOString().split("T")[0],
    fechaFin: "",
    activo: true,
  });

  // Queries
  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: impuestos = [], isLoading: loadingImpuestos } = useQuery<Impuesto[]>({
    queryKey: ["/api/impuestos"],
  });

  const { data: obligaciones = [], isLoading: loadingObligaciones } = useQuery<ObligacionFiscal[]>({
    queryKey: [`/api/obligaciones-fiscales/cliente/${selectedClientId}`],
    enabled: !!selectedClientId,
  });

  const isLoading = loadingClients || loadingImpuestos || (selectedClientId && loadingObligaciones);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        clienteId: selectedClientId,
        impuestoId: data.impuestoId,
        periodicidad: data.periodicidad,
        diaVencimiento: data.diaVencimiento ? parseInt(data.diaVencimiento) : null,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin || null,
        activo: data.activo,
      };
      return await apiRequest("POST", "/api/obligaciones-fiscales", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/obligaciones-fiscales/cliente/${selectedClientId}`] });
      toast({ title: "Obligación fiscal creada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear obligación fiscal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const payload = {
        periodicidad: data.periodicidad,
        diaVencimiento: data.diaVencimiento ? parseInt(data.diaVencimiento) : null,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin || null,
        activo: data.activo,
      };
      return await apiRequest("PATCH", `/api/obligaciones-fiscales/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/obligaciones-fiscales/cliente/${selectedClientId}`] });
      toast({ title: "Obligación fiscal actualizada exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar obligación fiscal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/obligaciones-fiscales/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/obligaciones-fiscales/cliente/${selectedClientId}`] });
      toast({ title: "Obligación fiscal eliminada exitosamente" });
      setDeleteDialogOpen(false);
      setObligacionToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar obligación fiscal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      impuestoId: "",
      periodicidad: "TRIMESTRAL",
      diaVencimiento: "",
      fechaInicio: new Date().toISOString().split("T")[0],
      fechaFin: "",
      activo: true,
    });
    setEditingObligacion(null);
  };

  const handleEdit = (obligacion: ObligacionFiscal) => {
    setEditingObligacion(obligacion);
    setFormData({
      impuestoId: obligacion.impuestoId,
      periodicidad: obligacion.periodicidad,
      diaVencimiento: obligacion.diaVencimiento?.toString() || "",
      fechaInicio: obligacion.fechaInicio,
      fechaFin: obligacion.fechaFin || "",
      activo: obligacion.activo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setObligacionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingObligacion) {
      updateMutation.mutate({ id: editingObligacion.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getPeriodicidadBadge = (periodicidad: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      MENSUAL: { variant: "default", label: "Mensual" },
      TRIMESTRAL: { variant: "secondary", label: "Trimestral" },
      ANUAL: { variant: "outline", label: "Anual" },
    };
    const config = variants[periodicidad] || { variant: "outline" as const, label: periodicidad };
    return (
      <Badge variant={config.variant} data-testid={`badge-periodicidad-${periodicidad.toLowerCase()}`}>
        {config.label}
      </Badge>
    );
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const impuestosActivos = impuestos.filter((i) => i.activo);

  if (loadingClients || loadingImpuestos) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Obligaciones Fiscales</h1>
          <p className="text-muted-foreground mt-1">Gestión de impuestos asignados por cliente</p>
        </div>
      </div>

      {/* Selector de Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Seleccionar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger data-testid="select-client">
              <SelectValue placeholder="Selecciona un cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.razonSocial} ({client.nifCif})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Obligaciones del Cliente */}
      {selectedClientId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Obligaciones Fiscales</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedClient?.razonSocial}
                </p>
              </div>
              <Dialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                  setIsDialogOpen(open);
                  if (!open) resetForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button onClick={resetForm} data-testid="button-add-obligacion">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Obligación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingObligacion ? "Editar Obligación Fiscal" : "Nueva Obligación Fiscal"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingObligacion
                        ? "Modifica los datos de la obligación fiscal"
                        : "Asigna un nuevo impuesto al cliente"}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {!editingObligacion && (
                      <div className="space-y-2">
                        <Label htmlFor="impuesto">Impuesto *</Label>
                        <Select
                          value={formData.impuestoId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, impuestoId: value })
                          }
                        >
                          <SelectTrigger data-testid="select-impuesto">
                            <SelectValue placeholder="Selecciona un impuesto" />
                          </SelectTrigger>
                          <SelectContent portal={false}>
                            {impuestosActivos.map((impuesto) => (
                              <SelectItem key={impuesto.id} value={impuesto.id}>
                                {impuesto.modelo} - {impuesto.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="periodicidad">Periodicidad *</Label>
                      <Select
                        value={formData.periodicidad}
                        onValueChange={(value: any) =>
                          setFormData({ ...formData, periodicidad: value })
                        }
                      >
                        <SelectTrigger data-testid="select-periodicidad">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent portal={false}>
                          <SelectItem value="MENSUAL">Mensual</SelectItem>
                          <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                          <SelectItem value="ANUAL">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diaVencimiento">Día de Vencimiento (opcional)</Label>
                      <Input
                        id="diaVencimiento"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.diaVencimiento}
                        onChange={(e) =>
                          setFormData({ ...formData, diaVencimiento: e.target.value })
                        }
                        placeholder="Ej: 20"
                        data-testid="input-dia-vencimiento"
                      />
                      <p className="text-xs text-muted-foreground">
                        Día del mes en que vence la declaración (si es distinto al calendario AEAT)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                        <Input
                          id="fechaInicio"
                          type="date"
                          value={formData.fechaInicio}
                          onChange={(e) =>
                            setFormData({ ...formData, fechaInicio: e.target.value })
                          }
                          required
                          data-testid="input-fecha-inicio"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fechaFin">Fecha Fin (opcional)</Label>
                        <Input
                          id="fechaFin"
                          type="date"
                          value={formData.fechaFin}
                          onChange={(e) =>
                            setFormData({ ...formData, fechaFin: e.target.value })
                          }
                          data-testid="input-fecha-fin"
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="activo"
                        checked={formData.activo}
                        onChange={(e) =>
                          setFormData({ ...formData, activo: e.target.checked })
                        }
                        className="rounded border-gray-300"
                        data-testid="checkbox-activo"
                      />
                      <Label htmlFor="activo" className="text-sm font-normal">
                        Obligación activa
                      </Label>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false);
                          resetForm();
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                        data-testid="button-submit-obligacion"
                      >
                        {createMutation.isPending || updateMutation.isPending
                          ? "Guardando..."
                          : editingObligacion
                          ? "Actualizar"
                          : "Crear"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingObligaciones ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : obligaciones.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No hay obligaciones fiscales</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comienza asignando un impuesto a este cliente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {obligaciones.map((obligacion) => {
                  const impuesto = impuestos.find((i) => i.id === obligacion.impuestoId);
                  return (
                    <Card key={obligacion.id} data-testid={`card-obligacion-${obligacion.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">
                                {impuesto?.modelo} - {impuesto?.nombre}
                              </h4>
                              {getPeriodicidadBadge(obligacion.periodicidad)}
                              <Badge
                                variant={obligacion.activo ? "default" : "secondary"}
                                data-testid={`badge-estado-${obligacion.id}`}
                              >
                                {obligacion.activo ? "Activa" : "Inactiva"}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Inicio: {new Date(obligacion.fechaInicio).toLocaleDateString()}
                              </span>
                              {obligacion.fechaFin && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  Fin: {new Date(obligacion.fechaFin).toLocaleDateString()}
                                </span>
                              )}
                              {obligacion.diaVencimiento && (
                                <span>Vencimiento día {obligacion.diaVencimiento}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(obligacion)}
                              data-testid={`button-edit-${obligacion.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDelete(obligacion.id)}
                              data-testid={`button-delete-${obligacion.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alert Dialog para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar obligación fiscal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la obligación fiscal y todas sus
              declaraciones asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => obligacionToDelete && deleteMutation.mutate(obligacionToDelete)}
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
