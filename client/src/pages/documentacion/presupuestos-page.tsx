import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Presupuestos from './presupuestos';
import ParametrosPresupuestos from './presupuestos/ParametrosPresupuestos';
import BudgetTemplatesManager from './presupuestos/BudgetTemplatesManager';

export default function PresupuestosPage() {
  const [activeTab, setActiveTab] = useState('presupuestos');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Presupuestos</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona presupuestos, parámetros y plantillas de tu negocio
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="presupuestos">Presupuestos</TabsTrigger>
          <TabsTrigger value="parametros">Parámetros</TabsTrigger>
          <TabsTrigger value="plantillas">Plantillas</TabsTrigger>
        </TabsList>

        <TabsContent value="presupuestos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mis Presupuestos</CardTitle>
              <CardDescription>
                Crea, edita y gestiona presupuestos para tus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Presupuestos />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parametros" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parámetros de Presupuestos</CardTitle>
              <CardDescription>
                Configura los parámetros y valores por defecto para los presupuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ParametrosPresupuestos />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plantillas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Presupuestos</CardTitle>
              <CardDescription>
                Crea y gestiona plantillas reutilizables para tus presupuestos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BudgetTemplatesManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
