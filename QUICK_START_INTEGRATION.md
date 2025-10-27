# ⚡ Quick Start - Integración Rápida del Módulo

## 🚀 Cuando la BD esté Online (Estimado: 30 minutos)

### Fase 1: Setup (5 minutos)

```bash
# 1. Clonar cambios más recientes
git pull

# 2. Instalar dependencias nuevas (si es necesario)
npm install multer uuid

# 3. Verificar conexión a BD
npx prisma db execute --stdin < /dev/null
```

---

### Fase 2: Schema Prisma (5 minutos)

```bash
# 1. Abrir prisma/schema.prisma
nano prisma/schema.prisma

# 2. Copiar al final los 4 modelos de:
#    PRISMA_SCHEMA_UPDATES.md

# 3. Guardar y cerrar

# 4. Generar tipos
npx prisma generate

# 5. Crear migración
npx prisma migrate dev --name add_documents_module

# 6. Verifi en Prisma Studio
npx prisma studio
#    Deberías ver 4 nuevas tablas
```

---

### Fase 3: Backend (10 minutos)

```bash
# 1. El código ya existe en el repo:
#    ✅ server/services/document-service.ts
#    ✅ server/documents.ts

# 2. Actualizar server/index.ts
#    Agregar al final de imports:
#    import { documentsRouter } from './documents.ts';
#
#    Y en registerRoutes():
#    app.use('/api', documentsRouter);

# 3. Crear directorio (si no existe)
mkdir -p uploads/documents
chmod 755 uploads/documents

# 4. Verificar .env
# Debe contener:
# DATABASE_URL="mysql://app_area:PASSWORD@185.239.239.43:3306/area_privada"
# UPLOADS_PATH="./uploads/documents"
```

---

### Fase 4: Permisos (3 minutos)

```bash
# 1. El código ya está actualizado
#    Los permisos están en server/reset-admin.ts

# 2. Ejecutar
npm run reset:admin

# 3. Verificar en base de datos
npx prisma studio
# Navega a role_permissions y verifica:
# ✅ documents:create
# ✅ documents:read
# ✅ documents:update
# ✅ documents:delete
# ✅ documents:sign
# ✅ documents:download
```

---

### Fase 5: Testing (7 minutos)

```bash
# 1. Iniciar servidor
npm run dev

# 2. Test básico
curl -X GET http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Crear documento
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_receipt",
    "name": "Test Receipt",
    "description": "Test"
  }'

# 4. Abrir en navegador
open http://localhost:3000/documentos
```

---

## 📊 Status Check

**Completación antes de BD online:**

| Item | Status |
|------|--------|
| Frontend Components | ✅ HECHO |
| Backend Service | ✅ HECHO |
| Backend Routes | ✅ HECHO |
| Permisos RBAC | ✅ HECHO |
| Documentación | ✅ HECHO |
| **BLOQUEADOR** | |
| Base de Datos | 🔴 OFFLINE |

---

## 🎯 Orden de Tareas Exacto

```bash
# Una vez BD esté online:

# 1. Generar Prisma
npx prisma generate

# 2. Migrar BD
npx prisma migrate dev --name add_documents_module

# 3. Crear directorio
mkdir -p uploads/documents

# 4. Actualizar server/index.ts (2 líneas)
# Agregar import y ruta

# 5. Reset admin
npm run reset:admin

# 6. Test
npm run dev

# 7. Verificar
# - http://localhost:3000/documentos debería cargar
# - Debería poder crear documentos
# - API debería responder
```

---

## 🔍 Verificación Final

Cuando todo esté integrado, ejecuta:

```bash
# Checklist
✅ curl -X GET http://localhost:3000/api/documents \
     -H "Authorization: Bearer TOKEN"

✅ curl -X GET http://localhost:3000/api/templates

✅ Browser: http://localhost:3000/documentos

✅ npx prisma studio
   # Ver 4 nuevas tablas

✅ npm run dev
   # Sin errores en consola
```

---

## 🆘 Si algo falla

### Error: "Property 'documents' does not exist"
```bash
# Ejecutaste antes de migración
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### Error: "Can't reach database server"
```bash
# BD aún está offline
# Contactar hosting
# Verificar: ping 185.239.239.43
```

### Error: "File upload directory doesn't exist"
```bash
mkdir -p uploads/documents
chmod 755 uploads/documents
npm run dev
```

---

## 📝 Cambios Requeridos en server/index.ts

Localiza donde se registran las rutas (busca algo como):

```typescript
// ANTES
app.use('/api', usersRouter);
app.use('/api', clientsRouter);
// ... otros routers

// DESPUÉS (agregar esta línea)
import { documentsRouter } from './documents.ts';

// ...
app.use('/api', usersRouter);
app.use('/api', clientsRouter);
app.use('/api', documentsRouter);  // ← AGREGAR ESTA LÍNEA
// ... otros routers
```

---

## ✅ Checklist de Integración

- [ ] BD Online (185.239.239.43:3306)
- [ ] `npm install multer uuid`
- [ ] Prisma generate
- [ ] Prisma migrate
- [ ] Verificar schema en Prisma Studio
- [ ] mkdir uploads/documents
- [ ] Actualizar server/index.ts
- [ ] npm run reset:admin
- [ ] npm run dev (sin errores)
- [ ] Probar endpoints curl
- [ ] Abrir /documentos en navegador
- [ ] Crear documento de prueba
- [ ] Subir archivo
- [ ] Firmar documento
- [ ] Descargar documento
- [ ] ✅ INTEGRACIÓN COMPLETA

---

## 📞 Recursos

**Si necesitas más info:**
- 📖 `DOCUMENTOS_MODULE_README.md` - Guía general
- 🔧 `PRISMA_SCHEMA_UPDATES.md` - Detalles schema
- ✅ `DOCUMENTOS_IMPLEMENTATION_CHECKLIST.md` - Pasos detallados
- 📊 `DOCUMENTOS_COMPLETION_SUMMARY.md` - Resumen técnico

---

## ⏰ Timeline Estimado

```
Pre-requisito: BD Online
├─ Fase 1 (Setup):        5 min
├─ Fase 2 (Schema):       5 min
├─ Fase 3 (Backend):     10 min
├─ Fase 4 (Permisos):     3 min
├─ Fase 5 (Testing):      7 min
└─ TOTAL:               30 min
```

---

**Notas:**
- ✅ Todo el código ya está listo
- ✅ Solo necesitas copiar/registrar
- ✅ BD es el único bloqueador
- ✅ Una vez online: 30 minutos

**Éxito en la integración! 🚀**
