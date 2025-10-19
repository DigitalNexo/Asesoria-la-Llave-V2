import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FileText, Plus, Pencil, Trash2, Calendar, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

interface Impuesto {
  id: string;
  modelo: string;
  nombre: string;
  descripcion: string | null;
  tipo: string | null;
  periodicidad: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
  activo: boolean;
}

interface CalendarioAEAT {
  id: string;
  impuestoId: string;
  ejercicio: number;
  periodo: string;
  fechaInicio: string;
  fechaFin: string;
  fechaLimitePresentacion: string;
}

export default function Impuestos() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingImpuesto, setEditingImpuesto] = useState<Impuesto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [impuestoToDelete, setImpuestoToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    modelo: string;
    nombre: string;
    descripcion: string;
    tipo: string;
    periodicidad: 'MENSUAL' | 'TRIMESTRAL' | 'ANUAL';
    activo: boolean;
  }>({
    modelo: "",
    nombre: "",
    descripcion: "",
    tipo: "",
    periodicidad: "TRIMESTRAL",
    activo: true,
  });

  const { data: impuestos, isLoading } = useQuery<Impuesto[]>({
    queryKey: ["/api/impuestos"],
  });

  const { data: calendarios } = useQuery<CalendarioAEAT[]>({
    queryKey: ["/api/calendario-aeat"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/impuestos", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impuestos"] });
      toast({ title: "Impuesto creado exitosamente" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al crear impuesto", 
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      return await apiRequest("PATCH", `/api/impuestos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impuestos"] });
      toast({ title: "Impuesto actualizado exitosamente" });
      setIsDialogOpen(false);
      setEditingImpuesto(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al actualizar impuesto", 
        description: error.message || "Ocurrió un error inesperado",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/impuestos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impuestos"] });
      toast({ title: "Impuesto eliminado exitosamente" });
      setDeleteDialogOpen(false);
      setImpuestoToDelete(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error al eliminar impuesto", 
        description: error.message || "No se puede eliminar porque tiene obligaciones asociadas",
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setFormData({
      modelo: "",
      nombre: "",
      descripcion: "",
      tipo: "",
      periodicidad: "TRIMESTRAL",
      activo: true,
    });
    setEditingImpuesto(null);
  };

  const handleEdit = (impuesto: Impuesto) => {
    setEditingImpuesto(impuesto);
    setFormData({
      modelo: impuesto.modelo,
      nombre: impuesto.nombre,
      descripcion: impuesto.descripcion || "",
      tipo: impuesto.tipo || "",
      periodicidad: impuesto.periodicidad,
      activo: impuesto.activo,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setImpuestoToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (impuestoToDelete) {
      deleteMutation.mutate(impuestoToDelete);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingImpuesto) {
      updateMutation.mutate({ id: editingImpuesto.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getCalendarioCount = (impuestoId: string) => {
    return calendarios?.filter(c => c.impuestoId === impuestoId).length || 0;
  };

  const getPeriodicidadBadge = (periodicidad: string | null | undefined) => {
    if (!periodicidad) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }
    const variants: Record<string, { variant: "default" | "secondary" | "outline", label: string }> = {
      MENSUAL: { variant: "default", label: "Mensual" },
      TRIMESTRAL: { variant: "secondary", label: "Trimestral" },
      ANUAL: { variant: "outline", label: "Anual" },
    };
    const config = variants[periodicidad] || { variant: "outline" as const, label: periodicidad };
    return <Badge variant={config.variant} data-testid={`badge-periodicidad-${periodicidad.toLowerCase()}`}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Catálogo de Impuestos</h1>
          <p className="text-muted-foreground mt-1">Gestión de modelos fiscales AEAT</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} data-testid="button-add-impuesto">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Impuesto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingImpuesto ? "Editar Impuesto" : "Nuevo Impuesto"}</DialogTitle>
              <DialogDescription>
                {editingImpuesto ? "Modifica los datos del modelo fiscal" : "Registra un nuevo modelo fiscal AEAT"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo AEAT *</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="Ej: 303, 390, 130..."
                  required
                  data-testid="input-modelo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del Impuesto *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: IVA - Autoliquidación"
                  required
                  data-testid="input-nombre"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Impuesto</Label>
                <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                  <SelectTrigger data-testid="select-tipo">
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IVA">IVA</SelectItem>
                    <SelectItem value="IRPF">IRPF</SelectItem>
                    <SelectItem value="IS">Impuesto sobre Sociedades</SelectItem>
                    <SelectItem value="IRNR">IRNR</SelectItem>
                    <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodicidad">Periodicidad *</Label>
                <Select 
                  value={formData.periodicidad} 
                  onValueChange={(value: any) => setFormData({ ...formData, periodicidad: value })}
                >
                  <SelectTrigger data-testid="select-periodicidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MENSUAL">Mensual</SelectItem>
                    <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                    <SelectItem value="ANUAL">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción detallada del impuesto..."
                  data-testid="textarea-descripcion"
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="activo">Estado</Label>
                  <p className="text-sm text-muted-foreground">
                    {formData.activo ? "Impuesto activo y disponible" : "Impuesto desactivado"}
                  </p>
                </div>
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                  data-testid="switch-activo"
                />
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => { setIsDialogOpen(false); resetForm(); }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-impuesto"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : (editingImpuesto ? "Actualizar" : "Crear")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Modelos Fiscales Registrados
          </CardTitle>
          <CardDescription>
            {impuestos?.length || 0} impuestos configurados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!impuestos || impuestos.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No hay impuestos registrados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Comienza creando tu primer modelo fiscal
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Periodicidad</TableHead>
                  <TableHead className="text-center">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Calendarios
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impuestos.map((impuesto) => (
                  <TableRow key={impuesto.id} data-testid={`row-impuesto-${impuesto.id}`}>
                    <TableCell className="font-mono font-semibold" data-testid={`text-modelo-${impuesto.id}`}>
                      {impuesto.modelo}
                    </TableCell>
                    <TableCell data-testid={`text-nombre-${impuesto.id}`}>
                      <div>
                        <div className="font-medium">{impuesto.nombre}</div>
                        {impuesto.descripcion && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {impuesto.descripcion}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {impuesto.tipo ? (
                        <Badge variant="outline" data-testid={`badge-tipo-${impuesto.id}`}>{impuesto.tipo}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getPeriodicidadBadge(impuesto.periodicidad)}
                    </TableCell>
                    <TableCell className="text-center" data-testid={`text-calendarios-${impuesto.id}`}>
                      <Badge variant="secondary">
                        {getCalendarioCount(impuesto.id)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {impuesto.activo ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700" data-testid={`badge-activo-${impuesto.id}`}>
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" data-testid={`badge-inactivo-${impuesto.id}`}>
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(impuesto)}
                          data-testid={`button-edit-${impuesto.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(impuesto.id)}
                          data-testid={`button-delete-${impuesto.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              ¿Eliminar impuesto?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El impuesto será eliminado permanentemente del sistema.
              Si tiene obligaciones fiscales o calendarios asociados, no podrá eliminarse.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
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
