import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const modernProfessionalTemplate = `
<div class="page single-page">
  <!-- Cabecera con logo y datos básicos -->
  <div class="header">
    <div class="header-left">
      <div class="logo-container">{{LOGO_URL}}</div>
      <div class="company-name">{{TIPO}}</div>
    </div>
    <div class="header-right">
      <h1 class="main-title">PRESUPUESTO</h1>
      <div class="budget-number">{{NUMERO}}</div>
      <div class="budget-date">{{FECHA}}</div>
    </div>
  </div>
  
  <!-- Información del cliente -->
  <div class="client-section">
    <div class="section-title">CLIENTE</div>
    <div class="client-grid">
      <div class="client-item"><strong>{{NOMBRE_CLIENTE}}</strong></div>
      <div class="client-item">{{CIF_NIF}}</div>
      <div class="client-item">{{EMAIL}}</div>
      <div class="client-item">{{TELEFONO}}</div>
    </div>
  </div>
  
  <!-- Servicios en columnas compactas -->
  <div class="services-container">
    <div class="services-column">
      <h3>📊 Contabilidad</h3>
      <table class="services-table">
        <tbody>{{SERVICIOS_CONTABILIDAD}}</tbody>
      </table>
    </div>
    
    <div class="services-column">
      <h3>👥 Laborales</h3>
      <table class="services-table">
        <tbody>{{SERVICIOS_LABORALES}}</tbody>
      </table>
    </div>
    
    <div class="services-column">
      <h3>⭐ Adicionales</h3>
      <table class="services-table">
        <tbody>{{SERVICIOS_ADICIONALES}}</tbody>
      </table>
    </div>
  </div>
  
  <!-- Información del negocio en grid compacto -->
  <div class="business-section">
    <div class="business-item">
      <span class="label">Facturación:</span>
      <span class="value">{{FACTURACION}}</span>
    </div>
    <div class="business-item">
      <span class="label">Facturas/Mes:</span>
      <span class="value">{{FACTURAS_MES}}</span>
    </div>
    <div class="business-item">
      <span class="label">Tributación:</span>
      <span class="value">{{SISTEMA_TRIBUTACION}}</span>
    </div>
    <div class="business-item">
      <span class="label">Declaraciones:</span>
      <span class="value">{{PERIODO_DECLARACIONES}}</span>
    </div>
  </div>
  
  <!-- Total destacado -->
  <div class="total-section">
    <div class="total-box">
      <div class="total-label">TOTAL MENSUAL</div>
      <div class="total-amount">{{TOTAL_FINAL}}</div>
      <div class="total-note">IVA no incluido</div>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <span class="validity">Válido hasta: {{FECHA_VALIDEZ}}</span>
    <span class="thank-you">Gracias por confiar en nosotros</span>
  </div>
</div>
`;

const modernProfessionalCSS = `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 9pt;
  line-height: 1.3;
  color: #2c3e50;
}

.page {
  width: 210mm;
  height: 297mm;
  padding: 15mm;
  background: white;
  position: relative;
  overflow: hidden;
}

/* CABECERA */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 8mm;
  border-bottom: 2px solid {{COLOR_PRIMARIO}};
  margin-bottom: 6mm;
}

.header-left {
  flex: 1;
}

.logo-container {
  height: 20mm;
  margin-bottom: 3mm;
}

.company-name {
  font-size: 11pt;
  font-weight: 600;
  color: {{COLOR_PRIMARIO}};
  letter-spacing: 1px;
}

.header-right {
  text-align: right;
}

.main-title {
  font-size: 22pt;
  font-weight: 700;
  color: {{COLOR_PRIMARIO}};
  margin-bottom: 2mm;
}

.budget-number {
  font-size: 12pt;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1mm;
}

.budget-date {
  font-size: 9pt;
  color: #7f8c8d;
}

/* SECCIÓN CLIENTE */
.client-section {
  background: linear-gradient(135deg, {{COLOR_PRIMARIO}} 0%, {{COLOR_SECUNDARIO}} 100%);
  color: white;
  padding: 5mm;
  border-radius: 4px;
  margin-bottom: 6mm;
}

.section-title {
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 3mm;
  opacity: 0.9;
}

.client-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1.5fr 1fr;
  gap: 3mm;
  font-size: 8pt;
}

.client-item {
  background: rgba(255, 255, 255, 0.15);
  padding: 2mm;
  border-radius: 2px;
  backdrop-filter: blur(5px);
}

/* SERVICIOS EN COLUMNAS */
.services-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 4mm;
  margin-bottom: 6mm;
}

.services-column h3 {
  font-size: 10pt;
  color: {{COLOR_PRIMARIO}};
  margin-bottom: 3mm;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 2mm;
}

.services-table {
  width: 100%;
  border-collapse: collapse;
}

.services-table td {
  padding: 2mm 1mm;
  font-size: 8pt;
  border-bottom: 1px solid #f0f0f0;
  color: #34495e;
}

.services-table td:before {
  content: "• ";
  color: {{COLOR_PRIMARIO}};
  font-weight: bold;
}

/* INFORMACIÓN DEL NEGOCIO */
.business-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 3mm;
  background: #f8f9fa;
  padding: 4mm;
  border-radius: 4px;
  margin-bottom: 6mm;
}

.business-item {
  display: flex;
  flex-direction: column;
  padding: 2mm;
  background: white;
  border-radius: 2px;
  border-left: 2px solid {{COLOR_PRIMARIO}};
}

.business-item .label {
  font-size: 7pt;
  color: #7f8c8d;
  font-weight: 500;
  margin-bottom: 1mm;
}

.business-item .value {
  font-size: 9pt;
  color: #2c3e50;
  font-weight: 700;
}

/* TOTAL */
.total-section {
  display: flex;
  justify-content: center;
  margin-bottom: 6mm;
}

.total-box {
  background: linear-gradient(135deg, {{COLOR_PRIMARIO}} 0%, {{COLOR_SECUNDARIO}} 100%);
  color: white;
  padding: 6mm 15mm;
  border-radius: 6px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 50%;
}

.total-label {
  font-size: 9pt;
  font-weight: 600;
  letter-spacing: 1.5px;
  margin-bottom: 2mm;
  opacity: 0.9;
}

.total-amount {
  font-size: 24pt;
  font-weight: 700;
  margin-bottom: 2mm;
}

.total-note {
  font-size: 7pt;
  opacity: 0.8;
  font-style: italic;
}

/* FOOTER */
.footer {
  position: absolute;
  bottom: 15mm;
  left: 15mm;
  right: 15mm;
  text-align: center;
  padding-top: 4mm;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.validity {
  font-size: 8pt;
  color: #7f8c8d;
}

.thank-you {
  font-size: 9pt;
  color: {{COLOR_PRIMARIO}};
  font-weight: 600;
}

/* Asegurar que no haya saltos de página */
@media print {
  .page {
    page-break-after: avoid;
    page-break-inside: avoid;
  }
}
`;

