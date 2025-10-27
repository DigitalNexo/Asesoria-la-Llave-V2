import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Agregando columnas de timestamps a tabla budgets...\n');

  const migrations = [
    { 
      column: 'created_at', 
      sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` 
    },
    { 
      column: 'updated_at', 
      sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` 
    }
  ];

  for (const { column, sql } of migrations) {
    try {
      console.log(`📝 Agregando columna: ${column}`);
      await (prisma as any).$executeRawUnsafe(sql);
      console.log(`✅ Columna ${column} agregada o ya existe\n`);
    } catch (error: any) {
      if (error.message?.includes('Duplicate column name')) {
        console.log(`ℹ️  Columna ${column} ya existe\n`);
      } else {
        console.error(`❌ Error al agregar columna ${column}:`, error.message);
        throw error;
      }
    }
  }

  console.log('\n📊 Verificando estructura final de la tabla budgets...\n');
  
  const columns: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'area_privada'
      AND TABLE_NAME = 'budgets'
      AND COLUMN_NAME IN ('created_at', 'updated_at')
    ORDER BY COLUMN_NAME
  `);

  console.log('✅ Columnas de timestamps:');
  console.table(columns);

  console.log('\n✅ Migración completada exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error durante la migración:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
