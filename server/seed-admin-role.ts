import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function seedAdminRole() {
  console.log('🔐 Inicializando rol Administrador...\n');

  try {
    // 1. Crear o verificar el rol Administrador
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

    // 2. Crear todos los permisos necesarios
    const permissions = [
      // Admin permissions
      { resource: 'admin', action: 'smtp_manage', description: 'Gestionar cuentas SMTP múltiples' },
      { resource: 'admin', action: 'users_manage', description: 'Gestionar usuarios' },
      { resource: 'admin', action: 'roles_manage', description: 'Gestionar roles' },
      { resource: 'admin', action: 'permissions_manage', description: 'Gestionar permisos' },
      { resource: 'admin', action: 'system_config', description: 'Configurar sistema' },
      
      // Notifications
      { resource: 'notifications', action: 'create', description: 'Crear plantillas de notificación' },
      { resource: 'notifications', action: 'update', description: 'Actualizar plantillas de notificación' },
      { resource: 'notifications', action: 'delete', description: 'Eliminar plantillas de notificación' },
      { resource: 'notifications', action: 'send', description: 'Enviar y programar notificaciones' },
      { resource: 'notifications', action: 'view_history', description: 'Ver historial de notificaciones' },
      
      // Clients
      { resource: 'clients', action: 'create', description: 'Crear clientes' },
      { resource: 'clients', action: 'read', description: 'Ver clientes' },
      { resource: 'clients', action: 'update', description: 'Actualizar clientes' },
      { resource: 'clients', action: 'delete', description: 'Eliminar clientes' },
      
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
      
      // Manuals
      { resource: 'manuals', action: 'create', description: 'Crear manuales' },
      { resource: 'manuals', action: 'read', description: 'Ver manuales' },
      { resource: 'manuals', action: 'update', description: 'Actualizar manuales' },
      { resource: 'manuals', action: 'delete', description: 'Eliminar manuales' },
    ];

    console.log('📋 Creando/verificando permisos...');
    const createdPermissions = [];

    for (const perm of permissions) {
      try {
        const existing = await prisma.permissions.findFirst({
          where: {
            resource: perm.resource,
            action: perm.action,
          },
        });

        if (existing) {
          console.log(`  ✓ ${perm.resource}:${perm.action}`);
          createdPermissions.push(existing);
        } else {
          const created = await prisma.permissions.create({
            data: {
              id: randomUUID(),
              resource: perm.resource,
              action: perm.action,
              description: perm.description,
            },
          });
          console.log(`  ✓ ${perm.resource}:${perm.action} (creado)`);
          createdPermissions.push(created);
        }
      } catch (error: any) {
        console.error(`  ✗ Error con ${perm.resource}:${perm.action}:`, error.message);
      }
    }

    console.log(`✅ Total permisos: ${createdPermissions.length}\n`);

    // 3. Asignar todos los permisos al rol Administrador
    console.log('🔑 Asignando permisos a rol Administrador...');
    let assignedCount = 0;

    for (const permission of createdPermissions) {
      try {
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
          console.log(`  ✓ ${permission.resource}:${permission.action}`);
          assignedCount++;
        } else {
          console.log(`  ✓ ${permission.resource}:${permission.action} (ya asignado)`);
        }
      } catch (error: any) {
        console.error(`  ✗ Error asignando ${permission.resource}:${permission.action}:`, error.message);
      }
    }

    console.log(`✅ Permisos asignados: ${assignedCount}\n`);

    // 4. Asignar rol Administrador al usuario admin
    console.log('👤 Buscando usuario admin...');
    const adminUser = await prisma.users.findFirst({
      where: { username: 'admin' },
    });

    if (adminUser) {
      console.log(`✓ Usuario admin encontrado (ID: ${adminUser.id})`);
      
      // Verificar si ya tiene el rol
      const hasRole = await prisma.users.findFirst({
        where: {
          id: adminUser.id,
          roleId: adminRole.id,
        },
      });

      if (hasRole) {
        console.log('✓ Usuario admin ya tiene el rol Administrador\n');
      } else {
        // Asignar el rol
        await prisma.users.update({
          where: { id: adminUser.id },
          data: { roleId: adminRole.id },
        });
        console.log('✅ Rol Administrador asignado al usuario admin\n');
      }
    } else {
      console.log('⚠️  Usuario admin no encontrado. Creándolo...');
      
      // Crear el usuario admin si no existe
      const bcrypt = require('bcrypt');
      const password = await bcrypt.hash('admin123', 10);
      
      const newAdmin = await prisma.users.create({
        data: {
          id: randomUUID(),
          username: 'admin',
          email: 'admin@asesoriallave.com',
          password,
          roleId: adminRole.id,
        },
      });
      
      console.log('✅ Usuario admin creado y asignado con rol Administrador\n');
    }

    console.log('🎉 ¡Seed de rol Administrador completado!\n');
    console.log('Resumen:');
    console.log(`  ✓ Rol Administrador: ${adminRole.name}`);
    console.log(`  ✓ Permisos creados/verificados: ${createdPermissions.length}`);
    console.log(`  ✓ Usuario admin: asignado\n`);

  } catch (error: any) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seedAdminRole()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
