import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type BudgetItem = {
  id?: string;
  concept: string;
  category?: string | null;
  position: number;
  quantity: number;
  unitPrice: number;
  vatPct: number;
  subtotal: number;
  total: number;
  isManuallyEdited?: boolean;
};

type Budget = {
  id: string;
  code: string;
  clientName: string;
  clientNif?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientAddress?: string | null;
  validityDays: number;
  paymentTerms?: string | null;
  notes?: string | null;
  subtotal: number;
  vatTotal: number;
  total: number;
  customTotal?: number | null;
  manuallyEdited?: boolean;
  items: BudgetItem[];
};

export default function PresupuestoEdit() {
  const [match, params] = useRoute<{ id: string }>('/documentacion/presupuestos/:id/editar');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = params?.id;

  const [clientName, setClientName] = useState('');
  const [clientNif, setClientNif] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [validityDays, setValidityDays] = useState(30);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [useCustomTotal, setUseCustomTotal] = useState(false);
  const [customTotal, setCustomTotal] = useState('');

  const { data: budget, isLoading } = useQuery<Budget>({
    queryKey: ['/api/budgets', id],
    queryFn: async () => {
      if (!id) throw new Error('ID no proporcionado');
      const res = await fetch(`/api/budgets/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('No se pudo cargar el presupuesto');
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (budget) {
      setClientName(budget.clientName || '');
      setClientNif(budget.clientNif || '');
      setClientEmail(budget.clientEmail || '');
      setClientPhone(budget.clientPhone || '');
      setClientAddress(budget.clientAddress || '');
      setValidityDays(budget.validityDays || 30);
      setPaymentTerms(budget.paymentTerms || '');
      setNotes(budget.notes || '');
      
      // Convertir Decimals a números
      const normalizedItems = (budget.items || []).map(item => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        vatPct: Number(item.vatPct),
        subtotal: Number(item.subtotal),
        total: Number(item.total),
      }));
      setItems(normalizedItems);
      
      if (budget.customTotal && Number(budget.customTotal) > 0) {
        setUseCustomTotal(true);
        setCustomTotal(Number(budget.customTotal).toString());
      }
    }
  }, [budget]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Error al actualizar el presupuesto');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      toast({
        title: 'Presupuesto actualizado',
        description: 'Los cambios se han guardado correctamente',
      });
      setLocation(`/documentacion/presupuestos/${id}`);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'No se pudo actualizar el presupuesto',
      });
    },
  });

  const handleSave = () => {
    // Calcular totales de los items
    let calculatedSubtotal = 0;
    let calculatedVatTotal = 0;
    
    items.forEach(item => {
      const subtotal = item.quantity * item.unitPrice;
      const vat = subtotal * (item.vatPct / 100);
      calculatedSubtotal += subtotal;
      calculatedVatTotal += vat;
    });

    const data: any = {
      clientName,
      clientNif: clientNif || null,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      clientAddress: clientAddress || null,
      validityDays,
      paymentTerms: paymentTerms || null,
      notes: notes || null,
      items: items.map((item, index) => ({
        concept: item.concept,
        category: item.category || null,
        position: index + 1,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        vatPct: item.vatPct,
        isManuallyEdited: item.isManuallyEdited || true,
      })),
      subtotal: calculatedSubtotal,
      vatTotal: calculatedVatTotal,
      total: calculatedSubtotal + calculatedVatTotal,
    };

    // Si hay total personalizado, agregarlo
    if (useCustomTotal && customTotal) {
      data.customTotal = parseFloat(customTotal);
    } else {
      data.customTotal = null;
    }

    updateMutation.mutate(data);
  };

  const handleUpdateItem = (index: number, field: keyof BudgetItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalcular subtotal y total del item
    if (field === 'quantity' || field === 'unitPrice' || field === 'vatPct') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : newItems[index].unitPrice;
      const vatPct = field === 'vatPct' ? parseFloat(value) || 0 : newItems[index].vatPct;
      
      const subtotal = quantity * unitPrice;
      const total = subtotal * (1 + vatPct / 100);
      
      newItems[index].subtotal = subtotal;
      newItems[index].total = total;
      newItems[index].isManuallyEdited = true;
    }
    
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, {
      concept: '',
      position: items.length + 1,
      quantity: 1,
      unitPrice: 0,
      vatPct: 21,
      subtotal: 0,
      total: 0,
      isManuallyEdited: true,
    }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  if (!budget) {
    return <div className="p-8">Presupuesto no encontrado</div>;
  }

  // Calcular totales actuales
  const calculatedSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const calculatedVatTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.vatPct / 100), 0);
  const calculatedTotal = calculatedSubtotal + calculatedVatTotal;
  const finalTotal = useCustomTotal && customTotal ? parseFloat(customTotal) : calculatedTotal;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/documentacion/presupuestos/${id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Presupuesto</h1>
          <p className="text-muted-foreground">{budget.code}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Datos del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Nombre / Razón Social *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="clientNif">NIF/CIF</Label>
                <Input
                  id="clientNif"
                  value={clientNif}
                  onChange={(e) => setClientNif(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clientAddress">Dirección</Label>
                <Input
                  id="clientAddress"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items del Presupuesto */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Conceptos</CardTitle>
              <Button onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Concepto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <Label>Concepto</Label>
                        <Input
                          value={item.concept}
                          onChange={(e) => handleUpdateItem(index, 'concept', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Cantidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Precio Unit. (€)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateItem(index, 'unitPrice', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>IVA (%)</Label>
                        <Input
                          type="number"
                          step="1"
                          value={item.vatPct}
                          onChange={(e) => handleUpdateItem(index, 'vatPct', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Total (€)</Label>
                        <Input
                          value={item.total.toFixed(2)}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(index)}
                      className="ml-2"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader>
            <CardTitle>Totales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Subtotal</Label>
                <Input value={`${calculatedSubtotal.toFixed(2)} €`} disabled className="bg-muted" />
              </div>
              <div>
                <Label>IVA</Label>
                <Input value={`${calculatedVatTotal.toFixed(2)} €`} disabled className="bg-muted" />
              </div>
              <div>
                <Label>Total Calculado</Label>
                <Input value={`${calculatedTotal.toFixed(2)} €`} disabled className="bg-muted" />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCustomTotal"
                  checked={useCustomTotal}
                  onCheckedChange={(checked) => setUseCustomTotal(checked as boolean)}
                />
                <Label htmlFor="useCustomTotal" className="cursor-pointer">
                  Usar total personalizado (edición manual)
                </Label>
              </div>
              
              {useCustomTotal && (
                <div>
                  <Label htmlFor="customTotal">Total Personalizado (€)</Label>
                  <Input
                    id="customTotal"
                    type="number"
                    step="0.01"
                    value={customTotal}
                    onChange={(e) => setCustomTotal(e.target.value)}
                    placeholder="Ej: 1250.00"
                  />
                </div>
              )}

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Final:</span>
                  <span className="text-2xl font-bold text-primary">
                    {finalTotal.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Condiciones */}
        <Card>
          <CardHeader>
            <CardTitle>Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validityDays">Validez (días)</Label>
                <Input
                  id="validityDays"
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
                />
              </div>
              <div>
                <Label htmlFor="paymentTerms">Forma de Pago</Label>
                <Input
                  id="paymentTerms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Ej: Transferencia bancaria"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notas / Observaciones</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Información adicional..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end gap-3">
          <Link href={`/documentacion/presupuestos/${id}`}>
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
