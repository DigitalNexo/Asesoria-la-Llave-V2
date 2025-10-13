import { pgStorage } from './pg-storage';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await pgStorage.createUser({
    username: 'admin',
    email: 'admin@asesoria.com',
    password: hashedPassword,
    role: 'ADMIN',
  });

  const gestor = await pgStorage.createUser({
    username: 'gestor',
    email: 'gestor@asesoria.com',
    password: hashedPassword,
    role: 'GESTOR',
  });

  const lectura = await pgStorage.createUser({
    username: 'lectura',
    email: 'lectura@asesoria.com',
    password: hashedPassword,
    role: 'LECTURA',
  });

  console.log('✅ Users created');

  // Create clients
  const client1 = await pgStorage.createClient({
    razonSocial: 'Comercial López S.L.',
    nifCif: 'B12345678',
    tipo: 'empresa',
    email: 'comercial@lopez.com',
    telefono: '912345678',
    direccion: 'Calle Mayor 123, Madrid',
    responsableAsignado: gestor.id,
  });

  await pgStorage.createClient({
    razonSocial: 'Juan García Pérez',
    nifCif: '12345678A',
    tipo: 'autonomo',
    email: 'juan@garcia.com',
    telefono: '654321987',
    direccion: 'Avenida de la Constitución 45, Barcelona',
    responsableAsignado: gestor.id,
  });

  await pgStorage.createClient({
    razonSocial: 'María Rodríguez López',
    nifCif: '87654321B',
    tipo: 'autonomo',
    email: 'maria@rodriguez.com',
    telefono: '678901234',
    direccion: 'Plaza España 12, Valencia',
    responsableAsignado: gestor.id,
  });

  await pgStorage.createClient({
    razonSocial: 'Construcciones Pérez S.A.',
    nifCif: 'A98765432',
    tipo: 'empresa',
    email: 'info@construccionesperez.com',
    telefono: '965432187',
    direccion: 'Polígono Industrial Norte, Sevilla',
    responsableAsignado: gestor.id,
  });

  await pgStorage.createClient({
    razonSocial: 'Carlos Martínez Sánchez',
    nifCif: '11223344C',
    tipo: 'autonomo',
    email: 'carlos@martinez.com',
    telefono: '612345678',
    direccion: 'Calle Real 89, Bilbao',
    responsableAsignado: null,
  });

  console.log('✅ Clients created');

  // Create tax models
  const model303 = await pgStorage.createTaxModel({
    nombre: 'Modelo 303',
    descripcion: 'IVA - Autoliquidación trimestral',
  });

  const model390 = await pgStorage.createTaxModel({
    nombre: 'Modelo 390',
    descripcion: 'IVA - Declaración anual resumen',
  });

  const model130 = await pgStorage.createTaxModel({
    nombre: 'Modelo 130',
    descripcion: 'IRPF - Pago fraccionado',
  });

  const model131 = await pgStorage.createTaxModel({
    nombre: 'Modelo 131',
    descripcion: 'IRPF - Estimación objetiva',
  });

  console.log('✅ Tax models created');

  // Create tax periods
  const currentYear = new Date().getFullYear();
  
  const period1 = await pgStorage.createTaxPeriod({
    modeloId: model303.id,
    anio: currentYear,
    trimestre: 1,
    mes: null,
    inicioPresentacion: new Date(currentYear, 3, 1),
    finPresentacion: new Date(currentYear, 3, 20),
  });

  const period2 = await pgStorage.createTaxPeriod({
    modeloId: model303.id,
    anio: currentYear,
    trimestre: 2,
    mes: null,
    inicioPresentacion: new Date(currentYear, 6, 1),
    finPresentacion: new Date(currentYear, 6, 20),
  });

  const period3 = await pgStorage.createTaxPeriod({
    modeloId: model130.id,
    anio: currentYear,
    trimestre: 1,
    mes: null,
    inicioPresentacion: new Date(currentYear, 3, 1),
    finPresentacion: new Date(currentYear, 3, 20),
  });

  const period4 = await pgStorage.createTaxPeriod({
    modeloId: model390.id,
    anio: currentYear,
    trimestre: null,
    mes: null,
    inicioPresentacion: new Date(currentYear + 1, 0, 1),
    finPresentacion: new Date(currentYear + 1, 0, 30),
  });

  console.log('✅ Tax periods created');

  // Create client tax assignments
  await pgStorage.createClientTax({
    clientId: client1.id,
    taxPeriodId: period1.id,
    estado: 'PENDIENTE',
    notas: null,
  });

  await pgStorage.createClientTax({
    clientId: client1.id,
    taxPeriodId: period2.id,
    estado: 'CALCULADO',
    notas: 'Pendiente de revisión',
  });

  console.log('✅ Client tax assignments created');

  // Create tasks
  await pgStorage.createTask({
    titulo: 'Revisar documentación fiscal Q1',
    descripcion: 'Revisar toda la documentación fiscal del primer trimestre',
    clienteId: client1.id,
    asignadoA: gestor.id,
    prioridad: 'ALTA',
    estado: 'EN_PROGRESO',
    visibilidad: 'GENERAL',
    fechaVencimiento: new Date(currentYear, 3, 15),
  });

  await pgStorage.createTask({
    titulo: 'Preparar declaración anual',
    descripcion: 'Preparar toda la documentación para la declaración anual',
    clienteId: null,
    asignadoA: gestor.id,
    prioridad: 'MEDIA',
    estado: 'PENDIENTE',
    visibilidad: 'GENERAL',
    fechaVencimiento: new Date(currentYear, 11, 31),
  });

  await pgStorage.createTask({
    titulo: 'Actualizar datos de contacto',
    descripcion: 'Actualizar los datos de contacto de todos los clientes',
    clienteId: null,
    asignadoA: admin.id,
    prioridad: 'BAJA',
    estado: 'COMPLETADA',
    visibilidad: 'GENERAL',
    fechaVencimiento: null,
  });

  await pgStorage.createTask({
    titulo: 'Llamar a proveedor',
    descripcion: 'Llamar al proveedor para confirmar entrega',
    clienteId: null,
    asignadoA: gestor.id,
    prioridad: 'ALTA',
    estado: 'PENDIENTE',
    visibilidad: 'PERSONAL',
    fechaVencimiento: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });

  await pgStorage.createTask({
    titulo: 'Revisar contratos',
    descripcion: 'Revisar los contratos de los nuevos clientes',
    clienteId: null,
    asignadoA: admin.id,
    prioridad: 'MEDIA',
    estado: 'EN_PROGRESO',
    visibilidad: 'GENERAL',
    fechaVencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  console.log('✅ Tasks created');

  // Create manuals
  await pgStorage.createManual({
    titulo: 'Guía de Modelos Fiscales',
    contenidoHtml: '<h2>Modelos Fiscales Principales</h2><p>Esta guía explica los principales modelos fiscales...</p>',
    autorId: admin.id,
    etiquetas: ['fiscal', 'impuestos', 'guía'],
    categoria: 'Procedimientos',
    publicado: true,
  });

  await pgStorage.createManual({
    titulo: 'Procedimiento de Alta de Clientes',
    contenidoHtml: '<h2>Alta de Nuevos Clientes</h2><p>Pasos para dar de alta un nuevo cliente...</p>',
    autorId: gestor.id,
    etiquetas: ['clientes', 'procedimientos'],
    categoria: 'Gestión',
    publicado: true,
  });

  console.log('✅ Manuals created');

  console.log('🎉 Database seeded successfully!');
}

seed().catch(console.error);
