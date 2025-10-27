# 🎭 Sistema Mejorado de Gestión de Roles Personalizados

**Fecha**: 26 de octubre de 2025
**Status**: ✅ **COMPLETADO**

---

## 📋 Resumen

Se ha mejorado el sistema de gestión de roles para permitir la creación de roles personalizados con características avanzadas como:

- ✅ Colores y iconos personalizados
- ✅ Permisos específicos para gestión de usuarios
- ✅ Protección de roles del sistema
- ✅ Auditoría completa
- ✅ Validaciones robustas

---

## 🔧 Cambios en la BD

### Schema Prisma (`prisma/schema.prisma`)

Se agregaron nuevos campos al modelo `roles`:

```prisma
model roles {
  // ... campos existentes
  color               String?  @db.VarChar(7) @default("#6366f1")      // Color para UI
  icon                String?  @db.VarChar(50) @default("shield")       // Lucide icon
  can_create_users    Boolean  @default(false) @map("can_create_users")  // Flag específico
  can_delete_users    Boolean  @default(false) @map("can_delete_users")  // Flag específico
  can_manage_roles    Boolean  @default(false) @map("can_manage_roles")  // Flag específico
  is_active           Boolean  @default(true) @map("is_active")          // Desactivar sin borrar
  created_by          String?  @map("created_by") @db.VarChar(36)       // Quién creó el rol
  // ... resto de campos
}
```

**Migración**: `20251026041218_enhance_roles_schema`

---

## 📡 Nuevos Endpoints

### 1. POST `/api/roles` - Crear Rol Personalizado

**Descripción**: Crea un nuevo rol con configuración personalizada.

**Requisitos**: 
- ✅ Autenticación requerida
- ✅ Permiso `admin:roles`

**Body**:
```json
{
  "name": "Gestor de Impuestos",
  "description": "Usuario que gestiona impuestos y declaraciones",
  "color": "#f59e0b",
  "icon": "file-text",
  "can_create_users": false,
  "can_delete_users": false,
  "can_manage_roles": false
}
```

**Respuesta (201)**:
```json
{
  "id": "role-uuid",
  "name": "Gestor de Impuestos",
  "description": "Usuario que gestiona impuestos y declaraciones",
  "color": "#f59e0b",
  "icon": "file-text",
  "can_create_users": false,
  "can_delete_users": false,
  "can_manage_roles": false,
  "is_system": false,
  "is_active": true,
  "created_by": "admin-uuid",
  "createdAt": "2025-10-26T04:20:00Z",
  "updatedAt": "2025-10-26T04:20:00Z",
  "role_permissions": []
}
```

---

### 2. PATCH `/api/roles/:id` - Actualizar Rol

**Descripción**: Actualiza un rol personalizado.

**Restricciones**:
- ❌ No se pueden modificar roles del sistema (`is_system = true`)
- ✅ Solo modificar campos especificados

**Body** (todos opcionales):
```json
{
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "color": "#ec4899",
  "icon": "star",
  "can_create_users": true,
  "can_delete_users": false,
  "can_manage_roles": false,
  "is_active": true
}
```

**Respuesta (200)**:
```json
{
  "id": "role-uuid",
  "name": "Nuevo nombre",
  "description": "Nueva descripción",
  "color": "#ec4899",
  "icon": "star",
  "can_create_users": true,
  "can_delete_users": false,
  "can_manage_roles": false,
  "is_system": false,
  "is_active": true,
  // ... resto de campos
}
```

---

### 3. DELETE `/api/roles/:id` - Eliminar Rol

**Descripción**: Elimina un rol personalizado (no del sistema).

**Restricciones**:
- ❌ No se puede eliminar roles del sistema
- ❌ No se puede eliminar si hay usuarios asignados
- ✅ Se eliminan automáticamente los permisos asociados

**Respuesta (200)**:
```json
{
  "success": true,
  "message": "Rol \"Gestor de Impuestos\" eliminado exitosamente"
}
```

