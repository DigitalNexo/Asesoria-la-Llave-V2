import React, { useEffect, useState } from 'react';
import useAutonomoConfig, { type ServiceItem } from '../../hooks/useAutonomoConfig';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';

interface ServicesTableProps {
  refreshParent?: () => void;
}

export default function ServicesTable({ refreshParent }: ServicesTableProps) {
  const { getServices, createService, updateService, deleteService } = useAutonomoConfig();
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    orden: 0,
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    tipoServicio: 'MENSUAL' as 'MENSUAL' | 'PUNTUAL',
    activo: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getServices();
      setItems(data.sort((a, b) => a.orden - b.orden));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los servicios',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (item?: ServiceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        orden: item.orden,
        codigo: item.codigo,
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        precio: item.precio,
        tipoServicio: item.tipoServicio,
        activo: item.activo,
      });
    } else {
      setEditingItem(null);
      setFormData({
        orden: items.length + 1,
        codigo: '',
        nombre: '',
        descripcion: '',
        precio: 0,
        tipoServicio: 'MENSUAL',
        activo: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateService(editingItem.id, formData);
        toast({ title: 'Servicio actualizado', description: 'Los cambios se han guardado correctamente' });
      } else {
        await createService(formData);
        toast({ title: 'Servicio creado', description: 'El nuevo servicio se ha añadido correctamente' });
      }
      setDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el servicio',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: ServiceItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    try {
      await deleteService(itemToDelete.id);
      toast({ title: 'Servicio eliminado', description: 'El servicio se ha eliminado correctamente' });
      setDeleteDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo eliminar el servicio',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: ServiceItem) => {
    try {
      await updateService(item.id, { activo: !item.activo });
      toast({ title: 'Estado actualizado', description: `Servicio ${item.activo ? 'desactivado' : 'activado'}` });
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
          {items.length} servicio{items.length !== 1 ? 's' : ''} configurado{items.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Servicio' : 'Nuevo Servicio'}</DialogTitle>
              <DialogDescription>
                Configura un servicio adicional con su precio y tipo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
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
                  <Label htmlFor="codigo">Código</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej: ASESORIA_EXTRA"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Asesoría Personalizada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción del servicio"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="precio">Precio (€)</Label>
                  <Input
                    id="precio"
                    type="number"
                    step="0.01"
                    value={formData.precio}
                    onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoServicio">Tipo de Servicio</Label>
                  <Select value={formData.tipoServicio} onValueChange={(v) => setFormData({ ...formData, tipoServicio: v as 'MENSUAL' | 'PUNTUAL' })}>
                    <SelectTrigger id="tipoServicio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSUAL">Mensual</SelectItem>
                      <SelectItem value="PUNTUAL">Puntual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.orden}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-sm">{item.codigo}</code>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{item.nombre}</div>
                    {item.descripcion && (
                      <div className="text-xs text-muted-foreground">{item.descripcion}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>€{item.precio.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={item.tipoServicio === 'MENSUAL' ? 'default' : 'outline'}>
                    {item.tipoServicio}
                  </Badge>
                </TableCell>
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
              Esta acción eliminará el servicio permanentemente. Los presupuestos que usen este servicio se verán afectados.
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
