import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useRoute, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  User,
  Phone,
  Building,
  FileText,
  DollarSign,
  XCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { downloadBudgetPDF, type GestoriaBudget } from '@/lib/api/gestoria-budgets';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper seguro para formatear moneda
function formatCurrency(value: string | number | null | undefined): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return '0,00 €';
  }
  return num.toLocaleString('es-ES', { 
    style: 'currency', 
    currency: 'EUR' 
  });
}

export default function GestoriaPresupuestoView() {
  const [match, params] = useRoute<{ id: string }>('/documentacion/presupuestos/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const id = params?.id;

  const { data: budget, isLoading, error } = useQuery<GestoriaBudget>({
    queryKey: ['/api/gestoria-budgets', id],
    queryFn: async () => {
      if (!id) throw new Error('ID no proporcionado');
      const res = await fetch(`/api/gestoria-budgets/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('No se pudo cargar el presupuesto');
      return res.json();
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  if (!match || !id) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">Presupuesto no encontrado</p>
            <Link href="/documentacion/presupuestos">
              <Button className="mt-4" variant="outline">Volver a la lista</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (estado: string) => {
    const colors: Record<string, string> = {
      BORRADOR: 'bg-amber-100 text-amber-700',
      ENVIADO: 'bg-blue-100 text-blue-700',
      ACEPTADO: 'bg-emerald-100 text-emerald-700',
      RECHAZADO: 'bg-red-100 text-red-700',
      FACTURADO: 'bg-purple-100 text-purple-700'
    };
    
    const icons: Record<string, any> = {
      BORRADOR: Clock,
      ENVIADO: AlertCircle,
      ACEPTADO: CheckCircle2,
      RECHAZADO: XCircle,
      FACTURADO: DollarSign
    };
    
    const Icon = icons[estado] || Clock;
    
    return (
      <Badge className={colors[estado] || 'bg-gray-100 text-gray-700'}>
        <Icon className="h-3 w-3 mr-1" />{estado}
      </Badge>
    );
  };

  const getTipoGestoriaBadge = (tipo: string) => {
    if (tipo === 'ASESORIA_LA_LLAVE') {
      return <Badge className="bg-blue-100 text-blue-700">Asesoría La Llave</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Gestoría Online</Badge>;
  };

  return (
    <div className="p-8 space-y-6">
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error || !budget ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-semibold mb-2">Error al cargar</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'No se pudo obtener la información del presupuesto'}
            </p>
            <Link href="/documentacion/presupuestos">
              <Button variant="outline">Volver a la lista</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link href="/documentacion/presupuestos">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />Volver
                  </Button>
                </Link>
              </div>
              <h1 className="text-3xl font-bold">Presupuesto {budget.numero}</h1>
              <p className="text-sm text-muted-foreground">
                Cliente: {budget.nombreCliente}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getTipoGestoriaBadge(budget.tipoGestoria)}
              {getStatusBadge(budget.estado)}
            </div>
          </div>

          {/* Acciones */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => downloadBudgetPDF(budget.id, budget.numero)}
                >
                  <Download className="h-4 w-4 mr-2" />Descargar PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setLocation(`/documentacion/presupuestos/${budget.id}/editar`)}
                >
                  <Edit className="h-4 w-4 mr-2" />Editar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Datos del cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Nombre</p>
                    <p className="font-medium">{budget.nombreCliente}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">CIF/NIF</p>
                    <p className="font-medium">{budget.nifCif || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{budget.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Teléfono</p>
                    <p className="font-medium">{budget.telefono || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información del Negocio */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Negocio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Sistema de Tributación</p>
                  <p className="font-medium">{budget.sistemaTributacion}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Facturación Anual</p>
                  <p className="font-medium">{formatCurrency(budget.facturacion)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Facturas/Mes</p>
                  <p className="font-medium">{budget.facturasMes}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nóminas/Mes</p>
                  <p className="font-medium">{budget.nominasMes || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Período Declaraciones</p>
                  <p className="font-medium">{budget.periodoDeclaraciones}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totales */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Costes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Servicios de Contabilidad:</span>
                  <span className="font-medium">{formatCurrency(budget.totalContabilidad)}</span>
                </div>
                {(budget.totalLaboral ?? 0) > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Servicios Laborales:</span>
                    <span className="font-medium">{formatCurrency(budget.totalLaboral)}</span>
                  </div>
                )}
                {budget.aplicaDescuento && (budget.descuentoCalculado ?? 0) > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center text-red-600">
                      <span>Descuento ({budget.tipoDescuento}):</span>
                      <span className="font-medium">-{formatCurrency(budget.descuentoCalculado)}</span>
                    </div>
                  </>
                )}
                <Separator />
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Mensual:</span>
                  <span className="font-bold text-primary">{formatCurrency(budget.totalFinal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observaciones - Campo no disponible en el modelo actual */}
          {/* {budget.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{budget.observaciones}</p>
              </CardContent>
            </Card>
          )} */}

          {/* Información de fechas */}
          <Card>
            <CardHeader>
              <CardTitle>Fechas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fecha de Creación</p>
                  <p className="font-medium">
                    {format(new Date(budget.fechaCreacion), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
