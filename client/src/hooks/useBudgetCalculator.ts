import { useState, useCallback } from 'react';

// Types para el input de cálculo
export interface BudgetCalculationInput {
  tipoGestoria: 'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE';
  nFacturas: number;
  nNominas: number;
  facturacionAnual: number;
  modelosFiscales: string[]; // IDs de modelos seleccionados
  serviciosAdicionales: string[]; // IDs de servicios seleccionados
  aplicarDescuento?: boolean;
  porcentajeDescuento?: number;
}

// Types para el resultado del cálculo
export interface CalculationBreakdown {
  conceptoBase: string;
  precioBase: number;
  conceptosAdicionales: Array<{
    concepto: string;
    precio: number;
    tipo: 'MENSUAL' | 'PUNTUAL';
  }>;
  subtotal: number;
  iva: number;
  total: number;
  detalleCalculo: {
    tramoFacturas?: {
      min: number;
      max: number | null;
      precio: number;
      etiqueta: string;
    };
    tramoNominas?: {
      min: number;
      max: number | null;
      precio: number;
      etiqueta: string;
    };
    tramoFacturacion?: {
      min: number;
      max: number | null;
      multiplicador: number;
      etiqueta: string;
    };
    precioFacturas: number;
    precioNominas: number;
    factorFacturacion: number;
    precioBase: number;
    porcentajePeriodoMensual: number;
    precioBaseConPeriodo: number;
    porcentajeEDN?: number;
    incrementoEDN?: number;
    precioConEDN?: number;
    porcentajeModulos?: number;
    incrementoModulos?: number;
    precioConModulos?: number;
    modelosFiscalesSeleccionados: Array<{
      codigo: string;
      nombre: string;
      precio: number;
    }>;
    precioModelosFiscales: number;
    serviciosSeleccionados: Array<{
      codigo: string;
      nombre: string;
      precio: number;
      tipo: 'MENSUAL' | 'PUNTUAL';
    }>;
    precioServiciosAdicionales: number;
    subtotalSinDescuento: number;
    descuentoAplicado?: number;
    porcentajeDescuento?: number;
  };
}

export interface CalculationResult {
  success: boolean;
  data?: CalculationBreakdown;
  error?: string;
}

export function useBudgetCalculator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculate = useCallback(async (input: BudgetCalculationInput): Promise<CalculationResult> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/gestoria-budgets/calculate-autonomo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al calcular presupuesto' }));
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const calculationResult: CalculationResult = {
        success: true,
        data,
      };
      
      setResult(calculationResult);
      return calculationResult;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al calcular presupuesto';
      setError(errorMessage);
      const calculationResult: CalculationResult = {
        success: false,
        error: errorMessage,
      };
      setResult(calculationResult);
      return calculationResult;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    calculate,
    clearResult,
    loading,
    result,
    error,
  };
}
