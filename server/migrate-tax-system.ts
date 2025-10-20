/**
 * Script de migración del sistema antiguo de impuestos al nuevo sistema
 * 
 * Migra:
 * 1. TaxModel → Impuesto
 * 2. TaxPeriod → CalendarioAEAT  
 * 3. Client.taxModels → ObligacionFiscal
 * 4. ClientTax → Declaracion
 */

// @ts-nocheck
import { PrismaClient, Periodicidad, EstadoDeclaracion } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de estados antiguos a nuevos
const estadoMap: Record<string, EstadoDeclaracion> = {
  PENDIENTE: 'PENDIENTE',
  CALCULADO: 'CALCULADO',
  REALIZADO: 'PRESENTADO'
};

// Determinar periodicidad basado en taxPeriod
function getPeriodicidad(taxPeriod: any): Periodicidad {
  if (taxPeriod.mes !== null) return 'MENSUAL';
  if (taxPeriod.trimestre !== null) return 'TRIMESTRAL';
  return 'ANUAL';
}

// Generar período contable
function getPeriodoContable(taxPeriod: any): string {
  const { anio, trimestre, mes } = taxPeriod;
  
  if (mes !== null) {
    return `${anio}-${String(mes).padStart(2, '0')}`; // Ej: 2025-04
  }
  if (trimestre !== null) {
    return `${anio}-Q${trimestre}`; // Ej: 2025-Q2
  }
  return String(anio); // Ej: 2025
}