**Errores**:
```json
// Si hay usuarios asignados
{
  "error": "No se puede eliminar el rol: hay 3 usuario(s) asignado(s) a este rol. Reasignalos a otro rol primero.",
  "code": "ROLE_IN_USE"
}

// Si es rol del sistema
{
  "error": "No se pueden eliminar roles del sistema",
  "code": "SYSTEM_ROLE_PROTECTED"
}
```

---

### 4. POST `/api/roles/:id/assign-permissions` - Asignar Permisos

**Descripción**: Asigna un conjunto de permisos a un rol.

**Requisitos**: 
- ✅ Autenticación requerida
- ✅ Permiso `admin:roles`

**Body**:
```json
{
  "permissionIds": [
    "permission-uuid-1",
    "permission-uuid-2",
    "permission-uuid-3"
  ]
}
```

**Respuesta (200)**:
```json
{
  "success": true,
  "message": "3 permisos asignados al rol \"Gestor de Impuestos\"",
  "role": {
    "id": "role-uuid",
    "name": "Gestor de Impuestos",
    "// ... resto de campos
    "role_permissions": [
      {
        "id": "rp-uuid-1",
        "roleId": "role-uuid",
        "permissionId": "permission-uuid-1",
        "permissions": {
          "id": "permission-uuid-1",
          "resource": "impuestos",
          "action": "read",
          "description": "Leer impuestos"
        }
      },
      // ... más permisos
    ]
  }
}
```

---

## 🎨 Colores y Iconos Predefinidos

### Colores Sugeridos

| Color | Hex | Uso |
|-------|-----|-----|
| Indigo (Defecto) | `#6366f1` | Admin, General |
| Amber | `#f59e0b` | Impuestos |
| Green | `#10b981` | Usuarios, Clientes |
| Red | `#ef4444` | Restricciones |
| Purple | `#a855f7` | Premium |
| Pink | `#ec4899` | Soporte |

### Iconos Sugeridos (Lucide)

```
"shield"          // General/Admin
"file-text"       // Documentos
"tax"             // Impuestos
"users"           // Usuarios
"settings"        // Configuración
"eye"             // Solo lectura
"lock"            // Restringido
"star"            // Premium
"activity"        // Logs/Auditoría
"bar-chart-3"     // Reportes
```

---

## 📊 Estructura de Roles

```
┌─────────────────────────────────────────────────┐
│ ROLES DEL SISTEMA (is_system = true)            │
│ ✓ Administrador                                 │
│ ✓ Gestor                                        │
│ ✓ Solo Lectura                                  │
│ ❌ No se pueden modificar, eliminar ni          │
│    cambiar sus permisos                         │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│ ROLES PERSONALIZADOS (is_system = false)        │
│ ✓ Gestor de Impuestos                           │
│ ✓ Auditor                                       │
│ ✓ Soporte                                       │
│ ✓ Custom...                                     │
│ ✅ Se pueden crear, modificar y eliminar       │
│    (si no tienen usuarios asignados)            │
└─────────────────────────────────────────────────┘
```

---

## 🔒 Validaciones

### Crear Rol
- ✅ Nombre requerido
- ✅ Nombre único (no puede duplicarse)
- ✅ Color debe ser código hex válido (opcional)
- ✅ Icon debe existir en Lucide (opcional)

### Actualizar Rol
- ❌ No modificar roles del sistema
- ✅ Validar nombre único si se cambia
- ✅ No cambiar `is_system` ni `created_by`

### Eliminar Rol
- ❌ No eliminar roles del sistema
- ❌ No eliminar si hay usuarios asignados
- ✅ Verificar antes de proceder

### Asignar Permisos
- ❌ No modificar permisos de roles del sistema
- ✅ Reemplazar todos los permisos (no agregar)
- ✅ Validar que los permisos existen

---

## 📝 Auditoría

