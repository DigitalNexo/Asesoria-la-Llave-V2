import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTaxData() {
  try {
    console.log('📋 Verificando modelos fiscales...');
    
    // Crear o buscar modelos fiscales
    let model303 = await prisma.taxModel.findFirst({ where: { nombre: '303' } });
    if (!model303) {
      model303 = await prisma.taxModel.create({
        data: { nombre: '303', descripcion: 'IVA - Autoliquidación mensual/trimestral' }
      });
    }

    let model390 = await prisma.taxModel.findFirst({ where: { nombre: '390' } });
    if (!model390) {
      model390 = await prisma.taxModel.create({
        data: { nombre: '390', descripcion: 'IVA - Declaración resumen anual' }
      });
    }

    let model130 = await prisma.taxModel.findFirst({ where: { nombre: '130' } });
    if (!model130) {
      model130 = await prisma.taxModel.create({
        data: { nombre: '130', descripcion: 'IRPF - Pago fraccionado trimestral (actividades económicas)' }
      });
    }

    let model131 = await prisma.taxModel.findFirst({ where: { nombre: '131' } });
    if (!model131) {
      model131 = await prisma.taxModel.create({
        data: { nombre: '131', descripcion: 'IRPF - Pago fraccionado trimestral (estimación directa)' }
      });
    }

    console.log('✅ Modelos fiscales verificados');

    // Crear períodos para modelo 303
    const existing303 = await prisma.taxPeriod.count({ where: { modeloId: model303.id } });
    if (existing303 === 0) {
      console.log('\n📅 Creando períodos para modelo 303...');
      for (const year of [2024, 2025]) {
        for (const q of [1, 2, 3, 4]) {
          const startMonth = q * 3 + 1;
          await prisma.taxPeriod.create({
            data: {
              modeloId: model303.id,
              anio: year,
              trimestre: q,
              inicioPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 1),
              finPresentacion: new Date(year + (q === 4 ? 1 : 0), (startMonth % 12), 20),
            },
          });
        }
      }
      console.log('  ✅ 8 períodos creados para modelo 303');
    } else {
      console.log(`⏭️  Modelo 303 ya tiene ${existing303} períodos`);
    }

    // Crear períodos para modelo 390
    const existing390 = await prisma.taxPeriod.count({ where: { modeloId: model390.id } });
    if (existing390 === 0) {
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
    } else {
      console.log(`⏭️  Modelo 390 ya tiene ${existing390} períodos`);
    }

    // Crear períodos para modelo 130
    const existing130 = await prisma.taxPeriod.count({ where: { modeloId: model130.id } });
    if (existing130 === 0) {
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
    } else {
      console.log(`⏭️  Modelo 130 ya tiene ${existing130} períodos`);
    }

    // Crear períodos para modelo 131
    const existing131 = await prisma.taxPeriod.count({ where: { modeloId: model131.id } });
    if (existing131 === 0) {
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
    } else {
      console.log(`⏭️  Modelo 131 ya tiene ${existing131} períodos`);
    }

    console.log('\n✅ Datos de impuestos verificados exitosamente');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTaxData();
