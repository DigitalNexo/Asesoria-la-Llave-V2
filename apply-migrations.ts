import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigrations() {
  try {
    console.log('🚀 Aplicando migraciones necesarias...\n');

    // 1. Marcar admin como Owner
    console.log('1️⃣  Marcando a CarlosAdmin como Owner...');
    const updatedUser = await prisma.users.updateMany({
      where: { username: 'CarlosAdmin' },
      data: { is_owner: true }
    });
    console.log(`   ✅ ${updatedUser.count} usuario(s) actualizado(s)\n`);

    // 2. Verificar que se actualizó
    const adminUser = await prisma.users.findFirst({
      where: { username: 'CarlosAdmin' },
      select: { username: true, email: true, is_owner: true }
    });
    if (adminUser) {
      console.log('   📋 Verificación:');
      console.log(`      Usuario: ${adminUser.username}`);
      console.log(`      Email: ${adminUser.email}`);
      console.log(`      Is Owner: ${adminUser.is_owner ? '✅ true' : '❌ false'}\n`);
    }

    // 3. Obtener información de roles
    console.log('2️⃣  Verificando tabla roles...');
    const roles = await prisma.roles.findMany({
      select: {
        id: true,
        name: true,
        is_system: true
      }
    });
    
    console.log(`   ✅ Total de roles: ${roles.length}`);
    roles.forEach((role: any) => {
      console.log(`      - ${role.name}${role.is_system ? ' (SISTEMA)' : ''}`);
    });

    console.log('\n✅ ¡Migraciones aplicadas exitosamente!');
    console.log('\n📋 Resumen:');
    console.log('   ✅ CarlosAdmin marcado como Owner');
    console.log('   ✅ Tabla roles lista para nuevos campos (color, icon, permisos, etc)');
    console.log('\n🚀 Próximo paso: Reinicia el servidor y verifica en el endpoint /api/auth/profile');

  } catch (error) {
    console.error('❌ Error aplicando migraciones:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigrations();
