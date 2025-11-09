import React, { useEffect, useState } from 'react';
import useAutonomoConfig, { type BillingTier } from '../../hooks/useAutonomoConfig';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface BillingTiersTableProps {
  refreshParent?: () => void;
}

export default function BillingTiersTable({ refreshParent }: BillingTiersTableProps) {
  const { getBillingTiers, createBillingTier, updateBillingTier, deleteBillingTier } = useAutonomoConfig();
  const { toast } = useToast();
  const [items, setItems] = useState<BillingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingTier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<BillingTier | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    orden: 0,
    minFacturacion: 0,
    maxFacturacion: null as number | null,
    multiplicador: 1,
    etiqueta: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBillingTiers();
      setItems(data.sort((a, b) => a.orden - b.orden));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudieron cargar los tramos',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (item?: BillingTier) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        orden: item.orden,
        minFacturacion: item.minFacturacion,
        maxFacturacion: item.maxFacturacion,
        multiplicador: item.multiplicador,
        etiqueta: item.etiqueta || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        orden: items.length + 1,
        minFacturacion: 0,
        maxFacturacion: null,
        multiplicador: 1,
        etiqueta: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateBillingTier(editingItem.id, formData);
        toast({ title: 'Tramo actualizado', description: 'Los cambios se han guardado correctamente' });
      } else {
        await createBillingTier(formData);
        toast({ title: 'Tramo creado', description: 'El nuevo tramo se ha añadido correctamente' });
      }
      setDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo guardar el tramo',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: BillingTier) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    try {
      await deleteBillingTier(itemToDelete.id);
      toast({ title: 'Tramo eliminado', description: 'El tramo se ha eliminado correctamente' });
      setDeleteDialogOpen(false);
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo eliminar el tramo',
      });
    } finally {
      setSaving(false);
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
          {items.length} tramo{items.length !== 1 ? 's' : ''} configurado{items.length !== 1 ? 's' : ''}
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Añadir Tramo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Tramo' : 'Nuevo Tramo'}</DialogTitle>
              <DialogDescription>
                Define el rango de facturación anual y el multiplicador correspondiente
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minFacturacion">Mín. Facturación (€)</Label>
                  <Input
                    id="minFacturacion"
                    type="number"
                    value={formData.minFacturacion}
                    onChange={(e) => setFormData({ ...formData, minFacturacion: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFacturacion">Máx. Facturación (€)</Label>
                  <Input
                    id="maxFacturacion"
                    type="number"
                    value={formData.maxFacturacion ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, maxFacturacion: e.target.value ? parseFloat(e.target.value) : null })
                    }
                    placeholder="∞ (dejar vacío)"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="multiplicador">Multiplicador</Label>
                <Input
                  id="multiplicador"
                  type="number"
                  step="0.01"
                  value={formData.multiplicador}
                  onChange={(e) => setFormData({ ...formData, multiplicador: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="etiqueta">Etiqueta</Label>
                <Input
                  id="etiqueta"
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                  placeholder="Ej: De 0 a 100.000€"
                />
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
              <TableHead>Min</TableHead>
              <TableHead>Max</TableHead>
              <TableHead>Multiplicador</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.orden}</TableCell>
                <TableCell>€{item.minFacturacion.toLocaleString()}</TableCell>
                <TableCell>{item.maxFacturacion ? `€${item.maxFacturacion.toLocaleString()}` : '∞'}</TableCell>
                <TableCell>{item.multiplicador}x</TableCell>
                <TableCell>{item.etiqueta}</TableCell>
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
              Esta acción eliminará el tramo permanentemente. Los presupuestos que usen este rango se verán afectados.
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
