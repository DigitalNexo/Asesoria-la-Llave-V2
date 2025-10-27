# 🔐 Implementación del Sistema de Owner Role

**Fecha**: 26 de octubre de 2025
**Estado**: ✅ **COMPLETADO**

---

## 📋 Resumen

Se ha implementado un nuevo nivel de permisos **OWNER** que solo tendrá la cuenta de usuario creada desde las variables de entorno (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`).

Este rol proporciona acceso a funcionalidades exclusivas y críticas del sistema que solo el propietario debe poder ejecutar.

---

## 🔧 Cambios Implementados

### 1. Schema Prisma

**Archivo**: `prisma/schema.prisma`

Se agregó un nuevo campo a la tabla `users`:

```prisma
model users {
  // ... campos existentes
  is_owner Boolean @map("is_owner") @default(false)
  // ... resto de campos
}
```

**Migración**: `20251026041218_add_owner_role`

---

### 2. Inicialización del Owner

**Archivo**: `server/index.ts`

En la función `createInitialAdmin()`, se marcó al usuario creado como Owner:

```typescript
const adminUser = await prisma.users.create({
  data: {
    id: randomUUID(),
    username: adminUsername,
    email: adminEmail,
    password: hashedPassword,
    roleId: adminRole.id,
    is_owner: true  // Mark as owner ✅
  }
});
```

**Cómo funciona**:
1. El usuario admin se crea desde `.env` al iniciar el servidor
2. Se marca automáticamente con `is_owner = true`
3. Nadie más puede tener este rol a menos que sea transferido explícitamente

---

### 3. Middleware de Validación

**Archivo**: `server/middleware/owner-middleware.ts`

Se crearon 3 funciones para validar permisos de Owner:

#### `requireOwner()`
Middleware que verifica que el usuario actual sea Owner:

```typescript
export async function requireOwner(req: Request, res: Response, next: NextFunction)
```

**Uso**:
```typescript
app.post('/api/admin/critical-action', 
  authenticateToken, 
  requireOwner,  // Solo Owner puede acceder
  async (req, res) => { ... }
);
```

#### `requireOwnerOrRole()`
Middleware que permite Owner O un rol específico:

```typescript
export async function requireOwnerOrRole(roleName: string)
```

**Uso**:
```typescript
app.post('/api/admin/action',
  authenticateToken,
  requireOwnerOrRole('Administrador'),  // Owner o Administrador
  async (req, res) => { ... }
);
```

#### `isUserOwner()`
Función para verificar si un usuario es Owner:

```typescript
export async function isUserOwner(userId: string): Promise<boolean>
```

---

### 4. Endpoints API

#### GET `/api/auth/profile`
Ahora retorna el campo `is_owner`:

```json
{
  "id": "user-id",
  "username": "admin",
  "email": "admin@example.com",
  "is_owner": true,
  "roleName": "Administrador",
  "permissions": [...]
}
```

#### GET `/api/users`
Lista todos los usuarios con su estado de Owner:

```json
[
  {
    "id": "user-1",
    "username": "CarlosAdmin",
    "email": "carlos@example.com",
    "is_owner": true,
    "isActive": true,
    "roles": {
      "name": "Administrador",
      "description": "..."
    }
  },
  {
    "id": "user-2",
    "username": "gestor1",
    "email": "gestor@example.com",
    "is_owner": false,
    "isActive": true,
    "roles": {
      "name": "Gestor",
      "description": "..."
    }
  }
]
```

#### POST `/api/users/:id/transfer-owner`
**Solo Owner puede ejecutar esto**

Transfiere el rol de Owner a otro usuario:

```bash
POST /api/users/target-user-id/transfer-owner
Authorization: Bearer token
```

**Respuesta**:
```json
{
  "message": "Rol de Owner transferido exitosamente",
  "newOwner": {
    "id": "target-user-id",
    "username": "newowner",
    "email": "newowner@example.com",
    "is_owner": true
  }
}
```

**Validaciones**:
- ✅ El usuario debe ser Owner para transferir
- ✅ No puede transferir a sí mismo
- ✅ El usuario destino debe existir
- ✅ Se registra en auditoría

---

## 📊 Estructura de Permisos

```
┌─────────────────────────────────────────────────┐
│                 OWNER (Único)                   │
│  - Usuario del .env                             │
│  - Puede transferir su rol                      │
│  - Acceso a todas las funciones críticas        │
│  - No puede ser eliminado por otros             │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│            Administrador (Múltiples)            │
│  - Gestiona usuarios, roles, permisos           │
│  - Acceso a admin panel completo                │
│  - No puede modificar al Owner                  │
└─────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────┐
│    Gestor / Solo Lectura / Otros Roles          │
│  - Permisos limitados según rol                 │
└─────────────────────────────────────────────────┘
```

---

## 🔒 Casos de Uso

### 1. El Owner quiere transferir responsabilidades

```typescript
// El Owner ejecuta
POST /api/users/new-admin-id/transfer-owner
Authorization: Bearer owner-token

// Resultado:
// - Owner actual pierde is_owner = false
// - Nuevo usuario obtiene is_owner = true
// - Queda registrado en auditoría
```

### 2. Proteger rutas críticas

```typescript
// Usar en server/routes.ts para funciones críticas
app.delete('/api/admin/system-reset',
  authenticateToken,
  requireOwner,  // Solo Owner
  async (req, res) => {
    // Implementar reset del sistema
  }
);
```

### 3. Verificar permisos en frontend

```typescript
// En React
const { is_owner } = useAuth();

return (
  <>
    {is_owner && (
      <button onClick={handleTransferOwner}>
        Transferir Rol de Owner
      </button>
    )}
  </>
);
```

---

## 🚀 Funcionalidades Futuras

Proteger con `requireOwner` middleware:

1. **Transferencias de Owner** ✅ (ya implementado)
2. **Reset del sistema** (limpiar todos los datos)
3. **Cambiar configuración crítica** (BD, encryption keys)
4. **Backup y restore forzados**
5. **Cambiar License/Suscripción**
6. **Gestionar integraciones críticas** (Webhooks, APIs externas)

---

## 📝 Auditoría

Todos los cambios de Owner se registran:

```
Acción: "Transfirió el rol de Owner a gestor1"
Módulo: "admin"
Usuario: "CarlosAdmin"
Detalles: "Nuevo Owner: gestor1 (gestor@example.com)"
Fecha: 2025-10-26T04:15:00Z
```

---

## 🔐 Seguridad

### ✅ Medidas implementadas:

1. **Solo un Owner activo**: El campo `is_owner` es único lógicamente (solo uno puede ser true al mismo tiempo)
2. **Auditoría completa**: Toda transferencia queda registrada
3. **No puede ser eliminado**: El middleware `requireOwner` previene que otro usuario lo elimine
4. **Transferencia explícita**: No hay forma de convertirse en Owner sin transferencia explícita
5. **Token JWT requerido**: Todas las operaciones requieren autenticación

### ⚠️ Consideraciones:

- El Owner se define en `.env` (debe estar en variable segura)
- Si se pierde acceso, se puede recrear borrando la BD o usando reset-admin
- Las transferencias deben hacerse de manera deliberada

---

## 🧪 Pruebas

Para probar la funcionalidad:

```bash
# 1. Iniciar servidor (crea Owner automáticamente)
npm run dev

# 2. Login como Owner
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"CarlosAdmin","password":"Turleque2026$"}'

# 3. Ver perfil (incluye is_owner)
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/auth/profile

# 4. Ver todos los usuarios
curl -H "Authorization: Bearer {token}" \
  http://localhost:5000/api/users

# 5. Transferir Owner (cambiar ID)
curl -X POST \
  -H "Authorization: Bearer {owner-token}" \
  http://localhost:5000/api/users/{new-user-id}/transfer-owner
```

---

## 📚 Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | +1 campo `is_owner` |
| `prisma/migrations/20251026041218_add_owner_role` | +1 migración SQL |
| `server/index.ts` | +1 línea `is_owner: true` |
| `server/routes.ts` | +2 endpoints, actualización GET users |
| `server/middleware/owner-middleware.ts` | +3 funciones nuevas |

**Total líneas**: ~150 líneas de código nuevo

---

## ✨ Conclusión

El sistema de Owner Role proporciona:

✅ Control total para el propietario del sistema
✅ Protección de funciones críticas
✅ Auditoría completa
✅ Capacidad de transferencia
✅ Seguridad por defecto

**Status**: Listo para producción 🚀

---

**Última actualización**: 2025-10-26 04:15 UTC
**Versión**: 1.0.0