async function main() {
  console.log('🚀 Iniciando migración del sistema de impuestos...\n');

  // PASO 1: Migrar TaxModel → Impuesto
  console.log('📋 Paso 1: Migrando TaxModels a Impuestos...');
  const taxModels = await prisma.taxModel.findMany();
  const impuestoMap = new Map<string, string>(); // modeloId → impuestoId

  for (const taxModel of taxModels) {
    // Buscar o crear impuesto
    let impuesto = await prisma.impuesto.findUnique({
      where: { modelo: taxModel.nombre }
    });

    if (!impuesto) {
      impuesto = await prisma.impuesto.create({
        data: {
          modelo: taxModel.nombre, // "303", "131", etc.
          nombre: taxModel.descripcion || taxModel.nombre,
          descripcion: taxModel.descripcion,
        }
      });
      console.log(`  ✓ Creado impuesto ${impuesto.modelo}: ${impuesto.nombre}`);
    } else {
      console.log(`  • Impuesto ya existe: ${impuesto.modelo}`);
    }
    
    impuestoMap.set(taxModel.id, impuesto.id);
  }
  console.log(`✅ ${taxModels.length} impuestos migrados\n`);

  // PASO 2: Migrar TaxPeriod → CalendarioAEAT
  console.log('📅 Paso 2: Migrando TaxPeriods a CalendarioAEAT...');
  const taxPeriods = await prisma.taxPeriod.findMany();
  const calendarioMap = new Map<string, string>(); // taxPeriodId → calendarioId

  for (const taxPeriod of taxPeriods) {
    const periodicidad = getPeriodicidad(taxPeriod);
    const periodoContable = getPeriodoContable(taxPeriod);
  const modelo = taxModelMap.get(taxPeriod.modeloId) ?? '';

    // Verificar si ya existe para evitar duplicados
    const existing = await prisma.calendarioAEAT.findUnique({
      where: {
        modelo_periodicidad_periodoContable: {
          modelo,
          periodicidad,
          periodoContable
        }
      }
    });

    if (existing) {
      calendarioMap.set(taxPeriod.id, existing.id);
      console.log(`  • Calendario ya existe: ${modelo} ${periodicidad} ${periodoContable}`);
      continue;
    }

    const calendario = await prisma.calendarioAEAT.create({
      data: {
        modelo,
        periodicidad,
        periodoContable,
        fechaInicio: taxPeriod.inicioPresentacion,
        fechaFin: taxPeriod.finPresentacion,
      }
    });
    calendarioMap.set(taxPeriod.id, calendario.id);
    console.log(`  ✓ Creado calendario ${modelo} ${periodicidad} ${periodoContable}`);
  }
  console.log(`✅ ${calendarioMap.size} calendarios creados\n`);

  // PASO 3: Crear ObligacionesFiscales desde Client.taxModels
  console.log('📝 Paso 3: Creando ObligacionesFiscales desde taxModels...');
  const clients = await prisma.client.findMany({
    where: {
      taxModels: { not: null }
    }
  });

  const obligacionMap = new Map<string, Map<string, string>>(); // clientId → (modelo → obligacionId)

  for (const client of clients) {
    const taxModels = client.taxModels as string[];
    if (!taxModels || taxModels.length === 0) continue;

    const clientObligaciones = new Map<string, string>();
    
    for (const modelo of taxModels) {
      // Buscar el impuesto correspondiente
      const impuesto = await prisma.impuesto.findUnique({
        where: { modelo }
      });

      if (!impuesto) {
        console.log(`  ⚠️  Modelo ${modelo} no encontrado en impuestos para cliente ${client.razonSocial}`);
        continue;
      }

      // Determinar periodicidad por defecto (puede ajustarse manualmente después)
      let periodicidad: Periodicidad = 'TRIMESTRAL';
      if (modelo === '303' || modelo === '111') periodicidad = 'MENSUAL';
      if (modelo === '200' || modelo === '180') periodicidad = 'ANUAL';

      // Verificar si ya existe la obligación
      let obligacion = await prisma.obligacionFiscal.findFirst({
        where: {
          clienteId: client.id,
          impuestoId: impuesto.id,
        }
      });

      if (!obligacion) {
        obligacion = await prisma.obligacionFiscal.create({
          data: {
            clienteId: client.id,
            impuestoId: impuesto.id,
            periodicidad,
            fechaInicio: client.fechaAlta,
            fechaFin: client.fechaBaja,
          }
        });
        console.log(`  ✓ Obligación ${modelo} ${periodicidad} para ${client.razonSocial}`);
      } else {
        console.log(`  • Obligación ya existe: ${modelo} para ${client.razonSocial}`);
      }

      clientObligaciones.set(modelo, obligacion.id);
    }

    obligacionMap.set(client.id, clientObligaciones);
  }
  console.log(`✅ Obligaciones fiscales creadas para ${clients.length} clientes\n`);

  // PASO 4: Migrar ClientTax → Declaracion
  console.log('📊 Paso 4: Migrando ClientTaxes a Declaraciones...');
  const clientTaxes = await prisma.clientTax.findMany({
    include: {
      period: { include: { modelo: true } }
    }
  });

  let declaracionesCreadas = 0;
  let declaracionesOmitidas = 0;

  for (const clientTax of clientTaxes) {
    const clientId = clientTax.clientId;
  const modelo = clientTax.period.modelo.nombre;
  const calendarioId = calendarioMap.get(clientTax.taxPeriodId);

    if (!calendarioId) {
      console.log(`  ⚠️  Calendario no encontrado para ClientTax ${clientTax.id}`);
      declaracionesOmitidas++;
      continue;
    }

    // Buscar la obligación fiscal correspondiente
    const clientObligaciones = obligacionMap.get(clientId);
    const obligacionId = clientObligaciones?.get(modelo);

    if (!obligacionId) {
      console.log(`  ⚠️  Obligación no encontrada para cliente ${clientId} modelo ${modelo}`);
      declaracionesOmitidas++;
      continue;
    }

    // Verificar si ya existe la declaración
    const existingDeclaracion = await prisma.declaracion.findFirst({
      where: {
        obligacionId,
        calendarioId,
      }
    });

    if (existingDeclaracion) {
      declaracionesOmitidas++;
      continue;
    }

    // Crear la declaración
    await prisma.declaracion.create({
      data: {
        obligacionId,
        calendarioId,
        estado: estadoMap[clientTax.estado] || 'PENDIENTE',
        fechaPresentacion: clientTax.estado === 'REALIZADO' ? clientTax.fechaActualizacion : null,
        archivoPdf: null, // Los PDFs antiguos no se migran automáticamente
        notas: clientTax.notas,
      }
    });

    declaracionesCreadas++;
    if (declaracionesCreadas % 20 === 0) {
      console.log(`  ... ${declaracionesCreadas} declaraciones migradas`);
    }
  }

  console.log(`✅ ${declaracionesCreadas} declaraciones migradas (${declaracionesOmitidas} omitidas)\n`);

  // Resumen final
  console.log('═══════════════════════════════════════════════════');
  console.log('🎉 MIGRACIÓN COMPLETADA');
  console.log('═══════════════════════════════════════════════════');
  console.log(`📋 Impuestos:           ${taxModels.length}`);
  console.log(`📅 Calendarios AEAT:    ${calendarioMap.size}`);
  console.log(`📝 Obligaciones fiscales: ${obligacionMap.size} clientes`);
  console.log(`📊 Declaraciones:       ${declaracionesCreadas}`);
  console.log('═══════════════════════════════════════════════════\n');

  console.log('⚠️  NOTA: Ahora puedes eliminar las tablas antiguas:');
  console.log('   - TaxModel');
  console.log('   - TaxPeriod');
  console.log('   - ClientTax');
  console.log('   - TaxFile');
  console.log('   - ClientTaxRequirement');
  console.log('   - ClientTaxFiling\n');
}

main()
  .catch((error) => {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
