/**
 * Script para actualizar estados de fiscal_periods
 * Ejecutar: npx tsx update-fiscal-periods-status.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateFiscalPeriodsStatus() {
  console.log("📅 Actualizando estados de períodos fiscales...\n");

  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const periods = await prisma.fiscal_periods.findMany({
      select: {
        id: true,
        year: true,
        label: true,
        starts_at: true,
        ends_at: true,
        status: true,
      },
      orderBy: [
        { year: 'desc' },
        { starts_at: 'asc' },
      ],
    });

    console.log(`Total de períodos: ${periods.length}\n`);

    let pendingToOpen = 0;
    let openToClosed = 0;
    let unchanged = 0;

    for (const period of periods) {
      const startsAt = new Date(period.starts_at);
      const endsAt = new Date(period.ends_at);
      startsAt.setHours(0, 0, 0, 0);
      endsAt.setHours(0, 0, 0, 0);

      let newStatus: 'OPEN' | 'CLOSED' | null = null;
      let action = '';

      if (now >= startsAt && now <= endsAt) {
        // En curso (abierto) - el período ha iniciado y no ha terminado
        if (period.status !== 'OPEN') {
          newStatus = 'OPEN';
          action = `${period.status} → OPEN`;
          pendingToOpen++;
        } else {
          unchanged++;
        }
      } else if (now > endsAt) {
        // Ya finalizó - la fecha de fin ha pasado
        if (period.status !== 'CLOSED') {
          newStatus = 'CLOSED';
          action = `${period.status} → CLOSED`;
          openToClosed++;
        } else {
          unchanged++;
        }
      } else {
        // now < startsAt - aún no ha comenzado, se queda como está
        unchanged++;
      }

      // Actualizar si cambió el estado
      if (newStatus && newStatus !== period.status) {
        await prisma.fiscal_periods.update({
          where: { id: period.id },
          data: { status: newStatus },
        });

        console.log(`✓ ${period.year} ${period.label}: ${action}`);
      }
    }

    console.log(`\n✅ Actualización completada:`);
    console.log(`   • ${pendingToOpen} períodos cambiados a ABIERTO`);
    console.log(`   • ${openToClosed} períodos cambiados a CERRADO`);
    console.log(`   • ${unchanged} períodos sin cambios`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateFiscalPeriodsStatus();
