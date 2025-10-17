import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedVisualTaxData() {
  console.log('🌱 Iniciando seed de datos visuales de impuestos...');

  try {
    // Obtener modelos fiscales existentes
    const taxModels = await prisma.taxModel.findMany();
    console.log(`📋 Modelos fiscales encontrados: ${taxModels.length}`);

    // Crear modelos fiscales adicionales si no existen
    const modelCodes = ['111', '115', '123', '130', '131', '202', '303', '349'];
    const modelDescriptions: { [key: string]: string } = {
      '111': 'IRPF Retenciones',
      '115': 'Alquileres',
      '123': 'Retenciones Capital Mobiliario',
      '130': 'Estimación Directa',
      '131': 'Estimación Objetiva',
      '202': 'IS Pagos Fraccionados',
      '303': 'IVA Autoliquidación',
      '349': 'Operaciones Intracomunitarias',
    };

    for (const code of modelCodes) {
      const existing = taxModels.find(m => m.nombre === code);
      if (!existing) {
        await prisma.taxModel.create({
          data: {
            nombre: code,
            descripcion: modelDescriptions[code],
          },
        });
        console.log(`✅ Modelo fiscal ${code} creado`);
      }
    }

    // Refrescar modelos después de crear
    const allModels = await prisma.taxModel.findMany();
    const modelMap = new Map(allModels.map(m => [m.nombre, m.id]));

    // Crear periodos fiscales para 2024 - Trimestres
    const year = 2024;
    for (let quarter = 1; quarter <= 4; quarter++) {
      for (const code of modelCodes) {
        const modelId = modelMap.get(code);
        if (!modelId) continue;

        // Verificar si ya existe
        const existing = await prisma.taxPeriod.findFirst({
          where: {
            modeloId: modelId,
            anio: year,
            trimestre: quarter,
          },
        });

        if (!existing) {
          await prisma.taxPeriod.create({
            data: {
              modeloId: modelId,
              anio: year,
              trimestre: quarter,
              mes: null,
              inicioPresentacion: new Date(`${year}-${quarter * 3 - 2}-01`),
              finPresentacion: new Date(`${year}-${quarter * 3}-20`),
            },
          });
          console.log(`📅 Periodo ${code} ${year} T${quarter} creado`);
        }
      }
    }

    // Obtener todos los clientes
    const clients = await prisma.client.findMany();
    console.log(`👥 Clientes encontrados: ${clients.length}`);

    // Obtener todos los periodos del Q1 2024
    const q1Periods = await prisma.taxPeriod.findMany({
      where: {
        anio: 2024,
        trimestre: 1,
      },
      include: {
        modelo: true,
      },
    });

    console.log(`📅 Periodos Q1 2024 encontrados: ${q1Periods.length}`);

    // Crear ClientTax con displayText y colorTag para cada cliente
    const visualStates = [
      { displayText: 'x', colorTag: 'green' },
      { displayText: 'x (No)', colorTag: 'blue' },
      { displayText: 'x (Sí)', colorTag: 'green' },
      { displayText: '-', colorTag: 'gray' },
      { displayText: 'Pendiente', colorTag: 'yellow' },
      { displayText: '✓', colorTag: 'green' },
    ];

    let created = 0;
    for (const client of clients) {
      for (const period of q1Periods) {
        // Verificar si ya existe
        const existing = await prisma.clientTax.findFirst({
          where: {
            clientId: client.id,
            taxPeriodId: period.id,
          },
        });

        if (!existing) {
          // Seleccionar un estado visual aleatorio
          const state = visualStates[Math.floor(Math.random() * visualStates.length)];
          
          await prisma.clientTax.create({
            data: {
              clientId: client.id,
              taxPeriodId: period.id,
              estado: 'REALIZADO',
              notas: `Estado generado automáticamente para ${period.modelo?.nombre}`,
              displayText: state.displayText,
              colorTag: state.colorTag,
            },
          });
          created++;
        }
      }
    }

    console.log(`✅ ${created} estados visuales de impuestos creados`);
    console.log('🎉 Seed de datos visuales completado exitosamente');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedVisualTaxData()
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
