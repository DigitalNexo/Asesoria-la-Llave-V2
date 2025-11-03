import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de configuración de presupuestos...\n');

  // Buscar un usuario admin para asignar como creador
  const admin = await prisma.users.findFirst({
    where: { username: 'admin' }
  });

  if (!admin) {
    console.error('❌ No se encontró usuario admin. Ejecuta primero: npx tsx prisma/seed.ts');
    process.exit(1);
  }

  // Verificar si ya existe configuración
  const existingConfig = await prisma.gestoria_budget_autonomo_config.findFirst();
  if (existingConfig) {
    console.log('⚠️  Ya existe una configuración de presupuestos. Eliminando...');
    await prisma.gestoria_budget_autonomo_config.delete({
      where: { id: existingConfig.id }
    });
  }

  // Crear configuración de presupuestos de Autónomos (BASU)
  console.log('💰 Creando configuración de presupuestos (sistema dinámico BASU)...');
  
  const budgetConfig = await prisma.gestoria_budget_autonomo_config.create({
    data: {
      id: randomUUID(),
      nombre: 'Configuración Autónomos - Oficial',
      activo: true,
      porcentajePeriodoMensual: 20.00,
      porcentajeEDN: 10.00,
      porcentajeModulos: -10.00,
      minimoMensual: 50.00,
      creadoPor: admin.id,
      
      // Tramos de facturas (5 tramos según BASU)
      tramosFacturas: {
        create: [
          {
            id: randomUUID(),
            orden: 1,
            minFacturas: 0,
            maxFacturas: 25,
            precio: 45.00,
            etiqueta: 'Hasta 25 facturas'
          },
          {
            id: randomUUID(),
            orden: 2,
            minFacturas: 26,
            maxFacturas: 50,
            precio: 55.00,
            etiqueta: 'De 26 a 50 facturas'
          },
          {
            id: randomUUID(),
            orden: 3,
            minFacturas: 51,
            maxFacturas: 100,
            precio: 80.00,
            etiqueta: 'De 51 a 100 facturas'
          },
          {
            id: randomUUID(),
            orden: 4,
            minFacturas: 101,
            maxFacturas: 150,
            precio: 100.00,
            etiqueta: 'De 101 a 150 facturas'
          },
          {
            id: randomUUID(),
            orden: 5,
            minFacturas: 151,
            maxFacturas: null, // null = infinito
            precio: 125.00,
            etiqueta: 'Más de 150 facturas'
          }
        ]
      },
      
      // Tramos de nóminas (6 tramos según BASU)
      tramosNominas: {
        create: [
          {
            id: randomUUID(),
            orden: 1,
            minNominas: 0,
            maxNominas: 10,
            precio: 20.00,
            etiqueta: 'Hasta 10 nóminas'
          },
          {
            id: randomUUID(),
            orden: 2,
            minNominas: 11,
            maxNominas: 20,
            precio: 18.00,
            etiqueta: 'De 11 a 20 nóminas'
          },
          {
            id: randomUUID(),
            orden: 3,
            minNominas: 21,
            maxNominas: 30,
            precio: 16.00,
            etiqueta: 'De 21 a 30 nóminas'
          },
          {
            id: randomUUID(),
            orden: 4,
            minNominas: 31,
            maxNominas: 40,
            precio: 14.00,
            etiqueta: 'De 31 a 40 nóminas'
          },
          {
            id: randomUUID(),
            orden: 5,
            minNominas: 41,
            maxNominas: 50,
            precio: 12.00,
            etiqueta: 'De 41 a 50 nóminas'
          },
          {
            id: randomUUID(),
            orden: 6,
            minNominas: 51,
            maxNominas: null,
            precio: 10.00,
            etiqueta: 'Más de 50 nóminas'
          }
        ]
      },
      
      // Tramos de facturación anual con multiplicadores (7 tramos según BASU)
      tramosFacturacionAnual: {
        create: [
          {
            id: randomUUID(),
            orden: 1,
            minFacturacion: 0,
            maxFacturacion: 49999.99,
            multiplicador: 1.00,
            etiqueta: 'Hasta 50.000€'
          },
          {
            id: randomUUID(),
            orden: 2,
            minFacturacion: 50000,
            maxFacturacion: 99999.99,
            multiplicador: 1.10,
            etiqueta: 'De 50k a 100k€'
          },
          {
            id: randomUUID(),
            orden: 3,
            minFacturacion: 100000,
            maxFacturacion: 199999.99,
            multiplicador: 1.15,
            etiqueta: 'De 100k a 200k€'
          },
          {
            id: randomUUID(),
            orden: 4,
            minFacturacion: 200000,
            maxFacturacion: 299999.99,
            multiplicador: 1.20,
            etiqueta: 'De 200k a 300k€'
          },
          {
            id: randomUUID(),
            orden: 5,
            minFacturacion: 300000,
            maxFacturacion: 399999.99,
            multiplicador: 1.25,
            etiqueta: 'De 300k a 400k€'
          },
          {
            id: randomUUID(),
            orden: 6,
            minFacturacion: 400000,
            maxFacturacion: 499999.99,
            multiplicador: 1.30,
            etiqueta: 'De 400k a 500k€'
          },
          {
            id: randomUUID(),
            orden: 7,
            minFacturacion: 500000,
            maxFacturacion: null,
            multiplicador: 1.40,
            etiqueta: 'Más de 500k€'
          }
        ]
      },
      
      // Precios de modelos fiscales (7 modelos según BASU)
      preciosModelosFiscales: {
        create: [
          {
            id: randomUUID(),
            codigoModelo: '303',
            nombreModelo: 'IVA Trimestral',
            precio: 15.00,
            activo: true,
            orden: 1
          },
          {
            id: randomUUID(),
            codigoModelo: '111',
            nombreModelo: 'IRPF Trabajadores',
            precio: 10.00,
            activo: true,
            orden: 2
          },
          {
            id: randomUUID(),
            codigoModelo: '115',
            nombreModelo: 'IRPF Alquileres',
            precio: 10.00,
            activo: true,
            orden: 3
          },
          {
            id: randomUUID(),
            codigoModelo: '130',
            nombreModelo: 'IRPF Actividades Económicas',
            precio: 15.00,
            activo: true,
            orden: 4
          },
          {
            id: randomUUID(),
            codigoModelo: '100',
            nombreModelo: 'Declaración Renta Anual',
            precio: 50.00,
            activo: true,
            orden: 5
          },
          {
            id: randomUUID(),
            codigoModelo: '349',
            nombreModelo: 'Operaciones Intracomunitarias',
            precio: 15.00,
            activo: true,
            orden: 6
          },
          {
            id: randomUUID(),
            codigoModelo: '347',
            nombreModelo: 'Operaciones Terceras Personas',
            precio: 15.00,
            activo: true,
            orden: 7
          }
        ]
      },
      
      // Servicios adicionales mensuales (11 servicios según BASU)
      preciosServiciosAdicionales: {
        create: [
          {
            id: randomUUID(),
            codigo: 'irpf_alquileres',
            nombre: 'IRPF Alquileres',
            descripcion: 'Gestión de rendimientos de alquileres',
            precio: 15.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 1
          },
          {
            id: randomUUID(),
            codigo: 'iva_intracomunitario',
            nombre: 'IVA Intracomunitario',
            descripcion: 'Declaración de operaciones intracomunitarias',
            precio: 20.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 2
          },
          {
            id: randomUUID(),
            codigo: 'gestion_notificaciones',
            nombre: 'Gestión de Notificaciones',
            descripcion: 'Recepción y gestión de notificaciones AEAT',
            precio: 10.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 3
          },
          {
            id: randomUUID(),
            codigo: 'solicitud_certificados',
            nombre: 'Solicitud de Certificados',
            descripcion: 'Gestión de certificados digitales',
            precio: 15.00,
            tipoServicio: 'PUNTUAL',
            activo: true,
            orden: 4
          },
          {
            id: randomUUID(),
            codigo: 'censos_aeat',
            nombre: 'Gestión de Censos AEAT',
            descripcion: 'Altas y modificaciones censales',
            precio: 25.00,
            tipoServicio: 'PUNTUAL',
            activo: true,
            orden: 5
          },
          {
            id: randomUUID(),
            codigo: 'estadisticas_ine',
            nombre: 'Estadísticas INE',
            descripcion: 'Declaraciones estadísticas',
            precio: 10.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 6
          },
          {
            id: randomUUID(),
            codigo: 'solicitud_ayudas',
            nombre: 'Solicitud de Ayudas',
            descripcion: 'Tramitación de ayudas y subvenciones',
            precio: 50.00,
            tipoServicio: 'PUNTUAL',
            activo: true,
            orden: 7
          },
          {
            id: randomUUID(),
            codigo: 'declaraciones_informativas',
            nombre: 'Declaraciones Informativas',
            descripcion: 'Modelos informativos diversos',
            precio: 15.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 8
          },
          {
            id: randomUUID(),
            codigo: 'presentacion_cuentas',
            nombre: 'Presentación de Cuentas',
            descripcion: 'Depósito de cuentas anuales',
            precio: 75.00,
            tipoServicio: 'PUNTUAL',
            activo: true,
            orden: 9
          },
          {
            id: randomUUID(),
            codigo: 'asesoria_laboral',
            nombre: 'Asesoría Laboral',
            descripcion: 'Consultas sobre temas laborales',
            precio: 30.00,
            tipoServicio: 'MENSUAL',
            activo: true,
            orden: 10
          },
          {
            id: randomUUID(),
            codigo: 'planes_igualdad',
            nombre: 'Planes de Igualdad',
            descripcion: 'Elaboración y seguimiento de planes de igualdad',
            precio: 100.00,
            tipoServicio: 'PUNTUAL',
            activo: true,
            orden: 11
          }
        ]
      }
    }
  });

  console.log(`\n✅ Configuración de presupuestos creada exitosamente!`);
  console.log(`\n📊 Resumen de datos insertados:`);
  console.log(`  ✓ 5 tramos de facturas (45€ - 125€)`);
  console.log(`  ✓ 6 tramos de nóminas (10€ - 20€)`);
  console.log(`  ✓ 7 tramos de facturación anual (multiplicadores 1.0x - 1.4x)`);
  console.log(`  ✓ 7 modelos fiscales (303, 111, 115, 130, 100, 349, 347)`);
  console.log(`  ✓ 11 servicios adicionales (mensuales y puntuales)`);
  console.log(`\n💾 Total: 36 registros relacionados insertados\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error durante el seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
