import puppeteer from 'puppeteer';
import { gestoriaBudgetConfigService } from './gestoria-budget-config-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type BudgetType = 'PYME' | 'AUTONOMO' | 'RENTA' | 'HERENCIAS';

export interface BudgetPDFData {
  // Presupuesto
  numero: string;
  fecha: Date;
  fechaValidez: Date;
  tipo: 'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE';
  
  // Cliente
  nombreCompleto: string;
  cifNif?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  
  // Negocio
  actividadEmpresarial?: string;
  facturacion: number;
  facturasMes: number;
  nominasMes?: number;
  sistemaTributacion: string;
  periodoDeclaraciones: string;
  
  // Servicios
  serviciosContabilidad: Array<{
    concepto: string;
    cantidad?: number;
    precio: number;
    total: number;
  }>;
  
  serviciosLaborales: Array<{
    concepto: string;
    cantidad?: number;
    precio: number;
    total: number;
  }>;
  
  serviciosAdicionales: Array<{
    nombre: string;
    precio: number;
    tipoServicio: 'MENSUAL' | 'PUNTUAL';
  }>;
  
  // Totales
  totalContabilidad: number;
  totalLaboral: number;
  subtotal: number;
  descuentoCalculado: number;
  totalFinal: number;
  
  // Descuento
  aplicaDescuento: boolean;
  tipoDescuento?: string;
  valorDescuento?: number;
  motivoDescuento?: string;
  
  // Observaciones
  observaciones?: string;
}

/**
 * Servicio para generar PDFs profesionales de presupuestos
 * con dual branding (OFICIAL / ONLINE)
 */
export class GestoriaBudgetPDFService {
  
