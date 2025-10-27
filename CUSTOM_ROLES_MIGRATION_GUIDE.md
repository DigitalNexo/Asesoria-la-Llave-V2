# 🚀 Guía: Aplicar Migración de Roles Personalizados

## Estado Actual

✅ **Completado**:
- Servidor corriendo exitosamente en puerto 5001
- Todos los endpoints de roles implementados y funcionales
- Código adaptado para trabajar sin los campos nuevos (compatibilidad temporal)
- Documentación completa creada

⏳ **Pendiente**:
- Aplicar migración de base de datos para agregar 7 nuevos campos a la tabla `roles`

---

## 🔄 Próximos Pasos

### Opción 1: Aplicar Migración Automática (RECOMENDADO)

```bash
cd /Users/usuario/Documents/Repositorios/Asesoria-La-Llave
npx prisma migrate dev --name enhance_roles_schema
```

**Nota**: Si pide confirmación interactiva, presiona `Enter` para confirmar.

### Opción 2: Generar SQL Manual (Si Opción 1 falla)

```bash
# Ver la migración pendiente
npx prisma migrate status

# Generar SQL sin aplicar
npx prisma migrate resolve --rolled-back "20251026041218_enhance_roles_schema"
```

---

## 📊 Campos Nuevos que se Agregarán

Cuando la migración se aplique, la tabla `roles` tendrá estos nuevos campos:

| Campo | Tipo | Descripción | Por Defecto |
|-------|------|-------------|-------------|
| `color` | VARCHAR(7) | Color hex para UI (ej: #6366f1) | #6366f1 |
| `icon` | VARCHAR(50) | Nombre del icono (ej: shield) | shield |
| `can_create_users` | BOOLEAN | Permiso para crear usuarios | false |
| `can_delete_users` | BOOLEAN | Permiso para eliminar usuarios | false |
| `can_manage_roles` | BOOLEAN | Permiso para gestionar roles | false |
| `is_active` | BOOLEAN | Si el rol está activo | true |
| `created_by` | VARCHAR(36) | ID del usuario que creó el rol | NULL |

---

## 🧪 Probar Endpoints de Roles

Una vez que la migración se aplique, puedes probar los endpoints:

### 1. Crear un Rol Personalizado
```bash
curl -X POST http://localhost:5001/api/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Auditor",
    "description": "Rol para auditorías",
    "color": "#ef4444",
    "icon": "eye",
    "can_create_users": false,
    "can_delete_users": false,
    "can_manage_roles": false
  }'
```

### 2. Obtener Todos los Roles
```bash
curl -X GET http://localhost:5001/api/roles \
  -H "Authorization: Bearer TU_TOKEN"
```

### 3. Actualizar un Rol
```bash
curl -X PATCH http://localhost:5001/api/roles/ROLE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "name": "Auditor Senior",
    "color": "#dc2626"
  }'
```

### 4. Asignar Permisos a un Rol
```bash
curl -X POST http://localhost:5001/api/roles/ROLE_ID/assign-permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{
    "permissionIds": ["PERMISSION_ID_1", "PERMISSION_ID_2"]
  }'
```

### 5. Eliminar un Rol
```bash
curl -X DELETE http://localhost:5001/api/roles/ROLE_ID \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## 🔒 Protecciones Implementadas

✅ Roles del sistema (`is_system: true`) no pueden modificarse
✅ No se pueden eliminar roles con usuarios asignados
✅ Nombres de roles deben ser únicos
✅ Solo admin puede crear/modificar/eliminar roles
✅ Se registra auditoría de todas las operaciones

---

## 📝 Notas Técnicas

### Compatibilidad Temporal
El código actualmente:
- Crea roles usando solo campos base (name, description, is_system)
- Enriquece respuestas con valores por defecto para campos nuevos
- Almacenará los nuevos valores **en memoria** hasta que se aplique la migración
- Una vez migrada la BD, almacenará persistentemente

### Ubicación de Cambios
- **Rutas**: `/server/routes.ts` (líneas 2862-3300)
- **Middleware**: `/server/middleware/owner-middleware.ts`
- **Schema**: `/prisma/schema.prisma`
- **Funciones Storage**: `/server/prisma-storage.ts`

---

## ✅ Checklist Final

- [x] Servidor iniciado exitosamente
- [x] Todos los endpoints de roles coded
- [x] Compatibilidad temporal implementada
- [x] Auditoría registrando operaciones
- [ ] Migración aplicada a BD (SIGUIENTE)
- [ ] Campos persistentes en BD (DESPUÉS)
- [ ] Pruebas completas de roles personalizados
- [ ] Documentación del cliente/frontend (OPCIONAL)

---

## 🆘 Troubleshooting

### Error: "Rol no encontrado"
- Verifica que el rol existe: `GET /api/roles`
- Confirma el ROLE_ID

### Error: "Ya existe un rol con ese nombre"
- El nombre de rol debe ser único
- Elige otro nombre

### Error: "No se pueden eliminar roles del sistema"
- No puedes eliminar: Administrador, Gestor, Lectura
- Son roles protegidos del sistema

### Error: Conectando a BD
- Verifica: `185.239.239.43:3306`
- Confirma credentials en `.env`

---

## 📚 Referencias

- **Documentación Roles**: `/CUSTOM_ROLES_IMPLEMENTATION.md`
- **Documentación Owner**: `/OWNER_ROLE_IMPLEMENTATION.md`
- **Schema Prisma**: `/prisma/schema.prisma`
