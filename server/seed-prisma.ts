#!/usr/bin/env tsx
/**
 * Seed Script para MariaDB con Prisma
 * Crea datos iniciales para el sistema Asesoría La Llave
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // Limpiar datos existentes (opcional, comentar si quieres preservar datos)
  console.log('🗑️  Limpiando datos existentes...');
  await prisma.auditTrail.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.taxFile.deleteMany();
  await prisma.clientTax.deleteMany();
  await prisma.taxPeriod.deleteMany();
  await prisma.taxModel.deleteMany();
  await prisma.manual.deleteMany();
  await prisma.task.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.smtpConfig.deleteMany();
  await prisma.jobRun.deleteMany();

  // Hash de contraseña (admin123)
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // ==================== USUARIOS ====================
  console.log('👥 Creando usuarios...');
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@asesoria.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const gestor = await prisma.user.create({
    data: {
      username: 'gestor',
      email: 'gestor@asesoria.com',
      password: hashedPassword,
      role: 'GESTOR',
    },
  });

  const lectura = await prisma.user.create({
    data: {
      username: 'lectura',
      email: 'lectura@asesoria.com',
      password: hashedPassword,
      role: 'LECTURA',
    },
  });

  console.log(`  ✅ Admin: ${admin.username} (${admin.email})`);
  console.log(`  ✅ Gestor: ${gestor.username} (${gestor.email})`);
  console.log(`  ✅ Lectura: ${lectura.username} (${lectura.email})`);

  // ==================== CLIENTES ====================
  console.log('\n📋 Creando clientes...');
  const client1 = await prisma.client.create({
    data: {
      razonSocial: 'Construcciones Pérez S.A.',
      nifCif: 'A98765432',
      tipo: 'EMPRESA',
      email: 'info@construccionesperez.com',
      telefono: '965432187',
      direccion: 'Polígono Industrial Norte, Sevilla',
      responsableAsignado: gestor.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      razonSocial: 'Textiles Martínez',
      nifCif: 'B12345678',
      tipo: 'EMPRESA',
      email: 'contacto@textilesmartinez.com',
      telefono: '912345678',
      direccion: 'Calle Mayor 45, Madrid',
      responsableAsignado: gestor.id,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      razonSocial: 'García López, Juan',
      nifCif: '12345678A',
      tipo: 'AUTONOMO',
      email: 'juan.garcia@email.com',
      telefono: '654321987',
      direccion: 'Avenida Principal 123, Barcelona',
      responsableAsignado: gestor.id,
    },
  });

  const client4 = await prisma.client.create({
    data: {
      razonSocial: 'Servicios Informáticos SL',
      nifCif: 'B87654321',
      tipo: 'EMPRESA',
      email: 'info@serviciosinf.com',
      telefono: '963258741',
      direccion: 'Parque Tecnológico, Valencia',
      responsableAsignado: gestor.id,
    },
  });

  const client5 = await prisma.client.create({
    data: {
      razonSocial: 'Rodríguez Sánchez, María',
      nifCif: '87654321B',
      tipo: 'AUTONOMO',
      email: 'maria.rodriguez@email.com',
      telefono: '698745632',
      direccion: 'Plaza España 12, Málaga',
      responsableAsignado: gestor.id,
    },
  });

  console.log(`  ✅ ${client1.razonSocial}`);
  console.log(`  ✅ ${client2.razonSocial}`);
  console.log(`  ✅ ${client3.razonSocial}`);
  console.log(`  ✅ ${client4.razonSocial}`);
  console.log(`  ✅ ${client5.razonSocial}`);

  // ==================== MODELOS FISCALES ====================
  console.log('\n🧾 Creando modelos fiscales...');
  const model303 = await prisma.taxModel.create({
    data: {
      nombre: '303',
      descripcion: 'IVA - Autoliquidación mensual/trimestral',
    },
  });

  const model390 = await prisma.taxModel.create({
    data: {
      nombre: '390',
      descripcion: 'IVA - Declaración resumen anual',
    },
  });

  const model130 = await prisma.taxModel.create({
    data: {
      nombre: '130',
      descripcion: 'IRPF - Pago fraccionado trimestral (actividades económicas)',
    },
  });

  const model131 = await prisma.taxModel.create({
    data: {
      nombre: '131',
      descripcion: 'IRPF - Pago fraccionado trimestral (estimación directa)',
    },
  });

  console.log(`  ✅ Modelo ${model303.nombre}: ${model303.descripcion}`);
  console.log(`  ✅ Modelo ${model390.nombre}: ${model390.descripcion}`);
  console.log(`  ✅ Modelo ${model130.nombre}: ${model130.descripcion}`);
  console.log(`  ✅ Modelo ${model131.nombre}: ${model131.descripcion}`);

  // ==================== PERIODOS TRIBUTARIOS ====================
  console.log('\n📅 Creando periodos tributarios 2024 y 2025...');
  
  // 2024 - Trimestre 1
  const period2024Q1 = await prisma.taxPeriod.create({
    data: {
      modeloId: model303.id,
      anio: 2024,
      trimestre: 1,
      inicioPresentacion: new Date('2024-04-01'),
      finPresentacion: new Date('2024-04-20'),
    },
  });

  // 2024 - Trimestre 2
  const period2024Q2 = await prisma.taxPeriod.create({
    data: {
      modeloId: model303.id,
      anio: 2024,
      trimestre: 2,
      inicioPresentacion: new Date('2024-07-01'),
      finPresentacion: new Date('2024-07-20'),
    },
  });

  // 2024 - Trimestre 3
  await prisma.taxPeriod.create({
    data: {
      modeloId: model303.id,
      anio: 2024,
      trimestre: 3,
      inicioPresentacion: new Date('2024-10-01'),
      finPresentacion: new Date('2024-10-20'),
    },
  });

  // 2024 - Trimestre 4
  await prisma.taxPeriod.create({
    data: {
      modeloId: model303.id,
      anio: 2024,
      trimestre: 4,
      inicioPresentacion: new Date('2025-01-01'),
      finPresentacion: new Date('2025-01-30'),
    },
  });

  // 2025 - Trimestre 1
  await prisma.taxPeriod.create({
    data: {
      modeloId: model303.id,
      anio: 2025,
      trimestre: 1,
      inicioPresentacion: new Date('2025-04-01'),
      finPresentacion: new Date('2025-04-20'),
    },
  });

  console.log('  ✅ 5 periodos tributarios creados (2024-2025)');

  // ==================== ASIGNACIONES DE IMPUESTOS ====================
  console.log('\n💼 Asignando impuestos a clientes...');
  await prisma.clientTax.create({
    data: {
      clientId: client1.id,
      taxPeriodId: period2024Q1.id,
      estado: 'REALIZADO',
      notas: 'Presentado correctamente',
    },
  });

  await prisma.clientTax.create({
    data: {
      clientId: client1.id,
      taxPeriodId: period2024Q2.id,
      estado: 'PENDIENTE',
    },
  });

  console.log('  ✅ Impuestos asignados a clientes');

  // ==================== TAREAS ====================
  console.log('\n✅ Creando tareas...');
  await prisma.task.create({
    data: {
      titulo: 'Revisar declaración trimestral',
      descripcion: 'Revisar modelo 303 del primer trimestre para Construcciones Pérez',
      clienteId: client1.id,
      asignadoA: gestor.id,
      prioridad: 'ALTA',
      estado: 'EN_PROGRESO',
      visibilidad: 'GENERAL',
      fechaVencimiento: new Date('2025-04-15'),
    },
  });

  await prisma.task.create({
    data: {
      titulo: 'Actualizar datos fiscales',
      descripcion: 'Actualizar información fiscal de Textiles Martínez',
      clienteId: client2.id,
      asignadoA: gestor.id,
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      visibilidad: 'GENERAL',
      fechaVencimiento: new Date('2025-04-20'),
    },
  });

  await prisma.task.create({
    data: {
      titulo: 'Contactar cliente para documentación',
      descripcion: 'Solicitar facturas del trimestre a Juan García',
      clienteId: client3.id,
      asignadoA: gestor.id,
      prioridad: 'ALTA',
      estado: 'PENDIENTE',
      visibilidad: 'GENERAL',
      fechaVencimiento: new Date('2025-04-10'),
    },
  });

  await prisma.task.create({
    data: {
      titulo: 'Preparar informe anual',
      descripcion: 'Elaborar informe anual de actividades para reunión de equipo',
      asignadoA: admin.id,
      prioridad: 'MEDIA',
      estado: 'PENDIENTE',
      visibilidad: 'PERSONAL',
      fechaVencimiento: new Date('2025-05-01'),
    },
  });

  await prisma.task.create({
    data: {
      titulo: 'Revisar procedimientos internos',
      descripcion: 'Actualizar manual de procedimientos de gestión documental',
      asignadoA: admin.id,
      prioridad: 'BAJA',
      estado: 'PENDIENTE',
      visibilidad: 'GENERAL',
      fechaVencimiento: new Date('2025-05-15'),
    },
  });

  console.log('  ✅ 5 tareas creadas (GENERAL y PERSONAL)');

  // ==================== MANUALES ====================
  console.log('\n📚 Creando manuales internos...');
  await prisma.manual.create({
    data: {
      titulo: 'Procedimiento de Presentación de Modelos Fiscales',
      contenidoHtml: '<h2>Procedimiento Modelo 303</h2><p>Este manual describe el proceso completo para la presentación del modelo 303...</p>',
      autorId: admin.id,
      etiquetas: JSON.stringify(['impuestos', 'modelo-303', 'procedimientos']),
      categoria: 'Fiscalidad',
      publicado: true,
    },
  });

  await prisma.manual.create({
    data: {
      titulo: 'Guía de Gestión Documental',
      contenidoHtml: '<h2>Sistema de Archivos</h2><p>Organización y gestión de documentación de clientes...</p>',
      autorId: gestor.id,
      etiquetas: JSON.stringify(['documentacion', 'gestion', 'archivos']),
      categoria: 'Administración',
      publicado: true,
    },
  });

  console.log('  ✅ 2 manuales internos creados');

  // ==================== CONFIGURACIÓN SMTP (Opcional) ====================
  console.log('\n📧 Creando configuración SMTP de ejemplo...');
  await prisma.smtpConfig.create({
    data: {
      host: 'smtp.gmail.com',
      port: 587,
      user: 'ejemplo@gmail.com',
      password: 'app-password-aqui',
      secure: false,
    },
  });
  console.log('  ✅ Configuración SMTP creada (editar en panel admin)');

  console.log('\n✨ Seed completado exitosamente!\n');
  console.log('📝 Usuarios creados:');
  console.log('   - admin / admin123 (ADMIN)');
  console.log('   - gestor / admin123 (GESTOR)');
  console.log('   - lectura / admin123 (LECTURA)\n');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
