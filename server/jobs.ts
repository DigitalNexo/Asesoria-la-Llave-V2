import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { addDays, format, isBefore, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { prismaStorage as storage } from "./prisma-storage";
import { calculateDerivedFields } from "./services/tax-calendar-service";

// Prisma client will be injected by server/index.ts
let prisma: PrismaClient;

/**
 * Inicializa el módulo de jobs con el PrismaClient compartido
 */
export function initializeJobs(client: PrismaClient) {
  prisma = client;
}

// Configuración SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

// Verificar configuración SMTP
let isMailConfigured = false;
transporter.verify((error, success) => {
  if (error) {
    console.warn("⚠️  SMTP no configurado - emails deshabilitados:", error.message);
    isMailConfigured = false;
  } else {
    console.log("✅ SMTP configurado correctamente");
    isMailConfigured = true;
  }
});

/**
 * Envía un email
 */
async function sendEmail(to: string, subject: string, html: string) {
  if (!isMailConfigured) {
    console.log(`📧 Email no enviado (SMTP no configurado): ${to} - ${subject}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    console.log(`✅ Email enviado: ${to} - ${subject}`);
  } catch (error) {
    console.error(`❌ Error enviando email a ${to}:`, error);
  }
}

/**
 * Job: Recordatorios de tareas próximas a vencer (cada día a las 9am)
 */
export const taskRemindersJob = cron.createTask("0 9 * * *", async () => {
  console.log("🔔 Ejecutando job: recordatorios de tareas");
  
  try {
    const tomorrow = addDays(new Date(), 1);
    const nextWeek = addDays(new Date(), 7);

    // Obtener tareas que vencen en las próximas 24-48 horas
    const upcomingTasks = await prisma.tasks.findMany({
      where: {
        estado: { notIn: ["COMPLETADA"] },
        fecha_vencimiento: {
          gte: new Date(),
          lte: nextWeek,
        },
      },
      include: {
        clients: true,
        users: true, // asignado → users
      },
    });

    console.log(`📋 Tareas próximas a vencer: ${upcomingTasks.length}`);

    for (const task of upcomingTasks) {
      if (!task.fecha_vencimiento) continue;
      
      const diasRestantes = Math.ceil(
        (new Date(task.fecha_vencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasRestantes <= 0) continue; // Ya vencida

      const urgencia = diasRestantes <= 1 ? "URGENTE" : diasRestantes <= 3 ? "Próximo" : "Recordatorio";
      const color = diasRestantes <= 1 ? "#dc2626" : diasRestantes <= 3 ? "#f59e0b" : "#3b82f6";

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">${urgencia}: Tarea próxima a vencer</h2>
          </div>
          <div style="padding: 20px; background: #f9fafb;">
            <h3>${task.titulo}</h3>
            <p><strong>Cliente:</strong> ${task.clients?.razonSocial || "Sin cliente"}</p>
            <p><strong>Descripción:</strong> ${task.descripcion || "Sin descripción"}</p>
            <p><strong>Vence:</strong> ${format(new Date(task.fecha_vencimiento), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            <p><strong>Días restantes:</strong> ${diasRestantes}</p>
            <p><strong>Prioridad:</strong> ${task.prioridad}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Este es un recordatorio automático del sistema Asesoría La Llave.
            </p>
          </div>
        </div>
      `;

      if (task.users?.email) {
        await sendEmail(
          task.users.email,
          `${urgencia}: ${task.titulo} - Vence en ${diasRestantes} día(s)`,
          html
        );
      }
    }
  } catch (error) {
    console.error("❌ Error en job de recordatorios de tareas:", error);
  }
});

/**
 * Job: Recordatorios de obligaciones fiscales (cada día a las 8am)
 */
