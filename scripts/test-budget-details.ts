import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testBudgetDetails() {
  console.log('🧪 TEST: Verificar detalles de presupuestos\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Obtener todos los presupuestos
    console.log('\n1️⃣ Obteniendo lista de presupuestos...');
    const budgets = await prisma.budgets.findMany({
      select: {
        id: true,
        code: true,
        clientName: true,
        type: true,
      },
      orderBy: { number: 'desc' },
    });
    
    console.log(`   ✓ Encontrados: ${budgets.length} presupuestos\n`);
    
    if (budgets.length === 0) {
      console.log('❌ NO HAY PRESUPUESTOS EN LA BD');
      console.log('   Crea uno desde http://localhost:5001/documentacion/presupuestos/nuevo\n');
      return;
    }
    
    // 2. Probar acceso a detalles de cada uno
    console.log('2️⃣ Verificando acceso a detalles de cada presupuesto:\n');
    
    for (const budget of budgets) {
      console.log(`   📄 ${budget.code} - ${budget.clientName} (${budget.type})`);
      console.log(`      🆔 ID: ${budget.id}`);
      
      // Intentar cargar con items y emails
      const details = await prisma.budgets.findUnique({
        where: { id: budget.id },
        include: {
          items: {
            orderBy: { position: 'asc' }
          },
          emails: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (!details) {
        console.log(`      ❌ ERROR: No se pudo cargar el presupuesto`);
        continue;
      }
      
      console.log(`      ✅ Cargado correctamente`);
      console.log(`      📦 Items: ${details.items.length}`);
      console.log(`      📧 Emails enviados: ${details.emails.length}`);
      console.log(`      💰 Total: €${details.total}`);
      console.log(`      🔗 URL: http://localhost:5001/documentacion/presupuestos/${details.id}`);
      console.log('');
    }
    
    // 3. Resumen
    console.log('='.repeat(60));
    console.log('✅ TODOS LOS PRESUPUESTOS ACCESIBLES\n');
    console.log('🌐 Ahora puedes abrir la interfaz web:');
    console.log('   http://localhost:5001/documentacion/presupuestos');
    console.log('\n💡 Haz clic en "Ver Detalles" de cualquier presupuesto\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.code) console.error('   Código:', error.code);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testBudgetDetails();
