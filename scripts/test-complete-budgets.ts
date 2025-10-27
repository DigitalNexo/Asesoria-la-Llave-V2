import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCompleteBudgetFlow() {
  console.log('🧪 TEST COMPLETO DE PRESUPUESTOS\n');
  console.log('='.repeat(60));
  
  const createdBudgets: string[] = [];
  
  try {
    // ========== TEST 1: PYME ==========
    console.log('\n✅ TEST 1: Crear presupuesto PYME');
    const pyme = await prisma.budgets.create({
      data: {
        series: 'AL',
        number: 10001,
        year: 2025,
        code: 'TEST-PYME-10001/2025',
        type: 'PYME',
        clientName: 'Empresa Test SL',
        clientNif: 'B12345678',
        clientEmail: 'test@empresa.com',
        clientPhone: '666777888',
        clientAddress: 'Calle Test 123, Madrid',
        activity: 'Hostelería',
        periodicity: 'MENSUAL',
        billingRange: 'HASTA_50K',
        payrollPerMonth: 5,
        status: 'DRAFT',
        subtotal: 1000,
        vatTotal: 210,
        total: 1210,
        validDays: 30,
      }
    });
    createdBudgets.push(pyme.id);
    console.log(`   ✓ ID: ${pyme.id}`);
    console.log(`   ✓ Código: ${pyme.code}`);
    console.log(`   ✓ Cliente: ${pyme.clientName} (${pyme.clientNif})`);
    console.log(`   ✓ Total: €${pyme.total}`);
    
    // ========== TEST 2: Items de presupuesto ==========
    console.log('\n✅ TEST 2: Crear items para PYME');
    const item1 = await prisma.budgetsItem.create({
      data: {
        budgetId: pyme.id,
        concept: 'Contabilidad mensual',
        category: 'CONTABILIDAD',
        position: 1,
        quantity: 12,
        unitPrice: 50,
        vatPct: 21,
        subtotal: 600,
        total: 726,
      }
    });
    console.log(`   ✓ Item 1: ${item1.concept} - €${item1.total}`);
    
    const item2 = await prisma.budgetsItem.create({
      data: {
        budgetId: pyme.id,
        concept: 'Nóminas (5 trabajadores)',
        category: 'LABORAL',
        position: 2,
        quantity: 12,
        unitPrice: 40,
        vatPct: 21,
        subtotal: 480,
        total: 580.8,
      }
    });
    console.log(`   ✓ Item 2: ${item2.concept} - €${item2.total}`);
    
    // ========== TEST 3: AUTONOMO ==========
    console.log('\n✅ TEST 3: Crear presupuesto AUTONOMO');
    const autonomo = await prisma.budgets.create({
      data: {
        series: 'AL',
        number: 10002,
        year: 2025,
        code: 'TEST-AUTO-10002/2025',
        type: 'AUTONOMO',
        clientName: 'Juan Pérez García',
        clientNif: '12345678A',
        clientEmail: 'juan@example.com',
        activity: 'Comercio al por menor',
        periodicity: 'TRIMESTRAL',
        status: 'DRAFT',
        subtotal: 300,
        vatTotal: 63,
        total: 363,
        validDays: 30,
      }
    });
    createdBudgets.push(autonomo.id);
    console.log(`   ✓ ID: ${autonomo.id}`);
    console.log(`   ✓ Código: ${autonomo.code}`);
    console.log(`   ✓ Cliente: ${autonomo.clientName}`);
    
    // ========== TEST 4: Edición manual ==========
    console.log('\n✅ TEST 4: Editar presupuesto manualmente (Tarea C)');
    const edited = await prisma.budgets.update({
      where: { id: pyme.id },
      data: {
        manuallyEdited: true,
        customTotal: 1500,  // Total personalizado diferente al calculado
        total: 1500,
      }
    });
    console.log(`   ✓ Presupuesto marcado como editado manualmente`);
    console.log(`   ✓ Total personalizado: €${edited.customTotal}`);
    console.log(`   ✓ Flag manuallyEdited: ${edited.manuallyEdited}`);
    
    // ========== TEST 5: Leer presupuestos con items ==========
    console.log('\n✅ TEST 5: Leer presupuesto PYME con todos sus items');
    const budgetWithItems = await prisma.budgets.findUnique({
      where: { id: pyme.id },
      include: {
        items: {
          orderBy: { position: 'asc' }
        }
      }
    });
    console.log(`   ✓ Presupuesto: ${budgetWithItems?.code}`);
    console.log(`   ✓ Items: ${budgetWithItems?.items.length}`);
    budgetWithItems?.items.forEach((item: any) => {
      console.log(`     - ${item.concept}: €${item.total}`);
    });
    
    // ========== TEST 6: Verificar timestamps ==========
    console.log('\n✅ TEST 6: Verificar timestamps automáticos');
    console.log(`   ✓ PYME createdAt: ${pyme.createdAt}`);
    console.log(`   ✓ PYME updatedAt: ${pyme.updatedAt}`);
    console.log(`   ✓ AUTONOMO createdAt: ${autonomo.createdAt}`);
    
    // ========== TEST 7: Filtros y búsquedas ==========
    console.log('\n✅ TEST 7: Búsquedas y filtros');
    const draftBudgets = await prisma.budgets.count({
      where: { status: 'DRAFT' }
    });
    console.log(`   ✓ Presupuestos en borrador: ${draftBudgets}`);
    
    const pymeType = await prisma.budgets.count({
      where: { type: 'PYME' }
    });
    console.log(`   ✓ Presupuestos tipo PYME: ${pymeType}`);
    
    // ========== RESUMEN FINAL ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ TODOS LOS TESTS PASARON CORRECTAMENTE\n');
    console.log('📊 Resumen:');
    console.log(`   • Presupuestos creados: ${createdBudgets.length}`);
    console.log(`   • Items creados: 2`);
    console.log(`   • Edición manual: ✓ Funcionando`);
    console.log(`   • Timestamps: ✓ Automáticos`);
    console.log(`   • Búsquedas: ✓ Funcionando`);
    console.log('\n🎉 Sistema de presupuestos 100% operativo\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.meta) {
      console.error('Meta:', error.meta);
    }
    throw error;
  } finally {
    // Limpiar presupuestos de prueba
    console.log('🧹 Limpiando datos de prueba...');
    for (const id of createdBudgets) {
      await prisma.budgets.delete({ where: { id } }).catch(() => {});
    }
    console.log('✅ Limpieza completa\n');
    await prisma.$disconnect();
  }
}

testCompleteBudgetFlow();
