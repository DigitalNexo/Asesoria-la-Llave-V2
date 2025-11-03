import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDatabase() {
  console.log('=== ANÁLISIS COMPLETO DE LA BASE DE DATOS ===\n');

  // 1. Clientes
  const clients = await prisma.clients.findMany({
    where: { isActive: true },
    select: { id: true, razonSocial: true }
  });
  console.log('1. CLIENTES ACTIVOS:', clients.length);
  clients.forEach(c => console.log(`   - ${c.razonSocial}`));
  console.log('');

  // 2. Asignaciones de modelos
  const assignments = await prisma.client_tax_assignments.findMany({
    where: { activeFlag: true },
    include: { clients: { select: { razonSocial: true } } }
  });
  console.log('2. ASIGNACIONES DE MODELOS (activas):', assignments.length);
  assignments.forEach(a => {
    console.log(`   - ${a.clients.razonSocial} | Modelo ${a.taxModelCode} | Periodicidad: ${a.periodicidad}`);
  });
  console.log('');

  // 3. Períodos fiscales
  const periods = await prisma.fiscal_periods.findMany({
    where: { year: 2025 },
    select: { id: true, label: true, status: true, kind: true, quarter: true }
  });
  console.log('3. PERÍODOS FISCALES (2025):', periods.length);
  console.log('   OPEN:', periods.filter(p => p.status === 'OPEN').length);
  console.log('   CLOSED:', periods.filter(p => p.status === 'CLOSED').length);
  periods.filter(p => p.status === 'OPEN').forEach(p => {
    console.log(`   - ${p.label} | Kind: ${p.kind} | Status: ${p.status}`);
  });
  console.log('');

  // 4. Calendario fiscal
  const calendar = await prisma.tax_calendar.findMany({
    where: { year: 2025 },
    select: { modelCode: true, period: true, status: true }
  });
  console.log('4. CALENDARIO FISCAL (2025):', calendar.length);
  console.log('   ABIERTO:', calendar.filter(c => c.status === 'ABIERTO').length);
  console.log('   PENDIENTE:', calendar.filter(c => c.status === 'PENDIENTE').length);
  console.log('   CERRADO:', calendar.filter(c => c.status === 'CERRADO').length);
  console.log('');
  console.log('   Entradas ABIERTAS:');
  calendar.filter(c => c.status === 'ABIERTO').forEach(c => {
    console.log(`   - Modelo ${c.modelCode} | Período: ${c.period}`);
  });
  console.log('');

  // 5. Tarjetas fiscales
  const filings = await prisma.client_tax_filings.findMany({
    include: {
      fiscal_periods: { select: { label: true, status: true, kind: true, year: true } },
      clients: { select: { razonSocial: true } }
    }
  });
  console.log('5. TARJETAS FISCALES (client_tax_filings):', filings.length);
  
  const byPeriodStatus = filings.reduce((acc, f) => {
    const status = f.fiscal_periods?.status || 'SIN PERÍODO';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  Object.entries(byPeriodStatus).forEach(([status, count]) => {
    console.log(`   Con período ${status}: ${count}`);
  });
  console.log('');

  console.log('   Detalle de tarjetas con períodos OPEN:');
  const openFilings = filings.filter(f => f.fiscal_periods?.status === 'OPEN');
  openFilings.forEach(f => {
    console.log(`   - ${f.clients?.razonSocial} | Modelo ${f.taxModelCode} | Período: ${f.fiscal_periods?.label}`);
  });
  console.log('');

  // 6. VALIDACIÓN: ¿Las tarjetas coinciden con las asignaciones?
  console.log('6. VALIDACIÓN:');
  console.log('   Asignaciones activas:', assignments.length);
  console.log('   Períodos OPEN:', periods.filter(p => p.status === 'OPEN').length);
  console.log('   Tarjetas con períodos OPEN:', openFilings.length);
  console.log('');

  await prisma.$disconnect();
}

analyzeDatabase();
