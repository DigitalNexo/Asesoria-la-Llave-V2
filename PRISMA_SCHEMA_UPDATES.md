# 📐 Prisma Schema Updates - Módulo de Documentos

## Instrucciones de Integración

Una vez que la base de datos esté online, debes actualizar el archivo `prisma/schema.prisma` agregando los siguientes modelos.

---

## 📋 Schema a Agregar

Copia y pega los siguientes modelos al final de tu archivo `prisma/schema.prisma`, justo antes del cierre del archivo (o después de los modelos existentes):

```prisma
// ============ DOCUMENTOS MODULE ============

model documents {
  id                String                    @id @default(cuid())
  type              String                    // "payment_receipt", "data_protection", "banking_domiciliation", "other"
  name              String
  description       String?                   @db.Text
  template_id       String?
  client_id         String?
  created_by        String
  file_path         String?
  file_name         String?
  file_size         Int?
  file_type         String?
  status            String                    @default("draft") // "draft", "pending_signature", "signed", "active", "archived", "cancelled"
  signature_status  String?                   @default("unsigned") // "unsigned", "signed"
  signature_date    DateTime?
  signed_by         String?
  created_at        DateTime                  @default(now())
  updated_at        DateTime                  @updatedAt

  // Relaciones
  clients           clients?                  @relation(fields: [client_id], references: [id])
  users             users                     @relation(fields: [created_by], references: [id])
  template          document_templates?      @relation(fields: [template_id], references: [id])
  signatures        document_signatures[]
  versions          document_versions[]

  @@index([client_id])
  @@index([created_by])
  @@index([template_id])
  @@index([status])
  @@index([type])
  @@map("documents")
}

model document_templates {
  id                String                    @id @default(cuid())
  type              String                    // "payment_receipt", "data_protection", "banking_domiciliation"
  name              String                    @unique
  description       String?                   @db.Text
  content           String                    @db.LongText
  variables         String?                   @db.Json
  is_active         Boolean                   @default(true)
  created_at        DateTime                  @default(now())
  updated_at        DateTime                  @updatedAt

  // Relaciones
  documents         documents[]

  @@index([type])
  @@index([is_active])
  @@map("document_templates")
}

model document_signatures {
  id                String                    @id @default(cuid())
  document_id       String
  signed_by         String                    // ID del usuario que firma
  signature_date    DateTime                  @default(now())
  signature_type    String                    // "digital", "electronic", "manual"
  ip_address        String?
  user_agent        String?                   @db.Text
  created_at        DateTime                  @default(now())

  // Relaciones
  documents         documents                 @relation(fields: [document_id], references: [id], onDelete: Cascade)
  users             users                     @relation(fields: [signed_by], references: [id])

  @@index([document_id])
  @@index([signed_by])
  @@map("document_signatures")
}

model document_versions {
  id                String                    @id @default(cuid())
  document_id       String
  version           Int
  content           String                    @db.LongText
  created_by        String
  created_at        DateTime                  @default(now())

  // Relaciones
  documents         documents                 @relation(fields: [document_id], references: [id], onDelete: Cascade)
  users             users                     @relation(fields: [created_by], references: [id])

  @@unique([document_id, version])
  @@index([document_id])
  @@index([created_by])
  @@map("document_versions")
}
```

---

## 🔧 Pasos de Migración

### 1. Backup de Base de Datos (CRÍTICO)
```bash
# Hacer backup de la BD actual
npm run backup:db
# o manualmente
mysqldump -u app_area -p area_privada > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Actualizar Prisma Schema
1. Abre `prisma/schema.prisma`
2. Desplázate hasta el final del archivo
3. Copia y pega los 4 modelos anteriores
4. Guarda el archivo

### 3. Generar Cliente Prisma
```bash
npx prisma generate
```

### 4. Crear Migración
```bash
# Esto creará una migración basada en los cambios
npx prisma migrate dev --name add_documents_module
```

**Alternativamente, si solo necesitas actualizar (no se recomienda en producción)**:
```bash
# SOLO en desarrollo
npx prisma db push
```

### 5. Verificar Schema
```bash
# Abre el dashboard de Prisma
npx prisma studio
```

Deberías ver 4 nuevas tablas:
- ✅ documents
- ✅ document_templates
- ✅ document_signatures
- ✅ document_versions

---

## 📝 Cambios en `users` Model (Si es necesario)

Si tu modelo `users` no tiene relación con documentos, puedes agregar (OPCIONAL):

```prisma
model users {
  // ... campos existentes ...
  
  // Relaciones con documentos
  created_documents     documents[]           @relation("created_by")
  signed_documents      document_signatures[] @relation("signed_by")
  document_versions     document_versions[]   @relation("created_by")
  
  // ... resto del modelo ...
}
```

---

## 📝 Cambios en `clients` Model (Si es necesario)

El modelo `clients` debe tener una relación con `documents`. Si no la tiene, agrega:

```prisma
model clients {
  // ... campos existentes ...
  
  // Relación con documentos
  documents           documents[]
  
  // ... resto del modelo ...
}
```

---

## 🗂️ Estructura de Directorios (Crea si no existen)

```bash
# Crear directorio para uploads
mkdir -p uploads/documents

