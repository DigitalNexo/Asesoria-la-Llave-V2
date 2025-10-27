import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type PriceCatalogItem = {
  id: string;
  key: string;
  title: string;
  unit?: string | null;
  basePrice: number;
  vatPct: number;
  active: boolean;
};

type BudgetLine = {
  id: string;
  concept: string;
  quantity: number;
  price: number;
  vatPct: number;
  subtotal: number;
};

export default function PresupuestoForm() {
  const { toast } = useToast();
  const [match, params] = useRoute<{ id: string }>('/documentacion/presupuestos/:id/editar');
  const isEdit = !!match;

  // Datos básicos
  const [series, setSeries] = useState<string>('AL');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [activity, setActivity] = useState('');
  const [validDays, setValidDays] = useState(30);
  const [notes, setNotes] = useState('');
  
  // Líneas del presupuesto
  const [lines, setLines] = useState<BudgetLine[]>([]);
  const [searchCatalog, setSearchCatalog] = useState('');

  // Catálogo de precios
  const { data: catalogData } = useQuery<PriceCatalogItem[]>({
    queryKey: ['/api/price-catalog'],
    queryFn: async () => {
      const res = await fetch('/api/price-catalog', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 60_000,
  });

  const catalogItems = catalogData || [];
  const filteredCatalog = useMemo(() => {
    if (!searchCatalog.trim()) return catalogItems.filter(c => c.active);
    const term = searchCatalog.toLowerCase();
    return catalogItems.filter(c => c.active && (
      c.title.toLowerCase().includes(term) || 
      c.key.toLowerCase().includes(term)
    ));
  }, [catalogItems, searchCatalog]);

  // Cálculos automáticos
  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const vatTotal = lines.reduce((sum, line) => sum + (line.subtotal * line.vatPct / 100), 0);
    const total = subtotal + vatTotal;
    return { subtotal, vatTotal, total };
  }, [lines]);

  const addLineFromCatalog = (item: PriceCatalogItem) => {
    const newLine: BudgetLine = {
      id: `new-${Date.now()}-${Math.random()}`,
      concept: item.title,
      quantity: 1,
      price: Number(item.basePrice),
      vatPct: Number(item.vatPct),
      subtotal: Number(item.basePrice),
    };
    setLines([...lines, newLine]);
    setSearchCatalog('');
    toast({ title: 'Línea añadida', description: `${item.title} agregado al presupuesto` });
  };

  const addEmptyLine = () => {
    const newLine: BudgetLine = {
      id: `new-${Date.now()}-${Math.random()}`,
      concept: '',
      quantity: 1,
      price: 0,
      vatPct: 21,
      subtotal: 0,
    };
    setLines([...lines, newLine]);
  };

  const updateLine = (id: string, field: keyof BudgetLine, value: any) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updated = { ...line, [field]: value };
      updated.subtotal = updated.quantity * updated.price;
      return updated;
    }));
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) {
      toast({ title: 'Error', description: 'El nombre del cliente es obligatorio', variant: 'destructive' });
      return;
    }

    if (lines.length === 0) {
      toast({ title: 'Error', description: 'Añade al menos una línea al presupuesto', variant: 'destructive' });
      return;
    }

    const payload = {
      series,
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || null,
      clientPhone: clientPhone.trim() || null,
      activity: activity.trim() || null,
      validDays,
      notes: notes.trim() || null,
      subtotal: totals.subtotal,
      vatTotal: totals.vatTotal,
      total: totals.total,
      items: lines.map((line, idx) => ({
        order: idx + 1,
        concept: line.concept,
        quantity: line.quantity,
        price: line.price,
        vatPct: line.vatPct,
        subtotal: line.subtotal,
      })),
    };

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'No se pudo crear el presupuesto');
      }

      const created = await res.json();
      toast({ title: 'Presupuesto creado', description: `Código: ${created.code}` });
      window.location.href = `/documentacion/presupuestos/${created.id}/ver`;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {isEdit ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Completa los datos del cliente y añade líneas desde el catálogo o manualmente
          </p>
        </div>
        <Link href="/documentacion/presupuestos">
          <Button variant="outline">
            <X className="h-4 w-4 mr-2" />Cancelar
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Encabezado */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="series">Serie *</Label>
                <Select value={series} onValueChange={setSeries}>
                  <SelectTrigger id="series">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AL">AL - Asesoría La Llave</SelectItem>
                    <SelectItem value="GO">GO - Gestoría Ortega</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="validDays">Vigencia (días) *</Label>
                <Input
                  id="validDays"
                  type="number"
                  min="1"
                  value={validDays}
                  onChange={(e) => setValidDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Vence el</Label>
                <div className="flex items-center h-10 px-3 border rounded-md bg-muted text-sm">
                  {new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Datos del cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Datos del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Nombre / Razón Social *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Email</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientPhone">Teléfono</Label>
                <Input
                  id="clientPhone"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: 612345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activity">Actividad</Label>
                <Input
                  id="activity"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Ej: Comercio minorista"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Catálogo de servicios */}
        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Servicios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar servicios en el catálogo..."
                value={searchCatalog}
                onChange={(e) => setSearchCatalog(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchCatalog && filteredCatalog.length > 0 && (
              <div className="border rounded-md p-2 space-y-2 max-h-60 overflow-y-auto">
                {filteredCatalog.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-md cursor-pointer"
                    onClick={() => addLineFromCatalog(item)}
                  >
                    <div>
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.key} · {item.unit || 'unidad'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{Number(item.basePrice).toFixed(2)} €</p>
                      <p className="text-xs text-muted-foreground">IVA {item.vatPct}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Líneas del presupuesto */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Líneas del Presupuesto</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addEmptyLine}>
                <Plus className="h-4 w-4 mr-2" />Añadir Línea Libre
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {lines.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                <p>No hay líneas. Busca servicios en el catálogo o añade líneas manualmente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lines.map((line) => (
                  <div key={line.id} className="grid grid-cols-12 gap-2 items-start p-3 border rounded-md">
                    <div className="col-span-5">
                      <Input
                        placeholder="Concepto"
                        value={line.concept}
                        onChange={(e) => updateLine(line.id, 'concept', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Cant."
                        value={line.quantity}
                        onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Precio"
                        value={line.price}
                        onChange={(e) => updateLine(line.id, 'price', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={line.vatPct}
                        onChange={(e) => updateLine(line.id, 'vatPct', Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end font-semibold text-sm">
                      {line.subtotal.toFixed(2)} €
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(line.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader>
            <CardTitle>Totales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (Base Imponible):</span>
              <span className="font-semibold">{totals.subtotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA Total:</span>
              <span className="font-semibold">{totals.vatTotal.toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-bold">TOTAL:</span>
              <span className="font-bold text-primary">{totals.total.toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas Internas</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full min-h-[100px] p-3 border rounded-md"
              placeholder="Añade notas internas (no se mostrarán en el PDF del cliente)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3">
          <Link href="/documentacion/presupuestos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Guardar Cambios' : 'Crear Presupuesto'}
          </Button>
        </div>
      </form>
    </div>
  );
}