export const taxRemindersJob = cron.createTask("0 8 * * *", async () => {
  console.log("🔔 Ejecutando job: recordatorios fiscales");

  try {
    const now = new Date();
    const nextMonth = addDays(now, 30);

    // Obtener clientes activos - Note: Currently no status field in Client model
      const clientes = await prisma.clients.findMany({
        include: ({
          clientTaxes: {
            include: {
              period: {
                    include: {
                      modelo: true,
                    },
              },
            },
          },
        } as any),
      }) as any[];

    console.log(`📊 Clientes con impuestos: ${clientes.length}`);

    for (const cliente of clientes) {
      if (!cliente.clientTaxes || cliente.clientTaxes.length === 0) continue;

      for (const clientTax of cliente.clientTaxes) {
        const period = clientTax.period;
        if (!period) continue;

        const diasRestantes = Math.ceil(
          (new Date(period.finPresentacion).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Enviar recordatorio si faltan 7, 3 o 1 días
        if ([7, 3, 1].includes(diasRestantes)) {
          const color = diasRestantes === 1 ? "#dc2626" : diasRestantes === 3 ? "#f59e0b" : "#3b82f6";
          const urgencia = diasRestantes === 1 ? "URGENTE" : "Recordatorio";

          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${color}; color: white; padding: 20px; text-align: center;">
                <h2 style="margin: 0;">${urgencia}: Obligación Fiscal Próxima</h2>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <h3>${period.modelo.nombre} - ${period.anio}</h3>
                <p><strong>Cliente:</strong> ${cliente.razonSocial}</p>
                <p><strong>NIF/CIF:</strong> ${cliente.nifCif}</p>
                <p><strong>Periodo:</strong> ${period.trimestre ? `Trimestre ${period.trimestre}` : period.mes ? `Mes ${period.mes}` : period.anio}</p>
                <p><strong>Fecha límite:</strong> ${format(new Date(period.finPresentacion), "dd 'de' MMMM, yyyy", { locale: es })}</p>
                <p><strong>Días restantes:</strong> ${diasRestantes}</p>
                <p><strong>Estado:</strong> ${clientTax.estado}</p>
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px;">
                  Este es un recordatorio automático del sistema Asesoría La Llave.
                </p>
              </div>
            </div>
          `;

          // Enviar al contacto del cliente
          if (cliente.email) {
            await sendEmail(
              cliente.email,
              `${urgencia}: ${period.modelo.nombre} - Vence en ${diasRestantes} día(s)`,
              html
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ Error en job de recordatorios fiscales:", error);
  }
});

/**
 * Job: Recalcular estado del calendario fiscal (cada día a medianoche)
 */
export const taxCalendarRefreshJob = cron.createTask("0 0 * * *", async () => {
  if (!prisma) {
    console.warn("⚠️  taxCalendarRefreshJob: Prisma no inicializado");
    return;
  }

  console.log("🗓️  Ejecutando job: refresco calendario fiscal");

  try {
    const entries = await prisma.tax_calendar.findMany();
    let updated = 0;

    for (const entry of entries) {
      const derived = calculateDerivedFields(entry.startDate, entry.endDate);
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
        updated++;
      }
    }

    console.log(`✅ Calendario fiscal actualizado (${updated} registros)`); // ok to log
  } catch (error) {
    console.error("❌ Error actualizando calendario fiscal:", error);
  }
});

/**
 * Job: Generar declaraciones faltantes para el año en curso (01:10 diario)
 */
export const ensureDeclarationsDailyJob = cron.createTask("10 1 * * *", async () => {
  const year = new Date().getFullYear();
  try {
    const result = await storage.ensureDeclarationsForYear(year);
    console.log(`🧩 ensureDeclarationsDailyJob: año ${year} => creadas ${result.created}, omitidas ${result.skipped}`);
  } catch (e) {
    console.error("❌ Error en ensureDeclarationsDailyJob:", e);
  }
});

/**
 * Job: Limpieza de sesiones expiradas (cada hora)
 */
export const cleanupSessionsJob = cron.createTask("0 * * * *", async () => {
  console.log("🧹 Ejecutando job: limpieza de sesiones");

  try {
    const prisma = new PrismaClient();
    
    // Limpiar sesiones cerradas más antiguas de 7 días
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const closedSessionsResult = await prisma.sessions.deleteMany({
      where: {
        ended_at: { 
          not: null,
          lt: sevenDaysAgo 
        }
      }
    });
    
    // Marcar como cerradas las sesiones inactivas por más de 2 horas
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const inactiveSessionsResult = await prisma.sessions.updateMany({
      where: {
        ended_at: null,
        last_seen_at: { lt: twoHoursAgo }
      },
      data: {
        ended_at: new Date()
      }
    });
    
    console.log(`✅ Sesiones limpias: ${closedSessionsResult.count} eliminadas, ${inactiveSessionsResult.count} marcadas como inactivas`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error en job de limpieza:", error);
  }
});

/**
 * Job: Backup automático de base de datos (cada noche a las 3am)
 */
export const backupDatabaseJob = cron.createTask("0 3 * * *", async () => {
  console.log("💾 Ejecutando job: backup de base de datos");

  try {
    const { spawn } = require("child_process");
    const path = require("path");
    const backupScript = path.join(process.cwd(), "scripts", "backup.sh");

    const backup = spawn("bash", [backupScript], {
      env: process.env,
      stdio: "inherit",
    });

    backup.on("close", (code: number) => {
      if (code === 0) {
        console.log("✅ Backup completado exitosamente");
      } else {
        console.error(`❌ Backup falló con código: ${code}`);
      }
    });
  } catch (error) {
    console.error("❌ Error en job de backup:", error);
  }
});

/**
 * Inicia todos los jobs
 * NOTA: Los cron jobs NO funcionan en Autoscale Deployments (se escalan a cero cuando están inactivos).
 * Use Scheduled Deployments de Replit para tareas programadas en producción.
 * Los jobs solo deben ejecutarse en:
 * - Desarrollo local (NODE_ENV !== 'production')
 * - Reserved VM Deployments (procesos persistentes)
 */
export function startAllJobs() {
  if (!prisma) {
    throw new Error(
      "❌ JOBS ERROR: Prisma client no inicializado.\n" +
      "   Debe llamar a initializeJobs(prisma) antes de startAllJobs().\n" +
      "   Ver server/index.ts para el orden correcto de inicialización."
    );
  }

  const isDev = process.env.NODE_ENV !== "production";
  const enableCronJobs = process.env.ENABLE_CRON_JOBS === "true";
  
  if (!isDev && !enableCronJobs) {
    console.warn(
      "⚠️  ADVERTENCIA: Cron jobs deshabilitados en este entorno.\n" +
      "   Los Autoscale Deployments no soportan procesos persistentes.\n" +
      "   Use Scheduled Deployments de Replit para tareas programadas.\n" +
      "   O configure ENABLE_CRON_JOBS=true en Reserved VM Deployments.\n" +
      "   Documentación: https://docs.replit.com/hosting/deployments/scheduled-deployments"
    );
    return;
  }
  
  console.log("🚀 Iniciando jobs programados...");
  
  taskRemindersJob.start();
  console.log("  ✓ Recordatorios de tareas (09:00 diario)");
  
  taxRemindersJob.start();
  console.log("  ✓ Recordatorios fiscales (08:00 diario)");

  // Eliminados jobs de calendario/AEAT
  
  cleanupSessionsJob.start();
  console.log("  ✓ Limpieza de sesiones (cada hora)");
  
  backupDatabaseJob.start();
  console.log("  ✓ Backup automático (03:00 diario)");
  
  console.log("✅ Todos los jobs activos");
}

/**
 * Detiene todos los jobs
 */
export function stopAllJobs() {
  if (!prisma) {
    throw new Error("Jobs no inicializados: debe llamar initializeJobs(prisma) primero");
  }
  
  taskRemindersJob.stop();
  taxRemindersJob.stop();
  // Eliminados jobs de calendario/AEAT
  cleanupSessionsJob.stop();
  backupDatabaseJob.stop();
  console.log("🛑 Todos los jobs detenidos");
}

export default {
  initializeJobs,
  startAllJobs,
  stopAllJobs,
  taskRemindersJob,
  taxRemindersJob,
  cleanupSessionsJob,
  backupDatabaseJob,
};
