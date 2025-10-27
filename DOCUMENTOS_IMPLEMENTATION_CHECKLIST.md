# 🚀 Checklist de Implementación - Módulo de Documentos

## Estado del Módulo: 80% Completo ✅

### ✅ COMPLETADO

#### Frontend (100%)
- [x] Página principal: `documentos.tsx`
- [x] Componente: DocumentList.tsx (lista, búsqueda, filtrado)
- [x] Componente: DocumentUpload.tsx (drag & drop)
- [x] Componente: PaymentReceipt.tsx (recibos de pago)
- [x] Componente: DataProtection.tsx (RGPD)
- [x] Componente: BankingDomiciliation.tsx (domiciliación bancaria)
- [x] Todos los componentes diseñados y sin errores TypeScript

#### Permisos & Roles (100%)
- [x] Agregar 6 nuevos permisos al sistema
- [x] Actualizar script `reset-admin.ts`
- [x] Permisos listos para ser asignados en próxima ejecución

#### Diseño (100%)
- [x] Schema Prisma diseñado (4 modelos nuevos)
- [x] API contracts definidos (12 endpoints)
- [x] Estructuras de datos documentadas
- [x] Flujos de trabajo mapeados

---

## ❌ PENDIENTE - BLOQUEADO POR BASE DE DATOS

### Base de Datos
- [ ] **CRÍTICO**: Restaurar conectividad a 185.239.239.43:3306
  - Estado actual: P1001 "Can't reach database server"
  - Bloqueador: Ningún comando de backend funcionará sin conexión

### Base de Datos (Una vez en línea)
- [ ] Actualizar `prisma/schema.prisma`:
  ```
  Agregar 4 modelos:
  - model documents
  - model document_templates
  - model document_signatures
  - model document_versions
  ```
- [ ] Ejecutar migración:
  ```bash
  npx prisma migrate dev --name add_documents_module
  ```
- [ ] Verificar con: `npx prisma studio`

---

## ⏳ PENDIENTE - BACKEND

### Paso 1: Crear Servicio (Prioridad: ALTA)
**Archivo**: `server/services/document-service.ts`
**Tamaño**: ~300 líneas
**Contenido**:
```
✓ Clase DocumentService
✓ Constructor (inicializa upload directory)
✓ Métodos CRUD:
  - createDocument(data)
  - getDocuments(filters)
  - getDocumentById(id)
  - updateDocument(id, data)
  - deleteDocument(id)
✓ Métodos de Templates:
  - createTemplate(data)
  - getTemplates(type)
✓ Métodos de Firma:
  - signDocument(documentId, userId, signatureType)
  - getSignatures(documentId)
✓ Métodos de Versioning:
  - createVersion(documentId, content, createdBy)
  - getVersions(documentId)
✓ Métodos de Archivos:
  - uploadFile(documentId, file)
  - downloadFile(documentId)
```

**Código completo proporcionado en la sesión anterior**

### Paso 2: Crear Rutas API (Prioridad: ALTA)
**Archivo**: `server/documents.ts`
**Tamaño**: ~250 líneas
**Rutas a implementar**:

```
POST   /api/documents                    [documents:create]
GET    /api/documents                    [documents:read]
GET    /api/documents/:id                [documents:read]
PUT    /api/documents/:id                [documents:update]
DELETE /api/documents/:id                [documents:delete]
POST   /api/documents/:id/sign           [documents:sign]
GET    /api/documents/:id/signatures     [documents:read]
POST   /api/documents/:id/versions       [documents:update]
GET    /api/documents/:id/versions       [documents:read]
POST   /api/documents/:id/upload         [documents:update]
GET    /api/documents/:id/download       [documents:read]
GET    /api/templates                    []
POST   /api/templates                    [admin]
```

**Incluir**:
- Multer para uploads (50MB limit)
- Validación de permisos en cada ruta
- Manejo de errores
- Respuestas JSON estándar

### Paso 3: Registrar Rutas en App (Prioridad: MEDIA)
**Archivo**: `server/index.ts`
**Cambios**:
```typescript
import { documentsRouter } from './documents.ts';

// En registerRoutes():
app.use('/api', documentsRouter);
```

### Paso 4: Actualizar Configuración (Prioridad: MEDIA)
**Archivos a verificar**:
- [ ] `package.json` - Verificar que multer está instalado
- [ ] `.env` - Verificar UPLOADS_PATH (default: './uploads/documents/')
- [ ] Crear directorio `uploads/documents/` si no existe

---

## 🔍 VERIFICACIÓN POST-IMPLEMENTACIÓN

### Pruebas Backend
```bash
# 1. Verificar conexión a BD
npm run prisma:generate

# 2. Ejecutar aplicación
npm run dev

# 3. Testear endpoints básicos
curl -X GET http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Crear documento de prueba
curl -X POST http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_receipt","name":"Test"}'
```

