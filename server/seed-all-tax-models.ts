import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuración de modelos fiscales con sus reglas de disponibilidad
const TAX_MODELS_CONFIG = [
  {
    codigo: '100',
    descripcion: 'IRPF - Declaración de la Renta',
    periodicidad: 'anual', // Un período anual en Q2
    disponiblePara: ['AUTONOMO', 'PARTICULAR'],
  },
  {
    codigo: '111',
    descripcion: 'Retenciones e ingresos a cuenta - Trimestral',
    periodicidad: 'trimestral',
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '130',
    descripcion: 'IRPF - Pago fraccionado (actividades económicas)',
    periodicidad: 'trimestral',
    disponiblePara: ['AUTONOMO'],
  },
  {
    codigo: '131',
    descripcion: 'IRPF - Pago fraccionado (estimación directa)',
    periodicidad: 'trimestral',
    disponiblePara: ['AUTONOMO'],
  },
  {
    codigo: '180',
    descripcion: 'Retenciones e ingresos a cuenta - Alquileres',
    periodicidad: 'trimestral',
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '190',
    descripcion: 'Retenciones e ingresos a cuenta - Resumen anual',
    periodicidad: 'anual', // Un período anual en Q1 del año siguiente
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '200',
    descripcion: 'Impuesto sobre Sociedades',
    periodicidad: 'anual', // Un período anual en Q3
    disponiblePara: ['EMPRESA'],
  },
  {
    codigo: '303',
    descripcion: 'IVA - Autoliquidación mensual/trimestral',
    periodicidad: 'trimestral',
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '347',
    descripcion: 'Declaración anual de operaciones con terceras personas',
    periodicidad: 'anual', // Un período anual en Q1 del año siguiente
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '349',
    descripcion: 'Declaración recapitulativa de operaciones intracomunitarias',
    periodicidad: 'mensual',
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '390',
    descripcion: 'IVA - Declaración resumen anual',
    periodicidad: 'anual', // Un período anual en Q1 del año siguiente
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
  {
    codigo: '720',
    descripcion: 'Declaración informativa sobre bienes en el extranjero',
    periodicidad: 'anual', // Un período anual en Q1
    disponiblePara: ['AUTONOMO', 'EMPRESA'],
  },
];

async function seedAllTaxModels() {
  try {
    console.log('📋 Creando/verificando todos los modelos fiscales...\n');

    for (const config of TAX_MODELS_CONFIG) {
      console.log(`📄 Modelo ${config.codigo}: ${config.descripcion}`);
      console.log(`   Periodicidad: ${config.periodicidad}`);
      console.log(`   Disponible para: ${config.disponiblePara.join(', ')}`);

      // Crear o buscar modelo
      let model = await prisma.taxModel.findFirst({
        where: { nombre: config.codigo },
      });

      if (!model) {
        model = await prisma.taxModel.create({
          data: {
            nombre: config.codigo,
            descripcion: config.descripcion,
          },
        });
        console.log(`   ✅ Modelo ${config.codigo} creado`);
      } else {
        console.log(`   ⏭️  Modelo ${config.codigo} ya existe`);
      }

      // Crear períodos según periodicidad
      const existingPeriods = await prisma.tax_periods.count({
        where: { modeloId: model.id },
      });

      if (existingPeriods === 0) {
        console.log(`   📅 Creando períodos para modelo ${config.codigo}...`);

        if (config.periodicidad === 'trimestral') {
          // Crear períodos trimestrales para 2024-2025
          for (const year of [2024, 2025]) {
            for (const q of [1, 2, 3, 4]) {
              const startMonth = q * 3 + 1;
              await prisma.tax_periods.create({
                data: {
                  modeloId: model.id,
                  anio: year,
                  trimestre: q,
                  inicioPresentacion: new Date(
                    year + (q === 4 ? 1 : 0),
                    (startMonth % 12),
                    1
                  ),
                  finPresentacion: new Date(
                    year + (q === 4 ? 1 : 0),
                    (startMonth % 12),
                    20
                  ),
                },
              });
            }
          }
          console.log(`      ✅ 8 períodos trimestrales creados`);
        } else if (config.periodicidad === 'anual') {
          // Crear períodos anuales
          // La mayoría de modelos anuales se presentan en Q1 del año siguiente
          for (const year of [2024, 2025]) {
            let quarter = 1; // Por defecto Q1 del año siguiente
            let presentationYear = year + 1;

            // Excepciones
            if (config.codigo === '100') {
              // Renta se presenta en Q2
              quarter = 2;
            } else if (config.codigo === '200') {
              // Sociedades se presenta en Q3
              quarter = 3;
            }

            await prisma.tax_periods.create({
              data: {
                modeloId: model.id,
                anio: year,
                trimestre: quarter,
                inicioPresentacion: new Date(presentationYear, quarter * 3 - 2, 1),
                finPresentacion: new Date(presentationYear, quarter * 3 - 2, 30),
              },
            });
          }
          console.log(`      ✅ 2 períodos anuales creados`);
        } else if (config.periodicidad === 'mensual') {
          // Crear períodos mensuales para 2024-2025
          for (const year of [2024, 2025]) {
            for (let month = 1; month <= 12; month++) {
              await prisma.tax_periods.create({
                data: {
                  modeloId: model.id,
                  anio: year,
                  mes: month,
                  inicioPresentacion: new Date(
                    year + (month === 12 ? 1 : 0),
                    (month % 12) + 1,
                    1
                  ),
                  finPresentacion: new Date(
                    year + (month === 12 ? 1 : 0),
                    (month % 12) + 1,
                    20
                  ),
                },
              });
            }
          }
          console.log(`      ✅ 24 períodos mensuales creados`);
        }
      } else {
        console.log(`   ⏭️  Ya tiene ${existingPeriods} períodos`);
      }

      console.log(''); // Línea en blanco
    }

    console.log('✅ Todos los modelos fiscales verificados exitosamente\n');
    console.log('📊 Resumen de disponibilidad por tipo de cliente:');
    console.log('   AUTONOMO: 100, 111, 130, 131, 180, 190, 303, 347, 349, 390, 720');
    console.log('   EMPRESA: 111, 180, 190, 200, 303, 347, 349, 390, 720');
    console.log('   PARTICULAR: 100');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAllTaxModels();
