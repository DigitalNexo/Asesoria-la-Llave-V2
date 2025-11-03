import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugFiltering() {
  console.log('=== DEBUG FILTERING ===\n');

  // 1. Ver entradas ABIERTAS en tax_calendar
  const openCalendar = await prisma.tax_calendar.findMany({
    where: { year: 2025, status: 'ABIERTO' },
    select: { modelCode: true, period: true }
  });

  console.log('Entradas ABIERTAS en tax_calendar:');
  openCalendar.forEach(e => console.log(`  - Modelo ${e.modelCode} | Período: ${e.period}`));
  console.log('');

  // 2. Ver fiscal_periods con status OPEN
  const openFiscal = await prisma.fiscal_periods.findMany({
    where: { year: 2025, status: 'OPEN' },
    select: { id: true, label: true, kind: true, starts_at: true }
  });

  console.log('Períodos fiscales OPEN:');
  openFiscal.forEach(p => {
    const dt = new Date(p.starts_at as any);
    const month = dt.getMonth() + 1;
    const monthCode = `M${String(month).padStart(2, '0')}`;
    console.log(`  - ${p.label} (${p.kind}) | starts_at: ${p.starts_at} | Código mes: ${monthCode}`);
  });
  console.log('');

  // 3. Ver tarjetas para Innoquest/349
  const filings = await prisma.client_tax_filings.findMany({
    where: {
      clients: { razon_social: { contains: 'Innoquest' } },
      taxModelCode: '349'
    },
    include: {
      clients: { select: { razon_social: true } },
      fiscal_periods: { select: { label: true, kind: true, starts_at: true, status: true } }
    }
  });

  console.log('Tarjetas Innoquest/349:');
  filings.forEach(f => {
    const dt = f.fiscal_periods?.starts_at ? new Date(f.fiscal_periods.starts_at as any) : null;
    const month = dt ? dt.getMonth() + 1 : null;
    const monthCode = month ? `M${String(month).padStart(2, '0')}` : null;
    console.log(`  - ${f.fiscal_periods?.label} (${f.fiscal_periods?.kind}, ${f.fiscal_periods?.status}) | código mes: ${monthCode}`);
  });
  console.log('');

  await prisma.$disconnect();
}

debugFiltering();
