/**
 * Script de prueba para verificar el sistema de plantillas
 */

import { PrismaClient } from '@prisma/client';
import { prepareBudgetData, replaceTemplateVariables } from '../server/utils/template-variables';

const prisma = new PrismaClient();

async function testTemplateSystem() {
  console.log('🧪 Iniciando pruebas del sistema de plantillas...\n');

  try {
    // 1. Verificar plantillas en BD
    console.log('1️⃣ Verificando plantillas en base de datos...');
    const templates = await prisma.budgetsTemplate.findMany({
      where: { isActive: true }
    });
    console.log(`   ✅ Encontradas ${templates.length} plantillas activas`);
    templates.forEach(t => {
      console.log(`      - ${t.name} (${t.type}, ${t.companyBrand})${t.isDefault ? ' [DEFAULT]' : ''}`);
    });

    // 2. Verificar plantillas por defecto
    console.log('\n2️⃣ Verificando plantillas por defecto...');
    const defaults = await prisma.budgetsTemplate.findMany({
      where: { isDefault: true }
    });
    console.log(`   ✅ Encontradas ${defaults.length} plantillas por defecto`);
    
    // 3. Simular datos de presupuesto PYME
    console.log('\n3️⃣ Simulando presupuesto PYME...');
    const mockBudget = {
      code: 'PYME-2025-001',
      createdAt: new Date(),
      contactName: 'Juan Pérez García',
      contactEmail: 'juan.perez@empresa.com',
      contactPhone: '666 777 888',
      subtotal: 150.00,
      iva: 31.50,
      total: 181.50,
      companyBrand: 'LA_LLAVE',
      type: 'PYME',
      description: 'Contabilidad mensual y declaraciones trimestrales para PYME del sector servicios',
      details: {
        companyName: 'Tecnologías Avanzadas SL',
        activity: 'Desarrollo de software',
        declarationPeriod: 'Trimestral',
        numEntries: 50,
        payrollsPerMonth: 5
      }
    };

    const budgetData = prepareBudgetData(mockBudget);
    console.log('   ✅ Datos del presupuesto preparados:');
    console.log(`      - Código: ${budgetData.codigo}`);
    console.log(`      - Cliente: ${budgetData.nombre_contacto}`);
    console.log(`      - Sociedad: ${budgetData.nombre_sociedad}`);
    console.log(`      - Total: ${budgetData.total}`);

    // 4. Obtener plantilla y reemplazar variables
    console.log('\n4️⃣ Obteniendo plantilla PYME para LA_LLAVE...');
    const template = await prisma.budgetsTemplate.findFirst({
      where: {
        type: 'PYME',
        companyBrand: 'LA_LLAVE',
        isDefault: true,
        isActive: true
      }
    });

    if (!template) {
      console.log('   ❌ No se encontró plantilla por defecto');
      return;
    }

    console.log(`   ✅ Plantilla encontrada: ${template.name}`);
    
    // 5. Reemplazar variables
    console.log('\n5️⃣ Reemplazando variables en plantilla...');
    const html = replaceTemplateVariables(template.htmlContent, budgetData);
    console.log(`   ✅ HTML generado (${html.length} caracteres)`);
    
    // Verificar que se reemplazaron las variables
    const stillHasVars = (html.match(/{{[^}]+}}/g) || []).filter(v => !v.includes('company_color'));
    if (stillHasVars.length > 0) {
      console.log(`   ⚠️  Variables sin reemplazar: ${stillHasVars.join(', ')}`);
    } else {
      console.log('   ✅ Todas las variables fueron reemplazadas correctamente');
    }

    // 6. Guardar HTML de prueba
    const fs = await import('fs');
    const path = await import('path');
    const testDir = path.join(process.cwd(), 'uploads', 'test');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFilePath = path.join(testDir, 'test-template-output.html');
    fs.writeFileSync(testFilePath, html, 'utf-8');
    console.log(`\n   💾 HTML guardado en: ${testFilePath}`);

    console.log('\n🎉 Todas las pruebas completadas exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error en las pruebas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testTemplateSystem()
  .then(() => {
    console.log('✅ Script de prueba finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
