/**
 * Script para limpiar completamente la tabla tax_calendar
 * Usar antes de importar un nuevo calendario fiscal desde Excel
 */

import { config } from 'dotenv';
config(); // Cargar variables de entorno

import prisma from '../server/prisma-client';

async function cleanTaxCalendar() {
  try {
    console.log('🗑️  Limpiando tabla tax_calendar...');

    // Contar registros antes
    const countBefore = await prisma.tax_calendar.count();
    console.log(`📊 Registros actuales: ${countBefore}`);

    // Eliminar todos los registros
    const result = await prisma.tax_calendar.deleteMany({});
    console.log(`✅ ${result.count} registros eliminados`);

    // Verificar que esté vacía
    const countAfter = await prisma.tax_calendar.count();
    console.log(`📊 Registros después: ${countAfter}`);

    if (countAfter === 0) {
      console.log('✅ Tabla tax_calendar limpiada completamente');
    } else {
      console.log('⚠️  Advertencia: Aún quedan registros en la tabla');
    }

  } catch (error) {
    console.error('❌ Error limpiando tax_calendar:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTaxCalendar();
