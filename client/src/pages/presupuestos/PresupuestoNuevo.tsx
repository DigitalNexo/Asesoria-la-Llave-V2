import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  useCreateBudget, 
  useCalculateBudget,
  useActiveConfig,
  CreateBudgetInput,
  BudgetCalculationInput 
} from '@/lib/api/gestoria-budgets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Calculator, FileText, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function PresupuestoNuevo() {
  const navigate = useNavigate();
  const [tipoGestoria, setTipoGestoria] = useState<'OFICIAL' | 'ONLINE'>('OFICIAL');
  const [calculatedData, setCalculatedData] = useState<any>(null);
  
  const { data: config } = useActiveConfig(tipoGestoria);
  const createMutation = useCreateBudget();
  const calculateMutation = useCalculateBudget();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateBudgetInput>({
    defaultValues: {
      tipoGestoria: 'OFICIAL',
      creadoPor: 'admin', // TODO: Get from auth context
      configId: ''
    }
  });
  
  const formValues = watch();
  
  // Auto-calcular cuando cambian los valores
  useEffect(() => {
    if (!config) return;
    
    const calculationInput: BudgetCalculationInput = {
      facturasMes: formValues.facturasMes || 0,
      nominasMes: formValues.nominasMes,
      facturacion: formValues.facturacion || 0,
      sistemaTributacion: formValues.sistemaTributacion || '',
      periodoDeclaraciones: formValues.periodoDeclaraciones || '',
      modelo303: formValues.modelo303,
      modelo111: formValues.modelo111,
      modelo115: formValues.modelo115,
      modelo130: formValues.modelo130,
      modelo100: formValues.modelo100,
      modelo349: formValues.modelo349,
      modelo347: formValues.modelo347,
      solicitudCertificados: formValues.solicitudCertificados,
      censosAEAT: formValues.censosAEAT,
      recepcionNotificaciones: formValues.recepcionNotificaciones,
      estadisticasINE: formValues.estadisticasINE,
      solicitudAyudas: formValues.solicitudAyudas,
      conLaboralSocial: formValues.conLaboralSocial,
      aplicaDescuento: formValues.aplicaDescuento,
      tipoDescuento: formValues.tipoDescuento,
      valorDescuento: formValues.valorDescuento
    };
    
    const timer = setTimeout(() => {
      calculateMutation.mutate(
        { calculation: calculationInput, tipo: tipoGestoria },
        {
          onSuccess: (data) => setCalculatedData(data),
          onError: () => setCalculatedData(null)
        }
      );
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formValues, config, tipoGestoria]);
  
  useEffect(() => {
    if (config) {
      setValue('configId', config.id);
    }
  }, [config, setValue]);
  
  const onSubmit = async (data: CreateBudgetInput) => {
    try {
      const budget = await createMutation.mutateAsync({
        ...data,
        tipoGestoria
      });
      toast.success('Presupuesto creado exitosamente');
      navigate(`/presupuestos/${budget.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Error al crear presupuesto');
    }
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/presupuestos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Nuevo Presupuesto</h1>
            <p className="text-muted-foreground">
              Complete los datos para generar el presupuesto
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={tipoGestoria === 'OFICIAL' ? 'default' : 'outline'}>
            {tipoGestoria}
          </Badge>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Gestoría */}
            <Card>
              <CardHeader>
                <CardTitle>Tipo de Gestoría</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={tipoGestoria} onValueChange={(v: any) => setTipoGestoria(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFICIAL">OFICIAL</SelectItem>
                    <SelectItem value="ONLINE">ONLINE</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            
            {/* Datos del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Datos del Cliente</CardTitle>
                <CardDescription>Información del cliente potencial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombreCliente">Nombre Completo *</Label>
                    <Input 
                      id="nombreCliente" 
                      {...register('nombreCliente', { required: true })} 
                      placeholder="Nombre o razón social"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nifCif">CIF/NIF *</Label>
                    <Input 
                      id="nifCif" 
                      {...register('nifCif', { required: true })} 
                      placeholder="12345678A"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      {...register('email', { required: true })} 
                      placeholder="cliente@ejemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input 
                      id="telefono" 
                      {...register('telefono')} 
                      placeholder="600 123 456"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input 
                    id="direccion" 
                    {...register('direccion')} 
                    placeholder="Calle, número, ciudad"
                  />
                </div>
                <div>
                  <Label htmlFor="personaContacto">Persona de Contacto</Label>
                  <Input 
                    id="personaContacto" 
                    {...register('personaContacto')} 
                    placeholder="Nombre de contacto"
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Datos Empresariales */}
            <Card>
              <CardHeader>
                <CardTitle>Datos Empresariales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="facturacion">Facturación Anual *</Label>
                    <Input 
                      id="facturacion" 
                      type="number" 
                      {...register('facturacion', { required: true, valueAsNumber: true })} 
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="facturasMes">Facturas/Mes *</Label>
                    <Input 
                      id="facturasMes" 
                      type="number" 
                      {...register('facturasMes', { required: true, valueAsNumber: true })} 
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nominasMes">Nóminas/Mes</Label>
                    <Input 
                      id="nominasMes" 
                      type="number" 
                      {...register('nominasMes', { valueAsNumber: true })} 
                      placeholder="2"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sistemaTributacion">Sistema Tributación *</Label>
                    <Select 
                      onValueChange={(v) => setValue('sistemaTributacion', v)}
                      value={formValues.sistemaTributacion}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Estimación Directa">Estimación Directa</SelectItem>
                        <SelectItem value="Estimación Objetiva">Estimación Objetiva</SelectItem>
                        <SelectItem value="Módulos">Módulos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="periodoDeclaraciones">Periodo Declaraciones *</Label>
                    <Select 
                      onValueChange={(v) => setValue('periodoDeclaraciones', v)}
                      value={formValues.periodoDeclaraciones}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mensual">Mensual</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Modelos Fiscales */}
            <Card>
              <CardHeader>
                <CardTitle>Modelos Fiscales</CardTitle>
                <CardDescription>Seleccione los modelos que aplican</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo303" 
                      checked={formValues.modelo303}
                      onCheckedChange={(checked) => setValue('modelo303', checked as boolean)}
                    />
                    <Label htmlFor="modelo303">Modelo 303 (IVA)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo111" 
                      checked={formValues.modelo111}
                      onCheckedChange={(checked) => setValue('modelo111', checked as boolean)}
                    />
                    <Label htmlFor="modelo111">Modelo 111 (IRPF)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo115" 
                      checked={formValues.modelo115}
                      onCheckedChange={(checked) => setValue('modelo115', checked as boolean)}
                    />
                    <Label htmlFor="modelo115">Modelo 115 (Alquileres)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo130" 
                      checked={formValues.modelo130}
                      onCheckedChange={(checked) => setValue('modelo130', checked as boolean)}
                    />
                    <Label htmlFor="modelo130">Modelo 130 (Autónomos)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo100" 
                      checked={formValues.modelo100}
                      onCheckedChange={(checked) => setValue('modelo100', checked as boolean)}
                    />
                    <Label htmlFor="modelo100">Modelo 100 (Renta)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo349" 
                      checked={formValues.modelo349}
                      onCheckedChange={(checked) => setValue('modelo349', checked as boolean)}
                    />
                    <Label htmlFor="modelo349">Modelo 349 (Intracomunitarias)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="modelo347" 
                      checked={formValues.modelo347}
                      onCheckedChange={(checked) => setValue('modelo347', checked as boolean)}
                    />
                    <Label htmlFor="modelo347">Modelo 347 (Terceros)</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Servicios Adicionales */}
            <Card>
              <CardHeader>
                <CardTitle>Servicios Adicionales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="solicitudCertificados" 
                      checked={formValues.solicitudCertificados}
                      onCheckedChange={(checked) => setValue('solicitudCertificados', checked as boolean)}
                    />
                    <Label htmlFor="solicitudCertificados">Solicitud Certificados</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="censosAEAT" 
                      checked={formValues.censosAEAT}
                      onCheckedChange={(checked) => setValue('censosAEAT', checked as boolean)}
                    />
                    <Label htmlFor="censosAEAT">Censos AEAT</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="recepcionNotificaciones" 
                      checked={formValues.recepcionNotificaciones}
                      onCheckedChange={(checked) => setValue('recepcionNotificaciones', checked as boolean)}
                    />
                    <Label htmlFor="recepcionNotificaciones">Recepción Notificaciones</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="estadisticasINE" 
                      checked={formValues.estadisticasINE}
                      onCheckedChange={(checked) => setValue('estadisticasINE', checked as boolean)}
                    />
                    <Label htmlFor="estadisticasINE">Estadísticas INE</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="solicitudAyudas" 
                      checked={formValues.solicitudAyudas}
                      onCheckedChange={(checked) => setValue('solicitudAyudas', checked as boolean)}
                    />
                    <Label htmlFor="solicitudAyudas">Solicitud Ayudas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="conLaboralSocial" 
                      checked={formValues.conLaboralSocial}
                      onCheckedChange={(checked) => setValue('conLaboralSocial', checked as boolean)}
                    />
                    <Label htmlFor="conLaboralSocial">Con Laboral/Social</Label>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Descuentos */}
            <Card>
              <CardHeader>
                <CardTitle>Descuentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="aplicaDescuento" 
                    checked={formValues.aplicaDescuento}
                    onCheckedChange={(checked) => setValue('aplicaDescuento', checked as boolean)}
                  />
                  <Label htmlFor="aplicaDescuento">Aplicar Descuento</Label>
                </div>
                {formValues.aplicaDescuento && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tipoDescuento">Tipo</Label>
                      <Select 
                        onValueChange={(v: any) => setValue('tipoDescuento', v)}
                        value={formValues.tipoDescuento}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PORCENTAJE">Porcentaje (%)</SelectItem>
                          <SelectItem value="FIJO">Fijo (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="valorDescuento">Valor</Label>
                      <Input 
                        id="valorDescuento" 
                        type="number" 
                        {...register('valorDescuento', { valueAsNumber: true })} 
                        placeholder={formValues.tipoDescuento === 'PORCENTAJE' ? '10' : '50'}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Resumen y Cálculos */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Resumen del Presupuesto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculateMutation.isPending ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Calculando...</p>
                  </div>
                ) : calculatedData ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Contabilidad:</span>
                        <span className="font-medium">
                          {calculatedData.totalContabilidad.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </span>
                      </div>
                      {calculatedData.totalLaboral > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Laboral:</span>
                          <span className="font-medium">
                            {calculatedData.totalLaboral.toLocaleString('es-ES', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium">
                          {calculatedData.subtotal.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </span>
                      </div>
                      {calculatedData.descuentoCalculado > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento:</span>
                          <span className="font-medium">
                            -{calculatedData.descuentoCalculado.toLocaleString('es-ES', { 
                              style: 'currency', 
                              currency: 'EUR' 
                            })}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Final:</span>
                        <span className="text-primary">
                          {calculatedData.totalFinal.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        className="w-full" 
                        size="lg"
                        disabled={createMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {createMutation.isPending ? 'Guardando...' : 'Crear Presupuesto'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Complete los campos para ver el cálculo</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
