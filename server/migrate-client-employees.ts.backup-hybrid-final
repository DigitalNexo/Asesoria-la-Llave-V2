import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateClientEmployees() {
  console.log('🔄 Iniciando migración de empleados de clientes...');

  try {
    // Obtener todos los clientes que tienen responsableAsignado
    const clients = await prisma.client.findMany({
      where: {
        responsableAsignado: {
          not: null
        }
      },
      select: {
        id: true,
        razonSocial: true,
        responsableAsignado: true
      }
    });

    console.log(`📋 Encontrados ${clients.length} clientes con responsable asignado`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      try {
        // Verificar si ya existe la relación
        const existing = await prisma.clientEmployee.findUnique({
          where: {
            clientId_userId: {
              clientId: client.id,
              userId: client.responsableAsignado!
            }
          }
        });

        if (existing) {
          console.log(`⏭️  Cliente "${client.razonSocial}" ya tiene empleado asignado, omitiendo...`);
          skippedCount++;
          continue;
        }

        // Crear la relación con isPrimary=true (es el responsable principal)
        await prisma.clientEmployee.create({
          data: {
            clientId: client.id,
            userId: client.responsableAsignado!,
            isPrimary: true
          }
        });

        console.log(`✅ Migrado: ${client.razonSocial}`);
        migratedCount++;
      } catch (error: any) {
        console.error(`❌ Error al migrar cliente "${client.razonSocial}":`, error.message);
      }
    }

    console.log('\n📊 Resumen de migración:');
    console.log(`  - Clientes migrados: ${migratedCount}`);
    console.log(`  - Clientes omitidos (ya migrados): ${skippedCount}`);
    console.log(`  - Total procesados: ${clients.length}`);
    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migrateClientEmployees();
