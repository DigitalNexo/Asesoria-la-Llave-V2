import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import {
  getTaxModels,
  createTaxModel,
  updateTaxModel,
  deleteTaxModel,
  type TaxModel,
  type CreateTaxModelInput,
} from "@/features/tax-models/api";
import { TaxesNav } from "@/components/taxes-nav";

const CLIENT_TYPES = [
  { value: "AUTONOMO", label: "Autónomo" },
  { value: "EMPRESA", label: "Empresa" },
  { value: "PARTICULAR", label: "Particular" },
];

const PERIODICITIES = [
  { value: "MENSUAL", label: "Mensual" },
  { value: "TRIMESTRAL", label: "Trimestral" },
  { value: "ANUAL", label: "Anual" },
  { value: "ESPECIAL_FRACCIONADO", label: "Especial Fraccionado" },
];

export default function TaxModelsPage() {
  const { toast } = useToast();
  const [models, setModels] = useState<TaxModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<TaxModel | null>(null);
  const [modelToDelete, setModelToDelete] = useState<TaxModel | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateTaxModelInput>({
    code: "",
    name: "",
    allowedTypes: [],
    allowedPeriods: [],
  });

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await getTaxModels();
      setModels(data);
    } catch (error: any) {
      toast({
        title: "Error al cargar modelos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (model?: TaxModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        code: model.code,
        name: model.name,
        allowedTypes: model.allowedTypes,
        allowedPeriods: model.allowedPeriods,
      });
    } else {
      setEditingModel(null);
      setFormData({
        code: "",
        name: "",
        allowedTypes: [],
        allowedPeriods: [],
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingModel(null);
    setFormData({
      code: "",
      name: "",
      allowedTypes: [],
      allowedPeriods: [],
    });
  };

  const handleSave = async () => {
    try {
      if (!formData.code || !formData.name) {
        toast({
          title: "Campos requeridos",
          description: "El código y el nombre son obligatorios",
          variant: "destructive",
        });
        return;
      }

      setSaving(true);

      if (editingModel) {
        await updateTaxModel(editingModel.code, {
          name: formData.name,
          allowedTypes: formData.allowedTypes,
          allowedPeriods: formData.allowedPeriods,
        });
        toast({
          title: "Modelo actualizado",
          description: `El modelo ${formData.code} se actualizó correctamente`,
        });
      } else {
        await createTaxModel(formData);
        toast({
          title: "Modelo creado",
          description: `El modelo ${formData.code} se creó correctamente`,
        });
      }

      handleCloseDialog();
      loadModels();
    } catch (error: any) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!modelToDelete) return;

    try {
      await deleteTaxModel(modelToDelete.code);
      toast({
        title: "Modelo eliminado",
        description: `El modelo ${modelToDelete.code} se eliminó correctamente`,
      });
      setDeleteDialogOpen(false);
      setModelToDelete(null);
      loadModels();
    } catch (error: any) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleClientType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedTypes: prev.allowedTypes.includes(type)
        ? prev.allowedTypes.filter((t) => t !== type)
        : [...prev.allowedTypes, type],
    }));
  };

  const togglePeriodicity = (period: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedPeriods: prev.allowedPeriods.includes(period)
        ? prev.allowedPeriods.filter((p) => p !== period)
        : [...prev.allowedPeriods, period],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold">Impuestos</h1>
        <p className="text-sm text-muted-foreground">Seguimiento y planificación fiscal con la misma experiencia consistente que Administración.</p>
      </div>

      <TaxesNav />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Modelos Fiscales</h2>
          <p className="text-muted-foreground">
            Gestiona los modelos fiscales disponibles para asignar a clientes
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Modelo
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipos de Cliente</TableHead>
              <TableHead>Periodicidades</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              <TableHead className="w-[100px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {models.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  No hay modelos fiscales registrados
                </TableCell>
              </TableRow>
            ) : (
              models.map((model) => (
                <TableRow key={model.code}>
                  <TableCell className="font-mono font-semibold">{model.code}</TableCell>
                  <TableCell>{model.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {model.allowedTypes.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {CLIENT_TYPES.find((t) => t.value === type)?.label || type}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {model.allowedPeriods.map((period) => (
                        <Badge key={period} variant="secondary" className="text-xs">
                          {PERIODICITIES.find((p) => p.value === period)?.label || period}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {model.isActive ? (
                      <Badge variant="default" className="bg-green-600">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(model)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModelToDelete(model);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingModel ? "Editar Modelo Fiscal" : "Nuevo Modelo Fiscal"}
            </DialogTitle>
            <DialogDescription>
              {editingModel
                ? "Modifica los datos del modelo fiscal"
                : "Completa los datos del nuevo modelo fiscal"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código del Modelo*</Label>
                <Input
                  id="code"
                  placeholder="Ej: 303, 111, 130"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  disabled={!!editingModel}
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground">
                  {editingModel ? "No se puede modificar el código" : "Código único del modelo"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Modelo*</Label>
                <Input
                  id="name"
                  placeholder="Ej: IVA - Autoliquidación"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipos de Cliente Permitidos</Label>
              <div className="flex flex-col gap-2">
                {CLIENT_TYPES.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={formData.allowedTypes.includes(type.value)}
                      onCheckedChange={() => toggleClientType(type.value)}
                    />
                    <label
                      htmlFor={type.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Periodicidades Permitidas</Label>
              <div className="flex flex-col gap-2">
                {PERIODICITIES.map((period) => (
                  <div key={period.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={period.value}
                      checked={formData.allowedPeriods.includes(period.value)}
                      onCheckedChange={() => togglePeriodicity(period.value)}
                    />
                    <label
                      htmlFor={period.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {period.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el modelo{" "}
              <strong>{modelToDelete?.code}</strong> - {modelToDelete?.name}.
              <br />
              <br />
              No se podrá eliminar si tiene asignaciones activas a clientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
