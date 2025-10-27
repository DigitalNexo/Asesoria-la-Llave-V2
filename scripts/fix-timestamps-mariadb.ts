import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Arreglando columnas de timestamps para MariaDB...\n');

  // MariaDB tiene problemas con DATETIME(3) NOT NULL DEFAULT + ON UPDATE
  // La solución es hacer las columnas NULL o remover ON UPDATE
  
  try {
    console.log('📝 Eliminando columnas created_at y updated_at existentes...');
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE budgets DROP COLUMN IF EXISTS created_at`);
    await (prisma as any).$executeRawUnsafe(`ALTER TABLE budgets DROP COLUMN IF EXISTS updated_at`);
    console.log('✅ Columnas eliminadas\n');
  } catch (error: any) {
    console.log('ℹ️  Columnas no existían o ya fueron eliminadas\n');
  }

  console.log('📝 Agregando columnas con configuración correcta para MariaDB...');
  
  // created_at: NOT NULL con default, sin ON UPDATE
  await (prisma as any).$executeRawUnsafe(`
    ALTER TABLE budgets 
    ADD COLUMN created_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)
  `);
  
  // updated_at: NOT NULL con default Y ON UPDATE
  await (prisma as any).$executeRawUnsafe(`
    ALTER TABLE budgets 
    ADD COLUMN updated_at DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  `);
  
  console.log('✅ Columnas agregadas correctamente\n');

  console.log('📝 Estableciendo valores para registros existentes...');
  await (prisma as any).$executeRawUnsafe(`
    UPDATE budgets 
    SET created_at = CURRENT_TIMESTAMP(3), updated_at = CURRENT_TIMESTAMP(3)
    WHERE created_at IS NULL OR updated_at IS NULL
  `);
  console.log('✅ Valores establecidos\n');

  console.log('📊 Verificando estructura final...\n');
  const columns: any[] = await (prisma as any).$queryRawUnsafe(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
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
