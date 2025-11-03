import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

/**
 * Calendario fiscal completo de la AEAT
 * Fuente: Agencia Tributaria - Calendario del contribuyente
 */

interface PeriodDefinition {
  kind: 'QUARTERLY' | 'ANNUAL' | 'SPECIAL';
  label: string;
  quarter?: number;
  month?: number;
  startsAt: Date;
  endsAt: Date;
  presentationStart: Date;
  presentationEnd: Date;
}

function getQuarterDates(year: number, quarter: number): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  const endMonth = quarter * 3 - 1;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, endMonth + 1, 0, 23, 59, 59),
  };
}

function getMonthDates(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59),
  };
}

/**
 * Genera el calendario fiscal completo para un año
 */
function generateFiscalCalendar(year: number): PeriodDefinition[] {
  const periods: PeriodDefinition[] = [];

  // ==================== TRIMESTRES ====================
  // Usado por: 303, 111, 130, 131, 349
  for (let q = 1; q <= 4; q++) {
    const { start, end } = getQuarterDates(year, q);

    // El plazo de presentación es del día 1 al 20 del mes siguiente al trimestre
    const presentationMonth = q * 3; // Mes siguiente al trimestre
    const presentationStart = new Date(year, presentationMonth, 1);
    const presentationEnd = new Date(year, presentationMonth, 20, 23, 59, 59);

    periods.push({
      kind: 'QUARTERLY',
      label: `${q}T`,
      quarter: q,
      startsAt: start,
      endsAt: end,
      presentationStart,
      presentationEnd,
    });
  }

  // ==================== MESES ====================
  // Usado por: 303, 111, 349 (cuando son mensuales)
  // Se marcan como SPECIAL para diferenciarlos de trimestrales
  for (let m = 1; m <= 12; m++) {
    const { start, end } = getMonthDates(year, m);

    // El plazo de presentación es del 1 al 20 del mes siguiente
    const presentationMonth = m < 12 ? m : 0; // Diciembre presenta en enero del año siguiente
    const presentationYear = m < 12 ? year : year + 1;
    const presentationStart = new Date(presentationYear, presentationMonth, 1);
    const presentationEnd = new Date(presentationYear, presentationMonth, 20, 23, 59, 59);

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    periods.push({
      kind: 'SPECIAL',
      label: `MES-${monthNames[m - 1]}`,
      month: m,
      startsAt: start,
      endsAt: end,
      presentationStart,
      presentationEnd,
    });
  }

  // ==================== ANUAL ====================
  // Usado por: 100, 200, 390, 347, 190, 180, 720

  // Declaración de la Renta (Modelo 100)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Abril - Junio del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 3, 1), // 1 abril
    presentationEnd: new Date(year + 1, 5, 30, 23, 59, 59), // 30 junio
  });

  // Impuesto sobre Sociedades (Modelo 200)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Hasta 25 de julio del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-200',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 0, 1), // 1 enero
    presentationEnd: new Date(year + 1, 6, 25, 23, 59, 59), // 25 julio
  });

  // Resumen anual IVA (Modelo 390)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Hasta 30 de enero del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-390',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 0, 1), // 1 enero
    presentationEnd: new Date(year + 1, 0, 30, 23, 59, 59), // 30 enero
  });

  // Operaciones con terceros (Modelo 347)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: 1 febrero - 28/29 febrero del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-347',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 1, 1), // 1 febrero
    presentationEnd: new Date(year + 1, 2, 0, 23, 59, 59), // Último día de febrero
  });

  // Resumen anual retenciones (Modelo 190)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Hasta 31 de enero del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-190',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 0, 1), // 1 enero
    presentationEnd: new Date(year + 1, 0, 31, 23, 59, 59), // 31 enero
  });

  // Retenciones alquileres (Modelo 180)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Hasta 31 de enero del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-180',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 0, 1), // 1 enero
    presentationEnd: new Date(year + 1, 0, 31, 23, 59, 59), // 31 enero
  });

  // Bienes en el extranjero (Modelo 720)
  // Periodo: 1 enero - 31 diciembre
  // Presentación: Hasta 31 de marzo del año siguiente
  periods.push({
    kind: 'ANNUAL',
    label: 'ANUAL-720',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 11, 31, 23, 59, 59),
    presentationStart: new Date(year + 1, 0, 1), // 1 enero
    presentationEnd: new Date(year + 1, 2, 31, 23, 59, 59), // 31 marzo
  });

  // ==================== PAGOS FRACCIONADOS (Modelo 202) ====================
  // Periodo especial para empresas

  // Pago fraccionado 1 (Abril)
  // Periodo: 1 enero - 31 marzo
  // Presentación: 1 - 20 abril
  periods.push({
    kind: 'SPECIAL',
    label: 'Abril',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 2, 31, 23, 59, 59),
    presentationStart: new Date(year, 3, 1),
    presentationEnd: new Date(year, 3, 20, 23, 59, 59),
  });

  // Pago fraccionado 2 (Octubre)
  // Periodo: 1 enero - 30 septiembre
  // Presentación: 1 - 20 octubre
  periods.push({
    kind: 'SPECIAL',
    label: 'Octubre',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 8, 30, 23, 59, 59),
    presentationStart: new Date(year, 9, 1),
    presentationEnd: new Date(year, 9, 20, 23, 59, 59),
  });

  // Pago fraccionado 3 (Diciembre)
  // Periodo: 1 enero - 30 noviembre
  // Presentación: 1 - 20 diciembre
  periods.push({
    kind: 'SPECIAL',
    label: 'Diciembre',
    startsAt: new Date(year, 0, 1),
    endsAt: new Date(year, 10, 30, 23, 59, 59),
    presentationStart: new Date(year, 11, 1),
    presentationEnd: new Date(year, 11, 20, 23, 59, 59),
  });

  return periods;
}

