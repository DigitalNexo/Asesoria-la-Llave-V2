import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBudgets() {
  try {
    const budgets = await prisma.budgets.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true
      }
    });
    
    console.log(`\n📊 Total de presupuestos encontrados: ${budgets.length}\n`);
    
    if (budgets.length === 0) {
      console.log('❌ No hay presupuestos en la base de datos');
      console.log('\n💡 Necesitas crear presupuestos desde la interfaz o ejecutar un seed\n');
    } else {
      console.log('✅ Presupuestos encontrados:\n');
      budgets.forEach((budget: any, idx: number) => {
        console.log(`${idx + 1}. ${budget.code} - ${budget.clientName} (${budget.type})`);
        console.log(`   🆔 ID: ${budget.id}`);
        console.log(`   Items: ${budget.items.length} | Status: ${budget.status} | Total: ${budget.total}€`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error al consultar presupuestos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBudgets();