  /**
   * Generar PDF del presupuesto
   */
  async generatePDF(data: BudgetPDFData): Promise<Buffer> {
    // Obtener configuración activa para branding
    const config = await gestoriaBudgetConfigService.getActiveConfig(data.tipo);
    
    if (!config) {
      throw new Error(`No hay configuración activa para ${data.tipo}`);
    }
    
    // SIEMPRE usar plantilla personalizada de la BD
    const template = await this.getTemplate(data.tipo, 'AUTONOMO'); // Por ahora solo AUTONOMO
    
    if (!template) {
      throw new Error(
        `❌ No existe una plantilla activa para generar el PDF.\n` +
        `Por favor, crea una plantilla en la sección de "Plantillas de Presupuestos".\n` +
        `Tipo: AUTONOMO | Empresa: ${data.tipo === 'ASESORIA_LA_LLAVE' ? 'LA_LLAVE' : 'GESTORIA_ONLINE'}`
      );
    }
    
    // Generar HTML usando la plantilla de la BD
    const html = this.generateHTMLFromTemplate(data, config, template);
    
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
        '--single-process',
        '--disable-gpu'
      ],
      timeout: 60000
    });
    
    try {
      const page = await browser.newPage();
      
      // Cargar HTML con timeout aumentado
      await page.setContent(html, {
        waitUntil: 'load',
        timeout: 60000
      });
      
      // Generar PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px'
        }
      });
      
      return Buffer.from(pdf);
      
    } finally {
      await browser.close();
    }
  }
  
  /**
   * Buscar plantilla personalizada en la BD
   */
  private async getTemplate(
    tipo: 'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE',
    budgetType: BudgetType = 'AUTONOMO'
  ): Promise<any | null> {
    try {
      const companyBrand = tipo === 'ASESORIA_LA_LLAVE' ? 'LA_LLAVE' : 'GESTORIA_ONLINE';
      
      const template = await prisma.budget_templates.findFirst({
        where: {
          type: budgetType,
          companyBrand: companyBrand,
          isDefault: true,
          isActive: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });
      
      return template;
    } catch (error) {
      console.error('Error al buscar plantilla:', error);
      return null;
    }
  }
  
  /**
   * Generar HTML usando plantilla de BD
   */
  private generateHTMLFromTemplate(data: BudgetPDFData, config: any, template: any): string {
    // Preparar variables para reemplazar en la plantilla
    const variables = this.prepareTemplateVariables(data, config);
    
    // Reemplazar variables en el HTML
    let html = this.replaceVariables(template.htmlContent, variables);
    
    // Agregar CSS personalizado si existe
    if (template.customCss) {
      // Si el HTML ya tiene <style>, agregamos el CSS dentro
      if (html.includes('<style>')) {
        html = html.replace('</style>', `\n${template.customCss}\n</style>`);
      } else {
        // Si no, lo agregamos en el head o al inicio
        html = `<style>${template.customCss}</style>\n${html}`;
      }
    }
    
    // Envolver en estructura HTML si no la tiene
    if (!html.toLowerCase().includes('<!doctype') && !html.toLowerCase().includes('<html')) {
      html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${data.numero}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;
    }
    
    return html;
  }
  
  /**
   * Preparar variables para la plantilla
   */
  private prepareTemplateVariables(data: BudgetPDFData, config: any): Record<string, string> {
    const formatCurrency = (value: number) => 
      value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
    
    const formatDate = (date: Date) => 
      date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const formatDateShort = (date: Date) =>
      date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    // Construir tabla de servicios de contabilidad (SIN PRECIOS INDIVIDUALES)
    const serviciosContabilidadHTML = data.serviciosContabilidad
      .map(s => `<tr><td>${s.concepto}</td></tr>`)
      .join('');
    
    // Construir tabla de servicios laborales (SIN PRECIOS INDIVIDUALES)
    const serviciosLaboralesHTML = data.serviciosLaborales
      .map(s => `<tr><td>${s.concepto}</td></tr>`)
      .join('');
    
    // Construir tabla de servicios adicionales (SIN PRECIOS INDIVIDUALES)
    const serviciosAdicionalesHTML = data.serviciosAdicionales
      .map(s => `<tr><td>${s.nombre}</td><td>${s.tipoServicio === 'MENSUAL' ? 'Mensual' : 'Puntual'}</td></tr>`)
      .join('');
    
    // Calcular IVA y subtotal
    const iva = data.totalFinal * 0.21 / 1.21;
    const subtotalSinIva = data.totalFinal - iva;
    
    return {
      // Presupuesto - Variables en MAYÚSCULAS (formato antiguo)
      '{{NUMERO}}': data.numero,
      '{{FECHA}}': formatDate(data.fecha),
      '{{FECHA_VALIDEZ}}': formatDate(data.fechaValidez),
      '{{TIPO}}': data.tipo === 'ASESORIA_LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online',
      
      // Presupuesto - Variables en minúsculas (formato nuevo)
      '{{codigo}}': data.numero,
      '{{fecha}}': formatDateShort(data.fecha),
      '{{empresa}}': data.tipo === 'ASESORIA_LA_LLAVE' ? 'Asesoría La Llave' : 'Gestoría Online',
      
      // Cliente - MAYÚSCULAS
      '{{NOMBRE_CLIENTE}}': data.nombreCompleto,
      '{{CIF_NIF}}': data.cifNif || '',
      '{{EMAIL}}': data.email || '',
      '{{TELEFONO}}': data.telefono || '',
      '{{DIRECCION}}': data.direccion || '',
      '{{CODIGO_POSTAL}}': data.codigoPostal || '',
      '{{CIUDAD}}': data.ciudad || '',
      '{{PROVINCIA}}': data.provincia || '',
      
      // Cliente - minúsculas
      '{{nombre_contacto}}': data.nombreCompleto,
      '{{email}}': data.email || '',
      '{{telefono}}': data.telefono || '',
      '{{direccion}}': data.direccion || '',
      
      // Negocio - MAYÚSCULAS
      '{{ACTIVIDAD}}': data.actividadEmpresarial || '',
      '{{FACTURACION}}': formatCurrency(data.facturacion),
      '{{FACTURAS_MES}}': data.facturasMes.toString(),
      '{{NOMINAS_MES}}': data.nominasMes?.toString() || '0',
      '{{SISTEMA_TRIBUTACION}}': data.sistemaTributacion,
      '{{PERIODO_DECLARACIONES}}': data.periodoDeclaraciones,
      
      // Negocio - minúsculas
      '{{actividad}}': data.actividadEmpresarial || '',
      '{{facturacion_anual}}': formatCurrency(data.facturacion),
      '{{num_facturas}}': data.facturasMes.toString(),
      '{{sistema_tributacion}}': data.sistemaTributacion,
      '{{nominas_mes}}': data.nominasMes?.toString() || '0',
      
      // Servicios (SIN PRECIOS INDIVIDUALES)
      '{{SERVICIOS_CONTABILIDAD}}': serviciosContabilidadHTML || '<tr><td>No aplica</td></tr>',
      '{{SERVICIOS_LABORALES}}': serviciosLaboralesHTML || '<tr><td>No aplica</td></tr>',
      '{{SERVICIOS_ADICIONALES}}': serviciosAdicionalesHTML || '<tr><td>No aplica</td></tr>',
      
      // Totales - MAYÚSCULAS
      '{{TOTAL_CONTABILIDAD}}': formatCurrency(data.totalContabilidad),
      '{{TOTAL_LABORAL}}': formatCurrency(data.totalLaboral),
      '{{SUBTOTAL}}': formatCurrency(data.subtotal),
      '{{DESCUENTO}}': formatCurrency(data.descuentoCalculado),
      '{{TOTAL_FINAL}}': formatCurrency(data.totalFinal),
      
      // Totales - minúsculas
      '{{subtotal}}': formatCurrency(subtotalSinIva),
      '{{iva}}': formatCurrency(iva),
      '{{total}}': formatCurrency(data.totalFinal),
      
      // Descuento
      '{{TIENE_DESCUENTO}}': data.aplicaDescuento ? 'Sí' : 'No',
      '{{TIPO_DESCUENTO}}': data.tipoDescuento || '',
      '{{VALOR_DESCUENTO}}': data.valorDescuento?.toString() || '0',
      '{{MOTIVO_DESCUENTO}}': data.motivoDescuento || '',
      
      // Observaciones
      '{{OBSERVACIONES}}': data.observaciones || '',
      '{{observaciones}}': data.observaciones || '',
      
      // Branding
      '{{COLOR_PRIMARIO}}': config.colorPrimario || '#2563eb',
      '{{COLOR_SECUNDARIO}}': config.colorSecundario || '#1e40af',
      '{{LOGO_URL}}': config.logoUrl || '',
      '{{NOMBRE_EMPRESA}}': config.nombre || data.tipo
    };
  }
  
  /**
   * Reemplazar variables en el template
   */
  private replaceVariables(html: string, variables: Record<string, string>): string {
    let result = html;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, value || '');
    }
    
    return result;
  }
  
  /**
   * Generar HTML completo del PDF
   */
  private generateHTML(data: BudgetPDFData, config: any): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${data.numero}</title>
  <style>
    ${this.getStyles(config)}
  </style>
