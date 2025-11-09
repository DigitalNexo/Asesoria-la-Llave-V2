import React, { useEffect, useState } from 'react';
import useAutonomoConfig, { type FiscalModel } from '../../hooks/useAutonomoConfig';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';

interface FiscalModelsTableProps {
  refreshParent?: () => void;
}

export default function FiscalModelsTable({ refreshParent }: FiscalModelsTableProps) {
  const { getFiscalModels, createFiscalModel, updateFiscalModel, deleteFiscalModel } = useAutonomoConfig();
  const { toast } = useToast();
  const [items, setItems] = useState<FiscalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FiscalModel | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<FiscalModel | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    orden: 0,
    codigoModelo: '',
    nombreModelo: '',
    precio: 0,
    activo: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFiscalModels();
      setItems(data.sort((a, b) => a.orden - b.orden));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los modelos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (item?: FiscalModel) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        orden: item.orden,
        codigoModelo: item.codigoModelo,
        nombreModelo: item.nombreModelo,
        precio: item.precio,
        activo: item.activo,
      });
    } else {
      setEditingItem(null);
      setFormData({
        orden: items.length + 1,
        codigoModelo: '',
        nombreModelo: '',
        precio: 0,
        activo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateFiscalModel(editingItem.id, formData);
        toast({ title: 'Modelo actualizado', description: 'Los cambios se han guardado correctamente' });
      } else {
        await createFiscalModel(formData);
        toast({ title: 'Modelo creado', description: 'El nuevo modelo se ha añadido correctamente' });
      }
      setDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el modelo',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: FiscalModel) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    try {
      await deleteFiscalModel(itemToDelete.id);
      toast({ title: 'Modelo eliminado', description: 'El modelo se ha eliminado correctamente' });
      setDeleteDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo eliminar el modelo',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: FiscalModel) => {
    try {
      await updateFiscalModel(item.id, { activo: !item.activo });
      toast({ title: 'Estado actualizado', description: `Modelo ${item.activo ? 'desactivado' : 'activado'}` });
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo cambiar el estado',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {items.length} modelo{items.length !== 1 ? 's' : ''} configurado{items.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Modelo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Modelo' : 'Nuevo Modelo'}</DialogTitle>
              <DialogDescription>
                Configura un modelo fiscal con su precio mensual
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orden">Orden</Label>
                <Input
                  id="orden"
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigoModelo">Código Modelo</Label>
                <Input
                  id="codigoModelo"
                  value={formData.codigoModelo}
                  onChange={(e) => setFormData({ ...formData, codigoModelo: e.target.value })}
                  placeholder="Ej: 303"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombreModelo">Nombre Modelo</Label>
                <Input
                  id="nombreModelo"
                  value={formData.nombreModelo}
                  onChange={(e) => setFormData({ ...formData, nombreModelo: e.target.value })}
                  placeholder="Ej: Autoliquidación IVA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precio">Precio Mensual (€)</Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Orden</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.orden}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">{item.codigoModelo}</code>
                </TableCell>
                <TableCell>{item.nombreModelo}</TableCell>
                <TableCell>€{item.precio.toFixed(2)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={item.activo} onCheckedChange={() => toggleActive(item)} />
                    <Badge variant={item.activo ? 'default' : 'secondary'}>
                      {item.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(item)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el modelo permanentemente. Los presupuestos que usen este modelo se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
