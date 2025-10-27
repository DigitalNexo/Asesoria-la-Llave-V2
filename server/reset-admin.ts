import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function resetAdminUser() {
  console.log('🔄 Reseteando usuario administrador...\n');

  // Get credentials from .env
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminUsername || !adminPassword) {
    console.error('❌ Faltan credenciales en .env');
    console.error(`   ADMIN_EMAIL: ${adminEmail || 'NO CONFIGURADO'}`);
    console.error(`   ADMIN_USERNAME: ${adminUsername || 'NO CONFIGURADO'}`);
    console.error(`   ADMIN_PASSWORD: ${adminPassword ? '***' : 'NO CONFIGURADO'}`);
    process.exit(1);
  }

  console.log(`📝 Credenciales del .env:`);
  console.log(`   Email: ${adminEmail}`);
  console.log(`   Usuario: ${adminUsername}`);
  console.log(`   Contraseña: ${adminPassword ? '***' : 'NO CONFIGURADA'}\n`);

  try {
    // 1. Obtener o crear el rol Administrador
    let adminRole = await prisma.roles.findFirst({
      where: { name: 'Administrador' },
    });

    if (!adminRole) {
      console.log('📝 Creando rol Administrador...');
      adminRole = await prisma.roles.create({
        data: {
          id: randomUUID(),
          name: 'Administrador',
          description: 'Acceso completo al sistema',
          is_system: true,
          updatedAt: new Date(),
        },
      });
      console.log('✅ Rol Administrador creado\n');
    } else {
      console.log('✓ Rol Administrador ya existe\n');
    }

    // 2. Crear/actualizar el usuario admin
    console.log('👤 Buscando usuario admin existente...');
    
    let adminUser = await prisma.users.findFirst({
      where: { username: adminUsername },
    });

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    if (adminUser) {
      console.log(`✓ Usuario ${adminUsername} existe, actualizando...`);
      adminUser = await prisma.users.update({
        where: { id: adminUser.id },
        data: {
          email: adminEmail,
          password: hashedPassword,
          roleId: adminRole.id,
          isActive: true,
        },
      });
      console.log(`✅ Usuario actualizado\n`);
    } else {
      console.log(`📝 Creando usuario ${adminUsername}...`);
      adminUser = await prisma.users.create({
        data: {
          id: randomUUID(),
          username: adminUsername,
          email: adminEmail,
          password: hashedPassword,
          roleId: adminRole.id,
          isActive: true,
        },
      });
      console.log(`✅ Usuario creado\n`);
    }

    // 3. Crear permisos
    const permissions = [
      // Admin
      { resource: 'admin', action: 'roles', description: 'Gestionar roles' },
      { resource: 'admin', action: 'users_manage', description: 'Gestionar usuarios' },
      { resource: 'admin', action: 'permissions_manage', description: 'Gestionar permisos' },
      { resource: 'admin', action: 'smtp_manage', description: 'Gestionar SMTP' },
      { resource: 'admin', action: 'settings', description: 'Configurar sistema' },
      { resource: 'admin', action: 'system', description: 'Acceso sistema' },
      { resource: 'admin', action: 'logs', description: 'Ver logs' },
      { resource: 'admin', action: 'smtp', description: 'SMTP' },
      { resource: 'admin', action: 'dashboard', description: 'Dashboard admin' },
      { resource: 'admin', action: 'system_config', description: 'Configurar sistema' },
      { resource: 'admin', action: 'roles_manage', description: 'Gestionar roles' },
      
      // Users
      { resource: 'users', action: 'create', description: 'Crear usuarios' },
      { resource: 'users', action: 'read', description: 'Ver usuarios' },
      { resource: 'users', action: 'update', description: 'Actualizar usuarios' },
      { resource: 'users', action: 'delete', description: 'Eliminar usuarios' },
      
      // Clients
      { resource: 'clients', action: 'create', description: 'Crear clientes' },
      { resource: 'clients', action: 'read', description: 'Ver clientes' },
      { resource: 'clients', action: 'update', description: 'Actualizar clientes' },
      { resource: 'clients', action: 'delete', description: 'Eliminar clientes' },
      { resource: 'clients', action: 'export', description: 'Exportar clientes' },
      
      // Budgets
      { resource: 'budgets', action: 'create', description: 'Crear presupuestos' },
      { resource: 'budgets', action: 'read', description: 'Ver presupuestos' },
      { resource: 'budgets', action: 'update', description: 'Actualizar presupuestos' },
      { resource: 'budgets', action: 'delete', description: 'Eliminar presupuestos' },
      
      // Tasks
      { resource: 'tasks', action: 'create', description: 'Crear tareas' },
      { resource: 'tasks', action: 'read', description: 'Ver tareas' },
      { resource: 'tasks', action: 'update', description: 'Actualizar tareas' },
      { resource: 'tasks', action: 'delete', description: 'Eliminar tareas' },
      { resource: 'tasks', action: 'assign', description: 'Asignar tareas' },
      
      // Manuals
      { resource: 'manuals', action: 'create', description: 'Crear manuales' },
      { resource: 'manuals', action: 'read', description: 'Ver manuales' },
      { resource: 'manuals', action: 'update', description: 'Actualizar manuales' },
      { resource: 'manuals', action: 'delete', description: 'Eliminar manuales' },
      { resource: 'manuals', action: 'publish', description: 'Publicar manuales' },
      
      // Taxes
      { resource: 'taxes', action: 'create', description: 'Crear impuestos' },
      { resource: 'taxes', action: 'read', description: 'Ver impuestos' },
      { resource: 'taxes', action: 'update', description: 'Actualizar impuestos' },
      { resource: 'taxes', action: 'delete', description: 'Eliminar impuestos' },
      { resource: 'taxes', action: 'export', description: 'Exportar impuestos' },
      { resource: 'taxes', action: 'upload', description: 'Subir impuestos' },
      
      // Notifications
      { resource: 'notifications', action: 'create', description: 'Crear notificaciones' },
      { resource: 'notifications', action: 'send', description: 'Enviar notificaciones' },
      { resource: 'notifications', action: 'delete', description: 'Eliminar notificaciones' },
      { resource: 'notifications', action: 'update', description: 'Actualizar notificaciones' },
      { resource: 'notifications', action: 'view_history', description: 'Ver historial' },
      
      // Other
      { resource: 'audits', action: 'read', description: 'Ver auditoría' },
      
      // Documents
      { resource: 'documents', action: 'create', description: 'Crear documentos' },
      { resource: 'documents', action: 'read', description: 'Ver documentos' },
      { resource: 'documents', action: 'update', description: 'Actualizar documentos' },
      { resource: 'documents', action: 'delete', description: 'Eliminar documentos' },
      { resource: 'documents', action: 'sign', description: 'Firmar documentos' },
      { resource: 'documents', action: 'download', description: 'Descargar documentos' },
    ];

    console.log('📋 Creando permisos...');
    const createdPermissions = [];

    for (const perm of permissions) {
      const existing = await prisma.permissions.findFirst({
        where: {
          resource: perm.resource,
          action: perm.action,
        },
      });

      if (!existing) {
        const created = await prisma.permissions.create({
          data: {
            id: randomUUID(),
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          },
        });
        createdPermissions.push(created);
      } else {
        createdPermissions.push(existing);
      }
    }

    console.log(`✅ Permisos: ${createdPermissions.length} total\n`);

    // 4. Asignar permisos al rol
    console.log('🔑 Asignando permisos al rol Administrador...');
    let assignedCount = 0;

    for (const permission of createdPermissions) {
      const existing = await prisma.role_permissions.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        await prisma.role_permissions.create({
          data: {
            id: randomUUID(),
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
        assignedCount++;
      }
    }

    console.log(`✅ Permisos asignados: ${assignedCount}\n`);

    console.log('🎉 ¡Setup completado!\n');
    console.log('Credenciales de acceso:');
    console.log(`   Usuario: ${adminUsername}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Contraseña: ${adminPassword}`);
    console.log(`\n⚠️  Cambia la contraseña después del primer login\n`);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAdminUser()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
