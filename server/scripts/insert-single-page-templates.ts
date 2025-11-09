import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

// PLANTILLA 1: MODERNA COMPACTA (1 PÁGINA)
const modernaCompactaHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #2c3e50;
      width: 210mm;
      height: 297mm;
      padding: 15mm;
      position: relative;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8mm;
      border-bottom: 3px solid #2563eb;
      margin-bottom: 6mm;
    }
    
    .header-left h1 {
      font-size: 24pt;
      color: #2563eb;
      margin-bottom: 2mm;
    }
    
    .header-right {
      text-align: right;
    }
    
    .budget-number {
      font-size: 14pt;
      font-weight: bold;
      color: #2563eb;
    }
    
    .budget-date {
      font-size: 9pt;
      color: #666;
    }
    
    .client-section {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 5mm;
      border-radius: 4px;
      margin-bottom: 6mm;
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
    }
    
    .services-container {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4mm;
      margin-bottom: 6mm;
    }
    
    .services-column h3 {
      font-size: 10pt;
      color: #2563eb;
      margin-bottom: 3mm;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 2mm;
    }
    
    .service-item {
      font-size: 8pt;
      padding: 2mm 1mm;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .service-item:before {
      content: "• ";
      color: #2563eb;
      font-weight: bold;
    }
    
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
      border-left: 2px solid #2563eb;
    }
    
    .business-item .label {
      font-size: 7pt;
      color: #7f8c8d;
      margin-bottom: 1mm;
    }
    
    .business-item .value {
      font-size: 9pt;
      font-weight: 700;
      color: #2c3e50;
    }
    
    .total-section {
      display: flex;
      justify-content: center;
      margin-bottom: 6mm;
    }
    
    .total-box {
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
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
      font-size: 8pt;
      color: #7f8c8d;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>PRESUPUESTO</h1>
    </div>
    <div class="header-right">
      <div class="budget-number">{{codigo}}</div>
      <div class="budget-date">{{fecha}}</div>
    </div>
  </div>
  
  <div class="client-section">
    <div class="client-grid">
      <div class="client-item"><strong>{{nombre_contacto}}</strong></div>
      <div class="client-item">{{telefono}}</div>
      <div class="client-item">{{email}}</div>
      <div class="client-item">Autónomo</div>
    </div>
  </div>
  
  <div class="services-container">
    <div class="services-column">
      <h3>📊 Contabilidad</h3>
      <div class="service-item">Contabilidad mensual</div>
      <div class="service-item">Declaraciones trimestrales</div>
      <div class="service-item">Modelo 303 - IVA</div>
      <div class="service-item">Modelo 130 - IRPF</div>
    </div>
    
    <div class="services-column">
      <h3>👥 Laboral</h3>
      <div class="service-item">Nóminas mensuales</div>
      <div class="service-item">Seguros Sociales</div>
      <div class="service-item">Modelo 111</div>
    </div>
    
    <div class="services-column">
      <h3>⭐ Adicionales</h3>
      <div class="service-item">Asesoramiento fiscal</div>
      <div class="service-item">Consultas ilimitadas</div>
      <div class="service-item">Gestor personal</div>
    </div>
  </div>
  
  <div class="business-section">
    <div class="business-item">
      <span class="label">Facturación:</span>
      <span class="value">{{facturacion_anual}}</span>
    </div>
    <div class="business-item">
      <span class="label">Facturas/año:</span>
      <span class="value">{{num_facturas}}</span>
    </div>
    <div class="business-item">
      <span class="label">Tributación:</span>
      <span class="value">{{sistema_tributacion}}</span>
    </div>
    <div class="business-item">
      <span class="label">Actividad:</span>
      <span class="value">{{actividad}}</span>
    </div>
  </div>
  
  <div class="total-section">
    <div class="total-box">
      <div class="total-label">TOTAL MENSUAL</div>
      <div class="total-amount">{{total}}</div>
      <div class="total-note">IVA no incluido</div>
    </div>
  </div>
  
  <div class="footer">
    <span>Válido hasta 30 días</span>
    <span>Gracias por confiar en nosotros</span>
  </div>
</body>
</html>
`;

// PLANTILLA 2: ELEGANTE PROFESIONAL (1 PÁGINA)
const eleganteProfesionalHTML = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', serif;
      font-size: 9pt;
      line-height: 1.4;
      color: #1a1a1a;
      width: 210mm;
      height: 297mm;
      padding: 20mm;
      background: #fff;
    }
    
    .letterhead {
      text-align: center;
      margin-bottom: 8mm;
      padding-bottom: 6mm;
      border-bottom: 2px solid #1a1a1a;
    }
    
    .letterhead h1 {
      font-size: 28pt;
      font-weight: 300;
      letter-spacing: 3px;
      margin-bottom: 2mm;
      color: #1a1a1a;
    }
    
    .letterhead .subtitle {
      font-size: 10pt;
      color: #666;
      font-style: italic;
    }
    
    .doc-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8mm;
      padding: 4mm 0;
    }
    
    .doc-number {
      font-size: 12pt;
      font-weight: bold;
    }
    
    .doc-date {
      font-size: 9pt;
      color: #666;
    }
    
    .client-box {
      background: #f5f5f5;
      padding: 6mm;
      margin-bottom: 8mm;
      border-left: 4px solid #1a1a1a;
    }
    
    .client-box h2 {
      font-size: 11pt;
      margin-bottom: 4mm;
      font-weight: 600;
    }
    
    .client-detail {
      margin-bottom: 2mm;
      font-size: 9pt;
    }
    
    .client-detail strong {
      display: inline-block;
      width: 35mm;
      color: #666;
    }
    
    .services-block {
      margin-bottom: 8mm;
    }
    
    .section-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 4mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #ddd;
    }
    
    .services-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    
    .service-category {
      background: #fafafa;
      padding: 4mm;
      border-radius: 2px;
    }
    
    .service-category h4 {
      font-size: 10pt;
      margin-bottom: 3mm;
      color: #333;
    }
    
    .service-list {
      list-style: none;
      font-size: 8pt;
    }
    
    .service-list li {
      padding: 1.5mm 0;
      padding-left: 4mm;
      position: relative;
    }
    
    .service-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      font-weight: bold;
    }
    
    .business-details {
      background: #f9f9f9;
      padding: 5mm;
      margin-bottom: 8mm;
      border-radius: 3px;
    }
    
    .business-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3mm;
    }
    
    .business-field {
      font-size: 8pt;
      padding: 2mm 0;
    }
    
    .business-field .field-label {
      color: #666;
      display: block;
      margin-bottom: 1mm;
    }
    
    .business-field .field-value {
      font-weight: bold;
      font-size: 9pt;
    }
    
    .total-container {
      text-align: right;
      margin-top: 8mm;
    }
    
    .total-line {
      display: flex;
      justify-content: flex-end;
      gap: 10mm;
      margin-bottom: 2mm;
      font-size: 9pt;
    }
    
    .total-final {
      display: flex;
      justify-content: flex-end;
      gap: 10mm;
      padding-top: 3mm;
      border-top: 2px solid #1a1a1a;
      font-size: 14pt;
      font-weight: bold;
    }
    
    .footer-note {
      margin-top: 10mm;
      padding-top: 4mm;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 8pt;
      color: #666;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="letterhead">
    <h1>PRESUPUESTO</h1>
    <div class="subtitle">Servicios Profesionales de Asesoría</div>
  </div>
  
  <div class="doc-info">
    <div>
      <div class="doc-number">Nº {{codigo}}</div>
    </div>
    <div class="doc-date">
      Fecha: {{fecha}}
    </div>
  </div>
  
  <div class="client-box">
    <h2>Datos del Cliente</h2>
    <div class="client-detail">
      <strong>Nombre:</strong> {{nombre_contacto}}
    </div>
    <div class="client-detail">
      <strong>Email:</strong> {{email}}
    </div>
    <div class="client-detail">
      <strong>Teléfono:</strong> {{telefono}}
    </div>
  </div>
  
  <div class="services-block">
    <div class="section-title">Servicios Incluidos</div>
    
    <div class="services-grid">
      <div class="service-category">
        <h4>Servicios Contables</h4>
        <ul class="service-list">
          <li>Contabilidad mensual completa</li>
          <li>Libro diario y mayor</li>
          <li>Balance de situación</li>
          <li>Declaraciones trimestrales IVA</li>
          <li>Modelo 130 - Pago fraccionado IRPF</li>
        </ul>
      </div>
      
      <div class="service-category">
        <h4>Servicios Laborales</h4>
        <ul class="service-list">
          <li>Confección de nóminas</li>
          <li>Seguros Sociales</li>
          <li>Contratos de trabajo</li>
          <li>Modelo 111 - Retenciones</li>
        </ul>
      </div>
    </div>
  </div>
  
  <div class="business-details">
    <div class="business-grid">
      <div class="business-field">
        <span class="field-label">Actividad Profesional</span>
        <span class="field-value">{{actividad}}</span>
      </div>
      <div class="business-field">
        <span class="field-label">Sistema de Tributación</span>
        <span class="field-value">{{sistema_tributacion}}</span>
      </div>
      <div class="business-field">
        <span class="field-label">Facturación Anual Estimada</span>
        <span class="field-value">{{facturacion_anual}}</span>
      </div>
      <div class="business-field">
        <span class="field-label">Número de Facturas/Año</span>
        <span class="field-value">{{num_facturas}}</span>
      </div>
    </div>
  </div>
  
  <div class="total-container">
    <div class="total-line">
      <span>Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div class="total-line">
      <span>IVA (21%):</span>
      <span>{{iva}}</span>
    </div>
    <div class="total-final">
      <span>TOTAL:</span>
      <span>{{total}}</span>
    </div>
  </div>
  
  <div class="footer-note">
    Este presupuesto tiene una validez de 30 días desde su emisión.
    Los servicios se facturarán mensualmente mediante domiciliación bancaria.
  </div>
</body>
</html>
`;

// PLANTILLA 3: MINIMALISTA LIMPIA (1 PÁGINA)
const minimalistaLimpiaHTML = `
<!DOCTYPE html>
<html lang="es">
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
      line-height: 1.5;
      color: #333;
      width: 210mm;
      height: 297mm;
      padding: 18mm;
    }
    
    .top-bar {
      height: 8mm;
      background: #000;
      margin: -18mm -18mm 10mm -18mm;
      padding: 2mm 18mm;
      color: white;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .top-bar-left {
      font-size: 14pt;
      font-weight: bold;
      letter-spacing: 2px;
    }
    
    .top-bar-right {
      font-size: 10pt;
    }
    
    .document-title {
      font-size: 32pt;
      font-weight: 300;
      margin-bottom: 2mm;
      color: #000;
    }
    
    .document-meta {
      font-size: 10pt;
      color: #999;
      margin-bottom: 10mm;
    }
    
    .info-section {
      margin-bottom: 8mm;
    }
    
    .info-label {
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #999;
      margin-bottom: 2mm;
      display: block;
    }
    
    .info-value {
      font-size: 11pt;
      color: #000;
      margin-bottom: 2mm;
    }
    
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6mm;
      margin-bottom: 8mm;
    }
    
    .divider {
      height: 1px;
      background: #ddd;
      margin: 8mm 0;
    }
    
    .services-title {
      font-size: 12pt;
      font-weight: 600;
      margin-bottom: 4mm;
      color: #000;
    }
    
    .service-row {
      display: flex;
      justify-content: space-between;
      padding: 3mm 0;
      border-bottom: 1px solid #f0f0f0;
      font-size: 9pt;
    }
    
    .service-name {
      color: #333;
    }
    
    .service-detail {
      color: #999;
      font-size: 8pt;
    }
    
    .summary-box {
      background: #fafafa;
      padding: 6mm;
      margin-top: 10mm;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2mm 0;
      font-size: 10pt;
    }
    
    .summary-row.total {
      border-top: 2px solid #000;
      margin-top: 3mm;
      padding-top: 3mm;
      font-size: 16pt;
      font-weight: bold;
    }
    
    .bottom-note {
      margin-top: 8mm;
      padding: 4mm;
      background: #f9f9f9;
      border-left: 3px solid #000;
      font-size: 8pt;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="top-bar">
    <div class="top-bar-left">ASESORÍA</div>
    <div class="top-bar-right">{{fecha}}</div>
  </div>
  
  <div class="document-title">Presupuesto</div>
  <div class="document-meta">{{codigo}}</div>
  
  <div class="two-column">
    <div>
      <div class="info-section">
        <span class="info-label">Cliente</span>
        <div class="info-value">{{nombre_contacto}}</div>
      </div>
      <div class="info-section">
        <span class="info-label">Email</span>
        <div class="info-value">{{email}}</div>
      </div>
    </div>
    <div>
      <div class="info-section">
        <span class="info-label">Teléfono</span>
        <div class="info-value">{{telefono}}</div>
      </div>
      <div class="info-section">
        <span class="info-label">Actividad</span>
        <div class="info-value">{{actividad}}</div>
      </div>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="services-title">Servicios</div>
  
  <div class="service-row">
    <div>
      <div class="service-name">Gestión Contable Mensual</div>
      <div class="service-detail">Contabilidad completa y declaraciones trimestrales</div>
    </div>
  </div>
  
  <div class="service-row">
    <div>
      <div class="service-name">Gestión Laboral</div>
      <div class="service-detail">Nóminas y seguros sociales</div>
    </div>
  </div>
  
  <div class="service-row">
    <div>
      <div class="service-name">Asesoramiento Fiscal</div>
      <div class="service-detail">Consultas ilimitadas y gestor personal</div>
    </div>
  </div>
  
  <div class="divider"></div>
  
  <div class="two-column">
    <div class="info-section">
      <span class="info-label">Facturación Anual</span>
      <div class="info-value">{{facturacion_anual}}</div>
    </div>
    <div class="info-section">
      <span class="info-label">Sistema Tributación</span>
      <div class="info-value">{{sistema_tributacion}}</div>
    </div>
  </div>
  
  <div class="summary-box">
    <div class="summary-row">
      <span>Subtotal</span>
      <span>{{subtotal}}</span>
    </div>
    <div class="summary-row">
      <span>IVA (21%)</span>
      <span>{{iva}}</span>
    </div>
    <div class="summary-row total">
      <span>Total Mensual</span>
      <span>{{total}}</span>
    </div>
  </div>
  
  <div class="bottom-note">
    Presupuesto válido 30 días. Servicios mensuales facturados por adelantado.
    Condiciones generales de contratación disponibles en nuestra web.
  </div>
</body>
</html>
`;

async function insertSinglePageTemplates() {
  try {
    console.log('📄 Insertando plantillas de una sola página...\n');
    
    // PLANTILLA 1: Moderna Compacta - LA_LLAVE
    const template1 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Moderna Compacta - Una Página',
        description: 'Diseño moderno con degradado azul, información compacta en una sola página A4',
        type: 'AUTONOMO',
        companyBrand: 'LA_LLAVE',
        htmlContent: modernaCompactaHTML,
        customCss: '', // CSS incluido en el HTML
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: true,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 1 - Moderna Compacta (LA_LLAVE):', template1.id);
    
    // PLANTILLA 2: Moderna Compacta - ONLINE
    const template2 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Moderna Compacta - Una Página',
        description: 'Diseño moderno con degradado azul, información compacta en una sola página A4',
        type: 'AUTONOMO',
        companyBrand: 'GESTORIA_ONLINE',
        htmlContent: modernaCompactaHTML,
        customCss: '',
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: true,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 2 - Moderna Compacta (GESTORIA_ONLINE):', template2.id);
    
    // PLANTILLA 3: Elegante Profesional - LA_LLAVE
    const template3 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Elegante Profesional - Una Página',
        description: 'Diseño clásico y elegante con tipografía serif, ideal para imagen corporativa seria',
        type: 'AUTONOMO',
        companyBrand: 'LA_LLAVE',
        htmlContent: eleganteProfesionalHTML,
        customCss: '',
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: false,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 3 - Elegante Profesional (LA_LLAVE):', template3.id);
    
    // PLANTILLA 4: Elegante Profesional - ONLINE
    const template4 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Elegante Profesional - Una Página',
        description: 'Diseño clásico y elegante con tipografía serif, ideal para imagen corporativa seria',
        type: 'AUTONOMO',
        companyBrand: 'GESTORIA_ONLINE',
        htmlContent: eleganteProfesionalHTML,
        customCss: '',
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: false,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 4 - Elegante Profesional (GESTORIA_ONLINE):', template4.id);
    
    // PLANTILLA 5: Minimalista Limpia - LA_LLAVE
    const template5 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Minimalista Limpia - Una Página',
        description: 'Diseño minimalista ultra limpio con barra superior negra, máxima legibilidad',
        type: 'AUTONOMO',
        companyBrand: 'LA_LLAVE',
        htmlContent: minimalistaLimpiaHTML,
        customCss: '',
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: false,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 5 - Minimalista Limpia (LA_LLAVE):', template5.id);
    
    // PLANTILLA 6: Minimalista Limpia - ONLINE
    const template6 = await prisma.budget_templates.create({
      data: {
        id: nanoid(),
        name: 'Minimalista Limpia - Una Página',
        description: 'Diseño minimalista ultra limpio con barra superior negra, máxima legibilidad',
        type: 'AUTONOMO',
        companyBrand: 'GESTORIA_ONLINE',
        htmlContent: minimalistaLimpiaHTML,
        customCss: '',
        availableVars: JSON.stringify([
          'codigo', 'fecha', 'nombre_contacto', 'email', 'telefono',
          'actividad', 'sistema_tributacion', 'facturacion_anual', 'num_facturas',
          'subtotal', 'iva', 'total', 'observaciones'
        ]),
        isDefault: false,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system'
      }
    });
    console.log('✅ Plantilla 6 - Minimalista Limpia (GESTORIA_ONLINE):', template6.id);
    
    console.log('\n🎉 ¡6 plantillas de una sola página insertadas exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   1. Moderna Compacta (2 versiones) - Predeterminadas ⭐');
    console.log('      • Degradado azul moderno');
    console.log('      • Grid de 3 columnas para servicios');
    console.log('      • Total destacado con sombra');
    console.log('');
    console.log('   2. Elegante Profesional (2 versiones)');
    console.log('      • Tipografía serif clásica');
    console.log('      • Diseño corporativo serio');
    console.log('      • Espacios generosos');
    console.log('');
    console.log('   3. Minimalista Limpia (2 versiones)');
    console.log('      • Barra superior negra');
    console.log('      • Ultra limpio y legible');
    console.log('      • Enfoque en contenido');
    console.log('');
    console.log('💡 Todas las plantillas son de UNA SOLA PÁGINA (210mm x 297mm)');
    console.log('💡 Listas para usar con autónomos');
    console.log('💡 Puedes editarlas desde Documentación > Presupuestos > Plantillas');
    
  } catch (error) {
    console.error('❌ Error al insertar plantillas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

insertSinglePageTemplates();
