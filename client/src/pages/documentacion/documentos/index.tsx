import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt, FileCheck, FileKey, FileStack } from 'lucide-react';

export default function DocumentosPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona recibos, protección de datos, domiciliaciones y otros documentos
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recibos */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/documentos/recibos')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-blue-500" />
                  Recibos
                </CardTitle>
                <CardDescription className="mt-2">
                  Genera recibos para clientes o externos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">✓ Para clientes y externos</p>
              <p className="text-sm text-gray-600">✓ Numeración automática</p>
              <p className="text-sm text-gray-600">✓ Envío por email con PDF</p>
            </div>
            <Button className="w-full" variant="outline">
              Gestionar Recibos
            </Button>
          </CardContent>
        </Card>

        {/* Protección de Datos */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/documentos/proteccion-datos')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-green-500" />
                  Protección de Datos
                </CardTitle>
                <CardDescription className="mt-2">
                  Documentos RGPD para clientes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">✓ Solo clientes registrados</p>
              <p className="text-sm text-gray-600">✓ Firma digital</p>
              <p className="text-sm text-gray-600">✓ Plantillas personalizables</p>
            </div>
            <Button className="w-full" variant="outline">
              Gestionar RGPD
            </Button>
          </CardContent>
        </Card>

        {/* Domiciliación Bancaria */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/documentos/domiciliacion')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <FileKey className="w-5 h-5 text-purple-500" />
                  Domiciliación Bancaria
                </CardTitle>
                <CardDescription className="mt-2">
                  Autorización de domiciliación SEPA
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">✓ Solo clientes registrados</p>
              <p className="text-sm text-gray-600">✓ Firma requerida</p>
              <p className="text-sm text-gray-600">✓ Envío automático</p>
            </div>
            <Button className="w-full" variant="outline">
              Gestionar Domiciliaciones
            </Button>
          </CardContent>
        </Card>

        {/* Plantillas */}
        <Card className="hover:shadow-lg transition cursor-pointer" onClick={() => setLocation('/documentacion/documentos/plantillas')}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <FileStack className="w-5 h-5 text-orange-500" />
                  Plantillas
                </CardTitle>
                <CardDescription className="mt-2">
                  Gestiona plantillas de documentos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-600">✓ Editor visual TipTap</p>
              <p className="text-sm text-gray-600">✓ Variables dinámicas</p>
              <p className="text-sm text-gray-600">✓ HTML personalizado</p>
            </div>
            <Button className="w-full" variant="outline">
              Gestionar Plantillas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
