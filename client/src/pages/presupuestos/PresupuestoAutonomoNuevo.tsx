import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Calculator, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import AutonomoCalculatorForm from '@/components/presupuestos/AutonomoCalculatorForm';

interface ClientFormData {
  nombreCliente: string;
  nifCif: string;
  email: string;
  telefono?: string;
  direccion?: string;
  personaContacto?: string;
  observaciones?: string;
}

export default function PresupuestoAutonomoNuevo() {
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('cliente');
  const [calculationData, setCalculationData] = useState<any>(null);
  const [tipoGestoria, setTipoGestoria] = useState<'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'>('ASESORIA_LA_LLAVE');
  
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>();
  
  const onCalculationComplete = (data: any) => {
    setCalculationData(data);
    // Auto-avanzar al tab de guardar
    setActiveTab('guardar');
  };

  const onSubmit = async (clientData: ClientFormData) => {
    if (!calculationData) {
      toast.error('Debe calcular el presupuesto primero');
      return;
    }

    try {
      // Preparar datos para guardar el presupuesto
      const budgetData = {
        ...clientData,
        tipoGestoria,
        subtotal: calculationData.subtotal,
        iva: calculationData.iva,
        total: calculationData.total,
        estado: 'BORRADOR',
        detalleCalculo: calculationData.detalleCalculo,
        conceptos: [
          {
            concepto: calculationData.conceptoBase,
            precio: calculationData.precioBase,
          },
          ...calculationData.conceptosAdicionales,
        ],
      };

      const response = await fetch('/api/gestoria-budgets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(budgetData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al crear presupuesto');
      }

      const budget = await response.json();
      toast.success('Presupuesto creado exitosamente');
      setLocation(`/documentacion/presupuestos/${budget.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar presupuesto');
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/documentacion/presupuestos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nuevo Presupuesto Autónomo</h1>
            <p className="text-muted-foreground">
              Genera un presupuesto personalizado con cálculo automático
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cliente" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Datos del Cliente
          </TabsTrigger>
          <TabsTrigger value="calculo" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Cálculo
          </TabsTrigger>
          <TabsTrigger value="guardar" disabled={!calculationData} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Revisar y Guardar
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Datos del Cliente */}
        <TabsContent value="cliente" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Cliente
              </CardTitle>
              <CardDescription>
                Introduce los datos del cliente para el presupuesto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombreCliente">Nombre / Razón Social *</Label>
                    <Input
                      id="nombreCliente"
                      {...register('nombreCliente', { required: 'Este campo es obligatorio' })}
                      placeholder="Juan Pérez García"
                    />
                    {errors.nombreCliente && (
                      <p className="text-sm text-destructive">{errors.nombreCliente.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nifCif">CIF/NIF *</Label>
                    <Input
                      id="nifCif"
                      {...register('nifCif', { required: 'Este campo es obligatorio' })}
                      placeholder="12345678A"
                    />
                    {errors.nifCif && (
                      <p className="text-sm text-destructive">{errors.nifCif.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email', {
                        required: 'Este campo es obligatorio',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido',
                        },
                      })}
                      placeholder="cliente@ejemplo.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      {...register('telefono')}
                      placeholder="600 123 456"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    {...register('direccion')}
                    placeholder="Calle, número, código postal, ciudad"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personaContacto">Persona de Contacto</Label>
                  <Input
                    id="personaContacto"
                    {...register('personaContacto')}
                    placeholder="Nombre de la persona de contacto"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    {...register('observaciones')}
                    placeholder="Notas internas sobre el cliente o el presupuesto"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => setActiveTab('calculo')}
                  >
                    Siguiente: Calcular Presupuesto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Calculadora */}
        <TabsContent value="calculo" className="space-y-6 mt-6">
          <AutonomoCalculatorForm
            onCalculationComplete={onCalculationComplete}
            initialValues={{
              tipoGestoria,
            }}
          />
        </TabsContent>

        {/* Tab 3: Revisar y Guardar */}
        <TabsContent value="guardar" className="space-y-6 mt-6">
          {calculationData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Resumen del Presupuesto</CardTitle>
                  <CardDescription>
                    Revisa todos los datos antes de guardar el presupuesto
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Concepto base:</span>
                      <p className="font-medium">{calculationData.conceptoBase}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Precio base:</span>
                      <p className="font-medium">{calculationData.precioBase.toFixed(2)}€</p>
                    </div>
                  </div>

                  {calculationData.conceptosAdicionales.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-2">Conceptos adicionales:</p>
                        <ul className="space-y-1">
                          {calculationData.conceptosAdicionales.map((c: any, idx: number) => (
                            <li key={idx} className="text-sm flex justify-between">
                              <span>{c.concepto}</span>
                              <span className="font-medium">{c.precio.toFixed(2)}€</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div className="space-y-2 text-lg">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span className="font-semibold">{calculationData.subtotal.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>IVA (21%):</span>
                      <span>{calculationData.iva.toFixed(2)}€</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-primary">
                      <span>Total:</span>
                      <span>{calculationData.total.toFixed(2)}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4 justify-end">
                <Button variant="outline" onClick={() => setActiveTab('calculo')}>
                  Volver a Calcular
                </Button>
                <Button onClick={handleSubmit(onSubmit)}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Presupuesto
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