Todas las operaciones de roles se registran:

```
Acción: "Creó el rol personalizado: Gestor de Impuestos"
Módulo: "admin"
Usuario: "CarlosAdmin"
Fecha: 2025-10-26T04:20:00Z
Detalles: {
  "description": "...",
  "color": "#f59e0b",
  "icon": "file-text",
  "can_create_users": false,
  "can_delete_users": false,
  "can_manage_roles": false
}
```

---

## 🧪 Ejemplos de Uso

### Crear Rol de Gestor de Impuestos

```bash
curl -X POST http://localhost:5001/api/roles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gestor de Impuestos",
    "description": "Gestiona declaraciones y obligaciones fiscales",
    "color": "#f59e0b",
    "icon": "file-text",
    "can_create_users": false,
    "can_delete_users": false,
    "can_manage_roles": false
  }'
```

### Actualizar a Activo/Inactivo

```bash
curl -X PATCH http://localhost:5001/api/roles/role-uuid \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "is_active": false
  }'
```

### Asignar Permisos

```bash
curl -X POST http://localhost:5001/api/roles/role-uuid/assign-permissions \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "permissionIds": [
      "perm-1",
      "perm-2",
      "perm-3"
    ]
  }'
```

### Eliminar Rol

```bash
curl -X DELETE http://localhost:5001/api/roles/role-uuid \
  -H "Authorization: Bearer {token}"
```

---

## ✨ Beneficios

✅ **Flexibilidad**: Crear roles exactos para necesidades específicas
✅ **Control**: Granular sobre qué puede hacer cada rol
✅ **Seguridad**: Protección de roles del sistema
✅ **Escalabilidad**: Fácil crear nuevos roles sin modificar código
✅ **Auditoría**: Registro completo de cambios
✅ **UX**: Colores e iconos para fácil identificación

---

## 🔄 Flujo Típico

1. **Owner/Admin crea un rol personalizado**
   ```
   POST /api/roles
   ```

2. **Selecciona permisos específicos**
   ```
   POST /api/roles/:id/assign-permissions
   ```

3. **Asigna usuarios a ese rol**
   ```
   PATCH /api/users/:userId { roleId: "..." }
   ```

4. **Puede actualizar el rol si es necesario**
   ```
   PATCH /api/roles/:id
   ```

5. **Si ya no es necesario, lo elimina** (sin usuarios)
   ```
   DELETE /api/roles/:id
   ```

---

## 📚 Campos del Rol

| Campo | Tipo | Defecto | Editable | Descripción |
|-------|------|---------|----------|-------------|
| `id` | UUID | Auto | ❌ | Identificador único |
| `name` | String | - | ✅ | Nombre único del rol |
| `description` | String | null | ✅ | Descripción del rol |
| `color` | String | #6366f1 | ✅ | Color hex para UI |
| `icon` | String | shield | ✅ | Nombre de icono Lucide |
| `can_create_users` | Boolean | false | ✅ | Permiso especial |
| `can_delete_users` | Boolean | false | ✅ | Permiso especial |
| `can_manage_roles` | Boolean | false | ✅ | Permiso especial |
| `is_active` | Boolean | true | ✅ | Activar/desactivar |
| `is_system` | Boolean | false | ❌ | Sistema (no editable) |
| `created_by` | UUID | null | ❌ | Quién lo creó |
| `createdAt` | DateTime | now | ❌ | Fecha creación |
| `updatedAt` | DateTime | now | ❌ | Última actualización |

---

## 🚀 Conclusión

Sistema robusto y flexible de gestión de roles que permite:

✅ Crear roles personalizados
✅ Mantener roles del sistema protegidos
✅ Auditoría completa
✅ Validaciones exhaustivas
✅ UX mejorada con colores e iconos

**Status**: Listo para producción 🎉

---

**Última actualización**: 2025-10-26 04:20 UTC
**Versión**: 1.0.0
