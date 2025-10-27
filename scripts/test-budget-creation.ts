import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBudgetCreation() {
  console.log('🧪 Testing Budget Creation Flow\n');
  
  try {
    // 1. Verificar estructura de timestamps
    console.log('1️⃣ Verificando columnas de timestamps...');
    const cols: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'area_privada'
        AND TABLE_NAME = 'budgets'
        AND COLUMN_NAME IN ('created_at', 'updated_at')
      ORDER BY COLUMN_NAME
    `);
    console.table(cols);
    
    // 2. Test crear presupuesto mínimo
    console.log('\n2️⃣ Intentando crear presupuesto de prueba...');
    const now = new Date();
    const testBudget = await prisma.budgets.create({
      data: {
        series: 'AL',
        number: 99999,
        year: 2025,
        code: 'TEST-99999/2025',
        type: 'PYME',
        clientName: 'Cliente Test',
        status: 'DRAFT',
        subtotal: 100,
        total: 121,
        validDays: 30,
        // CRITICAL: Incluir timestamps explícitamente
        createdAt: now,
        updatedAt: now,
      }
    });
    
    console.log('✅ Presupuesto creado exitosamente:');
    console.log(`   ID: ${testBudget.id}`);
    console.log(`   Code: ${testBudget.code}`);
    console.log(`   CreatedAt: ${testBudget.createdAt}`);
    console.log(`   UpdatedAt: ${testBudget.updatedAt}`);
    
    // 3. Limpiar
    console.log('\n3️⃣ Limpiando presupuesto de prueba...');
    await prisma.budgets.delete({
      where: { id: testBudget.id }
    });
    console.log('✅ Presupuesto eliminado\n');
    
    console.log('✅ TODAS LAS PRUEBAS PASARON');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBudgetCreation();