# Dar permisos (macOS/Linux)
chmod 755 uploads/documents
```

---

## ⚙️ Configuración de Variables de Entorno (.env)

Verifica que tu `.env` tenga:

```env
# Database
DATABASE_URL="mysql://app_area:PASSWORD@185.239.239.43:3306/area_privada"

# File uploads
UPLOADS_PATH="./uploads/documents"
MAX_FILE_SIZE="52428800"  # 50MB en bytes

# JWT
JWT_SECRET="tu_secret_aqui"
JWT_EXPIRES_IN="24h"
```

---

## 🔐 Permisos (Ya Agregados)

Los siguientes permisos se crearán al ejecutar `npm run reset:admin`:

```
documents:create       # Crear documentos
documents:read         # Ver documentos
documents:update       # Actualizar documentos
documents:delete       # Eliminar documentos
documents:sign         # Firmar documentos
documents:download     # Descargar documentos
admin:templates        # Crear plantillas (admin solo)
```

---

## 🚀 Testing de Migración

### Test Local
```bash
# 1. Generar tipos
npx prisma generate

# 2. Ejecutar migraciones
npx prisma migrate deploy

# 3. Ver datos
npx prisma studio
```

### Test en Producción
```bash
# 1. Backup
npm run backup:db

# 2. Migración
npx prisma migrate deploy --preview-features

# 3. Verificación
npm run verify:db
```

---

## ⚠️ Rollback (Si algo sale mal)

### Opción 1: Deshacer última migración
```bash
npx prisma migrate resolve --rolled-back add_documents_module
```

### Opción 2: Restaurar desde backup
```bash
mysql -u app_area -p area_privada < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📊 Verificación Post-Migración

Ejecuta estos queries para verificar:

```sql
-- Ver tablas creadas
SHOW TABLES LIKE 'document%';

-- Ver estructura de documentos
DESCRIBE documents;

-- Ver indices
SHOW INDEX FROM documents;

-- Ver relaciones (FK)
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME IN ('documents', 'document_signatures', 'document_versions', 'document_templates')
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

Expected Output:
```
✅ 4 tables created
✅ Indexes on: client_id, created_by, template_id, status, type, document_id, signed_by
✅ Foreign keys properly linked
```

---

## 🔍 Troubleshooting

### Error: "Table already exists"
- Verifica que no existan tablas con ese nombre
- Si existen, elimina la migración incompleta

### Error: "Foreign key constraint fails"
- Verifica que las tablas `users` y `clients` existen
- Ejecuta las migraciones previas primero

### Error: "Cannot create relation"
- Asegúrate de que el modelo `users` tiene un campo `id`
- Verifica que `clients` tiene un campo `id`

### Los cambios no aplican
```bash
# Fuerza la regeneración
rm -rf node_modules/.prisma
npx prisma generate
```

---

## ✅ Checklist Final

- [ ] Base de datos está online
- [ ] Backup hecho
- [ ] Schema actualizado con 4 modelos nuevos
- [ ] Migración creada
- [ ] `npx prisma generate` ejecutado
- [ ] Directorio `/uploads/documents` creado
- [ ] Permisos de carpeta correctos (755)
- [ ] Variables de entorno configuradas
- [ ] `npm run reset:admin` ejecutado
- [ ] Tablas visibles en Prisma Studio
- [ ] Relaciones funcionando
- [ ] Tests pasados

---

**Nota**: Una vez completados estos pasos, el backend podrá:
- ✅ Crear, leer, actualizar y eliminar documentos
- ✅ Manejar firmas digitales
- ✅ Versionar documentos
- ✅ Subir y descargar archivos
- ✅ Usar plantillas predefinidas

**Los endpoints estarán listos para usarse desde el frontend.**

---

**Última actualización**: 26 de Octubre de 2025
**Versión**: 1.0
