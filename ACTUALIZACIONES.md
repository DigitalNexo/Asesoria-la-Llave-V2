# 🔄 Sistema de Actualizaciones Automáticas

## 📋 Tabla de Contenidos

- [Visión General](#-visión-general)
- [Flujo de Actualización Completo](#-flujo-de-actualización-completo)
- [Archivos Involucrados](#-archivos-involucrados)
- [Versionado Semántico](#-versionado-semántico)
- [Crear una Nueva Release](#-crear-una-nueva-release)
- [Proceso de Actualización Paso a Paso](#-proceso-de-actualización-paso-a-paso)
- [Sistema de Rollback](#-sistema-de-rollback)
- [Configuración](#-configuración)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Visión General

El sistema de actualizaciones automáticas de **Asesoría La Llave** permite actualizar la aplicación directamente desde el panel de administración, descargando automáticamente nuevas versiones desde GitHub y aplicándolas con rollback automático en caso de error.

### Características Principales

✅ **Detección automática** de actualizaciones desde GitHub Releases  
✅ **Backup automático** antes de cada actualización (BD + archivos)  
✅ **Rollback automático** si algo falla  
✅ **Logs en tiempo real** vía WebSocket  
✅ **Health check** post-actualización  
✅ **Badge de versión** sincronizado automáticamente  

---

## 🔄 Flujo de Actualización Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE ACTUALIZACIÓN                            │
└─────────────────────────────────────────────────────────────────────┘

1. DESARROLLO LOCAL
   ├── Modificar código fuente
   ├── Actualizar package.json → "version": "X.Y.Z"
   ├── Commit cambios: git commit -m "feat: nueva funcionalidad"
   └── Push a GitHub: git push origin main

2. CREAR RELEASE EN GITHUB
   ├── GitHub Releases → "Create a new release"
   ├── Tag: vX.Y.Z (ej: v2.1.0)
   ├── Title: "Versión X.Y.Z"
   ├── Release notes: Descripción de cambios
   └── Publish release

3. DETECCIÓN EN SERVIDOR
   ├── Admin Panel → Pestaña "Actualizaciones"
   ├── Click "Verificar actualizaciones"
   ├── Sistema consulta GitHub API
   │   └── GET https://api.github.com/repos/{owner}/{repo}/releases/latest
   ├── Compara versión actual (package.json local) vs. tag de GitHub
   └── Muestra "Actualización disponible" si tag > versión actual

4. PROCESO DE ACTUALIZACIÓN
   ├── Usuario click "Actualizar ahora"
   ├── 📦 BACKUP AUTOMÁTICO
   │   ├── Exporta base de datos → backups/db/backup_db_*.sql
   │   ├── Comprime archivos → backups/files/backup_files_*.zip
   │   └── Registra backup en tabla SystemBackup
   ├── 📥 DESCARGA CÓDIGO
   │   └── git pull origin {branch}  (default: main)
   ├── 📦 INSTALA DEPENDENCIAS
   │   └── npm install
   ├── 🗄️ MIGRA BASE DE DATOS
   │   └── npx prisma db push
   ├── 🏗️ COMPILA APLICACIÓN
   │   └── npm run build
   ├── ✅ HEALTH CHECK
   │   └── Verifica que el servidor responda correctamente
   ├── 🔖 ACTUALIZA BADGE
   │   └── Sincroniza README.md con nueva versión
   └── ✅ COMPLETADO
       └── Usuario debe reiniciar servidor manualmente

5. REINICIO MANUAL
   ├── Producción Linux: systemctl restart asesoria-app
   ├── Desarrollo PM2: pm2 restart all
   └── Windows: Ctrl+C y ejecutar npm start

6. VERIFICACIÓN POST-ACTUALIZACIÓN
   ├── Sistema ejecuta health check automático
   ├── Verifica que frontend carga correctamente
   ├── Confirma que API responde
   └── Marca actualización como COMPLETED
```

---

## 📁 Archivos Involucrados

### 1. **package.json** - Fuente de Verdad de Versión

```json
{
  "name": "rest-express",
  "version": "1.0.0",  // ← VERSIÓN ACTUAL DEL SISTEMA
  "type": "module",
  ...
}
```

**Responsabilidad:**
- Define la versión actual de la aplicación
- Usado por `getCurrentVersion()` en `version-service.ts`
- **Este archivo NO se actualiza automáticamente** (llega vía `git pull`)

**Cuándo cambia:**
- Cuando un desarrollador incrementa la versión manualmente
- Cuando `git pull` descarga un nuevo `package.json` con versión superior

---

### 2. **README.md** - Badge de Versión

```markdown
![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
```

**Responsabilidad:**
- Muestra visualmente la versión actual
- **Actualizado automáticamente** por el script `update-readme-badge.ts`

**Cuándo cambia:**
- Automáticamente tras actualización exitosa
- Manualmente ejecutando: `tsx scripts/update-readme-badge.ts`

---

### 3. **server/services/version-service.ts** - Gestión de Versiones

**Funciones clave:**

```typescript
// Lee versión desde package.json
async function getCurrentVersion(): Promise<string>

// Consulta última release de GitHub
async function getLatestGitHubVersion(owner, repo): Promise<GitHubRelease>

// Compara versiones semánticas
function compareVersions(v1, v2): number

// Verifica si hay actualización disponible
async function checkForUpdates(owner, repo): Promise<VersionInfo>
```

**Responsabilidad:**
- Leer versión actual del `package.json`
- Consultar GitHub API para obtener última release
- Comparar versiones usando semver (ej: 2.1.0 > 1.5.3)

---

### 4. **server/services/update-service.ts** - Orquestador de Actualizaciones

**Funciones clave:**

```typescript
// Ejecuta actualización completa con rollback
async function performSystemUpdate(userId, onProgress): Promise<UpdateResult>

// Verifica que Git esté configurado
async function verifyGitSetup(): Promise<SetupInfo>

// Lista historial de actualizaciones
async function getUpdateHistory(limit): Promise<SystemUpdate[]>
```

**Responsabilidad:**
- Orquestar el proceso completo de actualización
- Crear backup antes de actualizar
- Ejecutar comandos: `git pull`, `npm install`, `prisma db push`, `npm run build`
- Rollback automático si falla algún paso
- Emitir logs en tiempo real vía WebSocket

---

### 5. **server/services/backup-service.ts** - Backups y Rollback

**Funciones clave:**

```typescript
// Crea backup completo del sistema
async function createSystemBackup(userId): Promise<BackupResult>

// Restaura sistema desde backup
async function restoreFromBackup(backupId, userId): Promise<RestoreResult>

// Reinicia servicio del sistema
async function restartService(): Promise<void>
```

**Responsabilidad:**
- Exportar base de datos PostgreSQL a SQL
- Comprimir archivos del proyecto (excluyendo node_modules, .git, backups)
- Restaurar base de datos y archivos en caso de rollback
- Reiniciar servidor automáticamente (PM2/systemctl)

---

### 6. **server/routes.ts** - API Endpoints

**Endpoints relacionados con actualizaciones:**

```typescript
GET  /api/admin/version          // Obtiene versión actual
GET  /api/admin/check-updates    // Verifica actualizaciones disponibles
POST /api/admin/update           // Inicia proceso de actualización
GET  /api/admin/update-history   // Historial de actualizaciones
GET  /api/admin/git-setup        // Verifica configuración de Git
```

---

### 7. **client/src/pages/admin.tsx** - Interfaz de Usuario

**Pestaña "Actualizaciones":**
- Muestra versión actual
- Botón "Verificar actualizaciones" → consulta GitHub
- Muestra información de nueva release (si existe)
- Botón "Actualizar ahora" → inicia actualización
- Tabla de historial de actualizaciones
- Logs en tiempo real vía WebSocket

---

### 8. **prisma/schema.prisma** - Modelos de Base de Datos

```prisma
model SystemUpdate {
  id            String   @id @default(uuid())
  fromVersion   String
  toVersion     String
  status        UpdateStatus  // CHECKING, BACKING_UP, DOWNLOADING, INSTALLING, COMPLETED, FAILED, ROLLED_BACK
  initiatedBy   String?
  backupId      String?
  errorMessage  String?
  logs          String?  // JSON con logs de progreso
  createdAt     DateTime @default(now())
  completedAt   DateTime?
}

model SystemConfig {
  key   String @id
  value String
  // Configuraciones:
  // - github_repo_url: "https://github.com/usuario/repo.git"
  // - github_branch: "main"
}
```

---

### 9. **scripts/update-readme-badge.ts** - Sincronizador de Badge

**Funcionalidad:**
- Lee versión desde `package.json`
- Busca badge de versión en `README.md`
- Reemplaza badge con versión actualizada
- Ejecutado automáticamente tras actualización exitosa

**Uso manual:**
```bash
tsx scripts/update-readme-badge.ts
```

---

## 🔢 Versionado Semántico

El sistema usa **Semantic Versioning (semver)**: `MAJOR.MINOR.PATCH`

```
Versión: 2.3.1
         │ │ │
         │ │ └─── PATCH: Correcciones de bugs (2.3.1 → 2.3.2)
         │ └───── MINOR: Nuevas funcionalidades (2.3.1 → 2.4.0)
         └─────── MAJOR: Cambios incompatibles (2.3.1 → 3.0.0)
```

### Ejemplos de Incremento

| Tipo de Cambio | Ejemplo | Nueva Versión |
|----------------|---------|---------------|
| 🐛 Bug fix | Corregir error en cálculo de impuestos | 1.2.3 → **1.2.4** |
| ✨ Nueva funcionalidad | Agregar filtro de búsqueda avanzada | 1.2.3 → **1.3.0** |
| 💥 Cambio incompatible | Migrar de MariaDB a PostgreSQL | 1.2.3 → **2.0.0** |

### Comparación de Versiones

El sistema compara versiones parte por parte:

```typescript
compareVersions("2.1.5", "1.9.9") // → 1 (2.1.5 > 1.9.9)
compareVersions("1.5.0", "1.5.0") // → 0 (iguales)
compareVersions("1.2.3", "1.3.0") // → -1 (1.2.3 < 1.3.0)
```

---

## 🚀 Crear una Nueva Release

### Opción A: Manual desde GitHub

1. **Incrementa la versión en `package.json`:**
   ```bash
   # Editar package.json manualmente
   "version": "2.1.0"  # Era 2.0.0
   ```

2. **Commit y push:**
   ```bash
   git add package.json
   git commit -m "chore: bump version to 2.1.0"
   git push origin main
   ```

3. **Crear release en GitHub:**
   - Ir a: `https://github.com/{usuario}/{repo}/releases/new`
   - **Tag:** `v2.1.0` (con la "v" al inicio)
   - **Title:** `Versión 2.1.0`
   - **Description:** Changelog de cambios:
     ```markdown
     ## 🎉 Novedades
     - ✨ Nuevo sistema de notificaciones multi-cuenta
     - ✨ Tablas Excel-like en manuales

     ## 🐛 Correcciones
     - 🐛 Corregido error en renderizado de tablas

     ## 📚 Documentación
     - 📝 Agregado ACTUALIZACIONES.md
     ```
   - Click **"Publish release"**

4. **El sistema ahora detectará la actualización:**
   - Los administradores verán "Actualización disponible: v2.1.0"
   - Podrán actualizar con un click desde el panel

---

### Opción B: Script Asistente (Recomendado)

```bash
# Ejecutar script asistente
tsx scripts/create-release-helper.ts
```

El script te guiará paso a paso:
1. ¿Tipo de cambio? (major/minor/patch)
2. Incrementa automáticamente la versión
3. Genera plantilla de changelog
4. Crea commit y tag
5. Muestra comandos para crear release en GitHub

---

## 🔄 Proceso de Actualización Paso a Paso

### Desde el Panel de Administración

#### 1. Verificar Actualizaciones

```
Admin Panel → Pestaña "Actualizaciones" → Click "Verificar actualizaciones"
```

**Qué sucede:**
1. Frontend hace `GET /api/admin/check-updates`
2. Backend ejecuta `checkForUpdates(owner, repo)`
3. Consulta GitHub API: `GET /repos/{owner}/{repo}/releases/latest`
4. Compara `tag_name` (ej: "v2.1.0") con versión local (package.json)
5. Retorna:
   ```json
   {
     "current": "2.0.0",
     "latest": "2.1.0",
     "updateAvailable": true,
     "releaseNotes": "## Cambios...",
     "publishedAt": "2025-10-16T10:30:00Z"
   }
   ```

---

#### 2. Iniciar Actualización

```
Click "Actualizar ahora" → Confirmar diálogo
```

**Qué sucede:**
1. Frontend hace `POST /api/admin/update`
2. Backend ejecuta `performSystemUpdate(userId)`
3. Se inicia el proceso completo...

---

### Proceso Interno Detallado

#### Paso 1: Crear Backup Automático

```
[BACKUP_START] Creando backup de seguridad antes de actualizar...
```

**Comandos ejecutados:**
```bash
# Backup de base de datos
pg_dump $DATABASE_URL > backups/db/backup_db_2025-10-16_14-30-00.sql

# Backup de archivos
zip -r backups/files/backup_files_2025-10-16_14-30-00.zip . \
  -x "node_modules/*" ".git/*" "backups/*" "dist/*"
```

**Registro en BD:**
```sql
INSERT INTO SystemBackup (
  id,
  type,
  databasePath,
  filesPath,
  createdBy,
  version
) VALUES (
  'uuid-backup-123',
  'AUTOMATIC',
  'backups/db/backup_db_2025-10-16_14-30-00.sql',
  'backups/files/backup_files_2025-10-16_14-30-00.zip',
  'admin-user-id',
  '2.0.0'
);
```

---

#### Paso 2: Descargar Código desde GitHub

```
[GIT_PULL] Descargando cambios desde GitHub...
```

**Comando ejecutado:**
```bash
git pull origin main
```

**Qué archivos cambian:**
- `package.json` → Nueva versión
- Archivos modificados en los commits
- Nuevas dependencias en `package-lock.json`

---

#### Paso 3: Instalar Dependencias

```
[NPM_INSTALL] Instalando dependencias...
```

**Comando ejecutado:**
```bash
npm install
```

**Qué sucede:**
- Instala nuevas dependencias listadas en `package.json`
- Actualiza `node_modules/`
- Reconstruye módulos nativos (bcrypt, etc.)

---

#### Paso 4: Migrar Base de Datos

```
[DB_MIGRATE] Aplicando migraciones de base de datos...
```

**Comando ejecutado:**
```bash
npx prisma db push
```

**Qué sucede:**
- Prisma compara `schema.prisma` con BD actual
- Genera y ejecuta ALTER TABLE si hay cambios
- NO borra datos (usa `db push`, no `migrate reset`)

**⚠️ Advertencia:**
- Si hay cambios destructivos, Prisma preguntará
- El sistema usa `--accept-data-loss` en producción

---

#### Paso 5: Compilar Aplicación

```
[BUILD] Compilando aplicación para producción...
```

**Comando ejecutado:**
```bash
npm run build
```

**Qué genera:**
- `dist/` → Código compilado del servidor (ESBuild)
- `dist/public/` → Assets estáticos del frontend (Vite)

---

#### Paso 6: Health Check Post-Actualización

```
[HEALTH_CHECK] Verificando que la aplicación funciona correctamente...
```

**Verificaciones:**
1. Frontend carga sin errores
2. API responde en `/api/health`
3. Base de datos es accesible
4. Sin errores críticos en logs

---

#### Paso 7: Actualizar Badge de README

```
[UPDATE_BADGE] Actualizando badge de versión en README.md...
```

**Comando ejecutado:**
```bash
tsx scripts/update-readme-badge.ts
```

**Cambio en README.md:**
```diff
- ![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
+ ![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
```

---

#### Paso 8: Completado - Reiniciar Manualmente

```
[UPDATE_COMPLETE] Actualización completada de 2.0.0 a 2.1.0
[RESTART_REQUIRED] Reinicie el servidor para aplicar los cambios
```

**El usuario debe ejecutar:**

```bash
# Producción con systemd
sudo systemctl restart asesoria-app

# Desarrollo con PM2
pm2 restart all

# Windows (manual)
# Detener servidor (Ctrl+C)
npm start
```

---

## 🔙 Sistema de Rollback

### Rollback Automático

Si **cualquier paso** falla durante la actualización, el sistema **automáticamente** restaura el backup:

```
[ERROR] Error durante la actualización: npm install failed
[ROLLBACK_START] Iniciando rollback automático...
[RESTORE_DB] Restaurando base de datos desde backup...
[RESTORE_FILES] Restaurando archivos desde backup...
[ROLLBACK_SUCCESS] Rollback completado exitosamente
```

**Qué se restaura:**
1. **Base de datos:** Se ejecuta el `.sql` del backup
2. **Archivos:** Se descomprime el `.zip` del backup
3. **Estado:** Registro marcado como `ROLLED_BACK`

---

### Rollback Manual

Desde el panel de administración:

```
Admin Panel → Backups → Click en backup → "Restaurar"
```

**Advertencia:**
- ⚠️ **Operación destructiva**
- ⚠️ Sobrescribe base de datos actual
- ⚠️ Sobrescribe archivos del proyecto
- ⚠️ Requiere reinicio del servidor

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# .env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

### Configuración en Base de Datos

```sql
-- URL del repositorio de GitHub
INSERT INTO SystemConfig (key, value) VALUES (
  'github_repo_url',
  'https://github.com/usuario/asesoria-la-llave.git'
);

-- Rama a utilizar (default: main)
INSERT INTO SystemConfig (key, value) VALUES (
  'github_branch',
  'main'
);
```

**Configurar desde Admin Panel:**
```
Admin Panel → GitHub → Configurar repositorio
```

---

## 🐛 Troubleshooting

### Error: "URL del repositorio de GitHub no configurada"

**Causa:** Falta configuración en `SystemConfig`

**Solución:**
```
Admin Panel → GitHub → Configurar URL del repositorio
Ejemplo: https://github.com/usuario/asesoria-la-llave.git
```

---

### Error: "Git no está instalado en el sistema"

**Causa:** Git no está disponible en PATH

**Solución:**
```bash
# Ubuntu/Debian
sudo apt-get install git

# Verificar
git --version
```

---

### Error: "No hay un repositorio remoto configurado"

**Causa:** El directorio no es un repositorio Git o no tiene remote

**Solución:**
```bash
# Verificar remote
git remote -v

# Agregar remote si falta
git remote add origin https://github.com/usuario/repo.git
```

---

### Error: "npm install failed"

**Causa:** Dependencias incompatibles o falta de permisos

**Solución:**
```bash
# Limpiar cache
npm cache clean --force

# Eliminar node_modules y reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

### Error: "Prisma migrations failed"

**Causa:** Cambios incompatibles en schema o BD corrupta

**Solución:**
```bash
# Forzar sincronización (⚠️ puede perder datos)
npx prisma db push --force-reset

# O regenerar cliente
npx prisma generate
npx prisma db push
```

---

### Actualización completada pero badge no se actualizó

**Causa:** Script `update-readme-badge.ts` falló o no se ejecutó

**Solución manual:**
```bash
tsx scripts/update-readme-badge.ts
```

---

### Health check falla después de actualización

**Causa:** Servidor no responde o errores en compilación

**Solución:**
1. Verificar logs del servidor
2. Verificar que `npm run build` completó sin errores
3. Reiniciar servidor manualmente
4. Si persiste, hacer rollback manual

---

## 📊 Registro de Actualizaciones

Cada actualización queda registrada en la tabla `SystemUpdate`:

```sql
SELECT 
  fromVersion,
  toVersion,
  status,
  createdAt,
  completedAt,
  errorMessage
FROM SystemUpdate
ORDER BY createdAt DESC
LIMIT 10;
```

**Estados posibles:**
- `CHECKING` - Verificando actualización
- `BACKING_UP` - Creando backup
- `DOWNLOADING` - Descargando código
- `INSTALLING` - Instalando dependencias
- `COMPLETED` - ✅ Completada exitosamente
- `FAILED` - ❌ Falló sin rollback
- `ROLLED_BACK` - ↩️ Falló con rollback exitoso

---

## 🎓 Mejores Prácticas

### Para Desarrolladores

1. **Siempre incrementa la versión** en `package.json` antes de crear release
2. **Usa tags semánticos** en GitHub: `v1.0.0`, no `1.0.0` ni `version-1.0.0`
3. **Escribe changelog detallado** en las releases
4. **Prueba migraciones** en desarrollo antes de publicar
5. **Nunca uses `--force-reset`** en producción sin backup

### Para Administradores

1. **Siempre haz backup manual** antes de actualizar en producción
2. **Actualiza primero en desarrollo** para probar
3. **Lee las release notes** antes de actualizar
4. **Verifica logs en tiempo real** durante actualización
5. **Ten plan de rollback** antes de actualizar

---

## 📚 Referencias

- [Semantic Versioning](https://semver.org/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Git Documentation](https://git-scm.com/doc)

---

**Última actualización:** Octubre 2025  
**Versión del documento:** 1.0.0
