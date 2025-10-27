import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Plus, Search, Clock, CheckCircle2, XCircle, AlertCircle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Budget = {
  id: string;
  code: string;
  series: string;
  number: number;
  year: number;
  type: 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS'; // Nuevo campo
  clientName: string;
  clientEmail?: string | null;
  total: number;
  subtotal: number;
  vatTotal: number;
  status: string;
  date: string;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  validDays: number;
};

export default function PresupuestosList() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // Nuevo filtro

  const { data, isLoading, error } = useQuery<{ items: Budget[] }>({
    queryKey: ['/api/budgets', searchTerm, statusFilter, seriesFilter, typeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set('q', searchTerm.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (seriesFilter !== 'all') params.set('series', seriesFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter); // Añadir filtro de tipo
      
      const url = `/api/budgets${params.toString() ? `?${params.toString()}` : ''}`;
      console.log('🔍 Fetching budgets from:', url); // Debug
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include',
      });
      console.log('📡 Response status:', res.status); // Debug
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error response:', errorData); // Debug
        throw new Error(errorData.error || 'No se pudieron cargar los presupuestos');
      }
      const data = await res.json();
      console.log('✅ Budgets loaded:', data.items?.length || 0); // Debug
      return data;
    },
    staleTime: 30_000,
  });

  const items = data?.items || [];

  const getTypeBadge = (type: string) => {
    const colors = {
      PYME: 'bg-blue-100 text-blue-700',
      AUTONOMO: 'bg-green-100 text-green-700',
      RENTA: 'bg-amber-100 text-amber-700',
      HERENCIAS: 'bg-purple-100 text-purple-700',
    };
    const labels = {
      PYME: 'PYME',
      AUTONOMO: 'Autónomo',
      RENTA: 'Renta',
      HERENCIAS: 'Herencias',
    };
    return <Badge className={colors[type as keyof typeof colors]}>{labels[type as keyof typeof labels]}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACCEPTED') return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Aceptado</Badge>;
    if (s === 'SENT') return <Badge className="bg-blue-100 text-blue-700"><AlertCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
    if (s === 'ARCHIVED') return <Badge className="bg-gray-100 text-gray-700"><XCircle className="h-3 w-3 mr-1" />Archivado</Badge>;
    return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>;
  };

  const getExpiryBadge = (expiresAt: string | null | undefined, status: string) => {
    if (!expiresAt || status === 'ACCEPTED' || status === 'ARCHIVED') return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return <Badge variant="destructive" className="text-xs"><XCircle className="h-3 w-3 mr-1" />Vencido</Badge>;
    if (daysLeft <= 3) return <Badge variant="destructive" className="text-xs"><Clock className="h-3 w-3 mr-1" />Vence en {daysLeft}d</Badge>;
    if (daysLeft <= 7) return <Badge className="bg-amber-100 text-amber-700 text-xs"><Clock className="h-3 w-3 mr-1" />Vence en {daysLeft}d</Badge>;
    return <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Vence en {daysLeft}d</Badge>;
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm.trim());
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (seriesFilter !== 'all') params.set('series', seriesFilter);
    
    const url = `/api/budgets/export.${format}${params.toString() ? `?${params.toString()}` : ''}`;
    window.open(url, '_blank');
    toast({ title: 'Exportando', description: `Se descargará el archivo ${format.toUpperCase()}` });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Filtros y búsqueda</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
                <Download className="h-4 w-4 mr-2" />Exportar XLSX
              </Button>
              <Link href="/documentacion/presupuestos/nuevo">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />Nuevo Presupuesto
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, cliente o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="DRAFT">Borrador</SelectItem>
                <SelectItem value="SENT">Enviado</SelectItem>
                <SelectItem value="ACCEPTED">Aceptado</SelectItem>
                <SelectItem value="ARCHIVED">Archivado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={seriesFilter} onValueChange={setSeriesFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Serie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las series</SelectItem>
                <SelectItem value="AL">AL (Asesoría La Llave)</SelectItem>
                <SelectItem value="GO">GO (Gestoría Ortega)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="PYME">PYME</SelectItem>
                <SelectItem value="AUTONOMO">Autónomo</SelectItem>
                <SelectItem value="RENTA">Renta</SelectItem>
                <SelectItem value="HERENCIAS">Herencias</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm || statusFilter !== 'all' || seriesFilter !== 'all' || typeFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); setSeriesFilter('all'); setTypeFilter('all'); }}
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-lg font-semibold mb-2">Error al cargar los presupuestos</p>
            <p className="text-sm text-muted-foreground mb-4">{error instanceof Error ? error.message : 'Error desconocido'}</p>
            <p className="text-xs text-muted-foreground mb-4">Revisa la consola del navegador (F12) para más detalles</p>
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
            <p className="text-sm text-muted-foreground mb-4">Crea tu primer presupuesto para comenzar</p>
            <Link href="/documentacion/presupuestos/nuevo">
              <Button>
                <Plus className="h-4 w-4 mr-2" />Crear Presupuesto
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((budget) => (
            <Card key={budget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold truncate">{budget.clientName}</h3>
                      {getTypeBadge(budget.type)}
                      {getStatusBadge(budget.status)}
                      {getExpiryBadge(budget.expiresAt, budget.status)}
                      {budget.acceptedAt && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Aceptado {new Date(budget.acceptedAt).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Código:</span> {budget.code}
                      </div>
                      <div>
                        <span className="font-medium">Serie:</span> {budget.series}
                      </div>
                      <div>
                        <span className="font-medium">Fecha:</span> {new Date(budget.date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {budget.clientEmail || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold">{Number(budget.total).toFixed(2)} €</div>
                      <div className="text-xs text-muted-foreground">
                        Base: {Number(budget.subtotal).toFixed(2)} € + IVA: {Number(budget.vatTotal).toFixed(2)} €
                      </div>
                    </div>
                    <Link href={`/documentacion/presupuestos/${budget.id}`}>
                      <Button size="sm" variant="outline">
                        <FileText className="h-4 w-4 mr-2" />Ver Detalles
                      </Button>
                    </Link>
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
