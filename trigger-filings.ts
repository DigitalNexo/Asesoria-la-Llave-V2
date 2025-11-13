import { prismaStorage } from './server/prisma-storage';

async function main() {
  console.log('🔄 Generando tarjetas fiscales para 2025...\n');
  
  const result = await prismaStorage.ensureClientTaxFilingsForYear(2025);
  
  console.log(`✅ Resultado: ${result.generated} períodos procesados\n`);
  
  // Verificar cuántas tarjetas hay para 349 en octubre
  const count = await prismaStorage.prisma.client_tax_filings.count({
    where: {
      tax_model_code: '349',
      fiscal_periods: {
        label: 'MES-Octubre',
        year: 2025
      }
    }
  });
  
  console.log(`📊 Tarjetas del modelo 349 para octubre 2025: ${count}`);
  
  process.exit(0);
}

main().catch(console.error);
