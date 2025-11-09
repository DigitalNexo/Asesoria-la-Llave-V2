import React, { useEffect, useState } from 'react';
import useAutonomoConfig, { type InvoiceTier } from '../../hooks/useAutonomoConfig';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Plus, Pencil, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface InvoiceTiersTableProps {
  refreshParent?: () => void;
}

function SortableRow({ tier, onEdit, onDelete }: { tier: InvoiceTier; onEdit: (tier: InvoiceTier) => void; onDelete: (tier: InvoiceTier) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tier.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>{tier.orden}</TableCell>
      <TableCell>{tier.minFacturas}</TableCell>
      <TableCell>{tier.maxFacturas ?? '∞'}</TableCell>
      <TableCell>€{tier.precio.toFixed(2)}</TableCell>
      <TableCell>{tier.etiqueta}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(tier)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(tier)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function InvoiceTiersTable({ refreshParent }: InvoiceTiersTableProps) {
  const { getInvoiceTiers, createInvoiceTier, updateInvoiceTier, deleteInvoiceTier, reorderInvoiceTiers } = useAutonomoConfig();
  const { toast } = useToast();
  const [items, setItems] = useState<InvoiceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceTier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InvoiceTier | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [formData, setFormData] = useState({
    orden: 0,
    minFacturas: 0,
    maxFacturas: null as number | null,
    precio: 0,
    etiqueta: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInvoiceTiers();
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    // Update orden values
    const orders = reordered.map((item, idx) => ({ id: item.id, orden: idx + 1 }));
    
    try {
      await reorderInvoiceTiers(orders);
      toast({ title: 'Orden actualizado', description: 'Los tramos se han reordenado correctamente' });
      await load();
      refreshParent?.();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo reordenar',
      });
      await load(); // reload to reset
    }
  };

  const openDialog = (item?: InvoiceTier) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        orden: item.orden,
        minFacturas: item.minFacturas,
        maxFacturas: item.maxFacturas,
        precio: item.precio,
        etiqueta: item.etiqueta || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        orden: items.length + 1,
        minFacturas: 0,
        maxFacturas: null,
        precio: 0,
        etiqueta: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingItem) {
        await updateInvoiceTier(editingItem.id, formData);
        toast({ title: 'Tramo actualizado', description: 'Los cambios se han guardado correctamente' });
      } else {
        await createInvoiceTier(formData);
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

  const confirmDelete = (item: InvoiceTier) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    try {
      await deleteInvoiceTier(itemToDelete.id);
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
                Define el rango de facturas y el precio correspondiente
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
                  <Label htmlFor="minFacturas">Mín. Facturas</Label>
                  <Input
                    id="minFacturas"
                    type="number"
                    value={formData.minFacturas}
                    onChange={(e) => setFormData({ ...formData, minFacturas: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxFacturas">Máx. Facturas</Label>
                  <Input
                    id="maxFacturas"
                    type="number"
                    value={formData.maxFacturas ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, maxFacturas: e.target.value ? parseInt(e.target.value) : null })
                    }
                    placeholder="∞ (dejar vacío)"
                  />
                </div>
              </div>
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
                <Label htmlFor="etiqueta">Etiqueta</Label>
                <Input
                  id="etiqueta"
                  value={formData.etiqueta}
                  onChange={(e) => setFormData({ ...formData, etiqueta: e.target.value })}
                  placeholder="Ej: De 0 a 25 facturas"
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
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Orden</TableHead>
              <TableHead>Min</TableHead>
              <TableHead>Max</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Etiqueta</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {items.map((item) => (
                  <SortableRow 
                    key={item.id} 
                    tier={item} 
                    onEdit={openDialog} 
                    onDelete={confirmDelete} 
                  />
                ))}
              </TableBody>
            </SortableContext>
          </DndContext>
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
