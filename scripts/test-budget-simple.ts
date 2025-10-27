import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBudgetCreation() {
  console.log('🧪 Testing Budget Creation (SIN timestamps explícitos)\n');
  
  try {
    console.log('Creando presupuesto...');
    const testBudget = await prisma.budgets.create({
      data: {
        series: 'AL',
        number: 99998,
        year: 2025,
        code: 'TEST-99998/2025',
        type: 'PYME',
        clientName: 'Cliente Test Simple',
        status: 'DRAFT',
        subtotal: 100,
        total: 121,
        validDays: 30,
        // ❌ NO incluir createdAt/updatedAt - que use los defaults
      }
    });
    
    console.log('✅ Presupuesto creado exitosamente:');
    console.log(`   ID: ${testBudget.id}`);
    console.log(`   Code: ${testBudget.code}`);
    console.log(`   CreatedAt: ${testBudget.createdAt}`);
    console.log(`   UpdatedAt: ${testBudget.updatedAt}`);
    
    // Limpiar
    await prisma.budgets.delete({
      where: { id: testBudget.id }
    });
    console.log('✅ Limpieza completa\n');
    
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
