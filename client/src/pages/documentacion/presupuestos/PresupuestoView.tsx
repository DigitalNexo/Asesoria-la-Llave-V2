import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Send, 
  Download, 
  Edit, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  User,
  Phone,
  Building,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type BudgetDetail = {
  id: string;
  code: string;
  series: string;
  number: number;
  year: number;
  date: string;
  validDays: number;
  expiresAt?: string | null;
  acceptedAt?: string | null;
  acceptedByIp?: string | null;
  acceptedByAgent?: string | null;
  remindSentAt?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  activity?: string | null;
  notes?: string | null;
  status: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  items: Array<{
    id: string;
    order: number;
    concept: string;
    quantity: number;
    price: number;
    vatPct: number;
    subtotal: number;
  }>;
  emails?: Array<{
    id: string;
    sentAt: string;
    recipientEmail: string;
    subject: string;
    status: string;
  }>;
};

export default function PresupuestoView() {
  const [match, params] = useRoute<{ id: string }>('/documentacion/presupuestos/:id');
  const { toast } = useToast();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const id = params?.id;

  const handleDownloadPDF = () => {
    if (!id) return;
    const token = localStorage.getItem('token') || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se encontró el token de autenticación',
      });
      return;
    }
    window.open(`/api/budgets/${id}/pdf?token=${encodeURIComponent(token)}`, '_blank');
  };

  const { data: budget, isLoading, error } = useQuery<BudgetDetail>({
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
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('ID no proporcionado');
      return apiRequest('POST', `/api/budgets/${id}/send`, {});
    },
    onSuccess: () => {
      toast({ title: 'Enviado', description: 'El presupuesto se ha enviado por email' });
      queryClient.invalidateQueries({ queryKey: ['/api/budgets', id] });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err?.message || 'No se pudo enviar', variant: 'destructive' });
    },
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

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'ACCEPTED') return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Aceptado</Badge>;
    if (s === 'SENT') return <Badge className="bg-blue-100 text-blue-700"><Send className="h-3 w-3 mr-1" />Enviado</Badge>;
    if (s === 'ARCHIVED') return <Badge variant="secondary">Archivado</Badge>;
    return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Borrador</Badge>;
  };

  const getExpiryInfo = (expiresAt: string | null | undefined, status: string) => {
    if (!expiresAt || status === 'ACCEPTED' || status === 'ARCHIVED') return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return { text: 'Vencido', variant: 'destructive' as const };
    if (daysLeft <= 3) return { text: `Vence en ${daysLeft} días`, variant: 'destructive' as const };
    if (daysLeft <= 7) return { text: `Vence en ${daysLeft} días`, variant: 'default' as const };
    return { text: `Válido hasta ${expiry.toLocaleDateString()}`, variant: 'outline' as const };
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
            <p className="text-sm text-muted-foreground mb-4">No se pudo obtener la información del presupuesto</p>
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
              <h1 className="text-3xl font-display font-bold">Presupuesto {budget.code}</h1>
              <p className="text-sm text-muted-foreground">
                Serie {budget.series} · Nº {budget.number}/{budget.year}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {getStatusBadge(budget.status)}
              {getExpiryInfo(budget.expiresAt, budget.status) && (
                <Badge variant={getExpiryInfo(budget.expiresAt, budget.status)!.variant}>
                  <Clock className="h-3 w-3 mr-1" />
                  {getExpiryInfo(budget.expiresAt, budget.status)!.text}
                </Badge>
              )}
            </div>
          </div>

          {/* Acciones */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => sendMutation.mutate()} 
                  disabled={sendMutation.isPending || budget.status === 'ACCEPTED'}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? 'Enviando...' : 'Enviar por Email'}
                </Button>
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />Descargar PDF
                </Button>
                <Link href={`/documentacion/presupuestos/${budget.id}/editar`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />Editar
                  </Button>
                </Link>
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
                    <p className="text-sm font-medium text-muted-foreground">Nombre / Razón Social</p>
                    <p className="font-semibold">{budget.clientName}</p>
                  </div>
                </div>
                {budget.clientEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <p className="font-semibold">{budget.clientEmail}</p>
                    </div>
                  </div>
                )}
                {budget.clientPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                      <p className="font-semibold">{budget.clientPhone}</p>
                    </div>
                  </div>
                )}
                {budget.activity && (
                  <div className="flex items-start gap-3">
                    <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Actividad</p>
                      <p className="font-semibold">{budget.activity}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de emisión</p>
                  <p className="font-semibold">{new Date(budget.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vigencia</p>
                  <p className="font-semibold">{budget.validDays} días</p>
                </div>
                {budget.expiresAt && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Vence el</p>
                    <p className="font-semibold">{new Date(budget.expiresAt).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              {budget.acceptedAt && (
                <div className="pt-4 border-t">
                  <Badge className="bg-emerald-100 text-emerald-700 mb-2">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Aceptado el {new Date(budget.acceptedAt).toLocaleString()}
                  </Badge>
                  {budget.acceptedByIp && (
                    <p className="text-xs text-muted-foreground">
                      IP: {budget.acceptedByIp} · {budget.acceptedByAgent || 'N/A'}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Líneas del presupuesto */}
          <Card>
            <CardHeader>
              <CardTitle>Líneas del Presupuesto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground pb-2 border-b">
                  <div className="col-span-5">Concepto</div>
                  <div className="col-span-2 text-center">Cantidad</div>
                  <div className="col-span-2 text-right">Precio Unit.</div>
                  <div className="col-span-1 text-center">IVA %</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>
                {budget.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 text-sm py-2 border-b">
                    <div className="col-span-5">{item.concept}</div>
                    <div className="col-span-2 text-center">{item.quantity}</div>
                    <div className="col-span-2 text-right">{Number(item.price).toFixed(2)} €</div>
                    <div className="col-span-1 text-center">{item.vatPct}%</div>
                    <div className="col-span-2 text-right font-semibold">{Number(item.subtotal).toFixed(2)} €</div>
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
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal (Base Imponible):</span>
                <span className="font-semibold">{Number(budget.subtotal).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA Total:</span>
                <span className="font-semibold">{Number(budget.vatTotal).toFixed(2)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl">
                <span className="font-bold">TOTAL:</span>
                <span className="font-bold text-primary">{Number(budget.total).toFixed(2)} €</span>
              </div>
            </CardContent>
          </Card>

          {/* Historial de emails */}
          {budget.emails && budget.emails.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Envíos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {budget.emails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{email.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            {email.recipientEmail} · {new Date(email.sentAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={email.status === 'SENT' ? 'default' : 'destructive'}>
                        {email.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notas internas */}
          {budget.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas Internas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{budget.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
