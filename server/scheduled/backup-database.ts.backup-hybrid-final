#!/usr/bin/env tsx
/**
 * Scheduled Task: Database Backup
 * Ejecuta backup automático de la base de datos
 * Frecuencia: Diario a las 03:00 (Cron: 0 3 * * *)
 */

import { spawn } from "child_process";
import path from "path";

/**
 * Ejecuta el job de backup de base de datos
 */
async function runDatabaseBackup() {
  console.log("💾 Ejecutando: Backup de base de datos");

  try {
    const backupScript = path.join(process.cwd(), "scripts", "backup.sh");

    // Ejecutar script de backup
    const backup = spawn("bash", [backupScript], {
      env: process.env,
      stdio: "inherit",
    });

    // Esperar a que termine el backup
    await new Promise<void>((resolve, reject) => {
      backup.on("close", (code: number) => {
        if (code === 0) {
          console.log("✅ Backup completado exitosamente");
          resolve();
        } else {
          console.error(`❌ Backup falló con código: ${code}`);
          reject(new Error(`Backup failed with code ${code}`));
        }
      });

      backup.on("error", (error: Error) => {
        console.error("❌ Error ejecutando backup:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("❌ Error en backup de base de datos:", error);
    process.exit(1);
  }
}

// Ejecutar
runDatabaseBackup();
