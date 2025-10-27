import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDecimalSerialization() {
  console.log('🧪 TEST: Verificar serialización de Decimales en API\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Obtener un presupuesto con items
    console.log('\n1️⃣ Obteniendo presupuesto con items...');
    const budget = await prisma.budgets.findFirst({
      include: {
        items: {
          orderBy: { position: 'asc' },
          take: 2, // Solo los primeros 2 items
        }
      },
      where: {
        items: {
          some: {} // Solo presupuestos que tengan items
        }
      }
    });
    
    if (!budget) {
      console.log('❌ No hay presupuestos con items en la BD');
      return;
    }
    
    console.log(`   ✓ Presupuesto: ${budget.code}`);
    console.log(`   ✓ Items encontrados: ${budget.items.length}\n`);
    
    // 2. Verificar tipos de los totales
    console.log('2️⃣ Verificando tipos de valores Decimal:\n');
    
    console.log(`   Presupuesto:`);
    console.log(`   - subtotal: ${typeof budget.subtotal} = ${budget.subtotal}`);
    console.log(`   - vatTotal: ${typeof budget.vatTotal} = ${budget.vatTotal}`);
    console.log(`   - total: ${typeof budget.total} = ${budget.total}`);
    
    if (budget.items.length > 0) {
      const item = budget.items[0];
      console.log(`\n   Item "${item.concept}":`);
      console.log(`   - quantity: ${typeof item.quantity} = ${item.quantity}`);
      console.log(`   - unitPrice: ${typeof item.unitPrice} = ${item.unitPrice}`);
      console.log(`   - vatPct: ${typeof item.vatPct} = ${item.vatPct}`);
      console.log(`   - subtotal: ${typeof item.subtotal} = ${item.subtotal}`);
      console.log(`   - total: ${typeof item.total} = ${item.total}`);
    }
    
    // 3. Simular serialización JSON (como hace la API)
    console.log('\n3️⃣ Simulando serialización JSON de la API:\n');
    const serialized = JSON.stringify(budget);
    const deserialized = JSON.parse(serialized);
    
    console.log(`   Después de JSON.parse():`);
    console.log(`   - subtotal: ${typeof deserialized.subtotal} = ${deserialized.subtotal}`);
    console.log(`   - total: ${typeof deserialized.total} = ${deserialized.total}`);
    
    if (deserialized.items.length > 0) {
      const item = deserialized.items[0];
      console.log(`   - item.total: ${typeof item.total} = ${item.total}`);
    }
    
    // 4. Probar conversión a número
    console.log('\n4️⃣ Verificando conversión con Number():\n');
    const testValue = deserialized.total;
    const converted = Number(testValue);
    console.log(`   Original: ${testValue} (${typeof testValue})`);
    console.log(`   Number(): ${converted} (${typeof converted})`);
    console.log(`   .toFixed(2): ${converted.toFixed(2)}`);
    
    // 5. Resumen
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETA\n');
    console.log('📝 Conclusiones:');
    console.log('   • Prisma devuelve Decimals como objetos/strings');
    console.log('   • JSON.stringify los convierte a números/strings');
    console.log('   • Number() los convierte correctamente a números JS');
    console.log('   • .toFixed(2) funciona después de Number()\n');
    console.log('💡 Solución aplicada en PresupuestoEdit.tsx:');
    console.log('   Convertir todos los Decimals con Number() al cargar\n');
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testDecimalSerialization();
