import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFiltering() {
  console.log('=== TEST DEL FILTRADO DE TARJETAS ===\n');

  // 1. Calendario ABIERTO
  const openCalendar = await prisma.tax_calendar.findMany({
    where: { status: 'ABIERTO', year: 2025 },
    select: { modelCode: true, period: true }
  });

  console.log('1. PERÍODOS ABIERTOS EN CALENDARIO FISCAL:');
  openCalendar.forEach(e => console.log(`   - Modelo ${e.modelCode} | Período: ${e.period}`));
  console.log('');

  // 2. Asignaciones
  const assignments = await prisma.client_tax_assignments.findMany({
    where: { activeFlag: true },
    include: { clients: { select: { razonSocial: true } } }
  });

  console.log('2. ASIGNACIONES ACTIVAS:');
  assignments.forEach(a => {
    console.log(`   - ${a.clients.razonSocial} | ${a.taxModelCode} | ${a.periodicidad}`);
  });
  console.log('');

  // 3. Aplicar lógica de filtrado
  console.log('3. TARJETAS QUE DEBERÍAN APARECER:');
  console.log('');

  for (const assignment of assignments) {
    const periodicity = assignment.periodicidad.toUpperCase();
    
    // Buscar períodos abiertos para este modelo
    const modelPeriods = openCalendar.filter(c => c.modelCode === assignment.taxModelCode);
    
    if (modelPeriods.length === 0) {
      console.log(`   ❌ ${assignment.clients.razonSocial} | ${assignment.taxModelCode} (${periodicity})`);
      console.log(`      → NO aparece: Modelo no tiene períodos abiertos en calendario`);
      console.log('');
      continue;
    }

    // Verificar tipo de período
    let hasMatchingPeriod = false;
    let matchingPeriods: string[] = [];

    for (const p of modelPeriods) {
      const isMonthly = p.period.match(/^M\d{2}$/);
      const isQuarterly = p.period.match(/^\d{1}T$/);
      const isAnnual = p.period === 'ANUAL';

      if (periodicity === 'MENSUAL' && isMonthly) {
        hasMatchingPeriod = true;
        matchingPeriods.push(p.period);
      } else if (periodicity === 'TRIMESTRAL' && isQuarterly) {
        hasMatchingPeriod = true;
        matchingPeriods.push(p.period);
      } else if (periodicity === 'ANUAL' && isAnnual) {
        hasMatchingPeriod = true;
        matchingPeriods.push(p.period);
      }
    }

    if (hasMatchingPeriod) {
      console.log(`   ✅ ${assignment.clients.razonSocial} | ${assignment.taxModelCode} (${periodicity})`);
      console.log(`      → SÍ aparece: Períodos abiertos: ${matchingPeriods.join(', ')}`);
    } else {
      console.log(`   ❌ ${assignment.clients.razonSocial} | ${assignment.taxModelCode} (${periodicity})`);
      console.log(`      → NO aparece: Períodos abiertos (${modelPeriods.map(p => p.period).join(', ')}) no coinciden con periodicidad ${periodicity}`);
    }
    console.log('');
  }

  console.log('=== RESUMEN ===');
  console.log('Solo debería aparecer 1 tarjeta: Innoquest | 349 (MENSUAL) con período M10');

  await prisma.$disconnect();
}

testFiltering();
