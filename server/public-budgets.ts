import express from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyAcceptanceHash } from './utils/budgets';
import { createBudgetPdf } from './utils';
import { getSMTPConfig } from './email';
import nodemailer from 'nodemailer';
import logger from './logger';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const router = express.Router();

// GET /public/budgets/:code/accept?t=hash
router.get('/:code/accept', async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const p: any = prisma;
    const budget = await p.budgets.findUnique({ 
      where: { code },
      include: { items: { orderBy: { position: 'asc' } } }
    });
    if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
    if (!t) return res.status(400).json({ error: 'Token requerido' });
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) return res.status(403).json({ error: 'Token inválido' });

    // Return budget data as JSON for the React component
    res.json(budget);
  } catch (err: any) {
    console.error('GET /public/budgets/:code/accept', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// POST /public/budgets/:code/accept
router.post('/:code/accept', async (req, res) => {
  try {
    const { code } = req.params;
    const { t } = req.query;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const agent = String(req.headers['user-agent'] || '');

    const p: any = prisma;
    const budget = await p.budgets.findUnique({ where: { code } });
    if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
    if (!t) return res.status(400).json({ error: 'Token requerido' });
    
    logger.info(`🔐 Verificando hash para presupuesto ${code}`);
    const valid = verifyAcceptanceHash(budget.code, budget.date, String(t));
    if (!valid) {
      logger.warn(`❌ Hash inválido para presupuesto ${code}`);
      return res.status(403).json({ error: 'Token inválido' });
    }

    // check expiry
    if (budget.expiresAt && new Date(budget.expiresAt) < new Date()) {
      logger.warn(`⏰ Presupuesto ${code} expirado`);
      return res.status(410).json({ error: 'Presupuesto expirado' });
    }

    // Check if already accepted
    if (budget.acceptedAt) {
      logger.warn(`⚠️ Presupuesto ${code} ya fue aceptado anteriormente`);
      return res.status(400).json({ 
        error: 'Este presupuesto ya fue aceptado anteriormente',
        acceptedAt: budget.acceptedAt 
      });
    }

    // Update budget
    const updatedBudget = await p.budgets.update({ 
      where: { id: budget.id }, 
      data: { 
        acceptedAt: new Date(), 
        acceptedByIp: String(ip), 
        acceptedByAgent: agent, 
        status: 'ACCEPTED' 
      } as any 
    });

    logger.info(`✅ Presupuesto ${code} aceptado exitosamente`);

    // Send confirmation email to client
    try {
      const isGestoriaOnline = budget.companyBrand === 'GESTORIA_ONLINE';
      const companyName = isGestoriaOnline ? 'GESTORÍA ONLINE' : 'ASESORÍA LA LLAVE';
      const companyEmail = isGestoriaOnline ? 'info@gestoriaonline.com' : 'info@asesorialallave.com';
      const companyPhone = isGestoriaOnline ? '91 XXX XX XX' : '91 238 99 60';
      const companyColor = isGestoriaOnline ? '#1a7f64' : '#2E5C8A';

      if (budget.clientEmail) {
        const smtp = getSMTPConfig();
        const transporter = smtp ? nodemailer.createTransport({ 
          host: smtp.host, 
          port: smtp.port, 
          secure: smtp.port === 465, 
          auth: { user: smtp.user, pass: (smtp as any).pass } 
        }) : null;

        if (transporter) {
          try {
            await transporter.sendMail({
              from: smtp!.user,
              to: budget.clientEmail,
              subject: `✅ Presupuesto ${budget.code} Aceptado - ${companyName}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .header { background: ${companyColor}; color: white; padding: 30px 20px; text-align: center; }
                    .header h1 { margin: 0; font-size: 28px; }
                    .content { background: #f9f9f9; padding: 30px 20px; }
                    .success-box { background: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 20px 0; border-radius: 5px; }
                    .success-box h2 { color: #155724; margin-top: 0; font-size: 20px; }
                    .info-table { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .info-row:last-child { border-bottom: none; }
                    .info-label { font-weight: bold; color: #666; }
                    .info-value { color: #333; }
                    .total { background: ${companyColor}; color: white; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
                    .total .amount { font-size: 36px; font-weight: bold; margin: 10px 0; }
                    .contact-info { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
                    .footer { background: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>✅ Confirmación de Aceptación</h1>
                    </div>
                    
                    <div class="content">
                      <div class="success-box">
                        <h2>¡Su presupuesto ha sido aceptado correctamente!</h2>
                        <p>Estimado/a <strong>${budget.clientName}</strong>,</p>
                        <p>Hemos recibido la aceptación de su presupuesto. A continuación le confirmamos los detalles:</p>
                      </div>

                      <div class="info-table">
                        <div class="info-row">
                          <span class="info-label">Presupuesto:</span>
                          <span class="info-value">${budget.code}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Tipo:</span>
                          <span class="info-value">${budget.type}</span>
                        </div>
                        <div class="info-row">
                          <span class="info-label">Fecha de aceptación:</span>
                          <span class="info-value">${new Date().toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                      </div>

                      <div class="total">
                        <div>TOTAL ACEPTADO</div>
                        <div class="amount">${Number(budget.total).toFixed(2)} €</div>
                      </div>

                      <p><strong>Próximos pasos:</strong></p>
                      <ul>
                        <li>Nuestro equipo se pondrá en contacto con usted en un plazo máximo de 24-48 horas.</li>
                        <li>Coordinaremos los detalles para iniciar los servicios contratados.</li>
                        <li>Recibirá toda la documentación necesaria por email.</li>
                      </ul>

                      <div class="contact-info">
                        <h3>¿Tiene alguna duda?</h3>
                        <p>No dude en contactarnos:</p>
                        <ul>
                          <li><strong>Email:</strong> ${companyEmail}</li>
                          <li><strong>Teléfono:</strong> ${companyPhone}</li>
                          <li><strong>Horario:</strong> Lunes a Viernes, 9:00 - 18:00</li>
                        </ul>
                      </div>

                      <p style="text-align: center; margin-top: 30px;">
                        <strong>Gracias por confiar en ${companyName}</strong>
                      </p>
                    </div>

                    <div class="footer">
                      <p>${companyName} - Todos los derechos reservados © ${new Date().getFullYear()}</p>
                      <p style="margin-top: 10px; opacity: 0.8;">
                        Este es un email automático generado por nuestro sistema de gestión de presupuestos.
                      </p>
                    </div>
                  </div>
                </body>
                </html>
              `,
            });

            logger.info(`📧 Email de confirmación enviado a ${budget.clientEmail}`);
          } catch (mailError: any) {
            logger.error({ error: mailError }, 'Error al enviar email de confirmación');
          }
        }

        // Send internal notification to company
        if (transporter) {
          try {
            await transporter.sendMail({
              from: smtp!.user,
              to: companyEmail,
              subject: `🎉 ¡Nuevo presupuesto aceptado! ${budget.code}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #28a745; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
                    .info-box { background: #f8f9fa; padding: 15px; border-left: 4px solid ${companyColor}; margin: 15px 0; }
                    .label { font-weight: bold; color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h2 style="margin: 0;">🎉 ¡Presupuesto Aceptado!</h2>
                    </div>
                    
                    <p>Se ha aceptado un nuevo presupuesto:</p>
                    
                    <div class="info-box">
                      <p><span class="label">Código:</span> ${budget.code}</p>
                      <p><span class="label">Cliente:</span> ${budget.clientName}</p>
                      <p><span class="label">Email:</span> ${budget.clientEmail || 'No especificado'}</p>
                      <p><span class="label">Teléfono:</span> ${budget.clientPhone || 'No especificado'}</p>
                      <p><span class="label">Tipo:</span> ${budget.type}</p>
                      <p><span class="label">Total:</span> ${Number(budget.total).toFixed(2)} €</p>
                      <p><span class="label">Fecha de aceptación:</span> ${new Date().toLocaleString('es-ES')}</p>
                      <p><span class="label">IP:</span> ${ip || 'No disponible'}</p>
                      <p><span class="label">User-Agent:</span> ${agent.substring(0, 100)}...</p>
                    </div>

                    <p><strong>Acción requerida:</strong> Contactar con el cliente en un plazo de 24-48 horas.</p>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #666;">
                      Este es un email automático del sistema de gestión de presupuestos.
                    </p>
                  </div>
                </body>
                </html>
              `,
            });

            logger.info(`📧 Notificación interna enviada a ${companyEmail}`);
          } catch (internalMailError: any) {
            logger.error({ error: internalMailError }, 'Error al enviar notificación interna');
          }
        }
      }
    } catch (emailError: any) {
      logger.error({ error: emailError }, 'Error en proceso de emails');
      // Don't fail the acceptance if email fails
    }

    res.json({ ok: true, message: 'Presupuesto aceptado correctamente', budget: updatedBudget });
  } catch (err: any) {
    logger.error({ error: err }, 'POST /public/budgets/:code/accept');
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /public/budgets/:id/pdf - download budget PDF (public with token validation)
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const p: any = prisma;
    const budget = await p.budgets.findUnique({ 
      where: { id },
      include: {
        items: { orderBy: { position: 'asc' } }
      }
    });
    if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });

    // Generate PDF on-the-fly
    const pdfResult = await createBudgetPdf(budget);
    const filepath = path.join(process.cwd(), 'uploads', 'budgets', pdfResult.filename);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${budget.code || 'presupuesto'}.pdf"`);
    
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
    fileStream.on('error', (err: any) => {
      console.error('Error streaming PDF:', err);
      res.status(500).json({ error: 'Error al generar PDF' });
    });
  } catch (err: any) {
    console.error('GET /public/budgets/:id/pdf', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
