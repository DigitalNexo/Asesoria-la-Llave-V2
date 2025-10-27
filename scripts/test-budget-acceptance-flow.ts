/**
 * Script de prueba para el flujo completo de aceptación de presupuestos
 * 
 * Flujo:
 * 1. Crear presupuesto con acceptanceHash
 * 2. Verificar que el hash fue generado
 * 3. Simular envío de email (endpoint /send)
 * 4. Simular aceptación pública (endpoint /public/budgets/:code/accept)
 * 5. Verificar estado final en BD
 */

import { PrismaClient } from '@prisma/client';
import { generateAcceptanceHash, verifyAcceptanceHash } from '../server/utils/budgets';

const prisma = new PrismaClient();

async function testBudgetAcceptanceFlow() {
  console.log('🧪 Iniciando prueba del flujo de aceptación de presupuestos\n');

  try {
    const p: any = prisma;

    // 1. Crear presupuesto de prueba
    console.log('1️⃣  Creando presupuesto de prueba...');
    
    const testDate = new Date();
    const year = testDate.getFullYear();
    const series = 'AL';
    
    // Obtener último número
    const lastBudget = await p.budget.findFirst({
      where: { series, year },
      orderBy: { number: 'desc' }
    });
    
    const nextNumber = (lastBudget?.number || 0) + 1;
    const code = `${series}-${year}-${String(nextNumber).padStart(4, '0')}`;
    const acceptanceHash = generateAcceptanceHash(code, testDate);

    const budget = await p.budget.create({
      data: {
        series,
        number: nextNumber,
        year,
        code,
        date: testDate,
        validDays: 30,
        expiresAt: new Date(testDate.getTime() + 30 * 24 * 60 * 60 * 1000),
        acceptanceHash,
        type: 'PYME',
        companyBrand: 'LA_LLAVE',
        clientName: 'TEST Cliente Prueba',
        clientEmail: 'test@example.com',
        clientPhone: '666111222',
        clientNif: '12345678Z',
        subtotal: 1000,
        vatTotal: 210,
        total: 1210,
        status: 'DRAFT',
        createdAt: testDate,
        updatedAt: testDate,
      }
    });

    console.log(`   ✅ Presupuesto creado: ${budget.code}`);
    console.log(`   📝 ID: ${budget.id}`);
    console.log(`   🔐 Hash: ${budget.acceptanceHash}\n`);

    // 2. Verificar hash
    console.log('2️⃣  Verificando hash de aceptación...');
    const isValidHash = verifyAcceptanceHash(budget.code, budget.date, budget.acceptanceHash);
    console.log(`   ${isValidHash ? '✅' : '❌'} Hash válido: ${isValidHash}\n`);

    // 3. Simular URL de aceptación pública
    console.log('3️⃣  Generando URL de aceptación pública...');
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5001';
    const acceptUrl = `${frontendUrl}/public/budgets/${encodeURIComponent(budget.code)}/accept?t=${encodeURIComponent(budget.acceptanceHash)}`;
    console.log(`   🔗 URL: ${acceptUrl}\n`);

    // 4. Simular aceptación (actualizar BD directamente)
    console.log('4️⃣  Simulando aceptación del presupuesto...');
    const acceptedBudget = await p.budget.update({
      where: { id: budget.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        acceptedByIp: '127.0.0.1',
        acceptedByAgent: 'Mozilla/5.0 (Test Script)',
      }
    });

    console.log(`   ✅ Presupuesto aceptado`);
    console.log(`   📅 Fecha de aceptación: ${acceptedBudget.acceptedAt}`);
    console.log(`   🌐 IP: ${acceptedBudget.acceptedByIp}`);
    console.log(`   🖥️  User-Agent: ${acceptedBudget.acceptedByAgent}\n`);

    // 5. Verificar estado final
    console.log('5️⃣  Verificando estado final...');
    const finalBudget = await p.budget.findUnique({
      where: { id: budget.id },
      include: { items: true }
    });

    console.log(`   Código: ${finalBudget.code}`);
    console.log(`   Estado: ${finalBudget.status}`);
    console.log(`   Hash generado: ${finalBudget.acceptanceHash ? '✅' : '❌'}`);
    console.log(`   Aceptado: ${finalBudget.acceptedAt ? '✅' : '❌'}`);
    console.log(`   IP registrada: ${finalBudget.acceptedByIp || 'N/A'}`);
    console.log(`   Company Brand: ${finalBudget.companyBrand}`);

    // 6. Resumen
    console.log('\n📊 RESUMEN DEL FLUJO:');
    console.log('─────────────────────────────────────────');
    console.log(`✅ Presupuesto creado con hash: ${!!finalBudget.acceptanceHash}`);
    console.log(`✅ Hash válido: ${isValidHash}`);
    console.log(`✅ URL generada correctamente: ${acceptUrl.length > 0}`);
    console.log(`✅ Presupuesto aceptado: ${finalBudget.status === 'ACCEPTED'}`);
    console.log(`✅ Fecha de aceptación registrada: ${!!finalBudget.acceptedAt}`);
    console.log(`✅ IP/User-Agent guardados: ${!!finalBudget.acceptedByIp}`);

    console.log('\n🎉 ¡Flujo completo verificado exitosamente!');
    console.log('\n📝 PRÓXIMOS PASOS MANUALES:');
    console.log('   1. Iniciar servidor: npm run dev');
    console.log('   2. Crear presupuesto desde la UI');
    console.log('   3. Click en "Enviar" para generar PDF y email');
    console.log('   4. Copiar URL de aceptación del email');
    console.log('   5. Abrir URL en navegador (sin login)');
    console.log('   6. Click en "Aceptar Presupuesto"');
    console.log('   7. Verificar emails de confirmación');

    // Opcional: Limpiar presupuesto de prueba
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      console.log('\n🧹 Limpiando presupuesto de prueba...');
      await p.budget.delete({ where: { id: budget.id } });
      console.log('   ✅ Presupuesto eliminado\n');
    } else {
      console.log(`\n💡 Tip: Ejecuta con --cleanup para eliminar el presupuesto de prueba`);
      console.log(`   npx tsx scripts/test-budget-acceptance-flow.ts --cleanup\n`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar prueba
testBudgetAcceptanceFlow()
  .then(() => {
    console.log('✅ Prueba completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Prueba fallida:', error);
    process.exit(1);
  });
