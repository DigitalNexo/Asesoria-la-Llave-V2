import nodemailer from 'nodemailer';
import type { Task, ClientTax, TaxPeriod, TaxModel } from '@shared/schema';

interface SMTPConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

let smtpConfig: SMTPConfig | null = null;

export function configureSMTP(config: SMTPConfig | null) {
  smtpConfig = config ? { ...config } : null;
}

export function getSMTPConfig(): SMTPConfig | null {
  return smtpConfig;
}

function createTransporter() {
  if (!smtpConfig) {
    console.warn('SMTP not configured, skipping email');
    return null;
  }

  return nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });
}

export async function sendTaskReminderEmail(
  task: Task & { assignedUser?: { email: string; username: string } },
  daysUntilDue: number
) {
  const transporter = createTransporter();
  if (!transporter || !task.assignedUser?.email || !smtpConfig) return;

  const subject = `Recordatorio: Tarea "${task.titulo}" vence en ${daysUntilDue} días`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Tarea</h2>
      <p>Hola ${task.assignedUser.username},</p>
      <p>Te recordamos que tienes una tarea pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${task.titulo}</h3>
        ${task.descripcion ? `<p>${task.descripcion}</p>` : ''}
        <p><strong>Prioridad:</strong> ${task.prioridad}</p>
        <p><strong>Vencimiento:</strong> ${task.fechaVencimiento ? new Date(task.fechaVencimiento).toLocaleDateString('es-ES') : 'No definido'}</p>
        <p><strong>Días restantes:</strong> ${daysUntilDue}</p>
      </div>
      
      <p>Por favor, asegúrate de completar esta tarea a tiempo.</p>
      <p>Saludos,<br>Asesoría La Llave</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: smtpConfig.user,
      to: task.assignedUser.email,
      subject,
      html,
    });
    console.log(`Email sent to ${task.assignedUser.email} for task ${task.id}`);
  } catch (error) {
    console.error('Error sending task reminder email:', error);
  }
}

export async function sendTaxReminderEmail(
  clientTax: ClientTax & { 
    client?: { razonSocial: string; email: string | null };
    taxPeriod?: TaxPeriod & { taxModel?: TaxModel };
  },
  daysUntilDue: number
) {
  const transporter = createTransporter();
  if (!transporter || !clientTax.client?.email || !smtpConfig) return;

  const modelName = clientTax.taxPeriod?.taxModel?.nombre || 'Modelo fiscal';
  const period = clientTax.taxPeriod 
    ? `${clientTax.taxPeriod.trimestre ? `T${clientTax.taxPeriod.trimestre}` : clientTax.taxPeriod.mes ? `Mes ${clientTax.taxPeriod.mes}` : ''} ${clientTax.taxPeriod.anio}`
    : 'Periodo no especificado';

  const subject = `Recordatorio: ${modelName} vence en ${daysUntilDue} días`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1E3A8A;">Recordatorio de Impuesto</h2>
      <p>Estimado cliente ${clientTax.client.razonSocial},</p>
      <p>Le recordamos que tiene un modelo fiscal pendiente que vence pronto:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${modelName}</h3>
        <p><strong>Periodo:</strong> ${period}</p>
        <p><strong>Estado:</strong> ${clientTax.estado}</p>
        <p><strong>Fecha límite:</strong> ${clientTax.taxPeriod?.finPresentacion ? new Date(clientTax.taxPeriod.finPresentacion).toLocaleDateString('es-ES') : 'No definida'}</p>
        <p><strong>Días restantes:</strong> ${daysUntilDue}</p>
        ${clientTax.notas ? `<p><strong>Notas:</strong> ${clientTax.notas}</p>` : ''}
      </div>
      
      <p>Por favor, asegúrese de presentar este modelo antes de la fecha límite para evitar sanciones.</p>
      <p>Atentamente,<br>Asesoría La Llave</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: smtpConfig.user,
      to: clientTax.client.email,
      subject,
      html,
    });
    console.log(`Email sent to ${clientTax.client.email} for tax ${clientTax.id}`);
  } catch (error) {
    console.error('Error sending tax reminder email:', error);
  }
}

export async function checkAndSendReminders(storage: any) {
  const now = new Date();
  
  // Check tasks (3 days before due)
  const tasks = await storage.getAllTasks();
  for (const task of tasks) {
    if (task.fechaVencimiento && task.estado !== 'COMPLETADA' && task.asignadoA) {
      const dueDate = new Date(task.fechaVencimiento);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue === 3) {
        const assignedUser = await storage.getUser(task.asignadoA);
        if (assignedUser) {
          await sendTaskReminderEmail({ ...task, assignedUser }, daysUntilDue);
        }
      }
    }
  }
  
  // Check taxes (7 days before due)
  const clientTaxes = await storage.getAllClientTax();
  for (const clientTax of clientTaxes) {
    if (clientTax.estado !== 'REALIZADO') {
      const taxPeriod = await storage.getTaxPeriod(clientTax.taxPeriodId);
      if (taxPeriod?.finPresentacion) {
        const dueDate = new Date(taxPeriod.finPresentacion);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue === 7) {
          const client = await storage.getClient(clientTax.clientId);
          const taxModel = await storage.getTaxModel(taxPeriod.modeloId);
          if (client) {
            await sendTaxReminderEmail({
              ...clientTax,
              client,
              taxPeriod: { ...taxPeriod, taxModel },
            }, daysUntilDue);
          }
        }
      }
    }
  }
}
