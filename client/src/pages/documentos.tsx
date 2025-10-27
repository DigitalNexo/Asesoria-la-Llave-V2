import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentList } from '@/components/documentos/DocumentList';
import { DocumentUpload } from '@/components/documentos/DocumentUpload';
import { PaymentReceipt } from '@/components/documentos/PaymentReceipt';
import { DataProtection } from '@/components/documentos/DataProtection';
import { BankingDomiciliation } from '@/components/documentos/BankingDomiciliation';

export default function DocumentosPage() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (location.includes('/recibos')) return 'recibos';
    if (location.includes('/proteccion')) return 'proteccion';
    if (location.includes('/bancaria')) return 'bancaria';
    if (location.includes('/subir')) return 'subir';
    return 'todos';
  });

  // Actualizar tab cuando la URL cambia
  useEffect(() => {
    if (location.includes('/recibos')) setActiveTab('recibos');
    else if (location.includes('/proteccion')) setActiveTab('proteccion');
    else if (location.includes('/bancaria')) setActiveTab('bancaria');
    else if (location.includes('/subir')) setActiveTab('subir');
    else setActiveTab('todos');
  }, [location]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    switch (value) {
      case 'recibos':
        setLocation('/documentacion/documentos/recibos');
        break;
      case 'proteccion':
        setLocation('/documentacion/documentos/proteccion');
        break;
      case 'bancaria':
        setLocation('/documentacion/documentos/bancaria');
        break;
      case 'subir':
        setLocation('/documentacion/documentos/subir');
        break;
      default:
        setLocation('/documentacion/documentos');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona recibos de pago, documentación de protección de datos, domiciliaciones bancarias y otros documentos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="recibos">💰 Recibos</TabsTrigger>
          <TabsTrigger value="proteccion">🔐 Protección</TabsTrigger>
          <TabsTrigger value="bancaria">🏦 Bancaria</TabsTrigger>
          <TabsTrigger value="subir">📤 Subir</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todos los Documentos</CardTitle>
              <CardDescription>
                Lista completa de documentos guardados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentList />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recibos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>💰 Recibos de Pago</CardTitle>
              <CardDescription>
                Gestiona recibos de pago y comprobantes de transacciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentReceipt />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proteccion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🔐 Protección de Datos</CardTitle>
              <CardDescription>
                Documentación de conformidad RGPD y LOPDGDD
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataProtection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bancaria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🏦 Domiciliación Bancaria</CardTitle>
              <CardDescription>
                Autorizaciones de domiciliación bancaria con validación IBAN
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankingDomiciliation />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subir" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📤 Subir Documento</CardTitle>
              <CardDescription>
                Sube nuevos documentos al sistema con drag & drop
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
