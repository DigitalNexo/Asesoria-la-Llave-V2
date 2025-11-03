#!/usr/bin/env tsx
/**
 * Scheduled Task: Tax Reminders
 * Envía recordatorios de obligaciones fiscales próximas a vencer
 * Frecuencia: Diario a las 08:00 (Cron: 0 8 * * *)
 */

import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";

const prisma = new PrismaClient();

// Configuración SMTP
const smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

if (process.env.SMTP_USER && !smtpPassword) {
  console.warn("⚠️  SMTP password environment variable missing. Define SMTP_PASS or SMTP_PASSWORD.");
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: process.env.SMTP_USER && smtpPassword ? {
    user: process.env.SMTP_USER,
    pass: smtpPassword,
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
 * Ejecuta el job de recordatorios fiscales
 */
async function runTaxReminders() {
  console.log("🔔 Ejecutando: Recordatorios fiscales");

  // Verificar SMTP
  await verifySmtp();

  try {
    const now = new Date();
    const nextMonth = addDays(now, 30);

    // Obtener clientes activos
    const clientes = await prisma.clients.findMany({
      include: {
        clientTaxes: {
          include: {
            period: {
              include: {
                modelo: true,
              },
            },
          },
        },
      },
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

    console.log("✅ Recordatorios fiscales completados");
  } catch (error) {
    console.error("❌ Error en recordatorios fiscales:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
runTaxReminders();
