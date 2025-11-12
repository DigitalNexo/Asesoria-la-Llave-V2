import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DocumentPdfService {
  private uploadsDir = path.join(process.cwd(), 'uploads', 'documents');

  constructor() {
    this.ensureUploadsDirExists();
  }

  private async ensureUploadsDirExists() {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Generar PDF de recibo
   */
  async generateReceiptPdf(receipt: any): Promise<string> {
    const html = await this.buildReceiptHtml(receipt);
    const filename = `recibo-${receipt.numero}.pdf`;
    const pdfPath = path.join(this.uploadsDir, filename);
    await this.generatePdfFromHtml(html, pdfPath);
    // Retornar ruta relativa para servir desde /uploads
    return `/uploads/documents/${filename}`;
  }

  /**
   * Generar PDF de documento
   */
  async generateDocumentPdf(document: any): Promise<string> {
    if (!document.template || !document.clients) {
      throw new Error('Documento sin plantilla o cliente');
    }

    const html = this.buildDocumentHtml(document);
    const filename = `${document.type}-${document.clients.nifCif}-${Date.now()}.pdf`;
    const pdfPath = path.join(this.uploadsDir, filename);
    await this.generatePdfFromHtml(html, pdfPath);
    // Retornar ruta relativa para servir desde /uploads
    return `/uploads/documents/${filename}`;
  }

  /**
   * HTML para recibo
   */
  private async buildReceiptHtml(receipt: any): Promise<string> {
    // Buscar plantilla activa tipo RECEIPT
    const template = await prisma.document_templates.findFirst({
      where: { type: 'RECEIPT', is_active: true },
      orderBy: { created_at: 'desc' }
    });

    const client = receipt.clients;
    const nombre = client?.razonSocial || receipt.recipient_name;
    const nif = client?.nifCif || receipt.recipient_nif;
    const email = client?.email || receipt.recipient_email;

    // Si hay plantilla, usar su contenido y reemplazar variables
    if (template && template.content) {
      return template.content
        .replace(/{{NUMERO}}/g, receipt.numero || '')
        .replace(/{{NOMBRE}}/g, nombre || '')
        .replace(/{{NIF}}/g, nif || '')
        .replace(/{{EMAIL}}/g, email || '')
        .replace(/{{FECHA}}/g, new Date(receipt.created_at).toLocaleDateString('es-ES'))
        .replace(/{{CONCEPTO}}/g, receipt.concepto || '')
        .replace(/{{BASE}}/g, Number(receipt.base_imponible).toFixed(2))
        .replace(/{{IVA_PORCENTAJE}}/g, String(receipt.iva_porcentaje || 21))
        .replace(/{{IVA_IMPORTE}}/g, Number(receipt.iva_importe).toFixed(2))
        .replace(/{{TOTAL}}/g, Number(receipt.total).toFixed(2))
        .replace(/{{NOTAS}}/g, receipt.notes || '');
    }

    // Plantilla por defecto si no hay en DB
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
    .header h1 { color: #1e40af; font-size: 32px; }
    .info { margin: 20px 0; }
    .info-row { display: flex; margin-bottom: 8px; }
    .label { font-weight: bold; width: 150px; }
    table { width: 100%; margin: 30px 0; border-collapse: collapse; }
    th { background: #1e40af; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    .amount { text-align: right; font-weight: bold; }
    .total-row { background: #f3f4f6; font-size: 18px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RECIBO</h1>
    <div>${receipt.numero}</div>
  </div>
  <div class="info">
    <div class="info-row"><div class="label">Nombre:</div><div>${nombre}</div></div>
    <div class="info-row"><div class="label">NIF/CIF:</div><div>${nif}</div></div>
    <div class="info-row"><div class="label">Email:</div><div>${email}</div></div>
    <div class="info-row"><div class="label">Fecha:</div><div>${new Date(receipt.created_at).toLocaleDateString('es-ES')}</div></div>
  </div>
  <table>
    <tr><th>Concepto</th><th class="amount">Base</th><th class="amount">IVA (${receipt.iva_porcentaje}%)</th><th class="amount">Total</th></tr>
    <tr><td>${receipt.concepto}</td><td class="amount">${Number(receipt.base_imponible).toFixed(2)} €</td><td class="amount">${Number(receipt.iva_importe).toFixed(2)} €</td><td class="amount">${Number(receipt.total).toFixed(2)} €</td></tr>
    <tr class="total-row"><td colspan="3">TOTAL</td><td class="amount">${Number(receipt.total).toFixed(2)} €</td></tr>
  </table>
  ${receipt.notes ? `<div style="padding:15px;background:#fef3c7;border-left:4px solid #f59e0b;"><strong>Notas:</strong> ${receipt.notes}</div>` : ''}
</body>
</html>
    `;
  }

  /**
   * HTML para documento
   */
  private buildDocumentHtml(document: any): string {
    const client = document.clients;
    const content = document.template.content || '<p>Sin contenido</p>';
    
    // Reemplazar variables básicas
    let html = content
      .replace(/{{CLIENTE_NOMBRE}}/g, client.razonSocial || '')
      .replace(/{{CLIENTE_NIF}}/g, client.nifCif || '')
      .replace(/{{CLIENTE_EMAIL}}/g, client.email || '')
      .replace(/{{FECHA}}/g, new Date().toLocaleDateString('es-ES'));

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
    h1 { color: #1e40af; margin-bottom: 20px; }
    p { margin-bottom: 10px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;
  }

  /**
   * Generar PDF con Puppeteer
   */
  private async generatePdfFromHtml(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      });
    } finally {
      await browser.close();
    }
  }
}

export const documentPdfService = new DocumentPdfService();
