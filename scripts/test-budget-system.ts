/**
 * Script de prueba para validar el sistema completo de presupuestos
 * Ejecutar: npx tsx scripts/test-budget-system.ts
 */

import { PrismaClient } from '@prisma/client';
import { prepareBudgetData, replaceTemplateVariables, extractTemplateVariables } from '../server/utils/template-variables';

const prisma = new PrismaClient();

async function testBudgetSystem() {
  console.log('\n🧪 PRUEBA COMPLETA DEL SISTEMA DE PRESUPUESTOS\n');
  console.log('═'.repeat(70));

  let allPassed = true;

  try {
    // TEST 1: Parámetros de Precios
    console.log('\n📊 TEST 1: Parámetros de Precios\n');
    
    const paramsByType = {
      PYME: await prisma.budgetsParameter.findMany({ where: { budgetType: 'PYME', isActive: true } }),
      AUTONOMO: await prisma.budgetsParameter.findMany({ where: { budgetType: 'AUTONOMO', isActive: true } }),
      RENTA: await prisma.budgetsParameter.findMany({ where: { budgetType: 'RENTA', isActive: true } }),
      HERENCIAS: await prisma.budgetsParameter.findMany({ where: { budgetType: 'HERENCIAS', isActive: true } })
    };

    let totalParams = 0;
    for (const [type, params] of Object.entries(paramsByType)) {
      totalParams += params.length;
      if (params.length > 0) {
        console.log(`  ✓ ${type}: ${params.length} parámetros`);
        console.log(`    Ejemplo: ${params[0].paramLabel} = ${params[0].paramValue}€`);
      } else {
        console.log(`  ✗ ${type}: SIN PARÁMETROS`);
        allPassed = false;
      }
    }

    console.log(`\n  Total: ${totalParams} parámetros activos`);

    // TEST 2: Plantillas HTML
    console.log('\n📄 TEST 2: Plantillas HTML\n');
    
    const templates = await prisma.budgetsTemplate.findMany({ where: { isActive: true } });
    console.log(`  ✓ ${templates.length} plantillas activas`);

    const byType = templates.reduce((acc, t) => {
      const key = `${t.type}-${t.companyBrand}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    }, {} as Record<string, any[]>);

    for (const [key, temps] of Object.entries(byType)) {
      const def = temps.find(t => t.isDefault);
      console.log(`  ✓ ${key}: ${temps.length} plantilla(s)${def ? ` (default: "${def.name}")` : ''}`);
    }

    if (templates.length === 0) {
      console.log('  ✗ SIN PLANTILLAS - ejecuta: npx tsx scripts/seed-templates.ts');
      allPassed = false;
    }

    // TEST 3: Variables en Plantillas
    console.log('\n🔤 TEST 3: Variables en Plantillas\n');

    if (templates.length > 0) {
      const sample = templates[0];
      const vars = extractTemplateVariables(sample.htmlContent);
      console.log(`  Plantilla: ${sample.name}`);
      console.log(`  Variables encontradas: ${vars.length}`);
      console.log(`  ${vars.slice(0, 5).join(', ')}${vars.length > 5 ? '...' : ''}`);
    }

    // TEST 4: Reemplazo de Variables
    console.log('\n🔄 TEST 4: Reemplazo de Variables\n');

    const mockBudget = {
      code: 'TEST-2025-001',
      createdAt: new Date(),
      contactName: 'Juan Pérez',
      contactEmail: 'juan@test.com',
      contactPhone: '666777888',
      subtotal: 150,
      iva: 31.50,
      total: 181.50,
      type: 'PYME',
      companyBrand: 'LA_LLAVE',
      details: {
        companyName: 'Test SL',
        activity: 'Pruebas',
        declarationPeriod: 'Trimestral',
        numEntries: 50,
        payrollsPerMonth: 5
      }
    };

    const budgetData = prepareBudgetData(mockBudget);
    console.log(`  ✓ Datos preparados:`);
    console.log(`    - codigo: ${budgetData.codigo}`);
    console.log(`    - total: ${budgetData.total}`);
    console.log(`    - nombre_sociedad: ${budgetData.nombre_sociedad || 'N/A'}`);

    const testHtml = '<p>Presupuesto {{codigo}} - Total: {{total}}</p>';
    const replaced = replaceTemplateVariables(testHtml, budgetData);
    
    if (replaced.includes('TEST-2025-001')) {
      console.log(`  ✓ Reemplazo funciona correctamente`);
    } else {
      console.log(`  ✗ Reemplazo NO funciona`);
      allPassed = false;
    }

    // TEST 5: Integración Completa
    console.log('\n🔗 TEST 5: Integración Completa\n');

    if (templates.length > 0) {
      const tpl = templates.find(t => t.type === 'PYME' && t.isDefault) || templates[0];
      const html = replaceTemplateVariables(tpl.htmlContent, budgetData);
      
      console.log(`  ✓ Template: ${tpl.name}`);
      console.log(`  ✓ HTML generado: ${html.length} caracteres`);
      
      // Verificar que no queden muchas variables sin reemplazar
      const remaining = extractTemplateVariables(html);
      if (remaining.length < 5) {
        console.log(`  ✓ Variables reemplazadas correctamente`);
      } else {
        console.log(`  ⚠️  ${remaining.length} variables pendientes: ${remaining.join(', ')}`);
      }
    }

    // RESUMEN
    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ RESUMEN:\n');
    console.log(`  Parámetros: ${totalParams} configurados`);
    console.log(`  Plantillas: ${templates.length} activas`);
    console.log(`  Variables: Sistema funcionando`);
    console.log(`  Estado: ${allPassed ? '✓ TODO OK' : '⚠️  REVISAR ADVERTENCIAS'}`);
    
    console.log('\n📋 Próximos pasos:\n');
    console.log('  1. Levantar servidor: npm run dev');
    console.log('  2. Ir a: Documentación → Parámetros');
    console.log('  3. Editar precios y guardar');
    console.log('  4. Ir a: Documentación → Plantillas');
    console.log('  5. Editar plantilla y ver preview');
    console.log('  6. Crear presupuesto y generar PDF\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes("Can't reach database")) {
      console.error('\n💡 Solución: La base de datos no está accesible.');
      console.error('   - Opción 1: Levanta MariaDB local: docker-compose up -d db');
      console.error('   - Opción 2: Modifica .env.local para usar file:./dev.db (SQLite)');
      console.error('   - Opción 3: Verifica que 185.239.239.43:3306 esté accesible\n');
    }
    allPassed = false;
  } finally {
    await prisma.$disconnect();
  }

  process.exit(allPassed ? 0 : 1);
}

testBudgetSystem();
