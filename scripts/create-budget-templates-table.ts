/**
 * Script para crear la tabla budget_templates en MariaDB
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBudgetTemplatesTable() {
  console.log('📝 Creando tabla budget_templates...\n');

  try {
    // Crear tabla usando SQL directo para MariaDB
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS budget_templates (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT NULL,
        type ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL,
        companyBrand VARCHAR(191) NOT NULL DEFAULT 'LA_LLAVE',
        htmlContent LONGTEXT NOT NULL,
        availableVars JSON NULL,
        customCss TEXT NULL,
        isDefault BOOLEAN NOT NULL DEFAULT FALSE,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdBy VARCHAR(191) NULL,
        updatedBy VARCHAR(191) NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        
        INDEX idx_type (type),
        INDEX idx_companyBrand (companyBrand),
        INDEX idx_isDefault (isDefault),
        INDEX idx_isActive (isActive)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ Tabla budget_templates creada exitosamente\n');

    // Verificar que se creó
    const result = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'budget_templates'
    `) as any[];

    if (result[0]?.count > 0) {
      console.log('✅ Verificación: Tabla existe en la base de datos\n');
    } else {
      console.error('❌ Error: La tabla no se creó correctamente\n');
    }

  } catch (error) {
    console.error('❌ Error al crear la tabla:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
createBudgetTemplatesTable()
  .then(() => {
    console.log('🎉 Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error en la migración:', error);
    process.exit(1);
  });
