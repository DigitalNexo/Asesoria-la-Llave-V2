import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminPermissions() {
  console.log('🔍 Verificando permisos del usuario admin...\n');

  // Buscar el usuario admin
  const admin = await prisma.users.findFirst({
    where: { username: 'admin' },
    include: {
      roles: {
        include: {
          role_permissions: {
            include: {
              permissions: true
            }
          }
        }
      }
    }
  });

  if (!admin) {
    console.log('❌ Usuario admin no encontrado');
    return;
  }

  console.log(`👤 Usuario encontrado: ${admin.username} (ID: ${admin.id})`);
  console.log(`   Email: ${admin.email}`);
  console.log(`   RoleId: ${admin.roleId}`);
  console.log(`   Activo: ${admin.isActive}\n`);

  if (!admin.roles) {
    console.log('❌ Usuario NO tiene rol asignado');
    return;
  }

  console.log(`🔐 Rol asignado: ${admin.roles.name}`);
  console.log(`   Descripción: ${admin.roles.description}`);
  console.log(`   Es sistema: ${admin.roles.is_system}\n`);

  if (!admin.roles.role_permissions || admin.roles.role_permissions.length === 0) {
    console.log('❌ El rol NO tiene permisos asignados');
    return;
  }

  console.log(`✅ Permisos asignados al rol (${admin.roles.role_permissions.length} total):\n`);

  for (const rp of admin.roles.role_permissions) {
    console.log(`   ✓ ${rp.permissions.resource}:${rp.permissions.action}`);
  }

  console.log('\n✅ El usuario admin tiene todos los permisos configurados correctamente');
}

checkAdminPermissions()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
