import { PrismaClient } from '@prisma/client';
import { init } from '@paralleldrive/cuid2';

const createId = init({ length: 25 });
const prisma = new PrismaClient();

interface BudgetParam {
  budgetType: 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';
  category: string;
  subcategory?: string;
  paramKey: string;
  paramLabel: string;
  paramValue: number;
  minRange?: number;
  maxRange?: number;
  description?: string;
}

// ==================== PARÁMETROS PYME ====================
const PYME_PARAMS: BudgetParam[] = [
  // Contabilidad Base
  { budgetType: 'PYME', category: 'Contabilidad', paramKey: 'BASE_CONTABILIDAD', paramLabel: 'Contabilidad base', paramValue: 250, description: 'Precio base de contabilidad mensual' },
  
  // Tramos de facturación
  { budgetType: 'PYME', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'Hasta 2 facturas/mes', paramValue: 0, minRange: 0, maxRange: 2 },
  { budgetType: 'PYME', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'De 3 a 9 facturas/mes', paramValue: 20, minRange: 3, maxRange: 9 },
  { budgetType: 'PYME', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'De 10 a 14 facturas/mes', paramValue: 40, minRange: 10, maxRange: 14 },
  { budgetType: 'PYME', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'Más de 15 facturas/mes', paramValue: 60, minRange: 15, maxRange: 999999 },
  
  // Tramos de nóminas
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'Hasta 2 nóminas/mes', paramValue: 20, minRange: 0, maxRange: 2 },
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 3 a 9 nóminas/mes', paramValue: 18, minRange: 3, maxRange: 9 },
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 10 a 14 nóminas/mes', paramValue: 16, minRange: 10, maxRange: 14 },
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 15 a 30 nóminas/mes', paramValue: 14, minRange: 15, maxRange: 30 },
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 31 a 60 nóminas/mes', paramValue: 12, minRange: 31, maxRange: 60 },
  { budgetType: 'PYME', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'Más de 60 nóminas/mes', paramValue: 10, minRange: 61, maxRange: 999999 },
  
  // Impuestos trimestrales
  { budgetType: 'PYME', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_111', paramLabel: 'Modelo 111 (Retenciones IRPF)', paramValue: 25 },
  { budgetType: 'PYME', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_115', paramLabel: 'Modelo 115 (Retenciones alquileres)', paramValue: 25 },
  { budgetType: 'PYME', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_130', paramLabel: 'Modelo 130 (Pago fraccionado IRPF)', paramValue: 25 },
  { budgetType: 'PYME', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_303', paramLabel: 'Modelo 303 (IVA Trimestral)', paramValue: 35 },
  
  // Impuestos anuales
  { budgetType: 'PYME', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_190', paramLabel: 'Modelo 190 (Resumen anual retenciones)', paramValue: 30 },
  { budgetType: 'PYME', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_180', paramLabel: 'Modelo 180 (Resumen anual alquileres)', paramValue: 30 },
  { budgetType: 'PYME', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_390', paramLabel: 'Modelo 390 (Resumen anual IVA)', paramValue: 40 },
  
  // Cuentas anuales
  { budgetType: 'PYME', category: 'Cuentas Anuales', paramKey: 'CUENTAS_ANUALES', paramLabel: 'Elaboración de cuentas anuales', paramValue: 400, description: 'Incluye balance, P&G y memoria' },
  { budgetType: 'PYME', category: 'Cuentas Anuales', paramKey: 'DEPOSITO_CUENTAS', paramLabel: 'Depósito de cuentas anuales', paramValue: 100 },
];

// ==================== PARÁMETROS AUTÓNOMO ====================
const AUTONOMO_PARAMS: BudgetParam[] = [
  // Contabilidad Base
  { budgetType: 'AUTONOMO', category: 'Contabilidad', paramKey: 'BASE_CONTABILIDAD', paramLabel: 'Contabilidad base mensual', paramValue: 50, description: 'Precio base de contabilidad para autónomos' },
  
  // Tramos de facturación
  { budgetType: 'AUTONOMO', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'Hasta 2 facturas/mes', paramValue: 0, minRange: 0, maxRange: 2 },
  { budgetType: 'AUTONOMO', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'De 3 a 9 facturas/mes', paramValue: 20, minRange: 3, maxRange: 9 },
  { budgetType: 'AUTONOMO', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'De 10 a 14 facturas/mes', paramValue: 40, minRange: 10, maxRange: 14 },
  { budgetType: 'AUTONOMO', category: 'Contabilidad', subcategory: 'Tramos Facturación', paramKey: 'TRAMO_FACTURACION', paramLabel: 'Más de 15 facturas/mes', paramValue: 60, minRange: 15, maxRange: 999999 },
  
  // Tramos de nóminas
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'Hasta 2 nóminas/mes', paramValue: 20, minRange: 0, maxRange: 2 },
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 3 a 5 nóminas/mes', paramValue: 18, minRange: 3, maxRange: 5 },
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 6 a 10 nóminas/mes', paramValue: 16, minRange: 6, maxRange: 10 },
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 11 a 30 nóminas/mes', paramValue: 14, minRange: 11, maxRange: 30 },
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'De 31 a 60 nóminas/mes', paramValue: 12, minRange: 31, maxRange: 60 },
  { budgetType: 'AUTONOMO', category: 'Nóminas', subcategory: 'Tramos Nóminas', paramKey: 'TRAMO_NOMINAS', paramLabel: 'Más de 60 nóminas/mes', paramValue: 10, minRange: 61, maxRange: 999999 },
  
  // Impuestos trimestrales
  { budgetType: 'AUTONOMO', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_111', paramLabel: 'Modelo 111 (Retenciones IRPF)', paramValue: 25 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_115', paramLabel: 'Modelo 115 (Retenciones alquileres)', paramValue: 25 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_130', paramLabel: 'Modelo 130 (Pago fraccionado IRPF)', paramValue: 25 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Trimestrales', paramKey: 'IMPUESTO_303', paramLabel: 'Modelo 303 (IVA Trimestral)', paramValue: 35 },
  
  // Impuestos anuales
  { budgetType: 'AUTONOMO', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_190', paramLabel: 'Modelo 190 (Resumen anual retenciones)', paramValue: 30 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_180', paramLabel: 'Modelo 180 (Resumen anual alquileres)', paramValue: 30 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Anuales', paramKey: 'IMPUESTO_390', paramLabel: 'Modelo 390 (Resumen anual IVA)', paramValue: 40 },
  { budgetType: 'AUTONOMO', category: 'Impuestos Anuales', paramKey: 'RENTA_AUTONOMO', paramLabel: 'Declaración de la Renta', paramValue: 80 },
];

// ==================== PARÁMETROS RENTA ====================
const RENTA_PARAMS: BudgetParam[] = [
  { budgetType: 'RENTA', category: 'Renta', paramKey: 'RENTA_INDIVIDUAL', paramLabel: 'Renta individual', paramValue: 70, description: 'Declaración individual sin complejidad' },
  { budgetType: 'RENTA', category: 'Renta', paramKey: 'RENTA_CONJUNTA', paramLabel: 'Renta conjunta', paramValue: 80, description: 'Declaración conjunta' },
  { budgetType: 'RENTA', category: 'Renta', paramKey: 'RENTA_COMPLEJA', paramLabel: 'Renta con complejidad', paramValue: 100, description: 'Incluye actividades económicas, inmuebles, etc.' },
  { budgetType: 'RENTA', category: 'Renta', paramKey: 'RENTA_AUTONOMO', paramLabel: 'Renta con actividades económicas', paramValue: 120, description: 'Autónomos con actividad profesional' },
];

// ==================== PARÁMETROS HERENCIAS ====================
const HERENCIAS_PARAMS: BudgetParam[] = [
  { budgetType: 'HERENCIAS', category: 'Herencias', paramKey: 'HERENCIA_SIMPLE', paramLabel: 'Herencia simple (hasta 100k€)', paramValue: 300, description: 'Herencia sin complejidades', minRange: 0, maxRange: 100000 },
  { budgetType: 'HERENCIAS', category: 'Herencias', paramKey: 'HERENCIA_MEDIA', paramLabel: 'Herencia media (100k-500k€)', paramValue: 600, description: 'Herencia con complejidad media', minRange: 100001, maxRange: 500000 },
  { budgetType: 'HERENCIAS', category: 'Herencias', paramKey: 'HERENCIA_COMPLEJA', paramLabel: 'Herencia compleja (>500k€)', paramValue: 1200, description: 'Herencia compleja con múltiples bienes', minRange: 500001, maxRange: 999999999 },
  { budgetType: 'HERENCIAS', category: 'Donaciones', paramKey: 'DONACION_SIMPLE', paramLabel: 'Donación simple', paramValue: 200 },
  { budgetType: 'HERENCIAS', category: 'Donaciones', paramKey: 'DONACION_COMPLEJA', paramLabel: 'Donación compleja', paramValue: 400 },
];

async function seedBudgetParameters() {
  try {
    console.log('\n📦 Iniciando seed de parámetros de presupuesto...\n');

    // Combinar todos los parámetros
    const allParams = [...PYME_PARAMS, ...AUTONOMO_PARAMS, ...RENTA_PARAMS, ...HERENCIAS_PARAMS];

    console.log(`Total de parámetros a insertar: ${allParams.length}\n`);

    let inserted = 0;
    let skipped = 0;

    for (const param of allParams) {
      try {
        // Verificar si ya existe
        const exists = await prisma.budgetsParameter.findFirst({
          where: {
            budgetType: param.budgetType,
            paramKey: param.paramKey,
            minRange: param.minRange,
            maxRange: param.maxRange,
          },
        });

        if (exists) {
          skipped++;
          continue;
        }

        // Insertar parámetro
        await prisma.budgetsParameter.create({
          data: {
            id: createId(),
            budgetType: param.budgetType,
            category: param.category,
            subcategory: param.subcategory,
            paramKey: param.paramKey,
            paramLabel: param.paramLabel,
            paramValue: param.paramValue,
            minRange: param.minRange,
            maxRange: param.maxRange,
            description: param.description,
            isActive: true,
          },
        });

        inserted++;
        process.stdout.write(`\r✅ Insertados: ${inserted} | ⏭️  Omitidos: ${skipped}`);
      } catch (error: any) {
        console.error(`\n❌ Error insertando ${param.paramLabel}:`, error.message);
      }
    }

    console.log('\n\n📊 Resumen por tipo de presupuesto:\n');

    const summary = await prisma.budgetsParameter.groupBy({
      by: ['budgetType'],
      _count: true,
    });

    summary.forEach((s: any) => {
      console.log(`   ${s.budgetType}: ${s._count} parámetros`);
    });

    console.log('\n✅ Seed completado exitosamente\n');
  } catch (error) {
    console.error('\n❌ Error en seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedBudgetParameters();
