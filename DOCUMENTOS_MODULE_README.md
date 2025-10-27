# 📄 Módulo de Documentos - Guía de Implementación

## 📋 Resumen

El módulo de Documentos permite gestionar y organizar:
- ✅ Recibos de Pago
- ✅ Documentación de Protección de Datos (RGPD)
- ✅ Domiciliaciones Bancarias de Honorarios
- ✅ Otros Documentos Personalizados
- ✅ Firmas Digitales
- ✅ Versionado de Documentos

## 🗂️ Estructura de Archivos

### Backend

```
server/
├── documents.ts                           # Rutas API
├── services/
│   └── document-service.ts                # Lógica de negocio
└── Modelos en Prisma:
    ├── documents                          # Documentos
    ├── document_templates                 # Plantillas
    ├── document_signatures                # Firmas digitales
    └── document_versions                  # Historial de versiones
```

### Frontend

```
client/src/
├── pages/
│   └── documentos.tsx                    # Página principal
└── components/documentos/
    ├── DocumentList.tsx                  # Lista general
    ├── DocumentUpload.tsx                # Carga de archivos
    ├── PaymentReceipt.tsx                # Recibos de pago
    ├── DataProtection.tsx                # RGPD/Protección
    └── BankingDomiciliation.tsx          # Domiciliación bancaria
```

## 🗄️ Schema de Prisma

### Modelo: documents
```prisma
model documents {
  id                String                    @id
  type              String                    // "payment_receipt", "data_protection", "banking_domiciliation", "other"
  name              String
  description       String?
  template_id       String?
  client_id         String?
  created_by        String                   // Usuario que creó
  file_path         String?
  file_name         String?
  file_size         Int?
  file_type         String?
  status            String                   @default("draft")
  signature_status  String?                  @default("unsigned")
  signature_date    DateTime?
  signed_by         String?
  created_at        DateTime                 @default(now())
  updated_at        DateTime
  
  clients           clients?
  users             users
  template          document_templates?
  signatures        document_signatures[]
  versions          document_versions[]
}
```

### Modelo: document_templates
```prisma
model document_templates {
  id                String    @id
  type              String    // "payment_receipt", "data_protection", "banking_domiciliation"
  name              String    @unique
  description       String?
  content           String    @db.LongText
  variables         String?   // JSON
  is_active         Boolean   @default(true)
  created_at        DateTime  @default(now())
  updated_at        DateTime
  
  documents         documents[]
}
```

### Modelo: document_signatures
```prisma
model document_signatures {
  id                String    @id
  document_id       String
  signed_by         String    // Usuario que firma
  signature_date    DateTime  @default(now())
  signature_type    String    // "digital", "electronic", "manual"
  ip_address        String?
  user_agent        String?
  created_at        DateTime  @default(now())
  
  documents         documents
  users             users
}
```

### Modelo: document_versions
```prisma
model document_versions {
  id                String    @id
  document_id       String
  version           Int
  content           String    @db.LongText
  created_by        String
  created_at        DateTime  @default(now())
  
  documents         documents
  users             users
}
```

## 🔌 Endpoints API

### Documentos

```
POST   /api/documents                   # Crear documento
GET    /api/documents                   # Listar documentos (con filtros)
GET    /api/documents/:id               # Obtener documento
PUT    /api/documents/:id               # Actualizar documento
DELETE /api/documents/:id               # Eliminar documento
```

### Firmas

```
POST   /api/documents/:id/sign          # Firmar documento
GET    /api/documents/:id/signatures    # Obtener firmas
```

### Versiones

```
POST   /api/documents/:id/versions      # Crear versión
GET    /api/documents/:id/versions      # Listar versiones
```

### Archivos

```
POST   /api/documents/:id/upload        # Subir archivo
GET    /api/documents/:id/download      # Descargar archivo
```

### Plantillas

```
GET    /api/templates                   # Listar plantillas
GET    /api/templates?type=payment_receipt
POST   /api/templates                   # Crear plantilla (admin)
```

## 🔐 Permisos Requeridos

Se agregaron los siguientes permisos al sistema RBAC:

```
documents:create       # Crear documentos
documents:read        # Ver documentos
documents:update      # Actualizar documentos
documents:delete      # Eliminar documentos
documents:sign        # Firmar documentos
documents:download    # Descargar documentos
```

**Nota**: Los permisos se activan automáticamente con `npm run reset:admin`

## 🚀 Instalación

### 1. Actualizar Prisma Schema
```bash
# El schema ya está definido en prisma/schema.prisma
# Solo necesitas ejecutar:
npx prisma migrate dev --name add_documents_module
```

### 2. Copiar Archivos
Los archivos están listos en:
- Backend: `server/services/document-service.ts`
- Backend: `server/documents.ts`
- Frontend: `client/src/pages/documentos.tsx`
- Frontend: `client/src/components/documentos/*`

### 3. Importar Rutas
En `server/index.ts` o donde registres rutas:

```typescript
import { documentsRouter } from './documents.ts';

// Dentro de registerRoutes:
app.use('/api', documentsRouter);
```

### 4. Agregar a Menú de Navegación
En el componente de navegación principal:

```tsx
<NavLink to="/documentos" icon={<FileText />}>
  Documentos
</NavLink>
```

### 5. Actualizar Admin
```bash
npm run reset:admin
```

## 📋 Tipos de Documentos

### 1. **Recibos de Pago** 💰
- Generar recibos automáticos
- Campos: Cliente, Importe, Concepto, Fecha, Referencia
- Descargar como PDF
- Historial de recibos

### 2. **Protección de Datos (RGPD)** 🔐
- Documentos de consentimiento RGPD
- Seleccionar tipos de datos (personales, fiscales, bancarios)
- Firma digital
- Cumplimiento normativo

### 3. **Domiciliación Bancaria** 🏦
- Autorización de domiciliación de honorarios
- Validación de IBAN
- Estados: Pendiente → Firmado → Activo → Cancelado
- Seguimiento de domiciliaciones activas

### 4. **Otros Documentos** 📄
- Carga de documentos personalizados
- Soporte para múltiples formatos
- Versionado automático

## 💻 Ejemplos de Uso

### Crear un Recibo de Pago
```typescript
const response = await fetch('/api/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    type: 'payment_receipt',
    name: 'Recibo de Pago - Juan García - 2025-10-26',
    description: 'Asesoramiento fiscal trimestral',
  }),
});
```

### Firmar un Documento
```typescript
const response = await fetch('/api/documents/{id}/sign', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    signatureType: 'digital',
  }),
});
```

### Subir un Archivo
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/documents/{id}/upload', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
  },
  body: formData,
});
```

## 🎨 Características Frontend

### DocumentList Component
- 🔍 Búsqueda de documentos
- 🏷️ Filtrado por tipo
- 📥 Descarga de archivos
- ✏️ Editar documentos
- 🗑️ Eliminar documentos
- ✅ Ver estado de firma

### PaymentReceipt Component
- ➕ Generar nuevo recibo
- 💬 Campos personalizables
- 📄 Vista previa
- 💾 Descarga en PDF

### DataProtection Component
- 📋 Plantilla RGPD predefinida
- ✅ Selección de tipos de datos
- 🖊️ Firma digital
- 📅 Registro de consentimiento

### BankingDomiciliation Component
- 🏦 Validación de IBAN
- 📊 Estados de domiciliación
- 🔄 Activar/Cancelar
- 📱 Seguimiento mensual

## 🔄 Flujos de Trabajo

### Recibo de Pago
1. Usuario hace clic en "Nuevo Recibo"
2. Completa información (cliente, importe, concepto)
3. Sistema genera documento
4. Usuario descarga PDF

### Protección de Datos
1. Seleccionar cliente
2. Elegir tipos de datos a procesar
3. Sistema genera documento RGPD
4. Enviar a cliente para firma
5. Cliente firma digitalmente
6. Documento se marca como completado

### Domiciliación Bancaria
1. Ingresar datos bancarios
2. Especificar importe mensual
3. Generar documento
4. Cliente firma
5. Activar domiciliación
6. Se inicia cobro automático

## 📊 Estados de Documentos

| Estado | Descripción |
|--------|-------------|
| `draft` | Borrador, no finalizado |
| `pending_signature` | Esperando firma |
| `signed` | Firmado pero no confirmado |
| `active` | Activo y en vigor |
| `archived` | Archivado |
| `cancelled` | Cancelado |

## 🔒 Seguridad

- ✅ Autenticación requerida
- ✅ Validación de permisos
- ✅ Firmas digitales
- ✅ Historial de cambios (versionado)
- ✅ Auditoría de acceso
- ✅ Encriptación de archivos en servidor

## 📝 Notas de Implementación

1. **Base de Datos**: Ejecutar migraciones de Prisma
2. **Permisos**: Los permisos se crean con `npm run reset:admin`
3. **Almacenamiento**: Los archivos se guardan en `uploads/documents/`
4. **Firmas**: Implementar firma digital real si es necesario
5. **PDF**: Usar librería como `pdfkit` o `puppeteer` para generar PDFs

## 🆘 Troubleshooting

**Los documentos no se muestran:**
- Verificar que el usuario tiene permiso `documents:read`
- Verificar que la base de datos tiene datos

**Error al firmar:**
- Verificar autenticación del usuario
- Verificar permiso `documents:sign`

**Descarga de PDF no funciona:**
- Verificar que el archivo existe en `uploads/documents/`
- Verificar permisos del servidor

## 📚 Recursos Adicionales

- [Documentación Prisma](https://www.prisma.io/docs)
- [RGPD - Regulación (UE) 2016/679](https://www.boe.es/doue/2016/119/L00001-00088.pdf)
- [Estándar SEPA para Domiciliaciones](https://www.bde.es/bde/es/sistemas_pago/)

---

**Última actualización**: 26 de Octubre de 2025
**Versión**: 1.0
