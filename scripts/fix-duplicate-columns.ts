import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDuplicateColumns() {
  console.log('🔧 Eliminando columnas duplicadas de budgets...\n');
  
  try {
    // Eliminar las columnas camelCase antiguas (que son NOT NULL)
    console.log('Eliminando `createdAt` (NOT NULL)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS createdAt
    `);
    
    console.log('Eliminando `updatedAt` (NOT NULL)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS updatedAt
    `);
    
    console.log('Eliminando `vatMode` (duplicado)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS vatMode
    `);
    
    console.log('Eliminando `clientEmail` (duplicado)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS clientEmail
    `);
    
    console.log('Eliminando `clientPhone` (duplicado)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budgets DROP COLUMN IF EXISTS clientPhone
    `);
    
    console.log('\n✅ Columnas duplicadas eliminadas');
    console.log('\n📋 Verificando estructura final...\n');
    
    const cols: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'area_privada'
        AND TABLE_NAME = 'budgets'
        AND COLUMN_NAME IN ('created_at', 'updated_at', 'vat_mode', 'client_email', 'client_phone')
      ORDER BY COLUMN_NAME
    `);
    console.table(cols);
    
  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicateColumns();
