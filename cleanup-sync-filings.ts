import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function cleanupAndSyncFilings() {
  console.log('=== LIMPIEZA Y SINCRONIZACIÓN DE TARJETAS FISCALES ===\n');

  // 1. Obtener asignaciones activas
  const assignments = await prisma.client_tax_assignments.findMany({
    where: { activeFlag: true },
    include: { clients: { select: { razonSocial: true } } }
  });

  console.log('Asignaciones activas:', assignments.length);
  assignments.forEach(a => {
    console.log(`  - ${a.clients.razonSocial} | ${a.taxModelCode} | ${a.periodicidad}`);
  });
  console.log('');

  // 2. Obtener todas las tarjetas
  const allFilings = await prisma.client_tax_filings.findMany({
    include: {
      clients: { select: { razonSocial: true } },
      fiscal_periods: { select: { label: true, status: true } }
    }
  });

  console.log('Tarjetas existentes:', allFilings.length);
  console.log('');

  // 3. Identificar tarjetas que NO corresponden a asignaciones activas
  const validFilings: string[] = [];
  const invalidFilings: string[] = [];

  for (const filing of allFilings) {
    const hasAssignment = assignments.some(a => 
      a.clientId === filing.clientId && a.taxModelCode === filing.taxModelCode
    );

    if (hasAssignment) {
      validFilings.push(filing.id);
    } else {
      invalidFilings.push(filing.id);
      console.log(`  ❌ INVÁLIDA: ${filing.clients?.razonSocial} | Modelo ${filing.taxModelCode} | ${filing.fiscal_periods?.label}`);
    }
  }

  console.log('');
  console.log(`Tarjetas válidas: ${validFilings.length}`);
  console.log(`Tarjetas inválidas (sin asignación): ${invalidFilings.length}`);
  console.log('');

  // 4. Eliminar tarjetas inválidas
  if (invalidFilings.length > 0) {
    console.log('Eliminando tarjetas inválidas...');
    const deleted = await prisma.client_tax_filings.deleteMany({
      where: { id: { in: invalidFilings } }
    });
    console.log(`✅ Eliminadas: ${deleted.count} tarjetas`);
    console.log('');
  }

  // 5. Verificar tarjetas faltantes
  // Ahora: crear tarjetas SOLO para períodos que estén ABIERTOS en tax_calendar
  // y mapear correctamente el código de período (Mxx, 1T, ANUAL) al registro en fiscal_periods
  console.log('Verificando tarjetas faltantes (basadas en tax_calendar abierto)...');
  let created = 0;

  // recuperar entradas abiertas del calendario fiscal por modelo (año 2025)
  const openCalendar = await prisma.tax_calendar.findMany({
    where: { year: 2025, status: 'ABIERTO' },
    select: { modelCode: true, period: true }
  });

  // map modelo -> set(period)
  const openMap = new Map<string, Set<string>>();
  for (const e of openCalendar) {
    if (!openMap.has(e.modelCode)) openMap.set(e.modelCode, new Set());
    openMap.get(e.modelCode)!.add(e.period);
  }

  for (const assignment of assignments) {
    const openPeriodsForModel = openMap.get(assignment.taxModelCode) ?? new Set();
    if (openPeriodsForModel.size === 0) continue; // nada abierto para este modelo

    for (const periodCode of Array.from(openPeriodsForModel)) {
      // Determinar fiscal_period correspondiente a este periodCode
      // - Si periodCode es MNN -> buscar fiscal_period whose starts_at month == NN-1 and year == 2025
      // - Si periodCode es like '1T' -> buscar quarter
      // - Si periodCode == 'ANUAL' -> buscar kind ANNUAL
      let fiscalPeriodRecord: any = null;

      const mMatch = periodCode.match(/^M(\d{2})$/i);
      if (mMatch) {
        const month = parseInt(mMatch[1], 10);
        // buscar fiscal_period with starts_at month == month-1 and year == 2025 and kind SPECIAL or MONTHLY
        fiscalPeriodRecord = await prisma.fiscal_periods.findFirst({
          where: {
            year: 2025,
            kind: { in: ['SPECIAL', 'MONTHLY'] },
            starts_at: {
              gte: new Date(2025, month - 1, 1, 0, 0, 0),
              lt: new Date(2025, month - 1 + 1, 1, 0, 0, 0),
            },
          },
        });
      } else if (/^\dT$/.test(periodCode)) {
        const q = parseInt(periodCode[0], 10);
        fiscalPeriodRecord = await prisma.fiscal_periods.findFirst({
          where: { year: 2025, quarter: q, kind: 'QUARTERLY' },
        });
      } else if (periodCode.toUpperCase() === 'ANUAL') {
        fiscalPeriodRecord = await prisma.fiscal_periods.findFirst({ where: { year: 2025, kind: 'ANNUAL' } });
      }

      if (!fiscalPeriodRecord) {
        console.log(`  ⚠️  No se encontró fiscal_period para código ${periodCode} (modelo ${assignment.taxModelCode})`);
        continue;
      }

      // Verificar si existe ya la tarjeta con ese periodId
      const existing = await prisma.client_tax_filings.findFirst({
        where: {
          clientId: assignment.clientId,
          taxModelCode: assignment.taxModelCode,
          periodId: fiscalPeriodRecord.id,
        }
      });

      if (!existing) {
        await prisma.client_tax_filings.create({
          data: {
            id: randomUUID(),
            clientId: assignment.clientId,
            taxModelCode: assignment.taxModelCode,
            periodId: fiscalPeriodRecord.id,
            status: 'NOT_STARTED'
          }
        });
        created++;
        console.log(`  ✅ Creada: ${assignment.clients.razonSocial} | ${assignment.taxModelCode} | ${fiscalPeriodRecord.label}`);
      }
    }
  }

  console.log('');
  console.log(`✅ Tarjetas creadas: ${created}`);
  console.log('');

  // 6. Resumen final
  const finalFilings = await prisma.client_tax_filings.count();
  const openFilings = await prisma.client_tax_filings.count({
    where: { fiscal_periods: { status: 'OPEN' } }
  });

  console.log('=== RESUMEN FINAL ===');
  console.log(`Total tarjetas: ${finalFilings}`);
  console.log(`Tarjetas con períodos OPEN: ${openFilings}`);
  console.log('');
  console.log('✅ Sincronización completada');

  await prisma.$disconnect();
}

cleanupAndSyncFilings();
