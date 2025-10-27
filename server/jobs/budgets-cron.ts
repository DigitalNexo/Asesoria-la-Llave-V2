#!/usr/bin/env tsx
/**
 * Daily job for budgets: mark expired and send reminders
 */
import { PrismaClient } from '@prisma/client';
import { getSMTPConfig } from '../email';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

async function runBudgetsCron() {
  console.log('[budgets-cron] Starting budgets cron');
  try {
    const now = new Date();

    // 1) Mark expired budgets as ARCHIVED (if DRAFT or SENT)
    const p: any = prisma;
    const expired = await p.budgets.findMany({ where: { expiresAt: { lt: now }, status: { in: ['DRAFT', 'SENT'] } } as any });
    for (const b of expired) {
      try {
        await p.budgets.update({ where: { id: b.id }, data: { status: 'ARCHIVED' } as any });
      } catch (err) {
        console.warn('Failed to archive budget', b.id, err);
      }
    }

    // 2) Find budgets with <=3 days to expire and remindSentAt is null
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const toRemind = await p.budgets.findMany({ where: { expiresAt: { lte: threeDaysFromNow, gt: now }, remindSentAt: null, status: { in: ['SENT', 'DRAFT'] } } as any });

    if (toRemind.length === 0) {
      console.log('[budgets-cron] No reminders to send');
    }

    const smtp = getSMTPConfig();
    const transporter = smtp ? nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: (smtp as any).pass } }) : null;

    for (const b of toRemind) {
      try {
        if (!b.clientEmail) continue;
        const subject = `Tu presupuesto ${b.code} vence en pocos días`;
        const acceptUrl = `${process.env.FRONTEND_URL || 'https://tu-dominio'}/public/budgets/${encodeURIComponent(b.code)}/accept?t=${encodeURIComponent(b.acceptanceHash || '')}`;
        const html = `
          <div>
            <p>Hola ${b.clientName},</p>
            <p>Te recordamos que tu presupuesto <strong>${b.code}</strong> vence el ${new Date(b.expiresAt!).toLocaleDateString()}.</p>
            <p><a href="${acceptUrl}">Aceptar presupuesto</a></p>
          </div>
        `;

        let sendOk = false;
        if (transporter) {
          try {
            await transporter.sendMail({ from: smtp!.user, to: b.clientEmail, subject, html });
            sendOk = true;
          } catch (mailErr) {
            console.warn('Failed sending reminder email for budget', b.id, mailErr);
          }
        }

  await p.budget_email_logs.create({ data: { budgetId: b.id, status: sendOk ? 'SENT' : 'FAILED', toEmail: b.clientEmail, subject, response: sendOk ? { sent: true } : { sent: false } as any } as any });
  await p.budgets.update({ where: { id: b.id }, data: { remindSentAt: new Date() } as any });
      } catch (err) {
        console.warn('Error processing reminder for budget', b.id, err);
      }
    }

    console.log('[budgets-cron] Completed');
  } catch (err) {
    console.error('[budgets-cron] Error', err);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runBudgetsCron().catch(err => { console.error(err); process.exit(1); });
}

export { runBudgetsCron };
