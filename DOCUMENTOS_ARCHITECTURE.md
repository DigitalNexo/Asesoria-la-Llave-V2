# 🏗️ Arquitectura del Módulo de Documentos

## 📐 Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                        │
│                      (Frontend - React)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  documentos.tsx (Main Page)                                      │
│  ├── Tab: Todos                                                  │
│  │   └── <DocumentList />                                        │
│  ├── Tab: Recibos de Pago                                        │
│  │   └── <PaymentReceipt />                                      │
│  ├── Tab: Protección de Datos                                    │
│  │   └── <DataProtection />                                      │
│  ├── Tab: Domiciliación                                          │
│  │   └── <BankingDomiciliation />                                │
│  └── Tab: Subir Documentos                                       │
│      └── <DocumentUpload />                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────┐
            │   HTTP / Fetch API            │
            │   Authorization: JWT Token    │
            └───────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CAPA DE APLICACIÓN (Backend)                    │
│                    (Node.js / Express)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Middleware Layer                                                │
│  ├── authenticateToken()  ← JWT Verification                    │
│  ├── checkPermission()    ← RBAC Authorization                  │
│  └── errorHandler()       ← Error Handling                       │
│                                                                   │
│  API Routes (documents.ts) - 15 Endpoints                        │
│  ├── POST   /api/documents           [documents:create]         │
│  ├── GET    /api/documents           [documents:read]           │
│  ├── GET    /api/documents/:id       [documents:read]           │
│  ├── PUT    /api/documents/:id       [documents:update]         │
│  ├── DELETE /api/documents/:id       [documents:delete]         │
│  ├── POST   /api/documents/:id/sign  [documents:sign]           │
│  ├── GET    /api/documents/:id/signatures                       │
│  ├── POST   /api/documents/:id/versions                         │
│  ├── GET    /api/documents/:id/versions                         │
│  ├── POST   /api/documents/:id/upload [documents:update]        │
│  ├── GET    /api/documents/:id/download [documents:read]        │
│  ├── GET    /api/templates                                      │
│  ├── POST   /api/templates           [admin:templates]          │
│  ├── GET    /api/documents/stats/all                            │
│  ├── GET    /api/documents/client/:id                           │
│  ├── GET    /api/documents/search/:query                        │
│  └── PUT    /api/documents/:id/archive                          │
│                                                                   │
│  Service Layer (document-service.ts)                             │
│  └── DocumentService class                                       │
│      ├── CRUD Methods (18+)                                     │
│      ├── Signature Methods                                      │
│      ├── Version Control Methods                                │
│      ├── File Management Methods                                │
│      └── Utility Methods                                        │
│                                                                   │
│  File Upload (Multer)                                           │
│  ├── Memory Storage                                             │
│  ├── 50MB Limit                                                 │
│  ├── MIME Type Filtering                                        │
│  └── uploads/documents/ Directory                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
            ┌───────────────────────────────┐
            │   Prisma ORM                  │
            │   (Type-safe DB Queries)      │
            └───────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE DATOS (Database)                      │
│                   (MySQL / MariaDB)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  documents                                                       │
│  ├── id, type, name, description                                │
│  ├── template_id (FK), client_id (FK), created_by (FK)         │
│  ├── file_path, file_name, file_size, file_type               │
│  ├── status, signature_status, signature_date, signed_by       │
│  └── created_at, updated_at                                    │
│                                                                   │
│  document_templates                                              │
│  ├── id, type, name, description                                │
│  ├── content (LongText)                                         │
│  ├── variables (JSON)                                           │
│  └── is_active, created_at, updated_at                         │
│                                                                   │
│  document_signatures                                             │
│  ├── id, document_id (FK), signed_by (FK)                       │
│  ├── signature_date, signature_type                             │
│  ├── ip_address, user_agent                                     │
│  └── created_at                                                 │
│                                                                   │
│  document_versions                                               │
│  ├── id, document_id (FK), version                              │
│  ├── content (LongText), created_by (FK)                        │
│  └── created_at                                                 │
│                                                                   │
│  Foreign Keys to:                                                │
│  ├── users (id)                                                 │
│  ├── clients (id)                                               │
│  └── document_templates (id)                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Datos - Crear Documento

