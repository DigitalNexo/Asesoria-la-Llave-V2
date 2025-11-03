import { useState } from 'react';
import { useBudgetConfigs, useActiveConfig, useUpdateConfig } from '@/lib/api/gestoria-budgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function ConfiguracionPrecios() {
  const [selectedTipo, setSelectedTipo] = useState<'OFICIAL' | 'ONLINE'>('OFICIAL');
  
  const { data: configOficial } = useActiveConfig('OFICIAL');
  const { data: configOnline } = useActiveConfig('ONLINE');
  const updateMutation = useUpdateConfig();
  
  const config = selectedTipo === 'OFICIAL' ? configOficial : configOnline;
  
  const [formData, setFormData] = useState<any>({});
  
  const handleSave = async () => {
    if (!config) return;
    
    try {
      await updateMutation.mutateAsync({
        id: config.id,
        input: formData
      });
      toast.success('Configuración actualizada');
      setFormData({});
    } catch (error: any) {
      toast.error(error.message);
    }
  };
  
  const getValue = (field: string) => {
    return formData[field] !== undefined ? formData[field] : (config as any)?.[field] || 0;
  };
  
  const setValue = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };
  
  if (!config) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Cargando configuración...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Configuración de Precios
        </h1>
        <p className="text-muted-foreground">
          Configure los precios base para cálculo de presupuestos
        </p>
      </div>
      
      <Tabs value={selectedTipo} onValueChange={(v: any) => setSelectedTipo(v)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="OFICIAL">
            OFICIAL
            {configOficial && <Badge className="ml-2" variant="default">Activo</Badge>}
          </TabsTrigger>
          <TabsTrigger value="ONLINE">
            ONLINE
            {configOnline && <Badge className="ml-2" variant="outline">Activo</Badge>}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={selectedTipo} className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Precios Base</CardTitle>
              <CardDescription>Precios fundamentales de facturación</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio Base por Factura</Label>
                <Input 
                  type="number" 
                  value={getValue('precioBaseFactura')}
                  onChange={(e) => setValue('precioBaseFactura', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Precio Base por Nómina</Label>
                <Input 
                  type="number" 
                  value={getValue('precioBaseNomina')}
                  onChange={(e) => setValue('precioBaseNomina', e.target.value)}
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Precios Modelos Fiscales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Modelo 303 (IVA)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo303')}
                  onChange={(e) => setValue('precioModelo303', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 111 (IRPF)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo111')}
                  onChange={(e) => setValue('precioModelo111', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 115 (Alquileres)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo115')}
                  onChange={(e) => setValue('precioModelo115', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 130 (Autónomos)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo130')}
                  onChange={(e) => setValue('precioModelo130', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 100 (Renta)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo100')}
                  onChange={(e) => setValue('precioModelo100', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 349 (Intracom.)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo349')}
                  onChange={(e) => setValue('precioModelo349', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Modelo 347 (Terceros)</Label>
                <Input 
                  type="number" 
                  value={getValue('precioModelo347')}
                  onChange={(e) => setValue('precioModelo347', e.target.value)}
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Servicios Adicionales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Solicitud Certificados</Label>
                <Input 
                  type="number" 
                  value={getValue('precioSolicitudCertificados')}
                  onChange={(e) => setValue('precioSolicitudCertificados', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Censos AEAT</Label>
                <Input 
                  type="number" 
                  value={getValue('precioCensosAEAT')}
                  onChange={(e) => setValue('precioCensosAEAT', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Recepción Notificaciones</Label>
                <Input 
                  type="number" 
                  value={getValue('precioRecepcionNotificaciones')}
                  onChange={(e) => setValue('precioRecepcionNotificaciones', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Estadísticas INE</Label>
                <Input 
                  type="number" 
                  value={getValue('precioEstadisticasINE')}
                  onChange={(e) => setValue('precioEstadisticasINE', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Solicitud Ayudas</Label>
                <Input 
                  type="number" 
                  value={getValue('precioSolicitudAyudas')}
                  onChange={(e) => setValue('precioSolicitudAyudas', e.target.value)}
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Precios Laborales</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label>Laboral Base</Label>
                <Input 
                  type="number" 
                  value={getValue('precioLaboralBase')}
                  onChange={(e) => setValue('precioLaboralBase', e.target.value)}
                  step="0.01"
                />
              </div>
              <div>
                <Label>Laboral por Nómina</Label>
                <Input 
                  type="number" 
                  value={getValue('precioLaboralNomina')}
                  onChange={(e) => setValue('precioLaboralNomina', e.target.value)}
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFormData({})}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
