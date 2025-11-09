import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, TrendingUp, FileText, Users, Package, DollarSign, Info } from 'lucide-react';
import type { CalculationBreakdown } from '@/hooks/useBudgetCalculator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface CalculationResultProps {
  data: CalculationBreakdown;
  tipoGestoria: 'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE';
}

export default function CalculationResult({ data, tipoGestoria }: CalculationResultProps) {
  const { detalleCalculo } = data;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Resumen Principal */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <CardTitle>Resumen del Presupuesto</CardTitle>
            </div>
            <Badge variant={tipoGestoria === 'ASESORIA_LA_LLAVE' ? 'default' : 'secondary'} className="text-sm">
              {tipoGestoria === 'ASESORIA_LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Concepto Base */}
          <div className="flex justify-between items-center text-lg">
            <span className="font-medium">{data.conceptoBase}</span>
            <span className="font-bold text-primary">{formatCurrency(data.precioBase)}</span>
          </div>

          {/* Conceptos Adicionales */}
          {data.conceptosAdicionales.length > 0 && (
            <div className="space-y-2">
              <Separator />
              <div className="text-sm text-muted-foreground font-medium">Conceptos Adicionales:</div>
              {data.conceptosAdicionales.map((concepto, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm pl-4">
                  <div className="flex items-center gap-2">
                    <span>{concepto.concepto}</span>
                    <Badge variant="outline" className="text-xs">
                      {concepto.tipo}
                    </Badge>
                  </div>
                  <span className="font-medium">{formatCurrency(concepto.precio)}</span>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Subtotal */}
          <div className="flex justify-between items-center">
            <span className="font-medium">Subtotal</span>
            <span className="font-semibold">{formatCurrency(data.subtotal)}</span>
          </div>

          {/* IVA */}
          <div className="flex justify-between items-center text-muted-foreground">
            <span>IVA (21%)</span>
            <span>{formatCurrency(data.iva)}</span>
          </div>

          <Separator className="my-2" />

          {/* Total */}
          <div className="flex justify-between items-center text-2xl">
            <span className="font-bold">Total</span>
            <span className="font-bold text-primary">{formatCurrency(data.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Detalle del Cálculo (Accordion) */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="detalles">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              <span className="font-medium">Ver Detalle del Cálculo</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              {/* Paso 1: Tramos Base */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    1. Cálculo Base por Tramos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {detalleCalculo.tramoFacturas && (
                    <div>
                      <div className="font-medium text-muted-foreground">Tramo Facturas:</div>
                      <div className="pl-4 space-y-1">
                        <div>{detalleCalculo.tramoFacturas.etiqueta}</div>
                        <div className="text-xs text-muted-foreground">
                          ({detalleCalculo.tramoFacturas.min} - {detalleCalculo.tramoFacturas.max ?? '∞'})
                        </div>
                        <div className="font-semibold">{formatCurrency(detalleCalculo.precioFacturas)}</div>
                      </div>
                    </div>
                  )}

                  {detalleCalculo.tramoNominas && (
                    <div>
                      <div className="font-medium text-muted-foreground">Tramo Nóminas:</div>
                      <div className="pl-4 space-y-1">
                        <div>{detalleCalculo.tramoNominas.etiqueta}</div>
                        <div className="text-xs text-muted-foreground">
                          ({detalleCalculo.tramoNominas.min} - {detalleCalculo.tramoNominas.max ?? '∞'})
                        </div>
                        <div className="font-semibold">{formatCurrency(detalleCalculo.precioNominas)}</div>
                      </div>
                    </div>
                  )}

                  {detalleCalculo.tramoFacturacion && (
                    <div>
                      <div className="font-medium text-muted-foreground">Factor Facturación Anual:</div>
                      <div className="pl-4 space-y-1">
                        <div>{detalleCalculo.tramoFacturacion.etiqueta}</div>
                        <div className="text-xs text-muted-foreground">
                          Multiplicador: {detalleCalculo.tramoFacturacion.multiplicador}x
                        </div>
                        <div className="font-semibold">Factor: {detalleCalculo.factorFacturacion.toFixed(2)}</div>
                      </div>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Precio Base Calculado:</span>
                    <span className="text-primary">{formatCurrency(detalleCalculo.precioBase)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Paso 2: Período Mensual */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    2. Ajuste Período Mensual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Porcentaje:</span>
                    <span>{detalleCalculo.porcentajePeriodoMensual}%</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Precio con Período:</span>
                    <span className="text-primary">{formatCurrency(detalleCalculo.precioBaseConPeriodo)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Paso 3: EDN (si aplica) */}
              {tipoGestoria === 'GESTORIA_ONLINE' && detalleCalculo.porcentajeEDN !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      3. Incremento EDN (Gestión Online)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Porcentaje EDN:</span>
                      <span>{detalleCalculo.porcentajeEDN}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incremento:</span>
                      <span>+{formatCurrency(detalleCalculo.incrementoEDN || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Precio con EDN:</span>
                      <span className="text-primary">{formatCurrency(detalleCalculo.precioConEDN || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paso 4: Módulos (si aplica) */}
              {tipoGestoria === 'GESTORIA_ONLINE' && detalleCalculo.porcentajeModulos !== undefined && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      4. Incremento Módulos (Gestión Online)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Porcentaje Módulos:</span>
                      <span>{detalleCalculo.porcentajeModulos}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Incremento:</span>
                      <span>+{formatCurrency(detalleCalculo.incrementoModulos || 0)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Precio con Módulos:</span>
                      <span className="text-primary">{formatCurrency(detalleCalculo.precioConModulos || 0)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paso 5: Modelos Fiscales */}
              {detalleCalculo.modelosFiscalesSeleccionados.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      5. Modelos Fiscales Seleccionados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {detalleCalculo.modelosFiscalesSeleccionados.map((modelo, idx) => (
                      <div key={idx} className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 text-xs">{modelo.codigo}</code>
                          <span>{modelo.nombre}</span>
                        </div>
                        <span>{formatCurrency(modelo.precio)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Modelos:</span>
                      <span className="text-primary">{formatCurrency(detalleCalculo.precioModelosFiscales)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Paso 6: Servicios Adicionales */}
              {detalleCalculo.serviciosSeleccionados.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      6. Servicios Adicionales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {detalleCalculo.serviciosSeleccionados.map((servicio, idx) => (
                      <div key={idx} className="flex justify-between">
                        <div className="flex items-center gap-2">
                          <span>{servicio.nombre}</span>
                          <Badge variant="outline" className="text-xs">{servicio.tipo}</Badge>
                        </div>
                        <span>{formatCurrency(servicio.precio)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Servicios:</span>
                      <span className="text-primary">{formatCurrency(detalleCalculo.precioServiciosAdicionales)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Descuento (si aplica) */}
              {detalleCalculo.descuentoAplicado !== undefined && detalleCalculo.descuentoAplicado > 0 && (
                <Card className="border-green-200 bg-green-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                      <TrendingUp className="h-4 w-4" />
                      Descuento Aplicado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal sin descuento:</span>
                      <span>{formatCurrency(detalleCalculo.subtotalSinDescuento || 0)}</span>
                    </div>
                    <div className="flex justify-between text-green-700 font-semibold">
                      <span>Descuento ({detalleCalculo.porcentajeDescuento}%):</span>
                      <span>-{formatCurrency(detalleCalculo.descuentoAplicado)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
