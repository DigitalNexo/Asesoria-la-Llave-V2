import React, { useState } from 'react';
import InvoiceTiersTable from '@/components/presupuestos/InvoiceTiersTable';
import PayrollTiersTable from '@/components/presupuestos/PayrollTiersTable';
import BillingTiersTable from '@/components/presupuestos/BillingTiersTable';
import FiscalModelsTable from '@/components/presupuestos/FiscalModelsTable';
import ServicesTable from '@/components/presupuestos/ServicesTable';
import ConfigGeneralForm from '@/components/presupuestos/ConfigGeneralForm';
import useAutonomoConfig from '@/hooks/useAutonomoConfig';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, FileText, Users, TrendingUp, FileCheck, Package } from 'lucide-react';

export default function PresupuestosParametrosPage() {
  const [activeTab, setActiveTab] = useState('general');
  const { refresh } = useAutonomoConfig();

  console.log('🎯 Active tab:', activeTab); // Debug log

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parámetros de Presupuestos</h1>
          <p className="text-muted-foreground">
            Gestión dinámica de configuración para presupuestos de Autónomos
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="facturas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Facturas
          </TabsTrigger>
          <TabsTrigger value="nominas" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Nóminas
          </TabsTrigger>
          <TabsTrigger value="facturacion" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Facturación
          </TabsTrigger>
          <TabsTrigger value="modelos" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Modelos
          </TabsTrigger>
          <TabsTrigger value="servicios" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Servicios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Porcentajes y mínimos aplicados a todos los presupuestos de Autónomos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConfigGeneralForm onSuccess={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tramos de Facturas Mensuales</CardTitle>
              <CardDescription>
                Define el precio base según el número de facturas del cliente por mes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvoiceTiersTable refreshParent={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nominas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tramos de Nóminas Mensuales</CardTitle>
              <CardDescription>
                Define el precio por nómina según el volumen mensual
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollTiersTable refreshParent={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tramos de Facturación Anual</CardTitle>
              <CardDescription>
                Multiplicadores aplicados según la facturación anual del cliente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BillingTiersTable refreshParent={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modelos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Fiscales</CardTitle>
              <CardDescription>
                Precios de modelos fiscales (303, 111, 115, 130, 100, 349, 347)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FiscalModelsTable refreshParent={refresh} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="servicios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Servicios Adicionales</CardTitle>
              <CardDescription>
                Servicios complementarios mensuales o puntuales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServicesTable refreshParent={refresh} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
