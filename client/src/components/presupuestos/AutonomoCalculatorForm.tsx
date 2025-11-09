import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Calculator, Loader2, FileText, Users, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useAutonomoConfig from '@/hooks/useAutonomoConfig';
import { useBudgetCalculator, type BudgetCalculationInput } from '@/hooks/useBudgetCalculator';
import CalculationResult from './CalculationResult';

interface AutonomoCalculatorFormProps {
  onCalculationComplete?: (result: any) => void;
  initialValues?: Partial<BudgetCalculationInput>;
}

export default function AutonomoCalculatorForm({
  onCalculationComplete,
  initialValues,
}: AutonomoCalculatorFormProps) {
  const { getFiscalModels, getServices } = useAutonomoConfig();
  const { calculate, loading, result, error } = useBudgetCalculator();

  // Estados del formulario
  const [tipoGestoria, setTipoGestoria] = useState<'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'>(initialValues?.tipoGestoria || 'ASESORIA_LA_LLAVE');
  const [nFacturas, setNFacturas] = useState(initialValues?.nFacturas || 10);
  const [nNominas, setNNominas] = useState(initialValues?.nNominas || 2);
  const [facturacionAnual, setFacturacionAnual] = useState(initialValues?.facturacionAnual || 50000);
  const [modelosSeleccionados, setModelosSeleccionados] = useState<string[]>(initialValues?.modelosFiscales || []);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<string[]>(initialValues?.serviciosAdicionales || []);
  const [aplicarDescuento, setAplicarDescuento] = useState(initialValues?.aplicarDescuento || false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState(initialValues?.porcentajeDescuento || 0);

  // Datos de modelos y servicios
  const [modelos, setModelos] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Cargar modelos y servicios
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [modelosData, serviciosData] = await Promise.all([
          getFiscalModels(),
          getServices(),
        ]);
        setModelos(modelosData.filter(m => m.activo).sort((a, b) => a.orden - b.orden));
        setServicios(serviciosData.filter(s => s.activo).sort((a, b) => a.orden - b.orden));
      } catch (err) {
        console.error('Error cargando datos:', err);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [getFiscalModels, getServices]);

  const handleCalculate = async () => {
    const input: BudgetCalculationInput = {
      tipoGestoria,
      nFacturas,
      nNominas,
      facturacionAnual,
      modelosFiscales: modelosSeleccionados,
      serviciosAdicionales: serviciosSeleccionados,
      aplicarDescuento,
      porcentajeDescuento: aplicarDescuento ? porcentajeDescuento : undefined,
    };

    const result = await calculate(input);
    if (result.success && onCalculationComplete) {
      onCalculationComplete(result.data);
    }
  };

  const toggleModelo = (modeloId: string) => {
    setModelosSeleccionados(prev =>
      prev.includes(modeloId)
        ? prev.filter(id => id !== modeloId)
        : [...prev, modeloId]
    );
  };

  const toggleServicio = (servicioId: string) => {
    setServiciosSeleccionados(prev =>
      prev.includes(servicioId)
        ? prev.filter(id => id !== servicioId)
        : [...prev, servicioId]
    );
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tipo de Gestoría */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tipo de Gestoría
          </CardTitle>
          <CardDescription>Selecciona el modelo de gestión</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={tipoGestoria === 'ASESORIA_LA_LLAVE' ? 'default' : 'outline'}
              onClick={() => setTipoGestoria('ASESORIA_LA_LLAVE')}
              className="flex-1"
            >
              Asesoría La Llave
            </Button>
            <Button
              variant={tipoGestoria === 'GESTORIA_ONLINE' ? 'default' : 'outline'}
              onClick={() => setTipoGestoria('GESTORIA_ONLINE')}
              className="flex-1"
            >
              Gestoría Online
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Datos Base */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Datos de Actividad
          </CardTitle>
          <CardDescription>Introduce los datos principales del autónomo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nFacturas">Nº Facturas</Label>
              <Input
                id="nFacturas"
                type="number"
                min="0"
                value={nFacturas}
                onChange={(e) => setNFacturas(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Facturas emitidas al mes</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nNominas">Nº Nóminas</Label>
              <Input
                id="nNominas"
                type="number"
                min="0"
                value={nNominas}
                onChange={(e) => setNNominas(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Nóminas procesadas al mes</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facturacionAnual">Facturación Anual (€)</Label>
              <Input
                id="facturacionAnual"
                type="number"
                min="0"
                step="1000"
                value={facturacionAnual}
                onChange={(e) => setFacturacionAnual(parseFloat(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Facturación anual estimada</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modelos Fiscales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Modelos Fiscales
          </CardTitle>
          <CardDescription>
            Selecciona los modelos fiscales que necesita el autónomo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modelos.map((modelo) => (
              <div
                key={modelo.id}
                className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleModelo(modelo.id)}
              >
                <Checkbox
                  id={`modelo-${modelo.id}`}
                  checked={modelosSeleccionados.includes(modelo.id)}
                  onCheckedChange={() => toggleModelo(modelo.id)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 text-xs font-semibold">
                      {modelo.codigoModelo}
                    </code>
                    <Label htmlFor={`modelo-${modelo.id}`} className="cursor-pointer font-medium">
                      {modelo.nombreModelo}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {modelo.precio.toFixed(2)}€/mes
                  </p>
                </div>
              </div>
            ))}
          </div>
          {modelos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay modelos fiscales disponibles
            </p>
          )}
        </CardContent>
      </Card>

      {/* Servicios Adicionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Servicios Adicionales
          </CardTitle>
          <CardDescription>
            Añade servicios extra al presupuesto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            {servicios.map((servicio) => (
              <div
                key={servicio.id}
                className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => toggleServicio(servicio.id)}
              >
                <Checkbox
                  id={`servicio-${servicio.id}`}
                  checked={serviciosSeleccionados.includes(servicio.id)}
                  onCheckedChange={() => toggleServicio(servicio.id)}
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`servicio-${servicio.id}`} className="cursor-pointer font-medium">
                      {servicio.nombre}
                    </Label>
                    <Badge variant={servicio.tipoServicio === 'MENSUAL' ? 'default' : 'outline'}>
                      {servicio.tipoServicio}
                    </Badge>
                  </div>
                  {servicio.descripcion && (
                    <p className="text-xs text-muted-foreground">{servicio.descripcion}</p>
                  )}
                  <p className="text-xs font-semibold text-primary">
                    {servicio.precio.toFixed(2)}€
                    {servicio.tipoServicio === 'MENSUAL' ? '/mes' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {servicios.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay servicios adicionales disponibles
            </p>
          )}
        </CardContent>
      </Card>

      {/* Descuento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Descuento
          </CardTitle>
          <CardDescription>Aplicar descuento al presupuesto</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="aplicar-descuento"
              checked={aplicarDescuento}
              onCheckedChange={setAplicarDescuento}
            />
            <Label htmlFor="aplicar-descuento">Aplicar descuento</Label>
          </div>

          {aplicarDescuento && (
            <div className="space-y-2">
              <Label htmlFor="porcentajeDescuento">Porcentaje de descuento (%)</Label>
              <Input
                id="porcentajeDescuento"
                type="number"
                min="0"
                max="100"
                step="1"
                value={porcentajeDescuento}
                onChange={(e) => setPorcentajeDescuento(parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botón Calcular */}
      <Button
        onClick={handleCalculate}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Calculando...' : 'Calcular Presupuesto'}
      </Button>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resultado */}
      {result?.success && result.data && (
        <CalculationResult data={result.data} tipoGestoria={tipoGestoria} />
      )}
    </div>
  );
}
