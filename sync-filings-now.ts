import { prismaStorage } from './server/prisma-storage';

async function main() {
  console.log('🔄 Sincronizando tarjetas fiscales para 2025...');
  
  try {
    const result = await prismaStorage.ensureClientTaxFilingsForYear(2025);
    console.log('✅ Resultado:', result);
    console.log(`   - Año: ${result.year}`);
    console.log(`   - Períodos revisados: ${result.generated}`);
    
    // Verificar cuántas tarjetas hay ahora para modelo 349
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const count349 = await prisma.client_tax_filings.count({
      where: {
        tax_model_code: '349',
        fiscal_periods: {
          label: {
            contains: 'Octubre'
          }
        }
      }
    });
    
    console.log(`\n📊 Tarjetas del modelo 349 para octubre: ${count349}`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
