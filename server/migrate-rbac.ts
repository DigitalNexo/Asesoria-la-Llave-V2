import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Definir todos los permisos del sistema
const PERMISSIONS = [
  // Clientes
  { resource: 'clients', action: 'create', description: 'Crear clientes' },
  { resource: 'clients', action: 'read', description: 'Ver clientes' },
  { resource: 'clients', action: 'update', description: 'Editar clientes' },
  { resource: 'clients', action: 'delete', description: 'Eliminar clientes' },
  { resource: 'clients', action: 'export', description: 'Exportar clientes a CSV' },
  
  // Impuestos
  { resource: 'taxes', action: 'create', description: 'Crear impuestos' },
  { resource: 'taxes', action: 'read', description: 'Ver impuestos' },
  { resource: 'taxes', action: 'update', description: 'Actualizar impuestos' },
  { resource: 'taxes', action: 'delete', description: 'Eliminar impuestos' },
  { resource: 'taxes', action: 'upload', description: 'Subir archivos de impuestos' },
  
  // Tareas
  { resource: 'tasks', action: 'create', description: 'Crear tareas' },
  { resource: 'tasks', action: 'read', description: 'Ver tareas' },
  { resource: 'tasks', action: 'update', description: 'Actualizar tareas' },
  { resource: 'tasks', action: 'delete', description: 'Eliminar tareas' },
  { resource: 'tasks', action: 'assign', description: 'Asignar tareas a usuarios' },
  
  // Manuales
  { resource: 'manuals', action: 'create', description: 'Crear manuales' },
  { resource: 'manuals', action: 'read', description: 'Ver manuales' },
  { resource: 'manuals', action: 'update', description: 'Editar manuales' },
  { resource: 'manuals', action: 'delete', description: 'Eliminar manuales' },
  { resource: 'manuals', action: 'publish', description: 'Publicar manuales' },
  
  // Usuarios
  { resource: 'users', action: 'create', description: 'Crear usuarios' },
  { resource: 'users', action: 'read', description: 'Ver usuarios' },
  { resource: 'users', action: 'update', description: 'Editar usuarios' },
  { resource: 'users', action: 'delete', description: 'Eliminar usuarios' },
  
  // Administración
  { resource: 'admin', action: 'smtp', description: 'Configurar SMTP' },
  { resource: 'admin', action: 'logs', description: 'Ver logs de actividad' },
  { resource: 'admin', action: 'dashboard', description: 'Ver dashboard administrativo' },
  { resource: 'admin', action: 'roles', description: 'Gestionar roles y permisos' },
  { resource: 'admin', action: 'settings', description: 'Gestionar configuración del sistema' },
];

// Configuración de roles predefinidos
const SYSTEM_ROLES = [
  {
    name: 'Administrador',
    description: 'Acceso completo a todas las funcionalidades del sistema',
    isSystem: true,
    permissions: PERMISSIONS.map(p => `${p.resource}:${p.action}`), // Todos los permisos
  },
  {
    name: 'Gestor',
    description: 'Puede gestionar clientes, impuestos, tareas y manuales',
    isSystem: true,
    permissions: [
      'clients:create', 'clients:read', 'clients:update', 'clients:export',
      'taxes:create', 'taxes:read', 'taxes:update', 'taxes:upload',
      'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
      'manuals:create', 'manuals:read', 'manuals:update', 'manuals:publish',
      'users:read',
      'admin:dashboard',
    ],
  },
  {
    name: 'Solo Lectura',
    description: 'Solo puede visualizar información, sin permisos de edición',
    isSystem: true,
    permissions: [
      'clients:read',
      'taxes:read',
      'tasks:read',
      'manuals:read',
      'admin:dashboard',
    ],
  },
];

async function migrateRBAC() {
  try {
    console.log('🔄 Iniciando migración a sistema de roles y permisos...\n');

    // 1. Crear todos los permisos
    console.log('📝 Creando permisos...');
    const createdPermissions: Record<string, any> = {};
    
    for (const perm of PERMISSIONS) {
      const permission = await prisma.permissions.upsert({
        where: {
          resource_action: {
            resource: perm.resource,
            action: perm.action,
          },
        },
        update: {},
        create: perm,
      });
      createdPermissions[`${perm.resource}:${perm.action}`] = permission;
      console.log(`  ✓ ${perm.resource}:${perm.action}`);
    }

    // 2. Crear roles del sistema
    console.log('\n👥 Creando roles del sistema...');
    const createdRoles: Record<string, any> = {};

    for (const roleData of SYSTEM_ROLES) {
      const role = await prisma.roles.upsert({
        where: { name: roleData.name },
        update: {
          description: roleData.description,
          isSystem: roleData.isSystem,
        },
        create: {
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
        },
      });

      createdRoles[roleData.name] = role;
      console.log(`  ✓ ${roleData.name}`);

      // 3. Eliminar permisos antiguos y crear nuevos
      await prisma.role_permissions.deleteMany({
        where: { roleId: role.id },
      });

      const rolePermissions = roleData.permissions
        .map(permKey => {
          const permission = createdPermissions[permKey];
          return permission ? {
            roleId: role.id,
            permissionId: permission.id,
          } : null;
        })
        .filter(Boolean);

      if (rolePermissions.length > 0) {
        await prisma.role_permissions.createMany({
          data: rolePermissions as any[],
          skipDuplicates: true,
        });
      }
      console.log(`    → ${roleData.permissions.length} permisos asignados`);
    }

    console.log('\n✅ Migración de RBAC completada exitosamente!');
    console.log(`\n📊 Resumen:`);
    console.log(`   - ${PERMISSIONS.length} permisos creados`);
    console.log(`   - ${SYSTEM_ROLES.length} roles del sistema creados`);
    console.log('\n💡 Nota: El usuario administrador se creará automáticamente');
    console.log('   al iniciar el servidor usando las variables de entorno:');
    console.log('   ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD');

  } catch (error) {
    console.error('❌ Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRBAC();
