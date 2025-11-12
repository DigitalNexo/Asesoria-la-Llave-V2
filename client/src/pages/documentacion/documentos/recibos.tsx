import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Send, FileDown, ArrowLeft, User, Building2, Download, Pencil } from 'lucide-react';
import * as documentsApi from '@/lib/api/documents';
import { apiRequest } from '@/lib/queryClient';

export default function RecibosPage() {
  const [, setLocation] = useLocation();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [recipientType, setRecipientType] = useState<'client' | 'external'>('client');
  const [calculationMode, setCalculationMode] = useState<'base' | 'total'>('total');
  const [baseImponible, setBaseImponible] = useState('');
  const [ivaPorcentaje, setIvaPorcentaje] = useState('21');
  const [precioTotal, setPrecioTotal] = useState('');
  const queryClient = useQueryClient();

    // Queries
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ['/api/documents/receipts'],
    queryFn: () => documentsApi.listReceipts(),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: () => apiRequest('GET', '/api/clients'),
  });

  // Cálculos automáticos
  const handleTotalChange = (value: string) => {
    setPrecioTotal(value);
    if (value && !isNaN(parseFloat(value))) {
      const total = parseFloat(value);
      const iva = parseFloat(ivaPorcentaje) || 21;
      const base = total / (1 + iva / 100);
      setBaseImponible(base.toFixed(2));
    }
  };

  const handleBaseChange = (value: string) => {
    setBaseImponible(value);
    if (value && !isNaN(parseFloat(value))) {
      const base = parseFloat(value);
      const iva = parseFloat(ivaPorcentaje) || 21;
      const total = base * (1 + iva / 100);
      setPrecioTotal(total.toFixed(2));
    }
  };

  const handleIvaChange = (value: string) => {
    setIvaPorcentaje(value);
    if (calculationMode === 'total' && precioTotal) {
      handleTotalChange(precioTotal);
    } else if (calculationMode === 'base' && baseImponible) {
      handleBaseChange(baseImponible);
    }
  };

  // Helper para resetear el formulario
  const resetForm = () => {
    setRecipientType('client');
    setCalculationMode('total');
    setBaseImponible('');
    setIvaPorcentaje('21');
    setPrecioTotal('');
  };

  // Helper para descargar PDF
  const handleDownloadPdf = (pdfPath: string, numero: string) => {
    // Convertir ruta absoluta a relativa si es necesario
    let url = pdfPath;
    if (pdfPath.startsWith('/root/')) {
      // Extraer solo la parte de uploads/documents/...
      const match = pdfPath.match(/uploads\/documents\/.+$/);
      if (match) {
        url = `/${match[0]}`;
      }
    }
    window.open(url, '_blank');
  };

  // Helper para abrir diálogo de nuevo recibo
  const handleOpenNew = () => {
    setEditingReceipt(null);
    resetForm();
    setOpenDialog(true);
  };

  // Helper para abrir diálogo de edición
  const handleOpenEdit = (receipt: any) => {
    setEditingReceipt(receipt);
    setRecipientType(receipt.client_id ? 'client' : 'external');
    setBaseImponible(receipt.base_imponible.toString());
    setIvaPorcentaje(receipt.iva_porcentaje.toString());
    setPrecioTotal(receipt.total.toString());
    setOpenDialog(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: documentsApi.createReceipt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setOpenDialog(false);
      setEditingReceipt(null);
      resetForm();
      toast({ title: 'Recibo creado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      documentsApi.updateReceipt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setOpenDialog(false);
      setEditingReceipt(null);
      resetForm();
      toast({ title: 'Recibo actualizado correctamente' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const generatePdfMutation = useMutation({
    mutationFn: (id: string) => documentsApi.generateReceiptPdf(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'PDF generado correctamente' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: ({ id, to }: { id: string; to: string }) =>
      documentsApi.sendReceipt(id, { to }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast({ title: 'Recibo enviado correctamente' });
    },
  });

  // Form handlers
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data: any = {
      concepto: formData.get('concepto') as string,
      base_imponible: parseFloat(baseImponible),
      iva_porcentaje: parseFloat(ivaPorcentaje) || 21,
      notes: formData.get('notes') as string || undefined,
    };

    if (recipientType === 'client') {
      data.clientId = formData.get('clientId') as string;
      const client = clients.find((c: any) => c.id === data.clientId);
      if (client) {
        data.recipient_name = client.razonSocial;
        data.recipient_nif = client.nifCif;
        data.recipient_email = client.email || '';
      }
    } else {
      data.recipient_name = formData.get('recipient_name') as string;
      data.recipient_nif = formData.get('recipient_nif') as string;
      data.recipient_email = formData.get('recipient_email') as string;
      data.recipient_address = formData.get('recipient_address') as string || undefined;
    }

    if (editingReceipt) {
      updateMutation.mutate({ id: editingReceipt.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleOpenDialog = () => {
    setEditingReceipt(null);
    setRecipientType('client');
    setBaseImponible('');
    setIvaPorcentaje('21');
    setPrecioTotal('');
    setCalculationMode('total');
    setOpenDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      BORRADOR: 'secondary',
      ENVIADO: 'default',
      ARCHIVADO: 'outline',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => setLocation('/documentacion/documentos')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Recibos</h1>
          <p className="text-muted-foreground mt-1">
            Genera y gestiona recibos para clientes o externos
          </p>
        </div>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Recibo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReceipt ? 'Editar Recibo' : 'Crear Nuevo Recibo'}</DialogTitle>
              <DialogDescription>
                {editingReceipt ? 'Modifica los datos del recibo' : 'Genera un recibo para un cliente registrado o una persona externa'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Tipo de destinatario */}
              <div className="space-y-2">
                <Label>Tipo de Destinatario</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={recipientType === 'client' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('client')}
                    className="flex-1"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Cliente Registrado
                  </Button>
                  <Button
                    type="button"
                    variant={recipientType === 'external' ? 'default' : 'outline'}
                    onClick={() => setRecipientType('external')}
                    className="flex-1"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Persona Externa
                  </Button>
                </div>
              </div>

              {/* Selector de cliente o datos externos */}
              {recipientType === 'client' ? (
                <div className="space-y-2">
                  <Label htmlFor="clientId">Cliente *</Label>
                  <Select name="clientId" required defaultValue={editingReceipt?.client_id}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.razonSocial} - {client.nifCif}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient_name">Nombre/Razón Social *</Label>
                      <Input id="recipient_name" name="recipient_name" required defaultValue={editingReceipt?.recipient_name} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient_nif">NIF/CIF *</Label>
                      <Input id="recipient_nif" name="recipient_nif" required defaultValue={editingReceipt?.recipient_nif} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient_email">Email *</Label>
                      <Input id="recipient_email" name="recipient_email" type="email" required defaultValue={editingReceipt?.recipient_email} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipient_address">Dirección</Label>
                      <Input id="recipient_address" name="recipient_address" defaultValue={editingReceipt?.recipient_address} />
                    </div>
                  </div>
                </>
              )}

              {/* Datos del recibo */}
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Textarea id="concepto" name="concepto" required rows={2} defaultValue={editingReceipt?.concepto} />
              </div>

              {/* Modo de cálculo */}
              <div className="space-y-2">
                <Label>Modo de Cálculo</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={calculationMode === 'total' ? 'default' : 'outline'}
                    onClick={() => setCalculationMode('total')}
                    className="flex-1"
                  >
                    Introducir Precio Total
                  </Button>
                  <Button
                    type="button"
                    variant={calculationMode === 'base' ? 'default' : 'outline'}
                    onClick={() => setCalculationMode('base')}
                    className="flex-1"
                  >
                    Introducir Base Imponible
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {calculationMode === 'total' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="precio_total">Precio Total (€) *</Label>
                      <Input
                        id="precio_total"
                        name="precio_total"
                        type="number"
                        step="0.01"
                        min="0"
                        value={precioTotal}
                        onChange={(e) => handleTotalChange(e.target.value)}
                        required
                        className="font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iva_porcentaje">IVA (%)</Label>
                      <Input
                        id="iva_porcentaje"
                        name="iva_porcentaje"
                        type="number"
                        step="0.01"
                        value={ivaPorcentaje}
                        onChange={(e) => handleIvaChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Base Imponible (calculada)</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center justify-end font-mono">
                        {baseImponible ? `${baseImponible} €` : '-'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="base_imponible">Base Imponible (€) *</Label>
                      <Input
                        id="base_imponible"
                        name="base_imponible"
                        type="number"
                        step="0.01"
                        min="0"
                        value={baseImponible}
                        onChange={(e) => handleBaseChange(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iva_porcentaje">IVA (%)</Label>
                      <Input
                        id="iva_porcentaje"
                        name="iva_porcentaje"
                        type="number"
                        step="0.01"
                        value={ivaPorcentaje}
                        onChange={(e) => handleIvaChange(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Total (calculado)</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center justify-end font-mono font-semibold">
                        {precioTotal ? `${precioTotal} €` : '-'}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Resumen del cálculo */}
              {baseImponible && precioTotal && (
                <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Base Imponible:</span>
                    <span className="font-mono">{baseImponible} €</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA ({ivaPorcentaje}%):</span>
                    <span className="font-mono">{(parseFloat(precioTotal) - parseFloat(baseImponible)).toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>TOTAL:</span>
                    <span className="font-mono">{precioTotal} €</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observaciones</Label>
                <Textarea id="notes" name="notes" rows={2} defaultValue={editingReceipt?.notes} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingReceipt 
                    ? (updateMutation.isPending ? 'Actualizando...' : 'Actualizar Recibo')
                    : (createMutation.isPending ? 'Creando...' : 'Crear Recibo')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de recibos */}
      <Card>
        <CardHeader>
          <CardTitle>Recibos Emitidos</CardTitle>
          <CardDescription>Listado de todos los recibos generados</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReceipts ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay recibos. Crea tu primer recibo.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt: any) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.numero}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{receipt.recipient_name}</div>
                        <div className="text-sm text-muted-foreground">{receipt.recipient_nif}</div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{receipt.concepto}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(receipt.total).toFixed(2)} €
                    </TableCell>
                    <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                    <TableCell>{new Date(receipt.created_at).toLocaleDateString('es-ES')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {receipt.status === 'BORRADOR' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(receipt)}
                            title="Editar recibo"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {!receipt.pdf_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generatePdfMutation.mutate(receipt.id)}
                            disabled={generatePdfMutation.isPending}
                            title="Generar PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                        )}
                        {receipt.pdf_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadPdf(receipt.pdf_path, receipt.numero)}
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {receipt.pdf_path && receipt.status === 'BORRADOR' && (
                          <Button
                            size="sm"
                            onClick={() =>
                              sendMutation.mutate({ id: receipt.id, to: receipt.recipient_email })
                            }
                            disabled={sendMutation.isPending}
                            title="Enviar por email"
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
