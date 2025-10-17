import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    nombre: 'Recordatorio Fiscal Trimestral',
    asunto: 'Recordatorio: Vencimiento de presentación fiscal {fecha_vencimiento}',
    contenidoHTML: '<h2>Estimado/a {nombre_cliente},</h2><p>Le recordamos que se aproxima la fecha de vencimiento para la presentación de sus obligaciones fiscales trimestrales.</p><p><strong>Fecha de vencimiento:</strong> {fecha_vencimiento}</p><p>Por favor, asegúrese de tener toda la documentación necesaria preparada. Si tiene alguna duda o necesita asistencia, no dude en contactarnos.</p><p>Atentamente,<br>Equipo de Asesoría La Llave</p>',
    tipo: 'RECORDATORIO'
  },
  {
    nombre: 'Solicitud de Documentación',
    asunto: 'Solicitud de documentos para trámite fiscal - {nombre_cliente}',
    contenidoHTML: '<h2>Estimado/a {nombre_cliente},</h2><p>Para poder proceder con la gestión de sus trámites fiscales, necesitamos que nos facilite la siguiente documentación:</p><ul><li>Facturas del último trimestre</li><li>Justificantes de gastos deducibles</li><li>Extractos bancarios del periodo correspondiente</li></ul><p>Puede enviar la documentación a través de nuestro correo electrónico o entregarla en nuestras oficinas.</p><p>Gracias por su colaboración.</p><p>Atentamente,<br>Equipo de Asesoría La Llave</p>',
    tipo: 'INFORMATIVO'
  },
  {
    nombre: 'Confirmación de Presentación',
    asunto: 'Confirmación: Presentación fiscal realizada correctamente',
    contenidoHTML: '<h2>Estimado/a {nombre_cliente},</h2><p>Le confirmamos que hemos realizado con éxito la presentación de sus obligaciones fiscales correspondientes al periodo indicado.</p><p><strong>Fecha de presentación:</strong> {fecha_vencimiento}</p><p>Puede consultar el justificante de la presentación en el área de clientes o solicitarlo en nuestras oficinas.</p><p>Si tiene alguna consulta, estamos a su disposición.</p><p>Atentamente,<br>Equipo de Asesoría La Llave</p>',
    tipo: 'INFORMATIVO'
  },
  {
    nombre: 'Mensaje de Bienvenida',
    asunto: 'Bienvenido/a a Asesoría La Llave - {nombre_cliente}',
    contenidoHTML: '<h2>Bienvenido/a {nombre_cliente},</h2><p>Es un placer darle la bienvenida a Asesoría La Llave. Nos comprometemos a ofrecerle un servicio profesional y de calidad en la gestión de todas sus obligaciones fiscales y contables.</p><p>A partir de ahora, recibirá notificaciones importantes relacionadas con:</p><ul><li>Vencimientos fiscales y trámites</li><li>Solicitudes de documentación</li><li>Confirmaciones de presentaciones</li><li>Actualizaciones normativas relevantes</li></ul><p>Si tiene alguna pregunta o necesita asistencia, puede contactarnos a través de {email_cliente} o llamarnos directamente.</p><p>Estamos aquí para ayudarle.</p><p>Atentamente,<br>Equipo de Asesoría La Llave</p>',
    tipo: 'INFORMATIVO'
  }
];

async function seedTemplates() {
  try {
    console.log('🚀 Iniciando creación de plantillas predefinidas...\n');
    
    for (const template of defaultTemplates) {
      // Verificar si ya existe
      const existing = await prisma.notificationTemplate.findFirst({
        where: { nombre: template.nombre }
      });
      
      if (existing) {
        console.log(`⏭️  Plantilla ya existe: ${template.nombre}`);
        continue;
      }
      
      // Crear plantilla
      await prisma.notificationTemplate.create({
        data: template
      });
      
      console.log(`✅ Plantilla creada: ${template.nombre}`);
    }
    
    console.log('\n✨ Proceso completado exitosamente');
  } catch (error) {
    console.error('❌ Error al crear plantillas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedTemplates();
