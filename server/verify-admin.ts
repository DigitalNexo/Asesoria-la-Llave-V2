import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyAdmin() {
  console.log('🔍 Verificando usuario admin...\n');

  try {
    // Get admin user with role
    const adminUser = await prisma.users.findUnique({
      where: { username: 'CarlosAdmin' },
    });

    if (!adminUser) {
      console.error('❌ Usuario CarlosAdmin no encontrado');
      process.exit(1);
    }

    console.log('👤 Usuario encontrado:');
    console.log(`   Username: ${adminUser.username}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Activo: ${adminUser.isActive}`);
    console.log(`   RoleId: ${adminUser.roleId || 'SIN ROL'}\n`);

    if (!adminUser.roleId) {
      console.error('❌ Usuario no tiene rol asignado');
      process.exit(1);
    }

    // Get the role
    const role = await prisma.roles.findUnique({
      where: { id: adminUser.roleId },
      include: {
        role_permissions: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!role) {
      console.error('❌ Rol no encontrado');
      process.exit(1);
    }

    console.log(`🔐 Rol: ${role.name}`);
    console.log(`   Descripción: ${role.description}`);
    console.log(`   Sistema: ${role.is_system}\n`);

    const permissions = role.role_permissions.map((rp) => rp.permissions);
    console.log(`📋 Permisos asignados: ${permissions.length}`);

    if (permissions.length === 0) {
      console.warn('   ⚠️  No hay permisos asignados');
    } else {
      // Group by resource
      const byResource: { [key: string]: string[] } = {};
      for (const perm of permissions) {
        if (!byResource[perm.resource]) {
          byResource[perm.resource] = [];
        }
        byResource[perm.resource].push(perm.action);
      }

      for (const [resource, actions] of Object.entries(byResource)) {
        console.log(`   ${resource}: ${actions.join(', ')}`);
      }
    }

    console.log('\n✅ Admin setup verificado correctamente');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyAdmin()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
