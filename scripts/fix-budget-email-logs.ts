import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBudgetEmailLogsColumns() {
  console.log('🔧 Arreglando budget_email_logs columnas...\n');
  
  try {
    // Renombrar toEmail → to_email
    console.log('Renombrando toEmail → to_email...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_email_logs CHANGE COLUMN toEmail to_email VARCHAR(191)
    `);
    
    console.log('\n✅ Columnas arregladas');
    console.log('\n📋 Verificando estructura final...\n');
    
    const cols: any[] = await (prisma as any).$queryRawUnsafe(`
      SHOW COLUMNS FROM budget_email_logs
    `);
    console.table(cols.map(c => ({
      Field: c.Field,
      Type: c.Type,
      Null: c.Null,
      Default: c.Default
    })));
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixBudgetEmailLogsColumns();
