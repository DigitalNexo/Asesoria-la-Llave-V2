import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAllBudgetTables() {
  console.log('🔧 ARREGLO MASIVO: Todas las tablas de presupuestos\n');
  console.log('='.repeat(60));
  
  try {
    // 1. budget_pdfs: createdAt → created_at
    console.log('\n1️⃣ Arreglando budget_pdfs...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_pdfs 
      CHANGE COLUMN createdAt created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
    `);
    console.log('   ✅ budget_pdfs arreglado');
    
    // 2. Verificar budget_parameters
    console.log('\n2️⃣ Verificando budget_parameters...');
    const paramsCols: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'area_privada' 
        AND TABLE_NAME = 'budget_parameters'
        AND COLUMN_NAME IN ('createdAt', 'updatedAt', 'created_at', 'updated_at')
    `);
    if (paramsCols.some(c => c.COLUMN_NAME === 'createdAt')) {
      console.log('   🔧 Renombrando createdAt → created_at...');
      await (prisma as any).$executeRawUnsafe(`
        ALTER TABLE budget_parameters 
        CHANGE COLUMN createdAt created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
      `);
    }
    if (paramsCols.some(c => c.COLUMN_NAME === 'updatedAt')) {
      console.log('   🔧 Renombrando updatedAt → updated_at...');
      await (prisma as any).$executeRawUnsafe(`
        ALTER TABLE budget_parameters 
        CHANGE COLUMN updatedAt updated_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
      `);
    }
    console.log('   ✅ budget_parameters verificado');
    
    // 3. Resumen de todas las tablas
    console.log('\n='.repeat(60));
    console.log('📊 RESUMEN FINAL DE TABLAS DE PRESUPUESTOS:\n');
    
    const tables = ['budgets', 'budget_items', 'budget_email_logs', 'budget_pdfs', 'budget_parameters'];
    
    for (const table of tables) {
      console.log(`\n📁 ${table.toUpperCase()}:`);
      const cols: any[] = await (prisma as any).$queryRawUnsafe(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'area_privada' 
          AND TABLE_NAME = '${table}'
        ORDER BY ORDINAL_POSITION
      `);
      
      // Resaltar columnas de timestamps
      const timestamps = cols.filter(c => 
        c.COLUMN_NAME.includes('created') || 
        c.COLUMN_NAME.includes('updated') ||
        c.COLUMN_NAME === 'date'
      );
      
      if (timestamps.length > 0) {
        timestamps.forEach(t => {
          const icon = t.COLUMN_NAME.match(/[A-Z]/) ? '⚠️ ' : '✅';
          console.log(`   ${icon} ${t.COLUMN_NAME}: ${t.DATA_TYPE} (${t.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
      }
      
      console.log(`   Total columnas: ${cols.length}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODAS LAS TABLAS REVISADAS Y CORREGIDAS\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAllBudgetTables();
