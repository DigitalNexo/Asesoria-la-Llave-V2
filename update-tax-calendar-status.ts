/**
 * Script para actualizar estados del calendario fiscal (tax_calendar)
 * Ejecutar: npx tsx update-tax-calendar-status.ts
 */
import { PrismaClient } from "@prisma/client";
import { calculateDerivedFields } from "./server/services/tax-calendar-service";

const prisma = new PrismaClient();

async function updateTaxCalendarStatus() {
  console.log("🗓️  Actualizando estados del calendario fiscal (tax_calendar)...\n");

  try {
    const entries = await prisma.tax_calendar.findMany({
      orderBy: [
        { year: 'desc' },
        { startDate: 'asc' },
      ],
    });

    console.log(`Total de entradas: ${entries.length}\n`);

    let pendingToOpen = 0;
    let openToClosed = 0;
    let closedToPending = 0;
    let unchanged = 0;

    for (const entry of entries) {
      const derived = calculateDerivedFields(entry.startDate, entry.endDate);
      const oldStatus = entry.status;
      
      if (
        entry.status !== derived.status ||
        entry.days_to_start !== derived.daysToStart ||
        entry.days_to_end !== derived.daysToEnd
      ) {
        await prisma.tax_calendar.update({
          where: { id: entry.id },
          data: {
            status: derived.status,
            days_to_start: derived.daysToStart,
            days_to_end: derived.daysToEnd,
          },
        });

        let action = '';
        if (oldStatus === 'PENDIENTE' && derived.status === 'ABIERTO') {
          pendingToOpen++;
          action = 'PENDIENTE → ABIERTO';
        } else if (oldStatus === 'ABIERTO' && derived.status === 'CERRADO') {
          openToClosed++;
          action = 'ABIERTO → CERRADO';
        } else if (oldStatus === 'CERRADO' && derived.status === 'PENDIENTE') {
          closedToPending++;
          action = 'CERRADO → PENDIENTE';
        } else {
          action = `${oldStatus} → ${derived.status}`;
        }

        console.log(`✓ ${entry.year} ${entry.modelCode} ${entry.period}: ${action} (días: ${derived.daysToEnd || derived.daysToStart || 0})`);
      } else {
        unchanged++;
      }
    }

    console.log(`\n✅ Actualización completada:`);
    console.log(`   • ${pendingToOpen} entradas cambiadas a ABIERTO`);
    console.log(`   • ${openToClosed} entradas cambiadas a CERRADO`);
    console.log(`   • ${closedToPending} entradas cambiadas a PENDIENTE`);
    console.log(`   • ${unchanged} entradas sin cambios`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateTaxCalendarStatus();
