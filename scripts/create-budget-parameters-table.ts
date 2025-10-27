import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createBudgetParametersTable() {
  try {
    console.log('Creando tabla budget_parameters...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS budget_parameters (
        id VARCHAR(36) PRIMARY KEY,
        budget_type ENUM('PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS') NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        param_key VARCHAR(100) NOT NULL,
        param_label TEXT NOT NULL,
        param_value DECIMAL(12,2) NOT NULL,
        min_range INT,
        max_range INT,
        is_active BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        UNIQUE KEY unique_param (budget_type, param_key, min_range, max_range),
        INDEX idx_budget_type (budget_type),
        INDEX idx_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla budget_parameters creada correctamente');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  La tabla budget_parameters ya existe');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createBudgetParametersTable();