```
┌──────────────────┐
│ Frontend Form    │
│ (React State)    │
└────────┬─────────┘
         │
         │ Validación Local
         │ ├── Campos requeridos
         │ ├── Tipos de datos
         │ └── Formatos (IBAN, Email)
         ↓
    ┌────────────────────────────────┐
    │ API Call: POST /api/documents   │
    │ Headers: { JWT Token }          │
    │ Body: { type, name, description}│
    └────────┬───────────────────────┘
             │
             ↓ HTTP Request
    ┌─────────────────────────────────────┐
    │ Backend - Express Route Handler      │
    │ POST /api/documents                 │
    └────────┬────────────────────────────┘
             │
             ├─→ authenticateToken()        [JWT Validation]
             │   ├─ Extract token from header
             │   ├─ Verify signature
             │   └─ Extract user info
             │
             ├─→ checkPermission()          [RBAC Check]
             │   └─ User has documents:create?
             │
             └─→ Route Handler
                 │
                 └─→ documentService.createDocument()
                     │
                     ├─ Validate input
                     ├─ Generate UUID
                     └─→ Prisma Query
                         │
                         ↓
                    ┌──────────────────┐
                    │ Database Insert  │
                    │ INTO documents   │
                    └────────┬─────────┘
                             │
                             ↓ INSERT Success
                    ┌──────────────────────────┐
                    │ Return Created Document  │
                    │ { id, type, name, ... }  │
                    └────────┬─────────────────┘
                             │
                             ↓ HTTP Response (201)
                    ┌──────────────────────────┐
                    │ Frontend - Update State  │
                    │ & Show Success Message   │
                    └──────────────────────────┘
```

---

## 🔐 Flujo de Autenticación y Autorización

```
                    Request
                       ↓
              ┌─────────────────────┐
              │ authenticateToken() │
              └────────┬────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   Header        Token               Extract
   Valid?        Valid?              Payload
   
   NO ──────────────────────→ 401 Unauthorized
   
   YES                         ↓
        ┌───────────────────────────────────┐
        │ user = {                          │
        │   id: "uuid",                     │
        │   email: "user@example.com",      │
        │   roles: [{ role_permissions }]   │
        │ }                                 │
        └────────┬────────────────────────┘
                 │
                 ↓
          ┌─────────────────────┐
          │ checkPermission()    │
          │ ("documents:read")   │
          └────────┬────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
   Is Admin?            Has Permission?
    
   YES ────→ PASS (Auto-pass admins)
   
   NO ──→ Check role_permissions
         │
         ├─ FOUND ──→ PASS
         └─ NOT FOUND ──→ 403 Forbidden
```

---

## 📤 Flujo de Carga de Archivo

```
User selects file(s)
        ↓
┌──────────────────────┐
│ DocumentUpload.tsx   │
│ ├─ Validate files    │
│ ├─ Create document   │
│ └─ Upload to server  │
└─────────┬────────────┘
          │
    API: POST /api/documents
    └──────→ Create empty document
            ← Returns { id }
          │
          ↓
    API: POST /api/documents/:id/upload
    ├─ FormData with file
    └──────→ Multer middleware
            │
            ├─ Verify file type (whitelist)
            ├─ Check file size (50MB)
            └─ Store in memory buffer
            
            ↓
    DocumentService.uploadFile()
    ├─ Generate unique filename
    ├─ Write to disk: uploads/documents/
    └─ Update document record
       ├─ file_path
       ├─ file_name
       ├─ file_size
       └─ file_type
    
            ↓
    Response 200 OK
    └──────→ Frontend shows success
            & updates document
```

---

## 🖊️ Flujo de Firma Digital

```
User clicks "Sign Document"
        ↓
Frontend Dialog: Select signature type
├─ Digital
├─ Electronic
└─ Manual
        │
        ↓ User selects + clicks "Sign"
        │
    API: POST /api/documents/:id/sign
    Body: { signatureType: "digital" }
        │
        ├─ authenticateToken() ✓
        └─ checkPermission("documents:sign") ✓
        
        ↓
    DocumentService.signDocument()
    ├─ Create signature record
    │  ├─ signature_id (UUID)
    │  ├─ document_id
    │  ├─ signed_by (user.id)
    │  ├─ signature_type
    │  ├─ ip_address (request.ip)
    │  ├─ user_agent (request headers)
    │  └─ signature_date (NOW)
    │
    └─ Update document
       ├─ status = "signed"
       ├─ signature_status = "signed"
       ├─ signature_date = NOW
       ├─ signed_by = user.id
       └─ updated_at = NOW
    
        ↓ INSERT INTO database
        
    Response 200 OK
    { signature record + document }
        
        ↓ Frontend
    ├─ Update UI (green checkmark)
    ├─ Disable sign button
    └─ Show signed date
```

---

## 📊 Relaciones en Base de Datos

```
users
  ├── 1 ──→ *  documents (created_by)
  ├── 1 ──→ *  document_signatures (signed_by)
  └── 1 ──→ *  document_versions (created_by)

clients
  └── 1 ──→ *  documents (client_id)

document_templates
  └── 1 ──→ *  documents (template_id)

documents
  ├── * ──→ 1  users (created_by)
  ├── * ──→ 1  clients (client_id)
  ├── * ──→ 1  document_templates (template_id)
  ├── 1 ──→ *  document_signatures
  └── 1 ──→ *  document_versions

document_signatures
  ├── * ──→ 1  documents (document_id)
  └── * ──→ 1  users (signed_by)

document_versions
  ├── * ──→ 1  documents (document_id)
  └── * ──→ 1  users (created_by)
```

---

## 🔄 Estados de Documento