async function insertTemplates() {
  try {
    console.log('🎨 Insertando plantillas profesionales...');
    
    // Plantilla 1: Moderna y Profesional (LA_LLAVE)
    const template1 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Una Página Profesional - Asesoría La Llave',
        description: 'Plantilla compacta en una sola página, sin precios individuales, con diseño moderno y profesional',
        type: 'AUTONOMO',
        companyBrand: 'LA_LLAVE',
        htmlContent: modernProfessionalTemplate,
        customCss: modernProfessionalCSS,
        availableVars: JSON.stringify([
          'NUMERO', 'FECHA', 'FECHA_VALIDEZ', 'TIPO',
          'NOMBRE_CLIENTE', 'CIF_NIF', 'EMAIL', 'TELEFONO',
          'SERVICIOS_CONTABILIDAD', 'SERVICIOS_LABORALES', 'SERVICIOS_ADICIONALES',
          'FACTURACION', 'FACTURAS_MES', 'SISTEMA_TRIBUTACION', 'PERIODO_DECLARACIONES',
          'TOTAL_FINAL', 'COLOR_PRIMARIO', 'COLOR_SECUNDARIO', 'LOGO_URL'
        ]),
        isDefault: true,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    
    console.log('✅ Plantilla 1 creada:', template1.id);
    
    // Plantilla 2: Misma para ONLINE
    const template2 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Una Página Profesional - Gestoría Online',
        description: 'Plantilla compacta en una sola página, sin precios individuales, con diseño moderno y profesional',
        type: 'AUTONOMO',
        companyBrand: 'ONLINE',
        htmlContent: modernProfessionalTemplate,
        customCss: modernProfessionalCSS,
        availableVars: JSON.stringify([
          'NUMERO', 'FECHA', 'FECHA_VALIDEZ', 'TIPO',
          'NOMBRE_CLIENTE', 'CIF_NIF', 'EMAIL', 'TELEFONO',
          'SERVICIOS_CONTABILIDAD', 'SERVICIOS_LABORALES', 'SERVICIOS_ADICIONALES',
          'FACTURACION', 'FACTURAS_MES', 'SISTEMA_TRIBUTACION', 'PERIODO_DECLARACIONES',
          'TOTAL_FINAL', 'COLOR_PRIMARIO', 'COLOR_SECUNDARIO', 'LOGO_URL'
        ]),
        isDefault: true,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    
    console.log('✅ Plantilla 2 creada:', template2.id);
    
    console.log('\n🎉 ¡Plantillas de una sola página insertadas exitosamente!');
    console.log('   - TODO en una sola página A4');
    console.log('   - Sin precios individuales de servicios');
    console.log('   - Solo muestra total final');
    console.log('   - Diseño compacto y profesional');
    console.log('   - Soporte para logo y colores personalizados');
    
  } catch (error) {
    console.error('❌ Error al insertar plantillas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

insertTemplates();
