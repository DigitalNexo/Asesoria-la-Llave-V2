import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMissingTaxPeriods() {
  try {
    console.log('📋 Buscando modelos fiscales...');
    
    // Buscar todos los modelos
    const model303 = await prisma.taxModel.findFirst({ where: { nombre: '303' } });
    const model390 = await prisma.taxModel.findFirst({ where: { nombre: '390' } });
    const model130 = await prisma.taxModel.findFirst({ where: { nombre: '130' } });
    const model131 = await prisma.taxModel.findFirst({ where: { nombre: '131' } });

    if (!model303 || !model390 || !model130 || !model131) {
      console.error('❌ No se encontraron todos los modelos fiscales');
      return;
    }

    console.log('✅ Modelos encontrados:', { 
      '303': model303.id, 
      '390': model390.id, 
      '130': model130.id, 
      '131': model131.id 
    });

    // Verificar si ya existen períodos para 390
    const existing390 = await prisma.taxPeriod.count({ where: { modeloId: model390.id } });
    if (existing390 > 0) {
      console.log(`⏭️  Modelo 390 ya tiene ${existing390} períodos, omitiendo...`);
    } else {
      console.log('\n📅 Creando períodos para modelo 390...');
      await prisma.taxPeriod.create({
        data: {
          modeloId: model390.id,
          anio: 2024,
          trimestre: 4,
          inicioPresentacion: new Date('2025-01-01'),
          finPresentacion: new Date('2025-01-30'),
        },
      });
      await prisma.taxPeriod.create({
        data: {
          modeloId: model390.id,
          anio: 2025,
          trimestre: 4,
          inicioPresentacion: new Date('2026-01-01'),
          finPresentacion: new Date('2026-01-30'),
        },
      });
      console.log('  ✅ 2 períodos creados para modelo 390');
    }

    // Crear períodos para modelo 130
    const existing130 = await prisma.taxPeriod.count({ where: { modeloId: model130.id } });
    if (existing130 > 0) {
      console.log(`⏭️  Modelo 130 ya tiene ${existing130} períodos, omitiendo...`);
    } else {
      console.log('\n📅 Creando períodos para modelo 130...');
      for (const year of [2024, 2025]) {
        for (const q of [1, 2, 3, 4]) {
          const startMonth = q * 3 + 1;
          await prisma.taxPeriod.create({
            data: {
              modeloId: model130.id,
              anio: year,
              trimestre: q,
              inicioPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 1),
              finPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 20),
            },
          });
        }
      }
      console.log('  ✅ 8 períodos creados para modelo 130');
    }

    // Crear períodos para modelo 131
    const existing131 = await prisma.taxPeriod.count({ where: { modeloId: model131.id } });
    if (existing131 > 0) {
      console.log(`⏭️  Modelo 131 ya tiene ${existing131} períodos, omitiendo...`);
    } else {
      console.log('\n📅 Creando períodos para modelo 131...');
      for (const year of [2024, 2025]) {
        for (const q of [1, 2, 3, 4]) {
          const startMonth = q * 3 + 1;
          await prisma.taxPeriod.create({
            data: {
              modeloId: model131.id,
              anio: year,
              trimestre: q,
              inicioPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 1),
              finPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 20),
            },
          });
        }
      }
      console.log('  ✅ 8 períodos creados para modelo 131');
    }

    console.log('\n✅ Todos los períodos tributarios han sido creados exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingTaxPeriods();
