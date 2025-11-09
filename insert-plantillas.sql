-- Plantillas base para presupuestos de gestoría
-- Plantilla 1: Asesoría La Llave (Oficial)
-- Plantilla 2: Gestoría Online

-- Eliminar plantillas existentes si las hay
DELETE FROM budget_templates WHERE name IN ('Plantilla Asesoría La Llave - Autónomos', 'Plantilla Gestoría Online - Autónomos');

-- PLANTILLA 1: ASESORÍA LA LLAVE (OFICIAL)
INSERT INTO budget_templates (
  id,
  name,
  description,
  type,
  companyBrand,
  htmlContent,
  availableVars,
  customCss,
  isDefault,
  isActive,
  created_at,
  updated_at
) VALUES (
  UUID(),
  'Plantilla Asesoría La Llave - Autónomos',
  'Plantilla oficial para presupuestos de autónomos con imagen corporativa de Asesoría La Llave',
  'AUTONOMO',
  'LA_LLAVE',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto - Asesoría La Llave</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "Arial", sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background: #f8f9fa;
      padding: 20px;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header { 
      border-bottom: 4px solid #1e40af;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { 
      font-size: 28px; 
      font-weight: bold; 
      color: #1e40af;
      letter-spacing: -0.5px;
    }
    .logo-sub { 
      font-size: 14px; 
      color: #64748b; 
      margin-top: 5px;
    }
    .document-info {
      text-align: right;
    }
    .document-info h1 { 
      color: #1e40af; 
      font-size: 24px;
      margin-bottom: 8px;
    }
    .document-info .code { 
      font-size: 14px; 
      color: #64748b;
      font-weight: 600;
    }
    .document-info .date { 
      font-size: 13px; 
      color: #94a3b8;
      margin-top: 4px;
    }
    .section { 
      margin-bottom: 30px; 
    }
    .section-title { 
      font-size: 18px; 
      font-weight: bold; 
      color: #1e40af;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 15px;
    }
    .info-item label { 
      font-weight: 600; 
      color: #64748b; 
      font-size: 13px;
      display: block;
      margin-bottom: 4px;
    }
    .info-item value { 
      color: #1e293b;
      font-size: 15px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
    }
    thead { 
      background: #1e40af; 
      color: white;
    }
    th { 
      padding: 12px; 
      text-align: left; 
      font-weight: 600;
      font-size: 14px;
    }
    td { 
      padding: 12px; 
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    tbody tr:hover { 
      background: #f1f5f9; 
    }
    .total-section { 
      margin-top: 30px;
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 10px;
      font-size: 15px;
    }
    .total-row.grand-total { 
      font-size: 20px; 
      font-weight: bold; 
      color: #1e40af;
      padding-top: 15px;
      border-top: 2px solid #cbd5e1;
      margin-top: 15px;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }
    .footer-contact { 
      margin-top: 15px;
      display: flex;
      justify-content: center;
      gap: 20px;
    }
    .footer-contact span { 
      display: inline-flex;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">⚖️ ASESORÍA LA LLAVE</div>
        <div class="logo-sub">Tu gestión profesional</div>
      </div>
      <div class="document-info">
        <h1>PRESUPUESTO</h1>
        <div class="code">{{codigo}}</div>
        <div class="date">{{fecha}}</div>
      </div>
    </div>

    <!-- Datos del Cliente -->
    <div class="section">
      <div class="section-title">📋 Datos del Cliente</div>
      <div class="info-grid">
        <div class="info-item">
          <label>Nombre / Razón Social</label>
          <value>{{nombre_contacto}}</value>
        </div>
        <div class="info-item">
          <label>Email</label>
          <value>{{email}}</value>
        </div>
        <div class="info-item">
          <label>Teléfono</label>
          <value>{{telefono}}</value>
        </div>
        <div class="info-item">
          <label>Sistema Tributación</label>
          <value>{{sistema_tributacion}}</value>
        </div>
      </div>
    </div>

    <!-- Datos del Negocio -->
    <div class="section">
      <div class="section-title">💼 Datos del Negocio</div>
      <div class="info-grid">
        <div class="info-item">
          <label>Facturación Anual</label>
          <value>{{facturacion_anual}}</value>
        </div>
        <div class="info-item">
          <label>Nº Facturas</label>
          <value>{{num_facturas}}</value>
        </div>
      </div>
    </div>

    <!-- Servicios Incluidos -->
    <div class="section">
      <div class="section-title">✅ Servicios Incluidos</div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Descripción</th>
            <th style="text-align: right;">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Contabilidad Mensual</td>
            <td>Gestión contable completa</td>
            <td style="text-align: right;">{{precio_contabilidad}}</td>
          </tr>
          <tr>
            <td>Declaraciones Fiscales</td>
            <td>Modelos 303, 111, 130</td>
            <td style="text-align: right;">{{precio_fiscal}}</td>
          </tr>
          <tr>
            <td>Asesoramiento</td>
            <td>Consultas ilimitadas</td>
            <td style="text-align: right;">Incluido</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totales -->
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>{{subtotal}}</span>
      </div>
      <div class="total-row">
        <span>IVA (21%):</span>
        <span>{{iva}}</span>
      </div>
      <div class="total-row grand-total">
        <span>TOTAL:</span>
        <span>{{total}}</span>
      </div>
    </div>

    <!-- Condiciones -->
    <div class="section">
      <div class="section-title">📝 Condiciones</div>
      <p style="font-size: 14px; color: #64748b; line-height: 1.8;">
        • Este presupuesto tiene una validez de 30 días desde la fecha de emisión.<br>
        • Los precios incluyen gestión mensual y asesoramiento continuo.<br>
        • Forma de pago: Domiciliación bancaria mensual.<br>
        • El servicio comenzará una vez firmado el contrato y proporcionada la documentación necesaria.
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong>Asesoría La Llave</strong>
      <div class="footer-contact">
        <span>📧 info@asesorialallav.es</span>
        <span>📞 915 XXX XXX</span>
        <span>📍 Madrid, España</span>
      </div>
      <p style="margin-top: 10px; font-size: 12px;">¡Gracias por confiar en nosotros!</p>
    </div>
  </div>
</body>
</html>',
  '{"codigo":"Código del presupuesto","fecha":"Fecha de emisión","nombre_contacto":"Nombre del cliente","email":"Email del cliente","telefono":"Teléfono del cliente","sistema_tributacion":"Sistema de tributación","facturacion_anual":"Facturación anual","num_facturas":"Número de facturas","precio_contabilidad":"Precio contabilidad","precio_fiscal":"Precio declaraciones","subtotal":"Subtotal sin IVA","iva":"IVA 21%","total":"Total con IVA"}',
  '.header { border-bottom-color: #1e40af; }
.logo { color: #1e40af; }
.section-title { color: #1e40af; border-bottom-color: #e2e8f0; }
thead { background: #1e40af; }
.total-row.grand-total { color: #1e40af; }',
  1,
  1,
  NOW(),
  NOW()
);

-- PLANTILLA 2: GESTORÍA ONLINE
INSERT INTO budget_templates (
  id,
  name,
  description,
  type,
  companyBrand,
  htmlContent,
  availableVars,
  customCss,
  isDefault,
  isActive,
  created_at,
  updated_at
) VALUES (
  UUID(),
  'Plantilla Gestoría Online - Autónomos',
  'Plantilla moderna para presupuestos de autónomos con imagen digital de Gestoría Online',
  'AUTONOMO',
  'GESTORIA_ONLINE',
  '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Presupuesto - Gestoría Online</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #1e293b; 
      background: linear-gradient(135deg, #e0f2fe 0%, #ecfdf5 100%);
      padding: 20px;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background: white; 
      padding: 40px;
      box-shadow: 0 4px 30px rgba(0,0,0,0.1);
      border-radius: 12px;
    }
    .header { 
      background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
      color: white;
      padding: 30px;
      margin: -40px -40px 30px -40px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo { 
      font-size: 32px; 
      font-weight: 700; 
      letter-spacing: -1px;
    }
    .logo-sub { 
      font-size: 15px; 
      opacity: 0.95;
      margin-top: 5px;
      font-weight: 300;
    }
    .document-info {
      text-align: right;
    }
    .document-info h1 { 
      font-size: 28px;
      margin-bottom: 8px;
      font-weight: 700;
    }
    .document-info .code { 
      font-size: 15px; 
      opacity: 0.9;
      font-weight: 500;
    }
    .document-info .date { 
      font-size: 13px; 
      opacity: 0.8;
      margin-top: 4px;
    }
    .section { 
      margin-bottom: 30px; 
    }
    .section-title { 
      font-size: 20px; 
      font-weight: 700; 
      color: #0ea5e9;
      margin-bottom: 18px;
      padding-bottom: 10px;
      border-bottom: 3px solid #e0f2fe;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-icon {
      font-size: 24px;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 18px;
    }
    .info-item { 
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #0ea5e9;
    }
    .info-item label { 
      font-weight: 600; 
      color: #64748b; 
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: block;
      margin-bottom: 6px;
    }
    .info-item value { 
      color: #0f172a;
      font-size: 16px;
      font-weight: 500;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 15px;
      border-radius: 8px;
      overflow: hidden;
    }
    thead { 
      background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
      color: white;
    }
    th { 
      padding: 14px; 
      text-align: left; 
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td { 
      padding: 14px; 
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    tbody tr:nth-child(even) { 
      background: #f8fafc; 
    }
    tbody tr:hover { 
      background: #e0f2fe; 
      transition: background 0.2s;
    }
    .total-section { 
      margin-top: 35px;
      background: linear-gradient(135deg, #f0f9ff 0%, #f0fdfa 100%);
      padding: 25px;
      border-radius: 10px;
      border: 2px solid #e0f2fe;
    }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      margin-bottom: 12px;
      font-size: 16px;
      color: #475569;
    }
    .total-row.grand-total { 
      font-size: 24px; 
      font-weight: 700; 
      background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      padding-top: 18px;
      border-top: 3px solid #cbd5e1;
      margin-top: 18px;
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 25px; 
      border-top: 2px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 13px;
    }
    .footer-contact { 
      margin-top: 18px;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 25px;
    }
    .footer-contact span { 
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
    }
    .badge { 
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div>
        <div class="logo">🌐 GESTORÍA ONLINE</div>
        <div class="logo-sub">Tu gestoría 100% digital</div>
      </div>
      <div class="document-info">
        <h1>PRESUPUESTO</h1>
        <div class="code">{{codigo}}</div>
        <div class="date">{{fecha}}</div>
      </div>
    </div>

    <!-- Datos del Cliente -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">👤</span>
        Datos del Cliente
      </div>
      <div class="info-grid">
        <div class="info-item">
          <label>Nombre / Razón Social</label>
          <value>{{nombre_contacto}}</value>
        </div>
        <div class="info-item">
          <label>Email</label>
          <value>{{email}}</value>
        </div>
        <div class="info-item">
          <label>Teléfono</label>
          <value>{{telefono}}</value>
        </div>
        <div class="info-item">
          <label>Sistema Tributación</label>
          <value>{{sistema_tributacion}}</value>
        </div>
      </div>
    </div>

    <!-- Datos del Negocio -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">💼</span>
        Datos del Negocio
      </div>
      <div class="info-grid">
        <div class="info-item">
          <label>Facturación Anual</label>
          <value>{{facturacion_anual}}</value>
        </div>
        <div class="info-item">
          <label>Nº Facturas</label>
          <value>{{num_facturas}}</value>
        </div>
      </div>
    </div>

    <!-- Servicios Incluidos -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">✅</span>
        Servicios Incluidos
        <span class="badge">100% Digital</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Concepto</th>
            <th>Descripción</th>
            <th style="text-align: right;">Importe</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Contabilidad Online</td>
            <td>Gestión contable digital</td>
            <td style="text-align: right;">{{precio_contabilidad}}</td>
          </tr>
          <tr>
            <td>Declaraciones Digitales</td>
            <td>Modelos 303, 111, 130</td>
            <td style="text-align: right;">{{precio_fiscal}}</td>
          </tr>
          <tr>
            <td>App Móvil</td>
            <td>Acceso 24/7 a tu gestión</td>
            <td style="text-align: right;">Incluido</td>
          </tr>
          <tr>
            <td>Soporte Online</td>
            <td>Chat y videollamadas</td>
            <td style="text-align: right;">Incluido</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Totales -->
    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>{{subtotal}}</span>
      </div>
      <div class="total-row">
        <span>IVA (21%):</span>
        <span>{{iva}}</span>
      </div>
      <div class="total-row grand-total">
        <span>TOTAL MENSUAL:</span>
        <span>{{total}}</span>
      </div>
    </div>

    <!-- Ventajas -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">⚡</span>
        Ventajas Gestoría Online
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #f0f9ff; border-radius: 6px;">
          <span style="font-size: 20px;">✅</span>
          <span style="font-size: 14px; color: #0f172a; font-weight: 500;">Sin desplazamientos</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #f0fdfa; border-radius: 6px;">
          <span style="font-size: 20px;">💰</span>
          <span style="font-size: 14px; color: #0f172a; font-weight: 500;">Precios competitivos</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #f0f9ff; border-radius: 6px;">
          <span style="font-size: 20px;">📱</span>
          <span style="font-size: 14px; color: #0f172a; font-weight: 500;">App móvil incluida</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; padding: 10px; background: #f0fdfa; border-radius: 6px;">
          <span style="font-size: 20px;">⚡</span>
          <span style="font-size: 14px; color: #0f172a; font-weight: 500;">Respuesta rápida</span>
        </div>
      </div>
    </div>

    <!-- Condiciones -->
    <div class="section">
      <div class="section-title">
        <span class="section-icon">📝</span>
        Condiciones
      </div>
      <p style="font-size: 14px; color: #64748b; line-height: 1.9;">
        • Presupuesto válido 30 días • Sin permanencia • Gestión 100% online • Pago mensual domiciliado • Alta inmediata tras firma digital
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <strong style="font-size: 16px; color: #0f172a;">Gestoría Online</strong>
      <div class="footer-contact">
        <span>📧 contacto@gestoriaonline.es</span>
        <span>💬 Chat 24/7</span>
        <span>🌐 www.gestoriaonline.es</span>
      </div>
      <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">¡Tu gestoría de confianza, estés donde estés!</p>
    </div>
  </div>
</body>
</html>',
  '{"codigo":"Código del presupuesto","fecha":"Fecha de emisión","nombre_contacto":"Nombre del cliente","email":"Email del cliente","telefono":"Teléfono del cliente","sistema_tributacion":"Sistema de tributación","facturacion_anual":"Facturación anual","num_facturas":"Número de facturas","precio_contabilidad":"Precio contabilidad","precio_fiscal":"Precio declaraciones","subtotal":"Subtotal sin IVA","iva":"IVA 21%","total":"Total con IVA"}',
  '.header { background: linear-gradient(135deg, #0ea5e9 0%, #10b981 100%); }
.section-title { color: #0ea5e9; border-bottom-color: #e0f2fe; }
.info-item { border-left-color: #0ea5e9; }
thead { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); }
.total-section { background: linear-gradient(135deg, #f0f9ff 0%, #f0fdfa 100%); border-color: #e0f2fe; }
.badge { background: #10b981; }',
  1,
  1,
  NOW(),
  NOW()
);
