import { useParams, useNavigate } from 'react-router-dom';
import { 
  useGestoriaBudget, 
  useAcceptBudget, 
  useRejectBudget,
  useConvertBudget,
  useSendBudget,
  useCanConvertBudget,
  downloadBudgetPDF 
} from '@/lib/api/gestoria-budgets';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download, Mail, CheckCircle, XCircle, UserPlus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';

export default function PresupuestoDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  
  const { data: budget, isLoading } = useGestoriaBudget(id!);
  const { data: canConvert } = useCanConvertBudget(id!);
  const acceptMutation = useAcceptBudget();
  const rejectMutation = useRejectBudget();
  const convertMutation = useConvertBudget();
  const sendMutation = useSendBudget();
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando presupuesto...</p>
      </div>
    );
  }
  
  if (!budget) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Presupuesto no encontrado</h2>
        <Button onClick={() => navigate('/presupuestos')}>Volver a la lista</Button>
      </div>
    );
  }
  
  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(id!);
      toast.success('Presupuesto aceptado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const handleReject = async () => {
    if (!motivoRechazo.trim()) {
      toast.error('Debe indicar el motivo del rechazo');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: id!, motivoRechazo });
      toast.success('Presupuesto rechazado');
      setRejectDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const handleConvert = async () => {
    try {
      const result = await convertMutation.mutateAsync({ id: id! });
      toast.success('Cliente creado exitosamente');
      navigate(`/clientes/${result.clientId}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const handleSend = async () => {
    try {
      await sendMutation.mutateAsync({ id: id! });
      toast.success('Presupuesto enviado');
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const getEstadoBadge = (estado: string) => {
    const colors: Record<string, string> = {
      BORRADOR: 'bg-gray-500',
      ENVIADO: 'bg-blue-500',
      ACEPTADO: 'bg-green-500',
      RECHAZADO: 'bg-red-500',
      FACTURADO: 'bg-purple-500'
    };
    return <Badge className={colors[estado] || ''}>{estado}</Badge>;
  };
  
  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/presupuestos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Presupuesto {budget.numero}</h1>
            <p className="text-muted-foreground">
              Creado el {format(new Date(budget.fechaCreacion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {getEstadoBadge(budget.estado)}
          <Badge variant={budget.tipoGestoria === 'OFICIAL' ? 'default' : 'outline'}>
            {budget.tipoGestoria}
          </Badge>
        </div>
      </div>
      
      {/* Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={() => downloadBudgetPDF(budget.id, budget.numero)}>
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
          
          {budget.estado === 'BORRADOR' && (
            <>
              <Button onClick={handleSend} disabled={sendMutation.isPending}>
                <Mail className="w-4 h-4 mr-2" />
                {sendMutation.isPending ? 'Enviando...' : 'Enviar por Email'}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/presupuestos/${id}/editar`)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </>
          )}
          
          {(budget.estado === 'ENVIADO' || budget.estado === 'BORRADOR') && (
            <>
              <Button onClick={handleAccept} disabled={acceptMutation.isPending}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {acceptMutation.isPending ? 'Aceptando...' : 'Marcar Aceptado'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => setRejectDialogOpen(true)}
                disabled={rejectMutation.isPending}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </>
          )}
          
          {budget.estado === 'ACEPTADO' && canConvert?.canConvert && (
            <Button onClick={() => setConvertDialogOpen(true)} disabled={convertMutation.isPending}>
              <UserPlus className="w-4 h-4 mr-2" />
              {convertMutation.isPending ? 'Convirtiendo...' : 'Convertir a Cliente'}
            </Button>
          )}
          
          {budget.estado === 'ACEPTADO' && !canConvert?.canConvert && (
            <div className="text-sm text-muted-foreground">
              {canConvert?.reason || 'No se puede convertir a cliente'}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Nombre</Label>
              <p className="font-medium">{budget.nombreCliente}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">CIF/NIF</Label>
              <p className="font-medium font-mono">{budget.nifCif}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{budget.email}</p>
            </div>
            {budget.telefono && (
              <div>
                <Label className="text-muted-foreground">Teléfono</Label>
                <p className="font-medium">{budget.telefono}</p>
              </div>
            )}
            {budget.direccion && (
              <div className="col-span-2">
                <Label className="text-muted-foreground">Dirección</Label>
                <p className="font-medium">{budget.direccion}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Datos Empresariales */}
      <Card>
        <CardHeader>
          <CardTitle>Datos Empresariales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Facturación Anual</Label>
              <p className="font-medium">
                {budget.facturacion.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">Facturas/Mes</Label>
              <p className="font-medium">{budget.facturasMes}</p>
            </div>
            {budget.nominasMes && (
              <div>
                <Label className="text-muted-foreground">Nóminas/Mes</Label>
                <p className="font-medium">{budget.nominasMes}</p>
              </div>
            )}
            <div>
              <Label className="text-muted-foreground">Sistema Tributación</Label>
              <p className="font-medium">{budget.sistemaTributacion}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Periodo Declaraciones</Label>
              <p className="font-medium">{budget.periodoDeclaraciones}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Modelos Fiscales */}
      <Card>
        <CardHeader>
          <CardTitle>Modelos Fiscales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {budget.modelo303 && <Badge>Modelo 303</Badge>}
            {budget.modelo111 && <Badge>Modelo 111</Badge>}
            {budget.modelo115 && <Badge>Modelo 115</Badge>}
            {budget.modelo130 && <Badge>Modelo 130</Badge>}
            {budget.modelo100 && <Badge>Modelo 100</Badge>}
            {budget.modelo349 && <Badge>Modelo 349</Badge>}
            {budget.modelo347 && <Badge>Modelo 347</Badge>}
          </div>
        </CardContent>
      </Card>
      
      {/* Servicios Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {budget.solicitudCertificados && <div>✓ Solicitud de Certificados</div>}
            {budget.censosAEAT && <div>✓ Censos AEAT</div>}
            {budget.recepcionNotificaciones && <div>✓ Recepción de Notificaciones</div>}
            {budget.estadisticasINE && <div>✓ Estadísticas INE</div>}
            {budget.solicitudAyudas && <div>✓ Solicitud de Ayudas</div>}
            {budget.conLaboralSocial && <div>✓ Con Laboral/Social</div>}
          </div>
        </CardContent>
      </Card>
      
      {/* Totales */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen Económico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Contabilidad:</span>
            <span className="font-medium">
              {budget.totalContabilidad.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          {budget.totalLaboral > 0 && (
            <div className="flex justify-between">
              <span>Laboral:</span>
              <span className="font-medium">
                {budget.totalLaboral.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span className="font-medium">
              {budget.subtotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
          {budget.aplicaDescuento && budget.descuentoCalculado > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Descuento ({budget.tipoDescuento === 'PORCENTAJE' ? `${budget.valorDescuento}%` : 'Fijo'}):</span>
              <span className="font-medium">
                -{budget.descuentoCalculado.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>Total Final:</span>
            <span className="text-primary">
              {budget.totalFinal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </span>
          </div>
        </CardContent>
      </Card>
      
      {/* Dialog Rechazar */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Presupuesto</DialogTitle>
            <DialogDescription>
              Indique el motivo del rechazo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del Rechazo</Label>
            <Textarea 
              id="motivo"
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Precio elevado, no se ajusta a necesidades, etc."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Rechazar Presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Convertir */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convertir a Cliente</DialogTitle>
            <DialogDescription>
              Se creará un nuevo cliente con los datos del presupuesto. Se asignarán automáticamente todos los modelos fiscales seleccionados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConvert}>
              Crear Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