### Pruebas Frontend
- [ ] Página `/documentos` carga sin errores
- [ ] DocumentList muestra documentos
- [ ] DocumentUpload sube archivos correctamente
- [ ] PaymentReceipt genera recibos
- [ ] DataProtection firma documentos
- [ ] BankingDomiciliation valida IBAN

### Pruebas de Permisos
- [ ] Usuario sin permiso no puede crear
- [ ] Usuario sin permiso no puede firmar
- [ ] Admin puede hacer todo
- [ ] Tokens expirados retornan 401

---

## 📋 ORDEN DE EJECUCIÓN RECOMENDADO

### Fase 1: Emergencia 🔴 (BLOQUEADO)
1. Contactar con proveedor de hosting
2. Restaurar conectividad a base de datos
3. Verificar: `npx prisma db execute --stdin`

### Fase 2: Infraestructura 🟡 (Post BD Online)
1. Actualizar `prisma/schema.prisma`
2. Ejecutar migración Prisma
3. Verificar schema en `prisma studio`

### Fase 3: Backend 🟡 (Post BD Online)
1. Crear `server/services/document-service.ts`
2. Crear `server/documents.ts`
3. Registrar rutas en `server/index.ts`
4. Ejecutar `npm run dev`

### Fase 4: Testing 🟢 (Post Backend)
1. Pruebas unitarias del servicio
2. Pruebas de API con curl
3. Pruebas frontend
4. Pruebas de integración completa

---

## 📦 DEPENDENCIAS

### Ya Instaladas ✅
- express
- prisma
- typescript

### Necesarias para Backend
```json
{
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.0"
}
```

**Instalar con**:
```bash
npm install multer uuid
```

---

## 📁 ESTRUCTURA DE DIRECTORIOS FINAL

```
proyecto/
├── server/
│   ├── services/
│   │   └── document-service.ts          ← CREAR
│   ├── documents.ts                     ← CREAR
│   ├── index.ts                         ← MODIFICAR
│   └── ... (otros)
├── client/
│   └── src/
│       ├── pages/
│       │   └── documentos.tsx           ✅ HECHO
│       └── components/documentos/
│           ├── DocumentList.tsx         ✅ HECHO
│           ├── DocumentUpload.tsx       ✅ HECHO
│           ├── PaymentReceipt.tsx       ✅ HECHO
│           ├── DataProtection.tsx       ✅ HECHO
│           └── BankingDomiciliation.tsx ✅ HECHO
├── prisma/
│   └── schema.prisma                    ← ACTUALIZAR
├── uploads/
│   └── documents/                       ← CREAR
└── DOCUMENTOS_MODULE_README.md          ✅ HECHO
```

---

## ⚠️ PUNTOS CRÍTICOS

### CRÍTICO 🔴
- [ ] Base de datos: DEBE estar online
- [ ] Prisma migration: DEBE ejecutarse
- [ ] Permisos: DEBEN ejecutar `npm run reset:admin`

### IMPORTANTE 🟡
- [ ] Directorio uploads debe existir
- [ ] Multer debe estar instalado
- [ ] Variables de entorno configuradas

### RECOMENDADO 🟢
- [ ] Tests escritos para cada endpoint
- [ ] Logging de auditoría activado
- [ ] Validación de IBAN en backend también

---

## 🎯 HITOS

| Hito | Estado | Fecha Est. | Bloqueador |
|------|--------|-----------|-----------|
| Frontend 100% | ✅ HECHO | - | Ninguno |
| Permisos | ✅ HECHO | - | Ninguno |
| BD Online | ⏳ ESPERANDO | - | **Base de Datos** |
| Schema Prisma | ⏳ ESPERANDO | Post-BD | BD |
| Servicio Backend | ⏳ ESPERANDO | Post-BD | BD |
| Rutas API | ⏳ ESPERANDO | Post-Servicio | BD + Servicio |
| Testing | ⏳ ESPERANDO | Post-Rutas | Todo |
| Producción | ⏳ ESPERANDO | Post-Testing | Todo |

---

## 📞 CONTACTOS Y REFERENCIAS

**Código Proporcionado**:
- ✅ Document Service (listo para copiar)
- ✅ Routes (listo para implementar)
- ✅ Frontend Components (listo)

**Documentación**:
- 📖 `DOCUMENTOS_MODULE_README.md`
- 📖 `DEPLOYMENT.md` (para deploy)

**Estado del Sistema**:
- ✅ Autenticación: Funcionando
- ✅ RBAC: Funcionando
- 🔴 Base de Datos: DOWN (P1001)
- 🟡 Documentos Backend: Pendiente

---

**Última Actualización**: 26 de Octubre de 2025 20:15 UTC
**Versión**: 1.0
**Estado General**: 80% Completado - Bloqueado por Base de Datos
