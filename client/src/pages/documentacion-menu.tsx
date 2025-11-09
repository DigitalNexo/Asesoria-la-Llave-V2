import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileStack, FileText } from 'lucide-react';

export default function DocumentacionMenu() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentación</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona presupuestos y documentos de tu negocio
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Presupuestos Card */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/presupuestos')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileStack className="w-5 h-5 text-blue-500" />
                  Presupuestos
                </CardTitle>
                <CardDescription className="mt-2">
                  Crea, gestiona y parametriza presupuestos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                ✓ Sistema OFICIAL/ONLINE
              </p>
              <p className="text-sm text-gray-600">
                ✓ Cálculo automático con tramos
              </p>
              <p className="text-sm text-gray-600">
                ✓ Parámetros configurables
              </p>
            </div>
            <Button className="w-full">
              Ir a Presupuestos
            </Button>
          </CardContent>
        </Card>

        {/* Documentos Card */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/documentos')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" />
                  Documentos
                </CardTitle>
                <CardDescription className="mt-2">
                  Gestiona documentos, recibos y comprobantes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">
                ✓ Recibos de pago
              </p>
              <p className="text-sm text-gray-600">
                ✓ Protección de datos (RGPD)
              </p>
              <p className="text-sm text-gray-600">
                ✓ Domiciliación bancaria
              </p>
            </div>
            <Button className="w-full">
              Ir a Documentos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