```
┌─────────────┐
│   draft     │  Nuevo documento, sin completar
└──────┬──────┘
       │ Usuario marca como listo
       ↓
┌──────────────────┐
│ pending_signature│  Esperando firma
└──────┬───────────┘
       │ Usuario firma
       ↓
┌─────────────┐
│   signed    │  Firmado, confirmado
└──────┬──────┘
       │ Documento procesado
       ├────→ Para recibos: enviado
       ├────→ Para domiciliación: activado
       └────→ Para RGPD: archivado
       │
       ↓
┌──────────────┐
│   active     │  En vigor / Activo
└──────┬───────┘
       │ Usuario cancela / archiva
       ↓
┌──────────────┐
│ cancelled    │  Cancelado
│ archived     │  Archivado
└──────────────┘
```

---

## 📋 Tipos de Documentos Soportados

```
┌─────────────────────────────────────────────────────────────┐
│                    TIPOS DE DOCUMENTOS                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. payment_receipt                                          │
│     ├─ Template: Recibo de pago                             │
│     ├─ Campos: Cliente, Importe, Concepto, Fecha           │
│     ├─ Formato: PDF                                         │
│     └─ Workflow: draft → generated → sent                   │
│                                                               │
│  2. data_protection                                          │
│     ├─ Template: RGPD/LOPDGDD                               │
│     ├─ Campos: Tipos de datos, Consentimiento              │
│     ├─ Compliance: RGPD (UE 2016/679)                       │
│     └─ Workflow: pending → signed → archived               │
│                                                               │
│  3. banking_domiciliation                                   │
│     ├─ Template: Autorización domiciliación               │
│     ├─ Campos: IBAN, Importe mensual, Concepto            │
│     ├─ Validación: IBAN format                             │
│     └─ Workflow: pending → signed → active → cancelled     │
│                                                               │
│  4. other                                                    │
│     ├─ Template: Genérico                                   │
│     ├─ Campos: Libres                                       │
│     ├─ Formato: Múltiple                                    │
│     └─ Workflow: Custom                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 Matriz de Permisos

```
┌─────────────────┬───────┬───────┬───────┬────────┐
│ Recurso         │ Admin │ Gestor│ Lecto │ Ninguno│
├─────────────────┼───────┼───────┼───────┼────────┤
│ create          │   ✅  │  ✅   │  ❌   │  ❌    │
│ read            │   ✅  │  ✅   │  ✅   │  ❌    │
│ update          │   ✅  │  ✅   │  ❌   │  ❌    │
│ delete          │   ✅  │  ✅   │  ❌   │  ❌    │
│ sign            │   ✅  │  ✅   │  ❌   │  ❌    │
│ download        │   ✅  │  ✅   │  ✅   │  ❌    │
└─────────────────┴───────┴───────┴───────┴────────┘

Admin: Auto-pass todo
Gestor: Permisos explícitos
Lectura: Solo lectura y descarga
Ninguno: 403 Forbidden
```

---

## 📁 Estructura de Almacenamiento

```
project/
├── uploads/
│   └── documents/
│       ├── uuid-1234567890-recibo.pdf
│       ├── uuid-1234567891-rgpd.pdf
│       ├── uuid-1234567892-domiciliacion.pdf
│       └── uuid-1234567893-documento.txt
│
├── server/
│   ├── services/
│   │   └── document-service.ts ← Lee/escribe archivos aquí
│   └── documents.ts ← Rutas que usan documentService
│
└── client/
    └── src/
        ├── pages/
        │   └── documentos.tsx ← UI principal
        └── components/documentos/
            ├── DocumentList.tsx ← Lista
            ├── DocumentUpload.tsx ← Upload
            ├── PaymentReceipt.tsx ← Recibos
            ├── DataProtection.tsx ← RGPD
            └── BankingDomiciliation.tsx ← Domiciliación
```

---

## 🚀 Ciclo de Vida Completo

```
START
  │
  ├─→ 1. Usuario accede a /documentos
  │      ├─ Frontend carga componentes
  │      └─ Obtiene documentos existentes (GET /api/documents)
  │
  ├─→ 2. Usuario crea nuevo documento
  │      ├─ Completa formulario
  │      └─ POST /api/documents → Backend crea record
  │
  ├─→ 3. Usuario sube archivo (opcional)
  │      ├─ Selecciona archivo
  │      └─ POST /api/documents/:id/upload → Guardado
  │
  ├─→ 4. Usuario firma documento
  │      ├─ Confirma acción
  │      └─ POST /api/documents/:id/sign → Registra firma
  │
  ├─→ 5. Usuario descarga documento
  │      ├─ Solicita descarga
  │      └─ GET /api/documents/:id/download → Retorna archivo
  │
  ├─→ 6. Sistema archiva documento
  │      ├─ Después de cierto tiempo
  │      └─ PUT /api/documents/:id/archive → Estado archivado
  │
  └─→ END
```

---

**Diagrama v1.0**
**Última actualización**: 26 de Octubre de 2025
