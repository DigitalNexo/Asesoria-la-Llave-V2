/**
 * Seed plantillas por defecto para los 4 tipos de presupuesto
 * Para ambas empresas: LA_LLAVE y GESTORIA_ONLINE
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Plantilla base HTML para PYME
const templatePymeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      color: #333;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .header {
      background-color: {{company_color}};
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 40px;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-section h2 {
      color: {{company_color}};
      border-bottom: 2px solid {{company_color}};
      padding-bottom: 10px;
      font-size: 20px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-top: 15px;
    }
    .info-item {
      padding: 10px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    .info-item label {
      font-weight: bold;
      color: {{company_color}};
      display: block;
      margin-bottom: 5px;
    }
    .total-section {
      background-color: {{company_color}};
      color: white;
      padding: 20px;
      margin-top: 30px;
      border-radius: 5px;
    }
    .total-section h3 {
      margin: 0 0 15px 0;
      font-size: 22px;
    }
    .total-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.3);
    }
    .total-item:last-child {
      border-bottom: none;
      font-size: 20px;
      font-weight: bold;
      padding-top: 15px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      background-color: #f8f9fa;
      color: #666;
      font-size: 12px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{empresa}}</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">PRESUPUESTO PYME</p>
  </div>

  <div class="content">
    <div class="info-section">
      <h2>Datos del Presupuesto</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Código:</label>
          <span>{{codigo}}</span>
        </div>
        <div class="info-item">
          <label>Fecha:</label>
          <span>{{fecha}}</span>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>Datos del Cliente</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Nombre de Contacto:</label>
          <span>{{nombre_contacto}}</span>
        </div>
        <div class="info-item">
          <label>Email:</label>
          <span>{{email}}</span>
        </div>
        <div class="info-item">
          <label>Teléfono:</label>
          <span>{{telefono}}</span>
        </div>
        <div class="info-item">
          <label>Nombre de la Sociedad:</label>
          <span>{{nombre_sociedad}}</span>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>Datos Fiscales y Contables</h2>
      <div class="info-grid">
        <div class="info-item">
          <label>Actividad:</label>
          <span>{{actividad}}</span>
        </div>
        <div class="info-item">
          <label>Periodo de Declaraciones:</label>
          <span>{{periodo_declaraciones}}</span>
        </div>
        <div class="info-item">
          <label>Número de Asientos:</label>
          <span>{{num_asientos}}</span>
        </div>
        <div class="info-item">
          <label>Nóminas al Mes:</label>
          <span>{{nominas_mes}}</span>
        </div>
      </div>
    </div>

    <div class="info-section">
      <h2>Descripción</h2>
      <p style="padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        {{descripcion}}
      </p>
    </div>

    <div class="total-section">
      <h3>Resumen Económico</h3>
      <div class="total-item">
        <span>Subtotal:</span>
        <span>{{subtotal}}</span>
      </div>
      <div class="total-item">
        <span>IVA (21%):</span>
        <span>{{iva}}</span>
      </div>
      <div class="total-item">
        <span>TOTAL:</span>
        <span>{{total}}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>{{empresa}} - Presupuesto generado automáticamente</p>
    <p>Para más información, contacte con nosotros</p>
  </div>
</body>
</html>
`;

// Plantilla para AUTONOMO
const templateAutonomoHtml = templatePymeHtml.replace('PRESUPUESTO PYME', 'PRESUPUESTO AUTÓNOMO')
  .replace('<h2>Datos Fiscales y Contables</h2>', '<h2>Datos Fiscales</h2>')
  .replace('{{nombre_sociedad}}', '—')
  .replace('{{actividad}}', '{{sistema_tributacion}}')
  .replace('{{periodo_declaraciones}}', '{{facturacion_anual}}')
  .replace('{{num_asientos}}', '{{num_facturas}}')
  .replace('{{nominas_mes}}', '—')
  .replace('Nombre de la Sociedad:', 'Sistema de Tributación:')
  .replace('Actividad:', 'Sistema de Tributación:')
  .replace('Periodo de Declaraciones:', 'Facturación Anual:')
  .replace('Número de Asientos:', 'Número de Facturas:')
  .replace('Nóminas al Mes:', '—');

// Plantilla para RENTA
const templateRentaHtml = templatePymeHtml.replace('PRESUPUESTO PYME', 'PRESUPUESTO DECLARACIÓN DE RENTA')
  .replace('<h2>Datos Fiscales y Contables</h2>', '<h2>Datos de la Declaración</h2>')
  .replace('{{nombre_sociedad}}', '—')
  .replace('{{actividad}}', '{{tipo_declaracion}}')
  .replace('{{periodo_declaraciones}}', '{{ingresos}}')
  .replace('{{num_asientos}}', '{{retenciones}}')
  .replace('{{nominas_mes}}', '—')
  .replace('Nombre de la Sociedad:', '—')
  .replace('Actividad:', 'Tipo de Declaración:')
  .replace('Periodo de Declaraciones:', 'Ingresos:')
  .replace('Número de Asientos:', 'Retenciones:')
  .replace('Nóminas al Mes:', '—');

// Plantilla para HERENCIAS
const templateHerenciasHtml = templatePymeHtml.replace('PRESUPUESTO PYME', 'PRESUPUESTO HERENCIAS Y DONACIONES')
  .replace('<h2>Datos Fiscales y Contables</h2>', '<h2>Datos del Proceso Sucesorio</h2>')
  .replace('{{nombre_sociedad}}', '{{titulo_sucesorio}}')
  .replace('{{actividad}}', '{{num_herederos}}')
  .replace('{{periodo_declaraciones}}', '{{fincas_madrid}}')
  .replace('{{num_asientos}}', '{{caudal}}')
  .replace('{{nominas_mes}}', '{{tipo_proceso}}')
  .replace('Nombre de la Sociedad:', 'Título Sucesorio:')
  .replace('Actividad:', 'Número de Herederos:')
  .replace('Periodo de Declaraciones:', 'Fincas en Madrid:')
  .replace('Número de Asientos:', 'Caudal Hereditario:')
  .replace('Nóminas al Mes:', 'Tipo de Proceso:');

async function seedTemplates() {
  try {
    console.log('🌱 Iniciando seed de plantillas de presupuestos...');

    const companies = [
      { brand: 'LA_LLAVE', color: '#2E5C8A', name: 'Asesoría La Llave' },
      { brand: 'GESTORIA_ONLINE', color: '#1a7f64', name: 'Gestoría Online' }
    ];

    const templates = [
      { type: 'PYME', name: 'Plantilla PYME', html: templatePymeHtml },
      { type: 'AUTONOMO', name: 'Plantilla Autónomo', html: templateAutonomoHtml },
      { type: 'RENTA', name: 'Plantilla Renta', html: templateRentaHtml },
      { type: 'HERENCIAS', name: 'Plantilla Herencias', html: templateHerenciasHtml }
    ];

    let created = 0;

    for (const company of companies) {
      for (const template of templates) {
        // Verificar si ya existe
        const existing = await prisma.budgetsTemplate.findFirst({
          where: {
            type: template.type as any,
            companyBrand: company.brand,
            isDefault: true
          }
        });

        if (existing) {
          console.log(`⏭️  Plantilla ${template.type} para ${company.brand} ya existe, saltando...`);
          continue;
        }

        // Reemplazar color de empresa en HTML
        const htmlWithColor = template.html.replace(/{{company_color}}/g, company.color);

        await prisma.budgetsTemplate.create({
          data: {
            name: `${template.name} - ${company.name}`,
            description: `Plantilla por defecto para presupuestos de tipo ${template.type}`,
            type: template.type as any,
            companyBrand: company.brand,
            htmlContent: htmlWithColor,
            isDefault: true,
            isActive: true
          }
        });

        created++;
        console.log(`✅ Creada plantilla: ${template.type} - ${company.brand}`);
      }
    }

    console.log(`\n🎉 Seed completado: ${created} plantillas creadas`);
  } catch (error) {
    console.error('❌ Error en seed de plantillas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export { seedTemplates };

// Ejecutar automáticamente
seedTemplates()
  .then(() => {
    console.log('✅ Seed de plantillas finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal en seed:', error);
    process.exit(1);
  });
