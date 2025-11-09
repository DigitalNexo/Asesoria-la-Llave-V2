import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useForm } from 'react-hook-form';
import { 
  useCreateBudget, 
  useCalculateBudget,
  useActiveConfig,
  useGestoriaBudget,
  useUpdateBudget,
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
import { ArrowLeft, Save, Calculator, FileText, DollarSign, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServicioAdicional {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
}

// Helper seguro para formatear moneda
function formatCurrency(value: string | number | null | undefined): string {
  const num = Number(value);
  if (isNaN(num) || value === null || value === undefined) {
    return '0,00 €';
  }
  return num.toLocaleString('es-ES', { 
    style: 'currency', 
    currency: 'EUR' 
  });
}

export default function PresupuestoNuevo() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>('/documentacion/presupuestos/:id/editar');
  const budgetId = params?.id;
  const isEditMode = !!budgetId;
  
  const [tipoGestoria, setTipoGestoria] = useState<'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'>('ASESORIA_LA_LLAVE');
  const [tipoCliente, setTipoCliente] = useState<'EMPRESA' | 'AUTONOMO' | 'PARTICULAR'>('AUTONOMO');
  const [calculatedData, setCalculatedData] = useState<any>(null);
  const [serviciosPersonalizados, setServiciosPersonalizados] = useState<ServicioAdicional[]>([]);
  
  const { data: existingBudget, isLoading: loadingBudget } = useGestoriaBudget(budgetId || '');
  const { data: config } = useActiveConfig(tipoGestoria);
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const calculateMutation = useCalculateBudget();
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateBudgetInput>({
    defaultValues: {
      tipoGestoria: 'ASESORIA_LA_LLAVE',
      creadoPor: 'admin',
      configId: '',
      nombreCliente: '',
      nifCif: '',
      email: '',
      telefono: '',
      direccion: '',
      personaContacto: '',
      facturacion: 0,
      facturasMes: 0,
      nominasMes: 0,
      sistemaTributacion: 'Estimación Directa',
      periodoDeclaraciones: 'Trimestral',
      modelo303: false,
      modelo111: false,
      modelo115: false,
      modelo130: false,
      modelo100: false,
      modelo349: false,
      modelo347: false,
      solicitudCertificados: false,
      censosAEAT: false,
      recepcionNotificaciones: false,
      estadisticasINE: false,
      solicitudAyudas: false,
      conLaboralSocial: false,
      aplicaDescuento: false,
      tipoDescuento: 'PORCENTAJE',
      valorDescuento: 0
    }
  });
  
  const formValues = watch();
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cargar datos del presupuesto existente cuando estamos en modo edición
  useEffect(() => {
    if (isEditMode && existingBudget && !loadingBudget) {
      // Establecer tipo de gestoría y cliente
      setTipoGestoria(existingBudget.tipoGestoria);
      
      // Poblar todos los campos del formulario
      setValue('nombreCliente', existingBudget.nombreCliente);
      setValue('nifCif', existingBudget.nifCif);
      setValue('email', existingBudget.email);
      setValue('telefono', existingBudget.telefono || '');
      setValue('direccion', existingBudget.direccion || '');
      setValue('personaContacto', existingBudget.personaContacto || '');
      
      // Datos empresariales
      setValue('facturacion', existingBudget.facturacion);
      setValue('facturasMes', existingBudget.facturasMes);
      setValue('nominasMes', existingBudget.nominasMes || 0);
      setValue('sistemaTributacion', existingBudget.sistemaTributacion);
      setValue('periodoDeclaraciones', existingBudget.periodoDeclaraciones);
      
      // Modelos fiscales
      setValue('modelo303', existingBudget.modelo303 || false);
      setValue('modelo111', existingBudget.modelo111 || false);
      setValue('modelo115', existingBudget.modelo115 || false);
      setValue('modelo130', existingBudget.modelo130 || false);
      setValue('modelo100', existingBudget.modelo100 || false);
      setValue('modelo349', existingBudget.modelo349 || false);
      setValue('modelo347', existingBudget.modelo347 || false);
      
      // Servicios adicionales
      setValue('solicitudCertificados', existingBudget.solicitudCertificados || false);
      setValue('censosAEAT', existingBudget.censosAEAT || false);
      setValue('recepcionNotificaciones', existingBudget.recepcionNotificaciones || false);
      setValue('estadisticasINE', existingBudget.estadisticasINE || false);
      setValue('solicitudAyudas', existingBudget.solicitudAyudas || false);
      setValue('conLaboralSocial', existingBudget.conLaboralSocial || false);
      
      // Descuentos
      setValue('aplicaDescuento', existingBudget.aplicaDescuento || false);
      setValue('tipoDescuento', existingBudget.tipoDescuento || 'PORCENTAJE');
      setValue('valorDescuento', existingBudget.valorDescuento || 0);
      
      // Config ID
      if (existingBudget.configId) {
        setValue('configId', existingBudget.configId);
      }
    }
  }, [existingBudget, loadingBudget, isEditMode, setValue]);
  
  // Memoizar los valores relevantes para el cálculo usando JSON para comparación profunda
  const calculationDeps = useMemo(() => JSON.stringify({
    facturasMes: formValues.facturasMes,
    nominasMes: formValues.nominasMes,
    facturacion: formValues.facturacion,
    sistemaTributacion: formValues.sistemaTributacion,
    periodoDeclaraciones: formValues.periodoDeclaraciones,
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
  }), [
    formValues.facturasMes,
    formValues.nominasMes,
    formValues.facturacion,
    formValues.sistemaTributacion,
    formValues.periodoDeclaraciones,
    formValues.modelo303,
    formValues.modelo111,
    formValues.modelo115,
    formValues.modelo130,
    formValues.modelo100,
    formValues.modelo349,
    formValues.modelo347,
    formValues.solicitudCertificados,
    formValues.censosAEAT,
    formValues.recepcionNotificaciones,
    formValues.estadisticasINE,
    formValues.solicitudAyudas,
    formValues.conLaboralSocial,
    formValues.aplicaDescuento,
    formValues.tipoDescuento,
    formValues.valorDescuento
  ]);
  
  // Auto-calcular cuando cambian los valores relevantes
  useEffect(() => {
    if (!config) return;
    
    const parsedValues = JSON.parse(calculationDeps);
    
    // Calcular solo si hay al menos facturación o facturas/mes
    if (!parsedValues.facturasMes && !parsedValues.facturacion) {
      setCalculatedData(null);
      return;
    }
    
    const calculationInput: BudgetCalculationInput = {
      facturasMes: parsedValues.facturasMes || 0,
      nominasMes: parsedValues.nominasMes,
      facturacion: parsedValues.facturacion || 0,
      sistemaTributacion: parsedValues.sistemaTributacion || 'Estimación Directa',
      periodoDeclaraciones: parsedValues.periodoDeclaraciones || 'Trimestral',
      modelo303: parsedValues.modelo303,
      modelo111: parsedValues.modelo111,
      modelo115: parsedValues.modelo115,
      modelo130: parsedValues.modelo130,
      modelo100: parsedValues.modelo100,
      modelo349: parsedValues.modelo349,
      modelo347: parsedValues.modelo347,
      solicitudCertificados: parsedValues.solicitudCertificados,
      censosAEAT: parsedValues.censosAEAT,
      recepcionNotificaciones: parsedValues.recepcionNotificaciones,
      estadisticasINE: parsedValues.estadisticasINE,
      solicitudAyudas: parsedValues.solicitudAyudas,
      conLaboralSocial: parsedValues.conLaboralSocial,
      aplicaDescuento: parsedValues.aplicaDescuento,
      tipoDescuento: parsedValues.tipoDescuento,
      valorDescuento: parsedValues.valorDescuento
    };
    
    // Limpiar timeout anterior si existe
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }
    
    // Debounce de 800ms para evitar cálculos excesivos
    calculateTimeoutRef.current = setTimeout(() => {
      calculateMutation.mutate(
        { calculation: calculationInput, tipo: tipoGestoria },
        {
          onSuccess: (data) => setCalculatedData(data),
          onError: () => setCalculatedData(null)
        }
      );
    }, 800);
    
    return () => {
      if (calculateTimeoutRef.current) {
        clearTimeout(calculateTimeoutRef.current);
      }
    };
  }, [calculationDeps, config, tipoGestoria]); // REMOVIDO calculateMutation de dependencias
  
  useEffect(() => {
    if (config) {
      setValue('configId', config.id);
    }
  }, [config, setValue]);
  
  // Cargar datos del presupuesto existente en modo edición
  useEffect(() => {
    if (isEditMode && existingBudget) {
      console.log('📥 Cargando datos del presupuesto existente:', existingBudget);
      
      // Establecer tipo de gestoría y cliente
      setTipoGestoria(existingBudget.tipoGestoria);
      
      // Determinar tipo de cliente basado en los datos
      if (existingBudget.nominasMes && existingBudget.nominasMes > 0) {
        setTipoCliente('EMPRESA');
      } else {
        setTipoCliente('AUTONOMO');
      }
      
      // Cargar todos los campos del formulario
      setValue('nombreCliente', existingBudget.nombreCliente);
      setValue('nifCif', existingBudget.nifCif);
      setValue('email', existingBudget.email);
      setValue('telefono', existingBudget.telefono || '');
      setValue('direccion', existingBudget.direccion || '');
      setValue('personaContacto', existingBudget.personaContacto || '');
      
      setValue('facturacion', existingBudget.facturacion);
      setValue('facturasMes', existingBudget.facturasMes);
      setValue('nominasMes', existingBudget.nominasMes || 0);
      setValue('sistemaTributacion', existingBudget.sistemaTributacion);
      setValue('periodoDeclaraciones', existingBudget.periodoDeclaraciones);
      
      // Modelos fiscales
      setValue('modelo303', existingBudget.modelo303 || false);
      setValue('modelo111', existingBudget.modelo111 || false);
      setValue('modelo115', existingBudget.modelo115 || false);
      setValue('modelo130', existingBudget.modelo130 || false);
      setValue('modelo100', existingBudget.modelo100 || false);
      setValue('modelo349', existingBudget.modelo349 || false);
      setValue('modelo347', existingBudget.modelo347 || false);
      
      // Servicios adicionales
      setValue('solicitudCertificados', existingBudget.solicitudCertificados || false);
      setValue('censosAEAT', existingBudget.censosAEAT || false);
      setValue('recepcionNotificaciones', existingBudget.recepcionNotificaciones || false);
      setValue('estadisticasINE', existingBudget.estadisticasINE || false);
      setValue('solicitudAyudas', existingBudget.solicitudAyudas || false);
      setValue('conLaboralSocial', existingBudget.conLaboralSocial || false);
      
      // Descuentos
      setValue('aplicaDescuento', existingBudget.aplicaDescuento || false);
      setValue('tipoDescuento', existingBudget.tipoDescuento || 'PORCENTAJE');
      setValue('valorDescuento', existingBudget.valorDescuento || 0);
      
      setValue('configId', existingBudget.configId || '');
      setValue('creadoPor', existingBudget.creadoPor || 'admin');
    }
  }, [isEditMode, existingBudget, setValue]);
  
  const onSubmit = async (data: CreateBudgetInput) => {
    try {
      console.log('📝 Datos del formulario:', data);
      console.log('🏢 Tipo gestoría:', tipoGestoria);
      console.log('🔧 Modo:', isEditMode ? 'Editar' : 'Crear');
      
      const budgetData = {
        ...data,
        tipoGestoria
      };
      
      if (isEditMode && budgetId) {
        // Actualizar presupuesto existente
        console.log('📤 Actualizando presupuesto:', budgetId);
        const budget = await updateMutation.mutateAsync({ 
          id: budgetId, 
          input: budgetData 
        });
        console.log('✅ Presupuesto actualizado:', budget);
        toast.success('Presupuesto actualizado exitosamente');
        setLocation(`/documentacion/presupuestos/${budgetId}`);
      } else {
        // Crear nuevo presupuesto
        console.log('📤 Creando presupuesto nuevo');
        const budget = await createMutation.mutateAsync(budgetData);
        console.log('✅ Presupuesto creado:', budget);
        toast.success('Presupuesto creado exitosamente');
        setLocation(`/documentacion/presupuestos/${budget.id}`);
      }
    } catch (error: any) {
      console.error('❌ Error:', error);
      console.error('❌ Detalles del error:', error.response?.data || error);
      const actionText = isEditMode ? 'actualizar' : 'crear';
      toast.error(error.response?.data?.message || error.message || `Error al ${actionText} presupuesto`);
    }
  };
  
  // Mostrar loading mientras se carga el presupuesto en modo edición
  if (isEditMode && loadingBudget) {
    return (
      <div className="container mx-auto py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Cargando presupuesto...</p>
      </div>
    );
  }
  
  // Mostrar error si no se encuentra el presupuesto en modo edición
  if (isEditMode && !loadingBudget && !existingBudget) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Presupuesto no encontrado</h2>
        <Button onClick={() => setLocation('/documentacion/presupuestos')}>Volver a la lista</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/documentacion/presupuestos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? `Editar Presupuesto ${existingBudget?.numero || ''}` : 'Nuevo Presupuesto'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Modifique los datos del presupuesto' : 'Complete los datos para generar el presupuesto'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={tipoGestoria === 'ASESORIA_LA_LLAVE' ? 'default' : 'outline'}>
            {tipoGestoria === 'ASESORIA_LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online'}
          </Badge>
          <Badge variant="secondary">
            {tipoCliente === 'EMPRESA' ? 'Empresa' : tipoCliente === 'AUTONOMO' ? 'Autónomo' : 'Particular'}
          </Badge>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulario Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tipo de Cliente y Gestoría */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración del Presupuesto</CardTitle>
                <CardDescription>Seleccione el tipo de cliente y gestoría</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tipoCliente">Tipo de Cliente *</Label>
                  <Select value={tipoCliente} onValueChange={(v: any) => setTipoCliente(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPRESA">🏢 Empresa</SelectItem>
                      <SelectItem value="AUTONOMO">👤 Autónomo</SelectItem>
                      <SelectItem value="PARTICULAR">🏠 Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipoGestoria">Tipo de Gestoría *</Label>
                  <Select value={tipoGestoria} onValueChange={(v: any) => setTipoGestoria(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ASESORIA_LA_LLAVE">Asesoría La Llave</SelectItem>
                      <SelectItem value="GESTORIA_ONLINE">Gestoría Online</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

            {/* Servicios Adicionales Personalizados */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Servicios Personalizados</CardTitle>
                    <CardDescription>Añade conceptos adicionales manualmente</CardDescription>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setServiciosPersonalizados([
                        ...serviciosPersonalizados,
                        { id: Date.now().toString(), nombre: '', descripcion: '', precio: 0 }
                      ]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir Servicio
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {serviciosPersonalizados.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay servicios personalizados. Haz clic en "Añadir Servicio" para crear uno.
                  </p>
                ) : (
                  serviciosPersonalizados.map((servicio, index) => (
                    <div key={servicio.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Servicio #{index + 1}</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setServiciosPersonalizados(
                              serviciosPersonalizados.filter(s => s.id !== servicio.id)
                            );
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label htmlFor={`nombre-${servicio.id}`}>Nombre del Servicio</Label>
                          <Input
                            id={`nombre-${servicio.id}`}
                            value={servicio.nombre}
                            onChange={(e) => {
                              const updated = serviciosPersonalizados.map(s =>
                                s.id === servicio.id ? { ...s, nombre: e.target.value } : s
                              );
                              setServiciosPersonalizados(updated);
                            }}
                            placeholder="Ej: Asesoría especial, Trámite urgente..."
                          />
                        </div>
                        <div>
                          <Label htmlFor={`descripcion-${servicio.id}`}>Descripción</Label>
                          <Input
                            id={`descripcion-${servicio.id}`}
                            value={servicio.descripcion}
                            onChange={(e) => {
                              const updated = serviciosPersonalizados.map(s =>
                                s.id === servicio.id ? { ...s, descripcion: e.target.value } : s
                              );
                              setServiciosPersonalizados(updated);
                            }}
                            placeholder="Descripción opcional del servicio"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`precio-${servicio.id}`}>Precio (€)</Label>
                          <Input
                            id={`precio-${servicio.id}`}
                            type="number"
                            step="0.01"
                            value={servicio.precio}
                            onChange={(e) => {
                              const updated = serviciosPersonalizados.map(s =>
                                s.id === servicio.id ? { ...s, precio: parseFloat(e.target.value) || 0 } : s
                              );
                              setServiciosPersonalizados(updated);
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
                  <Calculator className={`w-5 h-5 ${calculateMutation.isPending ? 'animate-pulse' : ''}`} />
                  Resumen del Presupuesto
                  {calculateMutation.isPending && (
                    <span className="text-xs font-normal text-muted-foreground ml-auto">
                      Actualizando...
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculatedData ? (
                  <>
                    <div className="space-y-2 transition-opacity duration-200" style={{ opacity: calculateMutation.isPending ? 0.6 : 1 }}>
                      <div className="flex justify-between text-sm">
                        <span>Contabilidad:</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(calculatedData.totalContabilidad)}
                        </span>
                      </div>
                      {(calculatedData.totalLaboral ?? 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Laboral:</span>
                          <span className="font-medium tabular-nums">
                            {formatCurrency(calculatedData.totalLaboral)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span className="font-medium tabular-nums">
                          {formatCurrency(calculatedData.subtotal)}
                        </span>
                      </div>
                      {serviciosPersonalizados.length > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Servicios Personalizados:</span>
                          <span className="font-medium tabular-nums">
                            +{formatCurrency(serviciosPersonalizados.reduce((sum, s) => sum + s.precio, 0))}
                          </span>
                        </div>
                      )}
                      {(calculatedData.descuentoCalculado ?? 0) > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento:</span>
                          <span className="font-medium tabular-nums">
                            -{formatCurrency(calculatedData.descuentoCalculado)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Final:</span>
                        <span className="text-primary tabular-nums">
                          {formatCurrency(calculatedData.totalFinal + serviciosPersonalizados.reduce((sum, s) => sum + s.precio, 0))}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-medium mb-2">Empiece a completar los datos</p>
                    <p className="text-xs">
                      El cálculo se actualizará<br/>
                      automáticamente mientras escribe
                    </p>
                  </div>
                )}
                
                {/* Botón siempre visible */}
                <div className="pt-4 border-t mt-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={(createMutation.isPending || updateMutation.isPending) || !formValues.nombreCliente || !formValues.nifCif || !formValues.email}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {createMutation.isPending || updateMutation.isPending 
                      ? (isEditMode ? 'Actualizando...' : 'Guardando...') 
                      : (isEditMode ? 'Actualizar Presupuesto' : 'Crear Presupuesto')}
                  </Button>
                  {(!formValues.nombreCliente || !formValues.nifCif || !formValues.email) && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Complete nombre, NIF y email del cliente
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
