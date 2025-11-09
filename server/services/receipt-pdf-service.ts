/**
 * Servicio de generación de PDFs para Recibos
 * Basado en el diseño original de BASU
 */

import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ReceiptPDFData {
  id: string;
  numeroRecibo: string;
  fecha: Date;
  clienteId?: string;
  clienteNombre?: string;
  clienteNif?: string;
  clienteDireccion?: string;
  clienteEmail?: string;
  clienteTelefono?: string;
  descripcionServicios: string;
  importe: number;
  porcentajeIva?: number;
  baseImponible?: number;
  total: number;
  notasAdicionales?: string;
  pagado: boolean;
  formaPago?: string;
  fechaPago?: Date;
}

interface CompanyData {
  nombre: string;
  nif: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
}

export class ReceiptPDFService {
  /**
   * Generar HTML del recibo estilo BASU
   */
  private generateHTML(receipt: ReceiptPDFData, company: CompanyData, cliente?: any): string {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return new Intl.DateFormat('es-ES').format(date);
    };

    const estadoColor = receipt.pagado ? '#2E7D32' : '#F57C00';
    const estadoTexto = receipt.pagado ? 'PAGADO' : 'PENDIENTE';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
      padding: 40px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      font-size: 24pt;
      color: #1565C0;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .company-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-top: 10px;
      border-top: 1px solid #BDBDBD;
    }
    
    .company-details {
      flex: 1;
    }
    
    .company-details .company-name {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 3px;
    }
    
    .company-details .detail {
      font-size: 9pt;
      line-height: 1.4;
    }
    
    .company-logo {
      width: 100px;
      max-height: 60px;
      object-fit: contain;
    }
    
    .separator {
      border-bottom: 1px solid #BDBDBD;
      margin: 20px 0;
    }
    
    .info-grid {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    
    .info-box {
      flex: 1;
      border: 1px solid #E0E0E0;
      padding: 15px;
    }
    
    .info-box-title {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 8px;
    }
    
    .info-row {
      padding: 3px 0;
      font-size: 9.5pt;
    }
    
    .info-row.status {
      font-weight: bold;
      padding-top: 5px;
    }
    
    .service-description {
      margin: 20px 0;
    }
    
    .service-description-title {
      font-weight: bold;
      font-size: 12pt;
      margin-bottom: 8px;
    }
    
    .service-description-content {
      border: 1px solid #E0E0E0;
      padding: 15px;
      background: #FAFAFA;
      white-space: pre-wrap;
      font-size: 10pt;
      line-height: 1.5;
    }
    
    .totals {
      float: right;
      width: 300px;
      margin-top: 20px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 10.5pt;
    }
    
    .totals-separator {
      border-top: 1px solid #333;
      margin: 8px 0;
    }
    
    .total-final {
      font-weight: bold;
      font-size: 14pt;
      padding-top: 8px;
    }
    
    .notes {
      clear: both;
      margin-top: 20px;
      padding-top: 20px;
    }
    
    .notes-title {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 8px;
    }
    
    .notes-content {
      background: #FFF9C4;
      padding: 15px;
      border-left: 4px solid #F57F17;
      font-size: 10pt;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    
    .payment-info {
      margin-top: 15px;
      font-size: 10pt;
      padding: 10px;
      background: #E8F5E9;
      border-left: 4px solid #4CAF50;
    }
    
    .footer {
      position: fixed;
      bottom: 30px;
      left: 40px;
      right: 40px;
      text-align: center;
      font-size: 8pt;
      color: #757575;
      border-top: 1px solid #E0E0E0;
      padding-top: 10px;
    }
  </style>
</head>
<body>
  <!-- ENCABEZADO -->
  <div class="header">
    <h1>RECIBO</h1>
  </div>
  
  <!-- INFORMACIÓN DE EMPRESA Y LOGO -->
  <div class="company-info">
    <div class="company-details">
      <div class="company-name">${company.nombre}</div>
      <div class="detail">NIF: ${company.nif}</div>
      ${company.direccion ? `<div class="detail">${company.direccion}</div>` : ''}
      ${company.telefono ? `<div class="detail">Tel: ${company.telefono}</div>` : ''}
      ${company.email ? `<div class="detail">Email: ${company.email}</div>` : ''}
    </div>
    ${company.logoUrl ? `<img src="${company.logoUrl}" alt="Logo" class="company-logo">` : ''}
  </div>
  
  <div class="separator"></div>
  
  <!-- INFORMACIÓN DEL RECIBO Y CLIENTE -->
  <div class="info-grid">
    <!-- Datos del Recibo -->
    <div class="info-box">
      <div class="info-box-title">Datos del Recibo</div>
      <div class="info-row">Número: ${receipt.numeroRecibo}</div>
      <div class="info-row">Fecha: ${formatDate(receipt.fecha)}</div>
      <div class="info-row status" style="color: ${estadoColor}">
        Estado: ${estadoTexto}
      </div>
    </div>
    
    <!-- Datos del Cliente -->
    <div class="info-box">
      <div class="info-box-title">Cliente</div>
      ${receipt.clienteId && cliente ? `
        <div class="info-row">${cliente.razonSocial}</div>
        <div class="info-row">NIF: ${cliente.nifCif}</div>
        ${cliente.email ? `<div class="info-row">Email: ${cliente.email}</div>` : ''}
      ` : `
        <div class="info-row">${receipt.clienteNombre || ''}</div>
        ${receipt.clienteNif ? `<div class="info-row">NIF: ${receipt.clienteNif}</div>` : ''}
        ${receipt.clienteDireccion ? `<div class="info-row">${receipt.clienteDireccion}</div>` : ''}
        ${receipt.clienteEmail ? `<div class="info-row">Email: ${receipt.clienteEmail}</div>` : ''}
        ${receipt.clienteTelefono ? `<div class="info-row">Tel: ${receipt.clienteTelefono}</div>` : ''}
      `}
    </div>
  </div>
  
  <!-- DESCRIPCIÓN DE SERVICIOS -->
  <div class="service-description">
    <div class="service-description-title">Descripción de Servicios</div>
    <div class="service-description-content">${receipt.descripcionServicios}</div>
  </div>
  
  <!-- TOTALES -->
  <div class="totals">
    ${receipt.porcentajeIva && receipt.porcentajeIva > 0 ? `
      <div class="totals-row">
        <span>Base Imponible:</span>
        <span>${formatCurrency(receipt.baseImponible || 0)}</span>
      </div>
      <div class="totals-row">
        <span>IVA (${receipt.porcentajeIva}%):</span>
        <span>${formatCurrency(((receipt.baseImponible || 0) * receipt.porcentajeIva) / 100)}</span>
      </div>
    ` : `
      <div class="totals-row">
        <span>Importe:</span>
        <span>${formatCurrency(receipt.importe)}</span>
      </div>
    `}
    <div class="totals-separator"></div>
    <div class="totals-row total-final">
      <span>TOTAL:</span>
      <span>${formatCurrency(receipt.total)}</span>
    </div>
  </div>
  
  <!-- NOTAS ADICIONALES -->
  ${receipt.notasAdicionales ? `
    <div class="notes">
      <div class="notes-title">Notas Adicionales</div>
      <div class="notes-content">${receipt.notasAdicionales}</div>
    </div>
  ` : ''}
  
  <!-- INFORMACIÓN DE PAGO -->
  ${receipt.pagado && receipt.formaPago ? `
    <div class="payment-info">
      <strong>Forma de pago:</strong> ${receipt.formaPago}
      ${receipt.fechaPago ? ` | <strong>Fecha de pago:</strong> ${formatDate(receipt.fechaPago)}` : ''}
    </div>
  ` : ''}
  
  <!-- FOOTER -->
  <div class="footer">
    Página <span class="pageNumber"></span>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generar PDF del recibo
   */
  async generatePDF(receiptId: string): Promise<Buffer> {
    try {
      // Obtener datos del recibo
      const receipt = await prisma.receipts.findUnique({
        where: { id: receiptId },
        include: {
          cliente: true,
        },
      });

      if (!receipt) {
        throw new Error('Recibo no encontrado');
      }

      // Obtener datos de empresa (puedes ajustar esto según tu lógica)
      const companyData: CompanyData = {
        nombre: 'Asesoría La Llave',
        nif: 'B12345678',
        direccion: 'Calle Principal, 123',
        telefono: '123 456 789',
        email: 'info@asesorialalllave.com',
        // logoUrl: 'https://...' // URL del logo si está disponible
      };

      // Generar HTML
      const html = this.generateHTML(
        {
          id: receipt.id,
          numeroRecibo: receipt.numeroRecibo,
          fecha: receipt.fecha,
          clienteId: receipt.clienteId || undefined,
          clienteNombre: receipt.clienteNombre || undefined,
          clienteNif: receipt.clienteNif || undefined,
          clienteDireccion: receipt.clienteDireccion || undefined,
          clienteEmail: receipt.clienteEmail || undefined,
          clienteTelefono: receipt.clienteTelefono || undefined,
          descripcionServicios: receipt.descripcionServicios,
          importe: Number(receipt.importe),
          porcentajeIva: receipt.porcentajeIva ? Number(receipt.porcentajeIva) : undefined,
          baseImponible: receipt.baseImponible ? Number(receipt.baseImponible) : undefined,
          total: Number(receipt.total),
          notasAdicionales: receipt.notasAdicionales || undefined,
          pagado: receipt.pagado,
          formaPago: receipt.formaPago || undefined,
          fechaPago: receipt.fechaPago || undefined,
        },
        companyData,
        receipt.cliente
      );

      // Generar PDF con Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      await browser.close();

      return pdfBuffer;
    } catch (error) {
      console.error('Error generando PDF de recibo:', error);
      throw error;
    }
  }
}

export const receiptPDFService = new ReceiptPDFService();
