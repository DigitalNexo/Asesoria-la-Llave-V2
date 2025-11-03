import { PrismaClient } from '@prisma/client';
import { prismaStorage } from './server/prisma-storage';

const prisma = new PrismaClient();

async function testAPIFiltering() {
  console.log('=== TEST DEL ENDPOINT getTaxFilings ===\n');

  try {
    const filings = await prismaStorage.getTaxFilings({
      year: 2025,
      includeClosedPeriods: false
    });

    console.log(`Total de tarjetas devueltas: ${filings.length}`);
    console.log('');

    if (filings.length > 0) {
      console.log('Detalle de las tarjetas:');
      filings.forEach(f => {
        console.log(`  - Cliente: ${f.clientName}`);
        console.log(`    Modelo: ${f.taxModelCode}`);
        console.log(`    Período: ${f.periodLabel}`);
        console.log(`    Status período: ${f.periodStatus}`);
        console.log(`    Status filing: ${f.status}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No se devolvieron tarjetas');
    }

    console.log('✅ Test completado');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAPIFiltering();
