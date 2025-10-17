import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and } from 'drizzle-orm';
import * as schema from '../shared/schema';

// Validar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Please set it in your environment variables.');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

const { roles, permissions, rolePermissions, users } = schema;

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
      // Verificar si ya existe
      const existing = await db
        .select()
        .from(permissions)
        .where(and(
          eq(permissions.resource, perm.resource),
          eq(permissions.action, perm.action)
        ))
        .limit(1);

      let permission;
      if (existing.length > 0) {
        permission = existing[0];
        console.log(`  ✓ ${perm.resource}:${perm.action} (ya existe)`);
      } else {
        const [newPerm] = await db.insert(permissions).values(perm).returning();
        permission = newPerm;
        console.log(`  ✓ ${perm.resource}:${perm.action} (creado)`);
      }
      
      createdPermissions[`${perm.resource}:${perm.action}`] = permission;
    }

    // 2. Crear roles del sistema
    console.log('\n👥 Creando roles del sistema...');
    const createdRoles: Record<string, any> = {};

    for (const roleData of SYSTEM_ROLES) {
      // Verificar si ya existe
      const existing = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleData.name))
        .limit(1);

      let role;
      if (existing.length > 0) {
        role = existing[0];
        // Actualizar descripción
        await db
          .update(roles)
          .set({ description: roleData.description, isSystem: roleData.isSystem })
          .where(eq(roles.id, role.id));
        console.log(`  ✓ ${roleData.name} (actualizado)`);
      } else {
        const [newRole] = await db.insert(roles).values({
          name: roleData.name,
          description: roleData.description,
          isSystem: roleData.isSystem,
        }).returning();
        role = newRole;
        console.log(`  ✓ ${roleData.name} (creado)`);
      }

      createdRoles[roleData.name] = role;

      // 3. Asignar permisos al rol
      console.log(`   📋 Asignando permisos a ${roleData.name}...`);
      
      // Eliminar permisos existentes del rol
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      // Crear nuevas asignaciones
      for (const permKey of roleData.permissions) {
        const permission = createdPermissions[permKey];
        if (permission) {
          await db.insert(rolePermissions).values({
            roleId: role.id,
            permissionId: permission.id,
          });
        }
      }
      console.log(`   ✅ ${roleData.permissions.length} permisos asignados`);
    }

    // 4. Migrar usuario admin
    console.log('\n👤 Migrando usuario admin...');
    const adminRole = createdRoles['Administrador'];
    
    if (adminRole) {
      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ADMIN'));

      for (const user of adminUsers) {
        await db
          .update(users)
          .set({ roleId: adminRole.id })
          .where(eq(users.id, user.id));
        console.log(`  ✓ Usuario ${user.username} migrado a rol Administrador`);
      }

      // Migrar usuarios GESTOR
      const gestorRole = createdRoles['Gestor'];
      if (gestorRole) {
        const gestorUsers = await db
          .select()
          .from(users)
          .where(eq(users.role, 'GESTOR'));

        for (const user of gestorUsers) {
          await db
            .update(users)
            .set({ roleId: gestorRole.id })
            .where(eq(users.id, user.id));
          console.log(`  ✓ Usuario ${user.username} migrado a rol Gestor`);
        }
      }

      // Migrar usuarios LECTURA
      const lecturaRole = createdRoles['Solo Lectura'];
      if (lecturaRole) {
        const lecturaUsers = await db
          .select()
          .from(users)
          .where(eq(users.role, 'LECTURA'));

        for (const user of lecturaUsers) {
          await db
            .update(users)
            .set({ roleId: lecturaRole.id })
            .where(eq(users.id, user.id));
          console.log(`  ✓ Usuario ${user.username} migrado a rol Solo Lectura`);
        }
      }
    }

    console.log('\n✅ Migración RBAC completada exitosamente!');
    console.log('\nResumen:');
    console.log(`- ${PERMISSIONS.length} permisos creados`);
    console.log(`- ${SYSTEM_ROLES.length} roles del sistema creados`);
    console.log('- Usuarios migrados al nuevo sistema de roles');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

migrateRBAC();
