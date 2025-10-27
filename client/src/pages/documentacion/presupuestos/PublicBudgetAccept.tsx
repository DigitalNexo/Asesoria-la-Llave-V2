import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Download,
  Shield
} from 'lucide-react';

type PublicBudget = {
  id: string;
  code: string;
  series: string;
  clientName: string;
  clientEmail: string | null;
  date: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  status: string;
  subtotal: number;
  vatTotal: number;
  total: number;
  validDays: number;
  items: Array<{
    concept: string;
    quantity: number;
    price: number;
    vatPct: number;
    subtotal: number;
  }>;
};

export default function PublicBudgetAccept() {
  const [match, params] = useRoute<{ code: string }>('/public/budgets/:code/accept');
  const code = params?.code;
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('t');
  
  const [accepted, setAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Obtener datos del presupuesto (público, no requiere auth)
  const { data: budget, isLoading, error } = useQuery<PublicBudget>({
    queryKey: ['/public/budgets', code, token],
    queryFn: async () => {
      if (!code || !token) throw new Error('Código o token no proporcionado');
      const res = await fetch(`/public/budgets/${code}/accept?t=${token}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error al cargar' }));
        throw new Error(errorData.error || 'No se pudo cargar el presupuesto');
      }
      return res.json();
    },
    enabled: !!code && !!token,
    retry: false,
  });

  // Mutación para aceptar el presupuesto
  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!code || !token) throw new Error('Código o token no proporcionado');
      const res = await fetch(`/public/budgets/${code}/accept?t=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error al aceptar' }));
        throw new Error(errorData.error || 'No se pudo aceptar el presupuesto');
      }
      return res.json();
    },
    onSuccess: () => {
      setAccepted(true);
    },
  });

  const handleAccept = () => {
    if (!termsAccepted) {
      alert('Por favor, acepta los términos y condiciones');
      return;
    }
    acceptMutation.mutate();
  };

  const isExpired = budget?.expiresAt && new Date(budget.expiresAt) < new Date();
  const isAlreadyAccepted = budget?.acceptedAt !== null;

  if (!match || !code || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Enlace inválido</h1>
            <p className="text-muted-foreground">
              El enlace que has utilizado no es válido o ha expirado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !budget) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Error</h1>
            <p className="text-muted-foreground">
              {(error as Error)?.message || 'No se pudo cargar el presupuesto'}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              El enlace puede haber expirado o ser inválido.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted || isAlreadyAccepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-12 text-center">
            <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100">
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold mb-3 text-emerald-900">¡Presupuesto Aceptado!</h1>
            <p className="text-lg text-emerald-700 mb-6">
              Hemos recibido tu aceptación del presupuesto <strong>{budget.code}</strong>
            </p>
            <div className="bg-white rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-2">Total aceptado:</p>
              <p className="text-3xl font-bold text-primary">{Number(budget.total).toFixed(2)} €</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Recibirás un email de confirmación en breve con los próximos pasos.
            </p>
            {isAlreadyAccepted && budget.acceptedAt && (
              <div className="mt-6 p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-700">
                  Aceptado el {new Date(budget.acceptedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader className="text-center pb-8">
            <div className="mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold mb-2">Presupuesto {budget.code}</CardTitle>
            <p className="text-muted-foreground">
              Revisa los detalles y acepta el presupuesto si estás conforme
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <Badge className="bg-blue-100 text-blue-700">Serie {budget.series}</Badge>
              {isExpired ? (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />Vencido
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Shield className="h-3 w-3 mr-1" />Válido {budget.validDays} días
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Información del cliente y fechas */}
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                <p className="font-semibold">{budget.clientName}</p>
              </div>
              {budget.clientEmail && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="font-semibold">{budget.clientEmail}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de emisión</p>
                <p className="font-semibold">{new Date(budget.date).toLocaleDateString()}</p>
              </div>
              {budget.expiresAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Válido hasta</p>
                  <p className={`font-semibold ${isExpired ? 'text-destructive' : ''}`}>
                    {new Date(budget.expiresAt).toLocaleDateString()}
                    {isExpired && ' (Vencido)'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Líneas del presupuesto */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {budget.items.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between gap-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{item.concept}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {Number(item.price).toFixed(2)} € (IVA {item.vatPct}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{Number(item.subtotal).toFixed(2)} €</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Totales */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (Base Imponible)</span>
              <span className="font-semibold">{Number(budget.subtotal).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA Total</span>
              <span className="font-semibold">{Number(budget.vatTotal).toFixed(2)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">TOTAL</span>
              <span className="text-3xl font-bold text-primary">{Number(budget.total).toFixed(2)} €</span>
            </div>
          </CardContent>
        </Card>

        {/* Botón de descarga PDF */}
        <Card>
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`/public/budgets/${budget.id}/pdf`, '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Presupuesto en PDF
            </Button>
          </CardContent>
        </Card>

        {/* Aceptación */}
        {!isExpired && (
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Aceptar Presupuesto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                />
                <label htmlFor="terms" className="text-sm cursor-pointer">
                  <span className="font-medium">Acepto los términos y condiciones</span>
                  <p className="text-muted-foreground mt-1">
                    He revisado el presupuesto y acepto los servicios, precios y condiciones detalladas. 
                    Al aceptar, estoy confirmando mi conformidad con este presupuesto.
                  </p>
                </label>
              </div>
              
              <Button
                size="lg"
                className="w-full"
                onClick={handleAccept}
                disabled={!termsAccepted || acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirmar Aceptación del Presupuesto
                  </>
                )}
              </Button>

              {acceptMutation.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm text-destructive font-medium">
                    {(acceptMutation.error as Error).message}
                  </p>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Conexión segura · Tu aceptación quedará registrada con fecha y hora
              </p>
            </CardContent>
          </Card>
        )}

        {isExpired && (
          <Card className="border-2 border-destructive">
            <CardContent className="p-8 text-center">
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h3 className="text-xl font-bold mb-2">Presupuesto Vencido</h3>
              <p className="text-muted-foreground">
                Este presupuesto venció el {new Date(budget.expiresAt!).toLocaleDateString()}.
                Por favor, contacta con nosotros para renovarlo.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card className="bg-slate-100">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            <p>© 2025 Asesoría La Llave · Todos los derechos reservados</p>
            <p className="mt-2">
              ¿Tienes dudas? Contacta con nosotros en <a href="mailto:info@asesorialallave.es" className="text-primary underline">info@asesorialallave.es</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
