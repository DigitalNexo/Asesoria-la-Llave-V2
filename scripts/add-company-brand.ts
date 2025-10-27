import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Añadiendo campo company_brand a la tabla budgets...');

  try {
    // Añadir columna company_brand con valor por defecto 'LA_LLAVE'
    await prisma.$executeRawUnsafe(`
      ALTER TABLE budgets 
      ADD COLUMN company_brand VARCHAR(50) DEFAULT 'LA_LLAVE' NOT NULL
    `);
    
    console.log('✅ Columna company_brand añadida correctamente');
    
    // Verificar
    const result: any = await prisma.$queryRawUnsafe(`
      SHOW COLUMNS FROM budgets WHERE Field = 'company_brand'
    `);
    
    console.log('📊 Verificación:', result);
    
  } catch (error: any) {
    if (error.message?.includes('Duplicate column name')) {
      console.log('⚠️  La columna company_brand ya existe');
    } else {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
