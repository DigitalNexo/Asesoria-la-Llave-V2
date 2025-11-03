import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { gestoriaBudgetPDFService, BudgetPDFData } from './gestoria-budget-pdf-service';
import { gestoriaBudgetConfigService } from './gestoria-budget-config-service';

const prisma = new PrismaClient();

export interface SendBudgetEmailOptions {
  to?: string;
  cc?: string[];
  subject?: string;
  customMessage?: string;
}

/**
 * Servicio para enviar presupuestos por email con PDF adjunto
 */
export class GestoriaBudgetEmailService {
  
  private transporter: nodemailer.Transporter | null = null;
  
  /**
   * Inicializar transporter de nodemailer
   */
  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) {
      return this.transporter;
    }
    
    // Configuración SMTP desde variables de entorno
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    return this.transporter;
  }
  
  /**
   * Enviar presupuesto por email
   */
  async sendBudgetEmail(
    budgetId: string,
    options: SendBudgetEmailOptions = {}
  ): Promise<void> {
    
    // Obtener presupuesto completo
    const budget = await prisma.gestoria_budgets.findUnique({
      where: { id: budgetId },
      include: {
        serviciosAdicionales: true
      }
    });
    
    if (!budget) {
      throw new Error(`Presupuesto con ID ${budgetId} no encontrado`);
    }
    
    // Obtener configuración para branding
    const config = await gestoriaBudgetConfigService.getActiveConfig(budget.tipoGestoria);
    
    if (!config) {
      throw new Error(`No hay configuración activa para ${budget.tipoGestoria}`);
    }
    
    // Preparar datos para PDF
    const pdfData: BudgetPDFData = {
      numero: budget.numero,
      fecha: budget.fechaCreacion,
      fechaValidez: new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1000),
      tipo: budget.tipoGestoria,
      
      nombreCompleto: budget.nombreCliente,
      cifNif: budget.nifCif || undefined,
      email: budget.email || undefined,
      telefono: budget.telefono || undefined,
      direccion: budget.direccion || undefined,
      codigoPostal: budget.personaContacto || undefined,
      ciudad: budget.direccion || undefined,
      provincia: budget.direccion || undefined,
      
      actividadEmpresarial: budget.sistemaTributacion || undefined,
      facturacion: Number(budget.facturacion),
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || undefined,
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      
      serviciosContabilidad: this.buildServicesForPDF(budget, config, 'contabilidad'),
      serviciosLaborales: this.buildServicesForPDF(budget, config, 'laboral'),
      serviciosAdicionales: budget.serviciosAdicionales?.map(s => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio
      })) || [],
      
      totalContabilidad: Number(budget.totalContabilidad),
      totalLaboral: Number(budget.totalLaboral),
      subtotal: (Number(budget.totalContabilidad) + Number(budget.totalLaboral)),
      descuentoCalculado: Number(budget.descuentoCalculado),
      totalFinal: Number(budget.totalFinal),
      
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento || undefined,
      valorDescuento: Number(budget.valorDescuento) || undefined,
      motivoDescuento: budget.tipoDescuento || undefined,
      
      observaciones: budget.direccion || undefined
    };
    
    // Generar PDF
    const pdfBuffer = await gestoriaBudgetPDFService.generatePDF(pdfData);
    
    // Preparar email
    const companyName = budget.tipoGestoria === 'OFICIAL' ? 
      config.nombreEmpresa : 
      config.nombreEmpresa;
    
    const subject = options.subject || 
      `Presupuesto ${budget.numero} - ${companyName}`;
    
    const htmlBody = this.buildEmailHTML(budget, config, options.customMessage);
    
    // Enviar email
    const transporter = await this.getTransporter();
    
    const mailOptions: nodemailer.SendMailOptions = {
      from: `${companyName} <${process.env.SMTP_USER}>`,
      to: options.to,
      cc: options.cc,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: `Presupuesto_${budget.numero}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };
    
    await transporter.sendMail(mailOptions);
    
    // Registrar envío en la base de datos
    await this.logEmailSend(budgetId, options.to, options.cc);
    
    // Actualizar última fecha de envío en presupuesto
    await prisma.gestoria_budgets.update({
      where: { id: budgetId },
      data: {
        fechaEnvio: new Date()
      }
    });
    
    // Registrar evento de estadísticas
    await prisma.gestoria_budget_statistics_events.create({
      data: {
        budgetId: budgetId,
        tipoGestoria: budget.tipoGestoria,
        evento: 'SENT',
        fecha: new Date()
      }
    });
  }
  
  /**
   * Construir servicios para el PDF
   */
  private buildServicesForPDF(
    budget: any,
    config: any,
    tipo: 'contabilidad' | 'laboral'
  ): Array<{ concepto: string; cantidad?: number; precio: number; total: number }> {
    
    const servicios: Array<{ concepto: string; cantidad?: number; precio: number; total: number }> = [];
    
    if (tipo === 'contabilidad') {
      // Base por facturas
      if (budget.facturasMes > 0) {
        const total = budget.facturasMes * config.precioBasePorFactura;
        servicios.push({
          concepto: 'Gestión de facturas',
          cantidad: budget.facturasMes,
          precio: config.precioBasePorFactura,
          total
        });
      }
      
      // Recargo por sistema
      if (Number(budget.facturacion) > 0) {
        let porcentaje = 0;
        switch (budget.sistemaTributacion) {
          case 'Régimen General':
            porcentaje = config.porcentajeRegimenGeneral;
            break;
          case 'Módulos':
            porcentaje = config.porcentajeModulos;
            break;
          case 'EDN':
            porcentaje = config.porcentajeEDN;
            break;
        }
        
        if (porcentaje > 0) {
          const total = (Number(budget.facturacion) * porcentaje) / 100;
          servicios.push({
            concepto: `Recargo ${budget.sistemaTributacion} (${porcentaje}% sobre ${this.formatCurrency(Number(budget.facturacion))})`,
            precio: total,
            total
          });
        }
      }
      
      // Recargo período mensual
      if (budget.periodoDeclaraciones === 'Mensual') {
        const baseParaRecargo = servicios.reduce((sum, s) => sum + s.total, 0);
        const recargoCalculado = (baseParaRecargo * config.recargoPeriodoMensual) / 100;
        const recargo = Math.max(recargoCalculado, config.minimoMensual);
        
        servicios.push({
          concepto: `Recargo período mensual (${config.recargoPeriodoMensual}%, mín. ${this.formatCurrency(config.minimoMensual)})`,
          precio: recargo,
          total: recargo
        });
      }
      
      // Modelos fiscales
      if (budget.modelo303) {
        servicios.push({
          concepto: 'Modelo 303 (IVA)',
          precio: config.precioModelo303,
          total: config.precioModelo303
        });
      }
      
      if (budget.modelo111) {
        servicios.push({
          concepto: 'Modelo 111 (Retenciones IRPF)',
          precio: config.precioModelo111,
          total: config.precioModelo111
        });
      }
      
      if (budget.modelo115) {
        servicios.push({
          concepto: 'Modelo 115 (Retenciones alquileres)',
          precio: config.precioModelo115,
          total: config.precioModelo115
        });
      }
      
      if (budget.modelo130) {
        servicios.push({
          concepto: 'Modelo 130 (IRPF autónomos)',
          precio: config.precioModelo130,
          total: config.precioModelo130
        });
      }
      
      if (budget.modelo100) {
        servicios.push({
          concepto: 'Modelo 100 (Renta)',
          precio: config.precioModelo100,
          total: config.precioModelo100
        });
      }
      
      if (budget.modelo349) {
        servicios.push({
          concepto: 'Modelo 349 (Operaciones intracomunitarias)',
          precio: config.precioModelo349,
          total: config.precioModelo349
        });
      }
      
      if (budget.modelo347) {
        servicios.push({
          concepto: 'Modelo 347 (Operaciones con terceros)',
          precio: config.precioModelo347,
          total: config.precioModelo347
        });
      }
      
      // Servicios adicionales fijos
      if (budget.solicitudCertificados) {
        servicios.push({
          concepto: 'Solicitud de certificados',
          precio: config.precioCertificados,
          total: config.precioCertificados
        });
      }
      
      if (budget.censosAEAT) {
        servicios.push({
          concepto: 'Gestión censos AEAT',
          precio: config.precioCensos,
          total: config.precioCensos
        });
      }
      
      if (budget.recepcionNotificaciones) {
        servicios.push({
          concepto: 'Recepción notificaciones',
          precio: config.precioNotificaciones,
          total: config.precioNotificaciones
        });
      }
      
      if (budget.estadisticasINE) {
        servicios.push({
          concepto: 'Estadísticas INE',
          precio: config.precioEstadisticas,
          total: config.precioEstadisticas
        });
      }
      
      if (budget.solicitudAyudas) {
        servicios.push({
          concepto: 'Solicitud ayudas y subvenciones',
          precio: config.precioAyudas,
          total: config.precioAyudas
        });
      }
    }
    
    if (tipo === 'laboral' && budget.conLaboralSocial && budget.nominasMes > 0) {
      servicios.push({
        concepto: 'Gestión de nóminas',
        cantidad: budget.nominasMes,
        precio: config.precioBasePorNomina,
        total: budget.nominasMes * config.precioBasePorNomina
      });
    }
    
    return servicios;
  }
  
  /**
   * Construir HTML del email
   */
  private buildEmailHTML(budget: any, config: any, customMessage?: string): string {
    const companyName = budget.tipoGestoria === 'OFICIAL' ? 
      config.nombreEmpresa : 
      config.nombreEmpresa;
    
    const primaryColor = config.colorPrimario || '#2563eb';
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto ${budget.numero}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          
          <!-- Cabecera -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${config.colorSecundario || '#1e40af'} 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold;">${companyName}</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu gestoría de confianza</p>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: ${primaryColor}; font-size: 24px;">¡Hola ${budget.nombreCliente}!</h2>
              
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                ${customMessage || 'Gracias por tu interés en nuestros servicios. Te adjuntamos el presupuesto solicitado con todos los detalles de los servicios que podemos ofrecerte.'}
              </p>
              
              <div style="background-color: #eff6ff; border-left: 4px solid ${primaryColor}; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: bold; font-size: 14px;">📄 PRESUPUESTO ${budget.numero}</p>
                <p style="margin: 0 0 5px 0; color: #374151; font-size: 14px;"><strong>Fecha:</strong> ${this.formatDate(budget.fechaCreacion)}</p>
                <p style="margin: 0 0 5px 0; color: #374151; font-size: 14px;"><strong>Válido hasta:</strong> ${this.formatDate(new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1000))}</p>
                <p style="margin: 0; color: #374151; font-size: 18px; font-weight: bold; margin-top: 10px;"><strong>Importe Total:</strong> ${this.formatCurrency(Number(budget.totalFinal))}</p>
              </div>
              
              <p style="margin: 25px 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                En el documento PDF adjunto encontrarás el desglose completo de todos los servicios incluidos en este presupuesto.
              </p>
              
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Si tienes cualquier duda o necesitas más información, no dudes en contactar con nosotros. Estaremos encantados de atenderte.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">¿Estás listo para empezar?</p>
                <a href="${config.webEmpresa || '#'}" style="display: inline-block; background-color: ${primaryColor}; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-top: 10px;">Aceptar Presupuesto</a>
              </div>
            </td>
          </tr>
          
          <!-- Pie de página -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #374151; font-size: 14px; text-align: center;">
                <strong>${companyName}</strong>
              </p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; text-align: center;">
                ${config.direccionEmpresa || ''}
              </p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 13px; text-align: center;">
                📧 ${config.emailEmpresa || ''} • 📞 ${config.telefonoEmpresa || ''}
              </p>
              ${config.webEmpresa ? `
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 13px; text-align: center;">
                🌐 <a href="${config.webEmpresa}" style="color: ${primaryColor}; text-decoration: none;">${config.webEmpresa}</a>
              </p>
              ` : ''}
            </td>
          </tr>
          
        </table>
        
        <!-- Nota legal -->
        <p style="margin: 20px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center; max-width: 600px;">
          Este email y cualquier archivo adjunto son confidenciales y están destinados exclusivamente al destinatario. Si ha recibido este email por error, por favor notifíquelo inmediatamente y elimínelo.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
  
  /**
   * Registrar envío de email en base de datos
   */
  private async logEmailSend(budgetId: string, to: string, cc?: string[]): Promise<void> {
    await prisma.budget_email_logs.create({
      data: {
        budgetId: budgetId,
        emailDestino: to,
        emailCopia: cc ? cc.join(', ') : null,
        fechaEnvio: new Date()
      }
    });
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

export const gestoriaBudgetEmailService = new GestoriaBudgetEmailService();
