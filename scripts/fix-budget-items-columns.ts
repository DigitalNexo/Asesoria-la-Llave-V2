/**
 * Script para verificar y agregar columna is_manually_edited a budget_items
 * Ejecutar: tsx scripts/fix-budget-items-columns.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Verificando y agregando columnas faltantes en tabla budget_items...\n');

  try {
    // Agregar columna is_manually_edited
    console.log(`📝 Agregando columna: is_manually_edited`);
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE budget_items 
        ADD COLUMN IF NOT EXISTS is_manually_edited BOOLEAN DEFAULT FALSE
      `);
      console.log(`✅ Columna is_manually_edited agregada o ya existe\n`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column name')) {
        console.log(`ℹ️  Columna is_manually_edited ya existe\n`);
      } else {
        console.error(`❌ Error al agregar is_manually_edited:`, error.message);
      }
    }

    // Verificar columnas finales
    console.log('\n📊 Verificando estructura de budget_items...');
    const columns: any = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'budget_items' 
        AND COLUMN_NAME = 'is_manually_edited'
      ORDER BY COLUMN_NAME
    `;

    console.log('\n✅ Columna is_manually_edited:');
    console.table(columns);

    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
