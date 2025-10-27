import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBudgetItemsColumns() {
  console.log('🔧 Arreglando budget_items columnas duplicadas...\n');
  
  try {
    // Renombrar unitPrice (camelCase) a unit_price (snake_case)
    console.log('Renombrando unitPrice → unit_price...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_items CHANGE COLUMN unitPrice unit_price DECIMAL(12,2) NOT NULL
    `);
    
    // Eliminar las columnas camelCase antiguas (NOT NULL sin defaults)
    console.log('Eliminando createdAt (NOT NULL)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_items DROP COLUMN IF EXISTS createdAt
    `);
    
    console.log('Eliminando updatedAt (NOT NULL)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_items DROP COLUMN IF EXISTS updatedAt
    `);
    
    // Agregar las columnas con snake_case y NULLABLE
    console.log('Agregando created_at (nullable con default)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_items 
      ADD COLUMN IF NOT EXISTS created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
    `);
    
    console.log('Agregando updated_at (nullable con default)...');
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE budget_items 
      ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    `);
    
    console.log('\n✅ Columnas arregladas');
    console.log('\n📋 Verificando estructura final...\n');
    
    const cols: any[] = await (prisma as any).$queryRawUnsafe(`
      SHOW COLUMNS FROM budget_items
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

fixBudgetItemsColumns();
