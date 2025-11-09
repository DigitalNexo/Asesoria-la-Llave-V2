import nodemailer from 'nodemailer';
import prisma from '../prisma-client';
import fs from 'fs/promises';

export class DocumentEmailService {
  /**
   * Obtener configuración SMTP
   */
  private async getSmtpConfig() {
    const smtp = await prisma.smtp_accounts.findFirst({
      where: { activa: true, is_predeterminada: true },
    });
    if (!smtp) {
      const any = await prisma.smtp_accounts.findFirst({ where: { activa: true } });
      if (!any) throw new Error('No hay cuentas SMTP activas');
      return any;
    }
    return smtp;
  }

  /**
   * Crear transporter
   */
  private async createTransporter() {
    const config = await this.getSmtpConfig();
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.password },
    });
  }

  /**
   * Enviar recibo
   */
  async sendReceiptEmail(receiptId: string, pdfPath: string, to: string) {
    const receipt = await prisma.receipts.findUnique({
      where: { id: receiptId },
      include: { clients: true },
    });
    if (!receipt) throw new Error('Recibo no encontrado');

    const nombre = receipt.clients?.razonSocial || receipt.recipient_name;
    const subject = `Recibo ${receipt.numero}`;
    const message = `
Estimado/a ${nombre},

Adjunto encontrará el recibo número ${receipt.numero} por importe de ${Number(receipt.total).toFixed(2)} €.

Concepto: ${receipt.concepto}

Saludos cordiales,
Asesoría La Llave
    `.trim();

    const transporter = await this.createTransporter();
    const pdfBuffer = await fs.readFile(pdfPath);

    await transporter.sendMail({
      from: '"Asesoría La Llave" <noreply@asesorialalllave.com>',
      to,
      subject,
      text: message,
      attachments: [{ filename: `recibo-${receipt.numero}.pdf`, content: pdfBuffer }],
    });

    await prisma.receipts.update({
      where: { id: receiptId },
      data: { status: 'ENVIADO', sent_at: new Date() },
    });
  }

  /**
   * Enviar documento
   */
  async sendDocumentEmail(documentId: string, pdfPath: string, to: string) {
    const doc = await prisma.documents.findUnique({
      where: { id: documentId },
      include: { clients: true },
    });
    if (!doc) throw new Error('Documento no encontrado');

    const typeName = doc.type === 'DATA_PROTECTION' ? 'Protección de Datos' : 'Domiciliación Bancaria';
    const subject = `${typeName} - ${doc.clients.razonSocial}`;
    const message = `
Estimado/a ${doc.clients.razonSocial},

Adjunto encontrará el documento de ${typeName} para su firma.

Por favor, revise, firme y envíenos una copia firmada.

Saludos cordiales,
Asesoría La Llave
    `.trim();

    const transporter = await this.createTransporter();
    const pdfBuffer = await fs.readFile(pdfPath);

    await transporter.sendMail({
      from: '"Asesoría La Llave" <noreply@asesorialalllave.com>',
      to,
      subject,
      text: message,
      attachments: [{ filename: `${doc.type}-${doc.clients.nifCif}.pdf`, content: pdfBuffer }],
    });

    await prisma.documents.update({
      where: { id: documentId },
      data: { status: 'ENVIADO', sent_at: new Date() },
    });
  }
}

export const documentEmailService = new DocumentEmailService();