</head>
<body>
  ${this.generateCoverPage(data, config)}
  ${this.generateServicesPage(data, config)}
  ${this.generateSummaryPage(data, config)}
</body>
</html>
    `;
  }
  
  /**
   * Estilos CSS del PDF
   */
  private getStyles(config: any): string {
    const primaryColor = config.colorPrimario || '#2563eb';
    const secondaryColor = config.colorSecundario || '#1e40af';
    
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: 'Arial', 'Helvetica', sans-serif;
        font-size: 10pt;
        line-height: 1.6;
        color: #333;
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        background: white;
        page-break-after: always;
        position: relative;
      }
      
      .page:last-child {
        page-break-after: auto;
      }
      
      /* PORTADA */
      .cover-page {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        color: white;
      }
      
      .cover-header {
        text-align: center;
        padding-top: 40mm;
      }
      
      .cover-logo {
        font-size: 48pt;
        font-weight: bold;
        margin-bottom: 10mm;
        text-transform: uppercase;
        letter-spacing: 3px;
      }
      
      .cover-title {
        font-size: 36pt;
        font-weight: bold;
        margin-bottom: 5mm;
      }
      
      .cover-subtitle {
        font-size: 18pt;
        opacity: 0.9;
        margin-bottom: 20mm;
      }
      
      .cover-info {
        background: rgba(255, 255, 255, 0.1);
        padding: 15mm;
        border-radius: 5px;
        backdrop-filter: blur(10px);
      }
      
      .cover-info-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 12pt;
      }
      
      .cover-info-label {
        font-weight: bold;
      }
      
      .cover-footer {
        text-align: center;
        padding-bottom: 10mm;
        opacity: 0.8;
      }
      
      /* CABECERA DE PÁGINAS */
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 10mm;
        margin-bottom: 10mm;
        border-bottom: 3px solid ${primaryColor};
      }
      
      .header-left {
        flex: 1;
      }
      
      .header-company {
        font-size: 20pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 2mm;
      }
      
      .header-contact {
        font-size: 9pt;
        color: #666;
      }
      
      .header-right {
        text-align: right;
      }
      
      .header-budget-number {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
      }
      
      .header-date {
        font-size: 9pt;
        color: #666;
      }
      
      /* CLIENTE */
      .client-info {
        background: #f8f9fa;
        padding: 10mm;
        border-radius: 5px;
        margin-bottom: 10mm;
      }
      
      .client-title {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5mm;
      }
      
      .client-row {
        display: flex;
        margin-bottom: 3mm;
      }
      
      .client-label {
        font-weight: bold;
        width: 40mm;
        color: #666;
      }
      
      .client-value {
        flex: 1;
      }
      
      /* TABLA DE SERVICIOS */
      .services-section {
        margin-bottom: 10mm;
      }
      
      .section-title {
        font-size: 14pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 5mm;
        padding-bottom: 2mm;
        border-bottom: 2px solid ${primaryColor};
      }
      
      .services-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 5mm;
      }
      
      .services-table th {
        background: ${primaryColor};
        color: white;
        padding: 3mm;
        text-align: left;
        font-weight: bold;
      }
      
      .services-table td {
        padding: 2.5mm 3mm;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .services-table tr:hover {
        background: #f8f9fa;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-center {
        text-align: center;
      }
      
      .subtotal-row {
        background: #f8f9fa;
        font-weight: bold;
      }
      
      /* TOTALES */
      .totals-section {
        margin-top: 10mm;
        display: flex;
        justify-content: flex-end;
      }
      
      .totals-box {
        width: 70mm;
        background: #f8f9fa;
        padding: 5mm;
        border-radius: 5px;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 2mm 0;
      }
      
      .total-label {
        font-weight: bold;
        color: #666;
      }
      
      .total-value {
        font-weight: bold;
      }
      
      .total-discount {
        color: #dc2626;
      }
      
      .total-final-row {
        border-top: 2px solid ${primaryColor};
        margin-top: 2mm;
        padding-top: 3mm;
        font-size: 14pt;
      }
      
      .total-final-value {
        color: ${primaryColor};
        font-size: 18pt;
      }
      
      /* OBSERVACIONES */
      .observations-section {
        margin-top: 10mm;
        padding: 5mm;
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
        border-radius: 3px;
      }
      
      .observations-title {
        font-weight: bold;
        color: #f59e0b;
        margin-bottom: 2mm;
      }
      
      /* TÉRMINOS Y CONDICIONES */
      .terms-section {
        margin-top: 10mm;
        padding: 5mm;
        background: #f8f9fa;
        border-radius: 5px;
        font-size: 9pt;
      }
      
      .terms-title {
        font-size: 12pt;
        font-weight: bold;
        color: ${primaryColor};
        margin-bottom: 3mm;
      }
      
      .terms-list {
        list-style-position: inside;
        line-height: 1.8;
      }
      
      .terms-list li {
        margin-bottom: 2mm;
      }
      
      /* PIE DE PÁGINA */
      .page-footer {
        position: absolute;
        bottom: 10mm;
        left: 20mm;
        right: 20mm;
        text-align: center;
        font-size: 8pt;
        color: #666;
        padding-top: 5mm;
        border-top: 1px solid #e5e7eb;
      }
      
      .badge {
        display: inline-block;
        padding: 2mm 4mm;
        background: ${primaryColor};
        color: white;
        border-radius: 3px;
        font-size: 9pt;
        font-weight: bold;
      }
      
      .highlight {
        background: #fef3c7;
        padding: 1mm 2mm;
        border-radius: 2px;
      }
    `;
  }
  
  /**
   * Generar página de portada
   */
  private generateCoverPage(data: BudgetPDFData, config: any): string {
    const companyName = data.tipo === 'ASESORIA_LA_LLAVE' ? 
      config.nombreEmpresaOficial : 
      config.nombreEmpresaOnline;
    
    return `
    <div class="page cover-page">
      <div class="cover-header">
        <div class="cover-logo">${companyName}</div>
        <div class="cover-title">PRESUPUESTO</div>
        <div class="cover-subtitle">Nº ${data.numero}</div>
      </div>
      
      <div class="cover-info">
        <div class="cover-info-row">
          <span class="cover-info-label">Cliente:</span>
          <span>${data.nombreCompleto}</span>
        </div>
        ${data.cifNif ? `
        <div class="cover-info-row">
          <span class="cover-info-label">CIF/NIF:</span>
          <span>${data.cifNif}</span>
        </div>
        ` : ''}
        <div class="cover-info-row">
          <span class="cover-info-label">Fecha:</span>
          <span>${this.formatDate(data.fecha)}</span>
        </div>
        <div class="cover-info-row">
          <span class="cover-info-label">Válido hasta:</span>
          <span>${this.formatDate(data.fechaValidez)}</span>
        </div>
        <div class="cover-info-row" style="margin-top: 5mm; font-size: 16pt;">
          <span class="cover-info-label">Importe Total:</span>
          <span style="font-weight: bold;">${this.formatCurrency(data.totalFinal)}</span>
        </div>
      </div>
      
      <div class="cover-footer">
        <p>${config.direccionEmpresa || ''}</p>
        <p>${config.emailEmpresa || ''} • ${config.telefonoEmpresa || ''}</p>
      </div>
    </div>
    `;
  }
  
  /**
   * Generar página de servicios
   */
  private generateServicesPage(data: BudgetPDFData, config: any): string {
    const companyName = data.tipo === 'ASESORIA_LA_LLAVE' ? 
      config.nombreEmpresaOficial : 
      config.nombreEmpresaOnline;
    
    return `
    <div class="page">
      ${this.generatePageHeader(data, config, companyName)}
      
      ${this.generateClientInfo(data)}
      
      <!-- SERVICIOS DE CONTABILIDAD -->
      ${data.serviciosContabilidad.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">📊 Servicios de Contabilidad</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 85%;">Concepto</th>
              <th style="width: 15%;" class="text-center">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosContabilidad.map(s => `
              <tr>
                <td>${s.concepto}</td>
                <td class="text-center">${s.cantidad || '-'}</td>
              </tr>
            `).join('')}
            <tr class="subtotal-row">
              <td class="text-right">Subtotal Contabilidad:</td>
              <td class="text-right">${this.formatCurrency(data.totalContabilidad)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- SERVICIOS LABORALES -->
      ${data.serviciosLaborales.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">👥 Servicios Laborales</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 85%;">Concepto</th>
              <th style="width: 15%;" class="text-center">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosLaborales.map(s => `
              <tr>
                <td>${s.concepto}</td>
                <td class="text-center">${s.cantidad || '-'}</td>
              </tr>
            `).join('')}
            <tr class="subtotal-row">
              <td class="text-right">Subtotal Laboral:</td>
              <td class="text-right">${this.formatCurrency(data.totalLaboral)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      ` : ''}
      
      <!-- SERVICIOS ADICIONALES -->
      ${data.serviciosAdicionales.length > 0 ? `
      <div class="services-section">
        <h2 class="section-title">⭐ Servicios Adicionales</h2>
        <table class="services-table">
          <thead>
            <tr>
              <th style="width: 80%;">Concepto</th>
              <th style="width: 20%;" class="text-center">Tipo</th>
            </tr>
          </thead>
          <tbody>
            ${data.serviciosAdicionales.map(s => `
              <tr>
                <td>${s.nombre}</td>
                <td class="text-center">
                  <span class="badge">${s.tipoServicio === 'MENSUAL' ? 'Mensual' : 'Puntual'}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${this.generatePageFooter(config)}
    </div>
    `;
  }
  
  /**
   * Generar página de resumen y términos
   */
  private generateSummaryPage(data: BudgetPDFData, config: any): string {
    const companyName = data.tipo === 'ASESORIA_LA_LLAVE' ? 
      config.nombreEmpresaOficial : 
      config.nombreEmpresaOnline;
    
    return `
    <div class="page">
      ${this.generatePageHeader(data, config, companyName)}
      
      <!-- TOTALES -->
      <div class="totals-section">
        <div class="totals-box">
          ${data.totalContabilidad > 0 ? `
          <div class="total-row">
            <span class="total-label">Contabilidad:</span>
            <span class="total-value">${this.formatCurrency(data.totalContabilidad)}</span>
          </div>
          ` : ''}
          
          ${data.totalLaboral > 0 ? `
          <div class="total-row">
            <span class="total-label">Laboral:</span>
            <span class="total-value">${this.formatCurrency(data.totalLaboral)}</span>
          </div>
          ` : ''}
          
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-value">${this.formatCurrency(data.subtotal)}</span>
          </div>
          
          ${data.aplicaDescuento && data.descuentoCalculado > 0 ? `
          <div class="total-row">
            <span class="total-label">Descuento ${data.tipoDescuento === 'PORCENTAJE' ? `(${data.valorDescuento}%)` : ''}:</span>
            <span class="total-value total-discount">-${this.formatCurrency(data.descuentoCalculado)}</span>
          </div>
          ` : ''}
          
          <div class="total-row total-final-row">
            <span class="total-label">TOTAL:</span>
            <span class="total-value total-final-value">${this.formatCurrency(data.totalFinal)}</span>
          </div>
        </div>
      </div>
      
      ${data.motivoDescuento ? `
      <div class="observations-section">
        <div class="observations-title">💡 Descuento Aplicado:</div>
        <div>${data.motivoDescuento}</div>
      </div>
      ` : ''}
      
      ${data.observaciones ? `
      <div class="observations-section" style="margin-top: 5mm;">
        <div class="observations-title">📝 Observaciones:</div>
        <div>${data.observaciones}</div>
      </div>
      ` : ''}
      
      <!-- TÉRMINOS Y CONDICIONES -->
      <div class="terms-section">
        <h2 class="terms-title">Términos y Condiciones</h2>
        <ol class="terms-list">
          <li><strong>Validez del presupuesto:</strong> Este presupuesto tiene validez hasta el ${this.formatDate(data.fechaValidez)}.</li>
          <li><strong>Servicios mensuales:</strong> Los servicios mensuales se facturarán de forma recurrente cada mes.</li>
          <li><strong>Servicios puntuales:</strong> Los servicios puntuales se facturarán únicamente cuando se realicen.</li>
          <li><strong>Forma de pago:</strong> El pago se realizará mediante domiciliación bancaria o transferencia según se acuerde.</li>
          <li><strong>Modificación de servicios:</strong> Cualquier modificación de los servicios contratados deberá ser comunicada con un mínimo de 15 días de antelación.</li>
          <li><strong>Documentación:</strong> El cliente se compromete a facilitar toda la documentación necesaria en los plazos establecidos.</li>
          <li><strong>IVA:</strong> Los precios mostrados no incluyen IVA (21% según legislación vigente).</li>
          <li><strong>Aceptación:</strong> La aceptación de este presupuesto implica la aceptación de estos términos y condiciones.</li>
        </ol>
      </div>
      
      ${this.generatePageFooter(config)}
    </div>
    `;
  }
  
  /**
   * Generar cabecera de página (excepto portada)
   */
  private generatePageHeader(data: BudgetPDFData, config: any, companyName: string): string {
    return `
    <div class="page-header">
      <div class="header-left">
        <div class="header-company">${companyName}</div>
        <div class="header-contact">
          ${config.emailEmpresa || ''} • ${config.telefonoEmpresa || ''}
        </div>
      </div>
      <div class="header-right">
        <div class="header-budget-number">Presupuesto ${data.numero}</div>
        <div class="header-date">${this.formatDate(data.fecha)}</div>
      </div>
    </div>
    `;
  }
  
  /**
   * Generar información del cliente
   */
  private generateClientInfo(data: BudgetPDFData): string {
    return `
    <div class="client-info">
      <h2 class="client-title">Datos del Cliente</h2>
      <div class="client-row">
        <span class="client-label">Nombre/Razón Social:</span>
        <span class="client-value">${data.nombreCompleto}</span>
      </div>
      ${data.cifNif ? `
      <div class="client-row">
        <span class="client-label">CIF/NIF:</span>
        <span class="client-value">${data.cifNif}</span>
      </div>
      ` : ''}
      ${data.email ? `
      <div class="client-row">
        <span class="client-label">Email:</span>
        <span class="client-value">${data.email}</span>
      </div>
      ` : ''}
      ${data.telefono ? `
      <div class="client-row">
        <span class="client-label">Teléfono:</span>
        <span class="client-value">${data.telefono}</span>
      </div>
      ` : ''}
      ${data.direccion ? `
      <div class="client-row">
        <span class="client-label">Dirección:</span>
        <span class="client-value">${data.direccion}${data.codigoPostal ? `, ${data.codigoPostal}` : ''}${data.ciudad ? `, ${data.ciudad}` : ''}${data.provincia ? ` (${data.provincia})` : ''}</span>
      </div>
      ` : ''}
      ${data.actividadEmpresarial ? `
      <div class="client-row">
        <span class="client-label">Actividad:</span>
        <span class="client-value">${data.actividadEmpresarial}</span>
      </div>
      ` : ''}
    </div>
    `;
  }
  
  /**
   * Generar pie de página
   */
  private generatePageFooter(config: any): string {
    return `
    <div class="page-footer">
      <p>${config.direccionEmpresa || ''}</p>
      <p>${config.emailEmpresa || ''} • ${config.telefonoEmpresa || ''}</p>
      <p style="margin-top: 2mm; font-size: 7pt;">
        Este presupuesto ha sido generado de forma automática. Para cualquier consulta, contacte con nosotros.
      </p>
    </div>
    `;
  }
  
  // ===== UTILIDADES =====
  
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
}

export const gestoriaBudgetPDFService = new GestoriaBudgetPDFService();
