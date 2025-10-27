/**
 * Script para agregar las columnas faltantes a la tabla budgets
 * Ejecutar: tsx scripts/fix-budgets-columns.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Verificando y agregando columnas faltantes en tabla budgets...\n');

  try {
    // Lista de columnas a agregar
    const migrations = [
      {
        column: 'client_email',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_email VARCHAR(255) DEFAULT NULL`
      },
      {
        column: 'client_phone',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_phone VARCHAR(50) DEFAULT NULL`
      },
      {
        column: 'client_nif',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_nif VARCHAR(50) DEFAULT NULL`
      },
      {
        column: 'client_address',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS client_address VARCHAR(500) DEFAULT NULL`
      },
      {
        column: 'vat_total',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS vat_total DECIMAL(12,2) DEFAULT 0`
      },
      {
        column: 'vat_mode',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS vat_mode VARCHAR(50) DEFAULT 'IVA_NO_INCLUIDO'`
      },
      {
        column: 'manually_edited',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS manually_edited BOOLEAN DEFAULT FALSE`
      },
      {
        column: 'custom_total',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS custom_total DECIMAL(12,2) DEFAULT NULL`
      },
      {
        column: 'billing_range',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS billing_range VARCHAR(100) DEFAULT NULL`
      },
      {
        column: 'payroll_per_month',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS payroll_per_month INT DEFAULT NULL`
      },
      {
        column: 'template_id',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_id VARCHAR(255) DEFAULT NULL`
      },
      {
        column: 'template_name',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_name VARCHAR(255) DEFAULT NULL`
      },
      {
        column: 'template_snapshot',
        sql: `ALTER TABLE budgets ADD COLUMN IF NOT EXISTS template_snapshot JSON DEFAULT NULL`
      }
    ];

    for (const migration of migrations) {
      console.log(`📝 Agregando columna: ${migration.column}`);
      try {
        await prisma.$executeRawUnsafe(migration.sql);
        console.log(`✅ Columna ${migration.column} agregada o ya existe\n`);
      } catch (error: any) {
        // Si el error es que la columna ya existe, ignorar
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️  Columna ${migration.column} ya existe\n`);
        } else {
          console.error(`❌ Error al agregar ${migration.column}:`, error.message);
        }
      }
    }

    // Verificar columnas finales
    console.log('\n📊 Verificando estructura final de la tabla budgets...');
    const columns: any = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'budgets' 
        AND COLUMN_NAME IN ('client_email', 'client_phone', 'client_nif', 'client_address', 
                            'manually_edited', 'custom_total', 'vat_total', 'vat_mode',
                            'billing_range', 'payroll_per_month', 'template_id', 'template_name', 'template_snapshot')
      ORDER BY COLUMN_NAME
    `;

    console.log('\n✅ Columnas actuales:');
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
