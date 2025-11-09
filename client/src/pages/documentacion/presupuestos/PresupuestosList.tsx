import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Plus, Search, Clock, CheckCircle2, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useGestoriaBudgets, type GestoriaBudget, downloadBudgetPDF } from '@/lib/api/gestoria-budgets';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

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

export default function PresupuestosList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'BORRADOR' | 'ENVIADO' | 'ACEPTADO' | 'RECHAZADO' | 'FACTURADO' | 'all'>('all');
  const [tipoGestoriaFilter, setTipoGestoriaFilter] = useState<'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE' | 'all'>('all');

  const { data: budgets, isLoading, error } = useGestoriaBudgets({
    estado: statusFilter !== 'all' ? statusFilter : undefined,
    tipoGestoria: tipoGestoriaFilter !== 'all' ? tipoGestoriaFilter : undefined,
    nombreCliente: searchTerm || undefined
  });

  const items = budgets || [];

  const getTipoGestoriaBadge = (tipo: string) => {
    if (tipo === 'ASESORIA_LA_LLAVE') {
      return <Badge className="bg-blue-100 text-blue-700">Asesoría La Llave</Badge>;
    }
    return <Badge className="bg-green-100 text-green-700">Gestoría Online</Badge>;
  };

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Filtros y búsqueda</CardTitle>
            <Link href="/documentacion/presupuestos/nuevo">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select 
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="ACEPTADO">Aceptado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="FACTURADO">Facturado</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={tipoGestoriaFilter} 
              onValueChange={(value) => setTipoGestoriaFilter(value as typeof tipoGestoriaFilter)}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="ASESORIA_LA_LLAVE">Asesoría La Llave</SelectItem>
                <SelectItem value="GESTORIA_ONLINE">Gestoría Online</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || tipoGestoriaFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { 
                  setSearchTerm(''); 
                  setStatusFilter('all'); 
                  setTipoGestoriaFilter('all'); 
                }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-semibold mb-2">Error al cargar los presupuestos</p>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'Error desconocido'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Recargar página
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No hay presupuestos</p>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' || tipoGestoriaFilter !== 'all'
                ? 'No se encontraron presupuestos con los filtros aplicados'
                : 'Crea tu primer presupuesto para comenzar'}
            </p>
            <Link href="/documentacion/presupuestos/nuevo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />Crear Presupuesto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((budget: GestoriaBudget) => (
            <Card key={budget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold truncate">{budget.nombreCliente}</h3>
                      {getTipoGestoriaBadge(budget.tipoGestoria)}
                      {getStatusBadge(budget.estado)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Número:</span> {budget.numero}
                      </div>
                      <div>
                        <span className="font-medium">CIF/NIF:</span> {budget.nifCif}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span>{' '}
                        {format(new Date(budget.fechaCreacion), 'dd/MM/yyyy', { locale: es })}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {budget.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {formatCurrency(budget.totalFinal)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Contabilidad: {formatCurrency(budget.totalContabilidad)}
                        {(budget.totalLaboral ?? 0) > 0 && (
                          <> + Laboral: {formatCurrency(budget.totalLaboral)}</>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => downloadBudgetPDF(budget.id, budget.numero)}
                      >
                        <Download className="h-4 w-4 mr-2" />PDF
                      </Button>
                      <Link href={`/documentacion/presupuestos/${budget.id}`}>
                        <Button size="sm">
                          <FileText className="h-4 w-4 mr-2" />Ver Detalles
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
