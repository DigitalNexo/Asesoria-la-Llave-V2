#!/usr/bin/env tsx
/**
 * Scheduled Task: Task Reminders
 * Envía recordatorios de tareas próximas a vencer
 * Frecuencia: Diario a las 09:00 (Cron: 0 9 * * *)
 */

import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";

const prisma = new PrismaClient();

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
async function verifySmtp() {
  try {
    await transporter.verify();
    console.log("✅ SMTP configurado correctamente");
    isMailConfigured = true;
  } catch (error) {
    console.warn("⚠️  SMTP no configurado - emails deshabilitados:", (error as Error).message);
  }
}

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
 * Ejecuta el job de recordatorios de tareas
 */
async function runTaskReminders() {
  console.log("🔔 Ejecutando: Recordatorios de tareas");
  
  // Verificar SMTP
  await verifySmtp();
  
  try {
    const tomorrow = addDays(new Date(), 1);
    const nextWeek = addDays(new Date(), 7);

    // Obtener tareas que vencen en las próximas 24-48 horas
    const upcomingTasks = await prisma.task.findMany({
      where: {
        estado: { notIn: ["COMPLETADA"] },
        fechaVencimiento: {
          gte: new Date(),
          lte: nextWeek,
        },
      },
      include: {
        cliente: true,
        asignado: true,
      },
    });

    console.log(`📋 Tareas próximas a vencer: ${upcomingTasks.length}`);

    for (const task of upcomingTasks) {
      if (!task.fechaVencimiento) continue;
      
      const diasRestantes = Math.ceil(
        (new Date(task.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
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
            <p><strong>Cliente:</strong> ${task.cliente?.razonSocial || "Sin cliente"}</p>
            <p><strong>Descripción:</strong> ${task.descripcion || "Sin descripción"}</p>
            <p><strong>Vence:</strong> ${format(new Date(task.fechaVencimiento), "dd 'de' MMMM, yyyy", { locale: es })}</p>
            <p><strong>Días restantes:</strong> ${diasRestantes}</p>
            <p><strong>Prioridad:</strong> ${task.prioridad}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Este es un recordatorio automático del sistema Asesoría La Llave.
            </p>
          </div>
        </div>
      `;

      if (task.asignado?.email) {
        await sendEmail(
          task.asignado.email,
          `${urgencia}: ${task.titulo} - Vence en ${diasRestantes} día(s)`,
          html
        );
      }
    }

    console.log("✅ Recordatorios de tareas completados");
  } catch (error) {
    console.error("❌ Error en recordatorios de tareas:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runTaskReminders();
