import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

const BASU_STYLE_TEMPLATES = [
  {
    id: nanoid(),
    name: 'BASU Profesional - La Llave',
    description: 'Plantilla estilo BASU original con diseño profesional, dos columnas, checkmarks y resumen financiero',
    type: 'AUTONOMO' as const,
    companyBrand: 'LA_LLAVE',
    htmlContent: `
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
      border-bottom: 2px solid #1565C0;
      padding-bottom: 10px;
    }
    
    .header-logo {
      flex: 0 0 100px;
    }
    
    .header-logo img {
      max-width: 100px;
      max-height: 60px;
    }
    
    .header-title {
      flex: 1;
      text-align: right;
      padding-left: 10px;
    }
    
    .header-title h1 {
      font-size: 20pt;
      color: #1565C0;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header-title .subtitle {
      font-size: 11pt;
      color: #555;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #1565C0;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    
    .client-data {
      margin-bottom: 12px;
    }
    
    .client-data table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .client-data td {
      padding: 3px 8px;
      font-size: 9pt;
    }
    
    .client-data td:first-child {
      font-weight: bold;
      width: 80px;
    }
    
    .two-columns {
      display: flex;
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .column {
      flex: 1;
    }
    
    .service-list {
      margin-top: 6px;
    }
    
    .service-item {
      display: flex;
      align-items: center;
      padding: 2px 0;
      font-size: 9pt;
    }
    
    .service-item .checkbox {
      width: 20px;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .checkbox.checked {
      color: #2E7D32;
    }
    
    .checkbox.unchecked {
      color: #C62828;
    }
    
    .service-item .text {
      flex: 1;
    }
    
    .workers-count {
      font-size: 10pt;
      font-weight: bold;
      margin: 6px 0;
    }
    
    .adicionales-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8pt;
    }
    
    .adicionales-table th {
      text-align: left;
      font-weight: bold;
      font-size: 9pt;
      padding: 3px 5px;
      border-bottom: 1px solid #ddd;
    }
    
    .adicionales-table th.price {
      text-align: right;
    }
    
    .adicionales-table td {
      padding: 2px 5px;
    }
    
    .adicionales-table td.price {
      text-align: right;
    }
    
    .resumen-financiero {
      float: right;
      width: 350px;
      margin-top: 15px;
      margin-bottom: 12px;
    }
    
    .resumen-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      color: #1565C0;
      margin-bottom: 6px;
    }
    
    .resumen-table {
      width: 100%;
      border: 1px solid #E0E0E0;
      border-collapse: collapse;
    }
    
    .resumen-table thead {
      background: #1565C0;
      color: white;
    }
    
    .resumen-table th,
    .resumen-table td {
      padding: 5px 8px;
      font-size: 9pt;
    }
    
    .resumen-table th {
      font-weight: bold;
    }
    
    .resumen-table th.price,
    .resumen-table td.price {
      text-align: right;
    }
    
    .resumen-table tbody tr:nth-child(odd) {
      background: #FAFAFA;
    }
    
    .resumen-table .total-row {
      background: #E0E0E0 !important;
      font-weight: bold;
      font-size: 11pt;
    }
    
    .resumen-table .discount-row {
      color: #C62828;
    }
    
    .resumen-table .puntuales-row {
      font-size: 8pt;
      color: #757575;
    }
    
    .notas {
      clear: both;
      border: 1px solid #E0E0E0;
      padding: 10px;
      margin-top: 12px;
      font-size: 7.5pt;
      line-height: 1.3;
    }
    
    .notas-title {
      font-weight: bold;
      font-size: 9pt;
      color: #1565C0;
      margin-bottom: 4px;
    }
    
    .notas p {
      margin: 2px 0;
    }
    
    .footer {
      position: fixed;
      bottom: 30px;
      left: 40px;
      right: 40px;
      text-align: center;
      font-size: 7pt;
      line-height: 1.3;
      border-top: 1px solid #E0E0E0;
      padding-top: 5px;
    }
    
    .footer .company-name {
      font-weight: bold;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <!-- ENCABEZADO -->
  <div class="header">
    <div class="header-logo">
      {{#LOGO_URL}}
      <img src="{{LOGO_URL}}" alt="Logo">
      {{/LOGO_URL}}
    </div>
    <div class="header-title">
      <h1>PRESUPUESTO PARA AUTÓNOMOS</h1>
      <div class="subtitle">Nº {{NUMERO}} - {{FECHA}}</div>
    </div>
  </div>
  
  <!-- DATOS DEL CLIENTE -->
  <div class="client-data">
    <div class="section-title">DATOS DEL CLIENTE</div>
    <table>
      <tr>
        <td>Empresa:</td>
        <td>{{NOMBRE_CLIENTE}}</td>
      </tr>
      {{#NIF_CIF}}
      <tr>
        <td>NIF/CIF:</td>
        <td>{{NIF_CIF}}</td>
      </tr>
      {{/NIF_CIF}}
      {{#PERSONA_CONTACTO}}
      <tr>
        <td>Contacto:</td>
        <td>{{PERSONA_CONTACTO}}</td>
      </tr>
      {{/PERSONA_CONTACTO}}
      {{#EMAIL}}
      <tr>
        <td>Email:</td>
        <td>{{EMAIL}}</td>
      </tr>
      {{/EMAIL}}
      {{#TELEFONO}}
      <tr>
        <td>Teléfono:</td>
        <td>{{TELEFONO}}</td>
      </tr>
      {{/TELEFONO}}
      {{#ACTIVIDAD}}
      <tr>
        <td>Actividad:</td>
        <td>{{ACTIVIDAD}}</td>
      </tr>
      {{/ACTIVIDAD}}
    </table>
  </div>
  
  <!-- DOS COLUMNAS: CONTABILIDAD Y LABORAL -->
  <div class="two-columns">
    <!-- COLUMNA IZQUIERDA: CONTABILIDAD/FISCAL -->
    <div class="column">
      <div class="section-title">CONTABILIDAD/FISCAL</div>
      <div class="service-list">
        <div class="service-item">
          <span class="checkbox {{#FACTURAS_MES}}checked{{/FACTURAS_MES}}{{^FACTURAS_MES}}unchecked{{/FACTURAS_MES}}">
            {{#FACTURAS_MES}}✓{{/FACTURAS_MES}}{{^FACTURAS_MES}}✗{{/FACTURAS_MES}}
          </span>
          <span class="text">Facturas/mes: {{FACTURAS_MES}}</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#FACTURACION}}checked{{/FACTURACION}}{{^FACTURACION}}unchecked{{/FACTURACION}}">
            {{#FACTURACION}}✓{{/FACTURACION}}{{^FACTURACION}}✗{{/FACTURACION}}
          </span>
          <span class="text">Facturación anual: {{FACTURACION}}</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_303}}checked{{/MODELO_303}}{{^MODELO_303}}unchecked{{/MODELO_303}}">
            {{#MODELO_303}}✓{{/MODELO_303}}{{^MODELO_303}}✗{{/MODELO_303}}
          </span>
          <span class="text">Modelo 303/390 - IVA</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_349}}checked{{/MODELO_349}}{{^MODELO_349}}unchecked{{/MODELO_349}}">
            {{#MODELO_349}}✓{{/MODELO_349}}{{^MODELO_349}}✗{{/MODELO_349}}
          </span>
          <span class="text">Modelo 349 - Operaciones Intracomunitarias</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_111}}checked{{/MODELO_111}}{{^MODELO_111}}unchecked{{/MODELO_111}}">
            {{#MODELO_111}}✓{{/MODELO_111}}{{^MODELO_111}}✗{{/MODELO_111}}
          </span>
          <span class="text">Modelo 111/190 - IRPF Profesionales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_115}}checked{{/MODELO_115}}{{^MODELO_115}}unchecked{{/MODELO_115}}">
            {{#MODELO_115}}✓{{/MODELO_115}}{{^MODELO_115}}✗{{/MODELO_115}}
          </span>
          <span class="text">Modelo 115/180 - IRPF Alquileres</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_130}}checked{{/MODELO_130}}{{^MODELO_130}}unchecked{{/MODELO_130}}">
            {{#MODELO_130}}✓{{/MODELO_130}}{{^MODELO_130}}✗{{/MODELO_130}}
          </span>
          <span class="text">Modelo 130/131 - IRPF Actividad</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_100}}checked{{/MODELO_100}}{{^MODELO_100}}unchecked{{/MODELO_100}}">
            {{#MODELO_100}}✓{{/MODELO_100}}{{^MODELO_100}}✗{{/MODELO_100}}
          </span>
          <span class="text">Modelo 100 - Declaración Renta</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#SOLICITUD_CERTIFICADOS}}checked{{/SOLICITUD_CERTIFICADOS}}{{^SOLICITUD_CERTIFICADOS}}unchecked{{/SOLICITUD_CERTIFICADOS}}">
            {{#SOLICITUD_CERTIFICADOS}}✓{{/SOLICITUD_CERTIFICADOS}}{{^SOLICITUD_CERTIFICADOS}}✗{{/SOLICITUD_CERTIFICADOS}}
          </span>
          <span class="text">Solicitud Certificados AEAT</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#CENSOS_AEAT}}checked{{/CENSOS_AEAT}}{{^CENSOS_AEAT}}unchecked{{/CENSOS_AEAT}}">
            {{#CENSOS_AEAT}}✓{{/CENSOS_AEAT}}{{^CENSOS_AEAT}}✗{{/CENSOS_AEAT}}
          </span>
          <span class="text">Censos AEAT (Mod. 036/037)</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#RECEPCION_NOTIFICACIONES}}checked{{/RECEPCION_NOTIFICACIONES}}{{^RECEPCION_NOTIFICACIONES}}unchecked{{/RECEPCION_NOTIFICACIONES}}">
            {{#RECEPCION_NOTIFICACIONES}}✓{{/RECEPCION_NOTIFICACIONES}}{{^RECEPCION_NOTIFICACIONES}}✗{{/RECEPCION_NOTIFICACIONES}}
          </span>
          <span class="text">Recepción Notificaciones AEAT</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#ESTADISTICAS_INE}}checked{{/ESTADISTICAS_INE}}{{^ESTADISTICAS_INE}}unchecked{{/ESTADISTICAS_INE}}">
            {{#ESTADISTICAS_INE}}✓{{/ESTADISTICAS_INE}}{{^ESTADISTICAS_INE}}✗{{/ESTADISTICAS_INE}}
          </span>
          <span class="text">Estadísticas INE</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#SOLICITUD_AYUDAS}}checked{{/SOLICITUD_AYUDAS}}{{^SOLICITUD_AYUDAS}}unchecked{{/SOLICITUD_AYUDAS}}">
            {{#SOLICITUD_AYUDAS}}✓{{/SOLICITUD_AYUDAS}}{{^SOLICITUD_AYUDAS}}✗{{/SOLICITUD_AYUDAS}}
          </span>
          <span class="text">Solicitud de Ayudas</span>
        </div>
      </div>
    </div>
    
    <!-- COLUMNA DERECHA: LABORAL (si aplica) -->
    {{#CON_LABORAL}}
    <div class="column">
      <div class="section-title">LABORAL/SEGURIDAD SOCIAL</div>
      <div class="workers-count">Número de Trabajadores: {{NOMINAS_MES}}</div>
      
      <div class="service-list">
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Contratos Laborales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Finiquitos</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Presentación Seguros Sociales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Modelo 111/190 IRPF Trabajadores</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Recepción Notificaciones Seg. Social</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Gestión de I.T.</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox unchecked">✗</span>
          <span class="text">SMAC / Demandas Judiciales</span>
        </div>
      </div>
    </div>
    {{/CON_LABORAL}}
  </div>
  
  <!-- SERVICIOS ADICIONALES (si existen) -->
  {{#HAS_SERVICIOS_MENSUALES}}
  <div class="two-columns">
    <div class="column">
      <div class="section-title">SERVICIOS ADICIONALES (MENSUALES)</div>
      <table class="adicionales-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="price">Precio</th>
          </tr>
        </thead>
        <tbody>
          {{#SERVICIOS_MENSUALES}}
          <tr>
            <td>• {{nombre}}</td>
            <td class="price">{{precio}}</td>
          </tr>
          {{/SERVICIOS_MENSUALES}}
        </tbody>
      </table>
    </div>
    
    {{#HAS_SERVICIOS_PUNTUALES}}
    <div class="column">
      <div class="section-title">SERVICIOS PUNTUALES</div>
      <table class="adicionales-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="price">Precio</th>
          </tr>
        </thead>
        <tbody>
          {{#SERVICIOS_PUNTUALES}}
          <tr>
            <td>• {{nombre}}</td>
            <td class="price">{{precio}}</td>
          </tr>
          {{/SERVICIOS_PUNTUALES}}
        </tbody>
      </table>
    </div>
    {{/HAS_SERVICIOS_PUNTUALES}}
  </div>
  {{/HAS_SERVICIOS_MENSUALES}}
  
  <!-- RESUMEN FINANCIERO -->
  <div class="resumen-financiero">
    <div class="resumen-title">RESUMEN FINANCIERO</div>
    <table class="resumen-table">
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="price">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Contabilidad</td>
          <td class="price">{{TOTAL_CONTA}}</td>
        </tr>
        {{#CON_LABORAL}}
        <tr>
          <td>Total Laboral ({{NOMINAS_MES}} trab.)</td>
          <td class="price">{{TOTAL_LABORAL}}</td>
        </tr>
        {{/CON_LABORAL}}
        {{#HAS_SERVICIOS_MENSUALES}}
        <tr>
          <td>Total Servicios Mensuales</td>
          <td class="price">{{TOTAL_SERVICIOS_MENSUALES}}</td>
        </tr>
        {{/HAS_SERVICIOS_MENSUALES}}
        {{#APLICA_DESCUENTO}}
        <tr class="discount-row">
          <td>Descuento</td>
          <td class="price">-{{DESCUENTO_CALCULADO}}</td>
        </tr>
        {{/APLICA_DESCUENTO}}
        <tr class="total-row">
          <td>TOTAL</td>
          <td class="price">{{TOTAL}}</td>
        </tr>
        {{#HAS_SERVICIOS_PUNTUALES}}
        <tr class="puntuales-row">
          <td>Servicios Puntuales</td>
          <td class="price">{{TOTAL_SERVICIOS_PUNTUALES}}</td>
        </tr>
        {{/HAS_SERVICIOS_PUNTUALES}}
      </tbody>
    </table>
  </div>
  
  <!-- NOTAS Y CONDICIONES -->
  <div class="notas">
    <div class="notas-title">NOTAS Y CONDICIONES</div>
    <p>1. Todos los precios de este presupuesto NO incluyen IVA.</p>
    <p>2. Este presupuesto tiene una validez de 30 días a partir de la fecha de emisión.</p>
    <p>3. En caso de necesitar los servicios no incluidos, serán facturados mensualmente.</p>
    <p>4. Los precios se revisarán al final de cada año, incrementándose como mínimo el IPC, si no cambia de tramo de facturación.</p>
    <p>5. Periodo de facturación: días 20 de cada mes.</p>
    <p>6. SIN compromiso de PERMANENCIA.</p>
  </div>
  
  <!-- FOOTER -->
  <div class="footer">
    <div class="company-name">{{EMPRESA_NOMBRE}}</div>
    <div>CIF: {{EMPRESA_NIF}} - Tel: {{EMPRESA_TELEFONO}} - {{EMPRESA_EMAIL}}</div>
    <div>{{EMPRESA_DIRECCION}} - {{EMPRESA_CP}} {{EMPRESA_LOCALIDAD}} - {{EMPRESA_PROVINCIA}}</div>
  </div>
</body>
</html>
    `,
    availableVars: JSON.stringify([
      'LOGO_URL',
      'NUMERO',
      'FECHA',
      'NOMBRE_CLIENTE',
      'NIF_CIF',
      'PERSONA_CONTACTO',
      'EMAIL',
      'TELEFONO',
      'ACTIVIDAD',
      'FACTURAS_MES',
      'FACTURACION',
      'MODELO_303',
      'MODELO_349',
      'MODELO_111',
      'MODELO_115',
      'MODELO_130',
      'MODELO_100',
      'SOLICITUD_CERTIFICADOS',
      'CENSOS_AEAT',
      'RECEPCION_NOTIFICACIONES',
      'ESTADISTICAS_INE',
      'SOLICITUD_AYUDAS',
      'CON_LABORAL',
      'NOMINAS_MES',
      'HAS_SERVICIOS_MENSUALES',
      'SERVICIOS_MENSUALES',
      'HAS_SERVICIOS_PUNTUALES',
      'SERVICIOS_PUNTUALES',
      'TOTAL_CONTA',
      'TOTAL_LABORAL',
      'TOTAL_SERVICIOS_MENSUALES',
      'APLICA_DESCUENTO',
      'DESCUENTO_CALCULADO',
      'TOTAL',
      'TOTAL_SERVICIOS_PUNTUALES',
      'EMPRESA_NOMBRE',
      'EMPRESA_NIF',
      'EMPRESA_TELEFONO',
      'EMPRESA_EMAIL',
      'EMPRESA_DIRECCION',
      'EMPRESA_CP',
      'EMPRESA_LOCALIDAD',
      'EMPRESA_PROVINCIA'
    ]),
    customCss: null,
    isActive: true,
    isDefault: false,
    createdBy: null,
    updatedBy: null,
  },
  {
    id: nanoid(),
    name: 'BASU Profesional - Gestoría Online',
    description: 'Plantilla estilo BASU original con diseño profesional, dos columnas, checkmarks y resumen financiero',
    type: 'AUTONOMO' as const,
    companyBrand: 'GESTORIA_ONLINE',
    htmlContent: `
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
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 15px;
      border-bottom: 2px solid #00796B;
      padding-bottom: 10px;
    }
    
    .header-logo {
      flex: 0 0 100px;
    }
    
    .header-logo img {
      max-width: 100px;
      max-height: 60px;
    }
    
    .header-title {
      flex: 1;
      text-align: right;
      padding-left: 10px;
    }
    
    .header-title h1 {
      font-size: 20pt;
      color: #00796B;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .header-title .subtitle {
      font-size: 11pt;
      color: #555;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #00796B;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    
    .client-data {
      margin-bottom: 12px;
    }
    
    .client-data table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .client-data td {
      padding: 3px 8px;
      font-size: 9pt;
    }
    
    .client-data td:first-child {
      font-weight: bold;
      width: 80px;
    }
    
    .two-columns {
      display: flex;
      gap: 15px;
      margin-bottom: 12px;
    }
    
    .column {
      flex: 1;
    }
    
    .service-list {
      margin-top: 6px;
    }
    
    .service-item {
      display: flex;
      align-items: center;
      padding: 2px 0;
      font-size: 9pt;
    }
    
    .service-item .checkbox {
      width: 20px;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .checkbox.checked {
      color: #2E7D32;
    }
    
    .checkbox.unchecked {
      color: #C62828;
    }
    
    .service-item .text {
      flex: 1;
    }
    
    .workers-count {
      font-size: 10pt;
      font-weight: bold;
      margin: 6px 0;
    }
    
    .adicionales-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8pt;
    }
    
    .adicionales-table th {
      text-align: left;
      font-weight: bold;
      font-size: 9pt;
      padding: 3px 5px;
      border-bottom: 1px solid #ddd;
    }
    
    .adicionales-table th.price {
      text-align: right;
    }
    
    .adicionales-table td {
      padding: 2px 5px;
    }
    
    .adicionales-table td.price {
      text-align: right;
    }
    
    .resumen-financiero {
      float: right;
      width: 350px;
      margin-top: 15px;
      margin-bottom: 12px;
    }
    
    .resumen-title {
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
      color: #00796B;
      margin-bottom: 6px;
    }
    
    .resumen-table {
      width: 100%;
      border: 1px solid #E0E0E0;
      border-collapse: collapse;
    }
    
    .resumen-table thead {
      background: #00796B;
      color: white;
    }
    
    .resumen-table th,
    .resumen-table td {
      padding: 5px 8px;
      font-size: 9pt;
    }
    
    .resumen-table th {
      font-weight: bold;
    }
    
    .resumen-table th.price,
    .resumen-table td.price {
      text-align: right;
    }
    
    .resumen-table tbody tr:nth-child(odd) {
      background: #FAFAFA;
    }
    
    .resumen-table .total-row {
      background: #E0E0E0 !important;
      font-weight: bold;
      font-size: 11pt;
    }
    
    .resumen-table .discount-row {
      color: #C62828;
    }
    
    .resumen-table .puntuales-row {
      font-size: 8pt;
      color: #757575;
    }
    
    .notas {
      clear: both;
      border: 1px solid #E0E0E0;
      padding: 10px;
      margin-top: 12px;
      font-size: 7.5pt;
      line-height: 1.3;
    }
    
    .notas-title {
      font-weight: bold;
      font-size: 9pt;
      color: #00796B;
      margin-bottom: 4px;
    }
    
    .notas p {
      margin: 2px 0;
    }
    
    .footer {
      position: fixed;
      bottom: 30px;
      left: 40px;
      right: 40px;
      text-align: center;
      font-size: 7pt;
      line-height: 1.3;
      border-top: 1px solid #E0E0E0;
      padding-top: 5px;
    }
    
    .footer .company-name {
      font-weight: bold;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <!-- ENCABEZADO -->
  <div class="header">
    <div class="header-logo">
      {{#LOGO_URL}}
      <img src="{{LOGO_URL}}" alt="Logo">
      {{/LOGO_URL}}
    </div>
    <div class="header-title">
      <h1>PRESUPUESTO PARA AUTÓNOMOS</h1>
      <div class="subtitle">Nº {{NUMERO}} - {{FECHA}}</div>
    </div>
  </div>
  
  <!-- DATOS DEL CLIENTE -->
  <div class="client-data">
    <div class="section-title">DATOS DEL CLIENTE</div>
    <table>
      <tr>
        <td>Empresa:</td>
        <td>{{NOMBRE_CLIENTE}}</td>
      </tr>
      {{#NIF_CIF}}
      <tr>
        <td>NIF/CIF:</td>
        <td>{{NIF_CIF}}</td>
      </tr>
      {{/NIF_CIF}}
      {{#PERSONA_CONTACTO}}
      <tr>
        <td>Contacto:</td>
        <td>{{PERSONA_CONTACTO}}</td>
      </tr>
      {{/PERSONA_CONTACTO}}
      {{#EMAIL}}
      <tr>
        <td>Email:</td>
        <td>{{EMAIL}}</td>
      </tr>
      {{/EMAIL}}
      {{#TELEFONO}}
      <tr>
        <td>Teléfono:</td>
        <td>{{TELEFONO}}</td>
      </tr>
      {{/TELEFONO}}
      {{#ACTIVIDAD}}
      <tr>
        <td>Actividad:</td>
        <td>{{ACTIVIDAD}}</td>
      </tr>
      {{/ACTIVIDAD}}
    </table>
  </div>
  
  <!-- DOS COLUMNAS: CONTABILIDAD Y LABORAL -->
  <div class="two-columns">
    <!-- COLUMNA IZQUIERDA: CONTABILIDAD/FISCAL -->
    <div class="column">
      <div class="section-title">CONTABILIDAD/FISCAL</div>
      <div class="service-list">
        <div class="service-item">
          <span class="checkbox {{#FACTURAS_MES}}checked{{/FACTURAS_MES}}{{^FACTURAS_MES}}unchecked{{/FACTURAS_MES}}">
            {{#FACTURAS_MES}}✓{{/FACTURAS_MES}}{{^FACTURAS_MES}}✗{{/FACTURAS_MES}}
          </span>
          <span class="text">Facturas/mes: {{FACTURAS_MES}}</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#FACTURACION}}checked{{/FACTURACION}}{{^FACTURACION}}unchecked{{/FACTURACION}}">
            {{#FACTURACION}}✓{{/FACTURACION}}{{^FACTURACION}}✗{{/FACTURACION}}
          </span>
          <span class="text">Facturación anual: {{FACTURACION}}</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_303}}checked{{/MODELO_303}}{{^MODELO_303}}unchecked{{/MODELO_303}}">
            {{#MODELO_303}}✓{{/MODELO_303}}{{^MODELO_303}}✗{{/MODELO_303}}
          </span>
          <span class="text">Modelo 303/390 - IVA</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_349}}checked{{/MODELO_349}}{{^MODELO_349}}unchecked{{/MODELO_349}}">
            {{#MODELO_349}}✓{{/MODELO_349}}{{^MODELO_349}}✗{{/MODELO_349}}
          </span>
          <span class="text">Modelo 349 - Operaciones Intracomunitarias</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_111}}checked{{/MODELO_111}}{{^MODELO_111}}unchecked{{/MODELO_111}}">
            {{#MODELO_111}}✓{{/MODELO_111}}{{^MODELO_111}}✗{{/MODELO_111}}
          </span>
          <span class="text">Modelo 111/190 - IRPF Profesionales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_115}}checked{{/MODELO_115}}{{^MODELO_115}}unchecked{{/MODELO_115}}">
            {{#MODELO_115}}✓{{/MODELO_115}}{{^MODELO_115}}✗{{/MODELO_115}}
          </span>
          <span class="text">Modelo 115/180 - IRPF Alquileres</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_130}}checked{{/MODELO_130}}{{^MODELO_130}}unchecked{{/MODELO_130}}">
            {{#MODELO_130}}✓{{/MODELO_130}}{{^MODELO_130}}✗{{/MODELO_130}}
          </span>
          <span class="text">Modelo 130/131 - IRPF Actividad</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#MODELO_100}}checked{{/MODELO_100}}{{^MODELO_100}}unchecked{{/MODELO_100}}">
            {{#MODELO_100}}✓{{/MODELO_100}}{{^MODELO_100}}✗{{/MODELO_100}}
          </span>
          <span class="text">Modelo 100 - Declaración Renta</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#SOLICITUD_CERTIFICADOS}}checked{{/SOLICITUD_CERTIFICADOS}}{{^SOLICITUD_CERTIFICADOS}}unchecked{{/SOLICITUD_CERTIFICADOS}}">
            {{#SOLICITUD_CERTIFICADOS}}✓{{/SOLICITUD_CERTIFICADOS}}{{^SOLICITUD_CERTIFICADOS}}✗{{/SOLICITUD_CERTIFICADOS}}
          </span>
          <span class="text">Solicitud Certificados AEAT</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#CENSOS_AEAT}}checked{{/CENSOS_AEAT}}{{^CENSOS_AEAT}}unchecked{{/CENSOS_AEAT}}">
            {{#CENSOS_AEAT}}✓{{/CENSOS_AEAT}}{{^CENSOS_AEAT}}✗{{/CENSOS_AEAT}}
          </span>
          <span class="text">Censos AEAT (Mod. 036/037)</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#RECEPCION_NOTIFICACIONES}}checked{{/RECEPCION_NOTIFICACIONES}}{{^RECEPCION_NOTIFICACIONES}}unchecked{{/RECEPCION_NOTIFICACIONES}}">
            {{#RECEPCION_NOTIFICACIONES}}✓{{/RECEPCION_NOTIFICACIONES}}{{^RECEPCION_NOTIFICACIONES}}✗{{/RECEPCION_NOTIFICACIONES}}
          </span>
          <span class="text">Recepción Notificaciones AEAT</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#ESTADISTICAS_INE}}checked{{/ESTADISTICAS_INE}}{{^ESTADISTICAS_INE}}unchecked{{/ESTADISTICAS_INE}}">
            {{#ESTADISTICAS_INE}}✓{{/ESTADISTICAS_INE}}{{^ESTADISTICAS_INE}}✗{{/ESTADISTICAS_INE}}
          </span>
          <span class="text">Estadísticas INE</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox {{#SOLICITUD_AYUDAS}}checked{{/SOLICITUD_AYUDAS}}{{^SOLICITUD_AYUDAS}}unchecked{{/SOLICITUD_AYUDAS}}">
            {{#SOLICITUD_AYUDAS}}✓{{/SOLICITUD_AYUDAS}}{{^SOLICITUD_AYUDAS}}✗{{/SOLICITUD_AYUDAS}}
          </span>
          <span class="text">Solicitud de Ayudas</span>
        </div>
      </div>
    </div>
    
    <!-- COLUMNA DERECHA: LABORAL (si aplica) -->
    {{#CON_LABORAL}}
    <div class="column">
      <div class="section-title">LABORAL/SEGURIDAD SOCIAL</div>
      <div class="workers-count">Número de Trabajadores: {{NOMINAS_MES}}</div>
      
      <div class="service-list">
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Contratos Laborales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Finiquitos</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Presentación Seguros Sociales</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Modelo 111/190 IRPF Trabajadores</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Recepción Notificaciones Seg. Social</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox checked">✓</span>
          <span class="text">Gestión de I.T.</span>
        </div>
        
        <div class="service-item">
          <span class="checkbox unchecked">✗</span>
          <span class="text">SMAC / Demandas Judiciales</span>
        </div>
      </div>
    </div>
    {{/CON_LABORAL}}
  </div>
  
  <!-- SERVICIOS ADICIONALES (si existen) -->
  {{#HAS_SERVICIOS_MENSUALES}}
  <div class="two-columns">
    <div class="column">
      <div class="section-title">SERVICIOS ADICIONALES (MENSUALES)</div>
      <table class="adicionales-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="price">Precio</th>
          </tr>
        </thead>
        <tbody>
          {{#SERVICIOS_MENSUALES}}
          <tr>
            <td>• {{nombre}}</td>
            <td class="price">{{precio}}</td>
          </tr>
          {{/SERVICIOS_MENSUALES}}
        </tbody>
      </table>
    </div>
    
    {{#HAS_SERVICIOS_PUNTUALES}}
    <div class="column">
      <div class="section-title">SERVICIOS PUNTUALES</div>
      <table class="adicionales-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th class="price">Precio</th>
          </tr>
        </thead>
        <tbody>
          {{#SERVICIOS_PUNTUALES}}
          <tr>
            <td>• {{nombre}}</td>
            <td class="price">{{precio}}</td>
          </tr>
          {{/SERVICIOS_PUNTUALES}}
        </tbody>
      </table>
    </div>
    {{/HAS_SERVICIOS_PUNTUALES}}
  </div>
  {{/HAS_SERVICIOS_MENSUALES}}
  
  <!-- RESUMEN FINANCIERO -->
  <div class="resumen-financiero">
    <div class="resumen-title">RESUMEN FINANCIERO</div>
    <table class="resumen-table">
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="price">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Total Contabilidad</td>
          <td class="price">{{TOTAL_CONTA}}</td>
        </tr>
        {{#CON_LABORAL}}
        <tr>
          <td>Total Laboral ({{NOMINAS_MES}} trab.)</td>
          <td class="price">{{TOTAL_LABORAL}}</td>
        </tr>
        {{/CON_LABORAL}}
        {{#HAS_SERVICIOS_MENSUALES}}
        <tr>
          <td>Total Servicios Mensuales</td>
          <td class="price">{{TOTAL_SERVICIOS_MENSUALES}}</td>
        </tr>
        {{/HAS_SERVICIOS_MENSUALES}}
        {{#APLICA_DESCUENTO}}
        <tr class="discount-row">
          <td>Descuento</td>
          <td class="price">-{{DESCUENTO_CALCULADO}}</td>
        </tr>
        {{/APLICA_DESCUENTO}}
        <tr class="total-row">
          <td>TOTAL</td>
          <td class="price">{{TOTAL}}</td>
        </tr>
        {{#HAS_SERVICIOS_PUNTUALES}}
        <tr class="puntuales-row">
          <td>Servicios Puntuales</td>
          <td class="price">{{TOTAL_SERVICIOS_PUNTUALES}}</td>
        </tr>
        {{/HAS_SERVICIOS_PUNTUALES}}
      </tbody>
    </table>
  </div>
  
  <!-- NOTAS Y CONDICIONES -->
  <div class="notas">
    <div class="notas-title">NOTAS Y CONDICIONES</div>
    <p>1. Todos los precios de este presupuesto NO incluyen IVA.</p>
    <p>2. Este presupuesto tiene una validez de 30 días a partir de la fecha de emisión.</p>
    <p>3. En caso de necesitar los servicios no incluidos, serán facturados mensualmente.</p>
    <p>4. Los precios se revisarán al final de cada año, incrementándose como mínimo el IPC, si no cambia de tramo de facturación.</p>
    <p>5. Periodo de facturación: días 20 de cada mes.</p>
    <p>6. SIN compromiso de PERMANENCIA.</p>
  </div>
  
  <!-- FOOTER -->
  <div class="footer">
    <div class="company-name">{{EMPRESA_NOMBRE}}</div>
    <div>CIF: {{EMPRESA_NIF}} - Tel: {{EMPRESA_TELEFONO}} - {{EMPRESA_EMAIL}}</div>
    <div>{{EMPRESA_DIRECCION}} - {{EMPRESA_CP}} {{EMPRESA_LOCALIDAD}} - {{EMPRESA_PROVINCIA}}</div>
  </div>
</body>
</html>
    `,
    availableVars: JSON.stringify([
      'LOGO_URL',
      'NUMERO',
      'FECHA',
      'NOMBRE_CLIENTE',
      'NIF_CIF',
      'PERSONA_CONTACTO',
      'EMAIL',
      'TELEFONO',
      'ACTIVIDAD',
      'FACTURAS_MES',
      'FACTURACION',
      'MODELO_303',
      'MODELO_349',
      'MODELO_111',
      'MODELO_115',
      'MODELO_130',
      'MODELO_100',
      'SOLICITUD_CERTIFICADOS',
      'CENSOS_AEAT',
      'RECEPCION_NOTIFICACIONES',
      'ESTADISTICAS_INE',
      'SOLICITUD_AYUDAS',
      'CON_LABORAL',
      'NOMINAS_MES',
      'HAS_SERVICIOS_MENSUALES',
      'SERVICIOS_MENSUALES',
      'HAS_SERVICIOS_PUNTUALES',
      'SERVICIOS_PUNTUALES',
      'TOTAL_CONTA',
      'TOTAL_LABORAL',
      'TOTAL_SERVICIOS_MENSUALES',
      'APLICA_DESCUENTO',
      'DESCUENTO_CALCULADO',
      'TOTAL',
      'TOTAL_SERVICIOS_PUNTUALES',
      'EMPRESA_NOMBRE',
      'EMPRESA_NIF',
      'EMPRESA_TELEFONO',
      'EMPRESA_EMAIL',
      'EMPRESA_DIRECCION',
      'EMPRESA_CP',
      'EMPRESA_LOCALIDAD',
      'EMPRESA_PROVINCIA'
    ]),
    customCss: null,
    isActive: true,
    isDefault: false,
    createdBy: null,
    updatedBy: null,
  }
];

async function main() {
  console.log('🎨 Insertando plantillas estilo BASU...\n');

  try {
    for (const template of BASU_STYLE_TEMPLATES) {
      console.log(`📝 Insertando: ${template.name}`);
      
      await prisma.budget_templates.create({
        data: template
      });
      
      console.log(`✅ ${template.name} insertada con ID: ${template.id}\n`);
    }

    console.log('🎉 ¡Todas las plantillas estilo BASU insertadas exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`- Total plantillas: ${BASU_STYLE_TEMPLATES.length}`);
    console.log('- Marcas: LA_LLAVE, GESTORIA_ONLINE');
    console.log('- Características:');
    console.log('  ✓ Diseño fiel al original BASU');
    console.log('  ✓ Dos columnas (Contabilidad/Fiscal + Laboral)');
    console.log('  ✓ Checkmarks verdes (✓) y rojos (✗)');
    console.log('  ✓ Servicios adicionales en dos columnas');
    console.log('  ✓ Resumen financiero alineado a la derecha');
    console.log('  ✓ Footer con datos de empresa');
    console.log('  ✓ 6 notas y condiciones estándar');
    
  } catch (error) {
    console.error('❌ Error al insertar plantillas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
