import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
  const permissions = [
    { resource: 'admin', action: 'smtp_manage', description: 'Gestionar cuentas SMTP múltiples' },
    { resource: 'notifications', action: 'create', description: 'Crear plantillas de notificación' },
    { resource: 'notifications', action: 'update', description: 'Actualizar plantillas de notificación' },
    { resource: 'notifications', action: 'delete', description: 'Eliminar plantillas de notificación' },
    { resource: 'notifications', action: 'send', description: 'Enviar y programar notificaciones' },
    { resource: 'notifications', action: 'view_history', description: 'Ver historial de notificaciones' },
  ];

  console.log('🔐 Creando permisos RBAC para sistema de notificaciones...\n');

  for (const perm of permissions) {
    try {
      // Verificar si ya existe
      const existing = await prisma.permissions.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
        },
      });

      if (existing) {
        console.log(`✓ Permiso ${perm.resource}:${perm.action} ya existe`);
      } else {
        await prisma.permissions.create({
          data: perm,
        });
        console.log(`✓ Creado permiso ${perm.resource}:${perm.action}`);
      }
    } catch (error) {
      console.error(`✗ Error creando permiso ${perm.resource}:${perm.action}:`, error);
    }
  }

  // Asignar todos los permisos al rol Administrador
  const adminRole = await prisma.roles.findFirst({
    where: { name: 'Administrador' },
  });

  if (adminRole) {
    console.log('\n🔑 Asignando permisos al rol Administrador...\n');
    
    for (const perm of permissions) {
      const permission = await prisma.permissions.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
        },
      });

      if (permission) {
        const existing = await prisma.role_permissions.findFirst({
          where: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });

        if (!existing) {
          await prisma.role_permissions.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          });
          console.log(`✓ Asignado ${perm.resource}:${perm.action} a Administrador`);
        } else {
          console.log(`✓ Permiso ${perm.resource}:${perm.action} ya asignado a Administrador`);
        }
      }
    }
  }

  console.log('\n✅ Seed de permisos completado!\n');
}

seedPermissions()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
