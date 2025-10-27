import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedDocumentTemplates() {
  console.log('🌱 Sembrando plantillas de documentos...');

  // Template 1: Payment Receipt
  const paymentReceiptTemplate = await prisma.document_templates.upsert({
    where: { name: 'payment_receipt_template' },
    update: {},
    create: {
      type: 'payment_receipt',
      name: 'payment_receipt_template',
      description: 'Plantilla estándar para recibos de pago',
      content: `
        <div class="payment-receipt">
          <h1>RECIBO DE PAGO</h1>
          <p><strong>Número:</strong> {{receipt_number}}</p>
          <p><strong>Fecha:</strong> {{date}}</p>
          <p><strong>Concepto:</strong> {{concept}}</p>
          <p><strong>Importe:</strong> {{amount}} €</p>
          <p><strong>Forma de pago:</strong> {{payment_method}}</p>
        </div>
      `,
      variables: {
        receipt_number: 'string',
        date: 'date',
        concept: 'string',
        amount: 'number',
        payment_method: 'string',
      },
      is_active: true,
    },
  });

  console.log('✅ Plantilla de recibos de pago creada');

  // Template 2: Data Protection
  const dataProtectionTemplate = await prisma.document_templates.upsert({
    where: { name: 'data_protection_template' },
    update: {},
    create: {
      type: 'data_protection',
      name: 'data_protection_template',
      description: 'Documento de conformidad RGPD/LOPDGDD',
      content: `
        <div class="data-protection">
          <h1>INFORMACIÓN DE PROTECCIÓN DE DATOS</h1>
          <h2>Conforme a RGPD y LOPDGDD</h2>
          <h3>Responsable del Tratamiento</h3>
          <p><strong>Razón Social:</strong> {{company_name}}</p>
          <p><strong>NIF:</strong> {{nif}}</p>
          
          <h3>Finalidades del Tratamiento</h3>
          <p>{{processing_purposes}}</p>
          
          <h3>Legitimación</h3>
          <p>{{legitimation}}</p>
          
          <h3>Derechos del Interesado</h3>
          <p>El interesado tiene derecho a acceder, rectificar, suprimir y portar sus datos.</p>
        </div>
      `,
      variables: {
        company_name: 'string',
        nif: 'string',
        processing_purposes: 'string',
        legitimation: 'string',
      },
      is_active: true,
    },
  });

  console.log('✅ Plantilla de protección de datos creada');

  // Template 3: Banking Domiciliation
  const bankingTemplate = await prisma.document_templates.upsert({
    where: { name: 'banking_domiciliation_template' },
    update: {},
    create: {
      type: 'banking_domiciliation',
      name: 'banking_domiciliation_template',
      description: 'Documento de autorización de domiciliación bancaria',
      content: `
        <div class="banking-domiciliation">
          <h1>AUTORIZACIÓN DE DOMICILIACIÓN BANCARIA</h1>
          <p><strong>Empresa:</strong> {{company_name}}</p>
          <p><strong>CIF:</strong> {{cif}}</p>
          
          <h3>Datos Bancarios del Cliente</h3>
          <p><strong>IBAN:</strong> {{iban}}</p>
          <p><strong>BIC:</strong> {{bic}}</p>
          <p><strong>Titular de la Cuenta:</strong> {{account_holder}}</p>
          
          <h3>Autorización</h3>
          <p>Autorizo al acreedor a debitar de mi cuenta bancaria los importes que se causen por razón de los servicios prestados.</p>
          
          <p><strong>Fecha:</strong> {{date}}</p>
          <p><strong>Firma:</strong> _____________________</p>
        </div>
      `,
      variables: {
        company_name: 'string',
        cif: 'string',
        iban: 'string',
        bic: 'string',
        account_holder: 'string',
        date: 'date',
      },
      is_active: true,
    },
  });

  console.log('✅ Plantilla de domiciliación bancaria creada');

  console.log('🎉 Seeding de plantillas completado');
}

async function main() {
  try {
    await seedDocumentTemplates();
  } catch (error) {
    console.error('❌ Error durante seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