/**
 * Determina si un periodo está abierto (en plazo de presentación)
 */
function isPeriodOpen(period: PeriodDefinition): boolean {
  const now = new Date();
  return now >= period.presentationStart && now <= period.presentationEnd;
}

/**
 * Inserta o actualiza los periodos fiscales en la base de datos
 */
async function upsertFiscalPeriods(year: number) {
  const periods = generateFiscalCalendar(year);

  console.log(`\n📅 Generando calendario fiscal para ${year}`);
  console.log(`Total de periodos: ${periods.length}`);

  for (const period of periods) {
    const status = isPeriodOpen(period) ? 'OPEN' : 'CLOSED';

    await prisma.fiscal_periods.upsert({
      where: {
        year_label: {
          year,
          label: period.label,
        },
      },
      create: {
        id: randomUUID(),
        year,
        quarter: period.quarter ?? null,
        label: period.label,
        kind: period.kind,
        starts_at: period.startsAt,
        ends_at: period.endsAt,
        status,
      },
      update: {
        quarter: period.quarter ?? null,
        kind: period.kind,
        starts_at: period.startsAt,
        ends_at: period.endsAt,
        status,
      },
    });

    const statusEmoji = status === 'OPEN' ? '🟢' : '⚪';
    console.log(`  ${statusEmoji} ${period.kind.padEnd(10)} ${period.label.padEnd(15)} ${period.startsAt.toLocaleDateString('es-ES')} - ${period.endsAt.toLocaleDateString('es-ES')} (Presenta: ${period.presentationStart.toLocaleDateString('es-ES')} - ${period.presentationEnd.toLocaleDateString('es-ES')})`);
  }

  console.log(`\n✅ Calendario fiscal ${year} generado correctamente`);
}

async function main() {
  try {
    const currentYear = new Date().getFullYear();

    // Generar calendarios para el año actual y el siguiente
    await upsertFiscalPeriods(currentYear);
    await upsertFiscalPeriods(currentYear + 1);

    console.log('\n✅ Calendario fiscal completo generado');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
