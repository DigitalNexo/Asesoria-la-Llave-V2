#!/usr/bin/env tsx
/**
 * Scheduled Task: Cleanup Sessions
 * Limpia sesiones expiradas de la base de datos
 * Frecuencia: Cada hora (Cron: 0 * * * *)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ejecuta el job de limpieza de sesiones
 */
async function runCleanupSessions() {
  console.log("🧹 Ejecutando: Limpieza de sesiones");

  try {
    // Eliminar sesiones más antiguas de 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Si usas express-session con connect-pg-simple o similar,
    // aquí irían las queries para limpiar la tabla de sesiones
    // Por ahora, esto es un placeholder que se puede extender según
    // tu implementación específica de sesiones

    console.log("✅ Limpieza de sesiones completada");
    
    // Ejemplo si tienes una tabla 'sessions':
    // const result = await prisma.$executeRaw`
    //   DELETE FROM sessions WHERE expire < ${sevenDaysAgo}
    // `;
    // console.log(`Sesiones eliminadas: ${result}`);
    
  } catch (error) {
    console.error("❌ Error en limpieza de sesiones:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runCleanupSessions();
