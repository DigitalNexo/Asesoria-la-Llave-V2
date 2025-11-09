# Sistema de Actualizaciones Automáticas desde GitHub

Este sistema permite que la aplicación se actualice automáticamente cada vez que hagas push a tu repositorio de GitHub, sin necesidad de acceso SSH.

## 📋 Requisitos

- Repositorio en GitHub (puede ser privado)
- Acceso de administrador a la aplicación
- Servidor con Git instalado

## 🔧 Configuración Paso a Paso

### 1. Crear Personal Access Token en GitHub (solo para repos privados)

Si tu repositorio es **privado**, necesitas crear un token:

1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click en "Generate new token (classic)"
3. Dale un nombre descriptivo: `Asesoria-la-Llave-V2 Auto-Update`
4. Marca estos permisos:
   - ✅ `repo` (Full control of private repositories)
5. Click en "Generate token"
6. **Copia el token** (ghp_xxxxxxxxxxxx) - solo se muestra una vez

Si tu repositorio es **público**, puedes omitir este paso.

### 2. Crear Webhook Secret (opcional pero recomendado)

Para validar que las peticiones vienen realmente de GitHub:

1. Genera un secret aleatorio:
```bash
openssl rand -hex 32
```

2. **Copia el resultado**, lo usarás en el siguiente paso.

### 3. Configurar en la Aplicación

1. Accede a tu aplicación: `https://digitalnexo.es`
2. Ve a **Admin** → **Actualizaciones GitHub** (o directamente a `/admin/github-updates`)
3. Completa el formulario:
   - **Repositorio**: `DigitalNexo/Asesoria-la-Llave-V2`
   - **Rama**: `main` (o la rama que quieras monitorear)
   - **GitHub Personal Access Token**: Pega el token (solo si es privado)
   - **Webhook Secret**: Pega el secret generado (opcional)
   - **Aplicar actualizaciones automáticamente**: 
     - ✅ ON = Se aplicará automáticamente al recibir el webhook
     - ❌ OFF = Solo se registrará, deberás aplicarlo manualmente
4. Click en **Guardar Configuración**

### 4. Configurar Webhook en GitHub

1. Ve a tu repositorio en GitHub: `https://github.com/DigitalNexo/Asesoria-la-Llave-V2`
2. Settings → Webhooks → Add webhook
3. Completa el formulario:
   - **Payload URL**: `https://digitalnexo.es/api/system/github/webhook`
   - **Content type**: `application/json`
   - **Secret**: Pega el mismo secret que usaste en la app (si lo configuraste)
   - **Which events would you like to trigger this webhook?**: 
     - Selecciona "Just the push event"
   - ✅ **Active**
4. Click en **Add webhook**

## ✅ Probar el Sistema

### Prueba Manual (sin webhook)

1. Haz un cambio en cualquier archivo de tu repositorio
2. Haz commit y push a GitHub:
```bash
git add .
git commit -m "Test: Probar sistema de actualizaciones"
git push origin main
```

3. En la aplicación, ve a **Admin** → **Actualizaciones GitHub**
4. Si el webhook está configurado correctamente, deberías ver el commit en la lista
5. Si **auto-update está OFF**, click en "Aplicar" para ejecutar la actualización
6. Click en "Logs" para ver el proceso en tiempo real

### Verificar que el Webhook Funciona

1. Ve a GitHub → Settings → Webhooks
2. Click en el webhook que creaste
3. Scroll down hasta "Recent Deliveries"
4. Deberías ver las entregas recientes con ✅ (200 OK)
5. Si ves ❌ (error), click en la entrega para ver el error

## 🔄 Flujo de Actualización

Cuando haces push a GitHub:

1. **GitHub envía webhook** → Tu servidor recibe notificación
2. **Se crea registro** en `system_updates` con estado `PENDING`
3. **Si auto-update está ON**:
   - Se ejecuta automáticamente:
     - `git fetch origin`
     - `git pull origin main`
     - `npm install`
     - `npm run build`
     - `sudo systemctl restart asesoria-llave.service`
   - Todo el proceso queda registrado en los logs
4. **Si auto-update está OFF**:
   - Espera a que lo apliques manualmente desde la UI

## 🛡️ Seguridad

### Webhook Secret

El webhook secret es **MUY IMPORTANTE** para validar que las peticiones vienen realmente de GitHub y no de un atacante.

**Cómo funciona:**
1. GitHub firma cada petición con el secret usando HMAC-SHA256
2. Tu servidor valida la firma antes de procesar el webhook
3. Si la firma no coincide, se rechaza la petición (401 Unauthorized)

**Sin el secret configurado:**
- ⚠️ Cualquiera podría enviar peticiones falsas a tu webhook
- ⚠️ Podrían intentar ejecutar actualizaciones maliciosas

**Recomendación:** Siempre configura el webhook secret.

### Personal Access Token

El PAT se almacena **encriptado** en la base de datos y solo se usa para clonar/pullear el repositorio si es privado.

**Permisos necesarios:**
- `repo` (solo si el repositorio es privado)

**Revocación:**
Si crees que el token ha sido comprometido:
1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Click en el token → "Delete"
3. Genera uno nuevo y actualízalo en la aplicación

## 📊 Monitoreo

### Ver Estado Actual

En **Admin** → **Actualizaciones GitHub** puedes ver:

- ✅ **Commit actual del servidor**: Hash y rama
- 📋 **Lista de actualizaciones**: Historial de commits recibidos
- 🔍 **Logs detallados**: Para cada actualización

### Estados de Actualización

- **Pendiente** 🕐: Esperando a ser aplicada
- **Aplicando...** 🔄: En proceso de aplicación
- **Completada** ✅: Aplicada exitosamente
- **Fallida** ❌: Error durante la aplicación

### Ver Logs

1. Click en el botón **"Logs"** de cualquier actualización
2. Verás el proceso completo:
   - Git fetch
   - Git pull
   - npm install
   - npm run build
   - Systemctl restart
   - Mensajes de error (si hubo)

## 🚨 Troubleshooting

### El webhook no llega

1. Verifica que la URL es correcta: `https://digitalnexo.es/api/system/github/webhook`
2. Verifica que el servidor está corriendo: `sudo systemctl status asesoria-llave.service`
3. Revisa los logs del servidor: `sudo journalctl -u asesoria-llave.service -f`
4. En GitHub, ve a Settings → Webhooks → Recent Deliveries para ver el error

### Error: "Invalid signature"

- El webhook secret en GitHub no coincide con el de la app
- Verifica que usaste el mismo secret en ambos lugares

### Error: "Commit not found"

- El servidor no tiene acceso al repositorio
- Si es privado, verifica que el Personal Access Token sea correcto
- Verifica que el token tenga permisos `repo`

### La actualización falla en `npm install` o `npm run build`

- Revisa los logs para ver el error específico
- Puede ser un problema de dependencias o código con errores
- El sistema NO revertirá automáticamente, deberás arreglarlo manualmente

### La aplicación no se reinicia

- Verifica que systemd está corriendo: `sudo systemctl status asesoria-llave.service`
- El nombre del servicio debe ser exactamente: `asesoria-llave.service`
- Revisa los logs: `sudo journalctl -u asesoria-llave.service -xe`

## 🎯 Mejores Prácticas

### 1. Usa Ramas

- **main**: Producción (auto-update ON)
- **develop**: Desarrollo (auto-update OFF, aplica manualmente)

Configura dos instancias si quieres probar antes de aplicar a producción.

### 2. Commits Descriptivos

El mensaje del commit se muestra en la UI, hazlos descriptivos:
```bash
git commit -m "feat: Añadir sistema de notificaciones por email"
git commit -m "fix: Corregir error en cálculo de impuestos"
git commit -m "docs: Actualizar documentación de API"
```

### 3. Prueba Localmente Primero

Antes de hacer push:
```bash
npm install
npm run build
npm test  # si tienes tests
```

### 4. Monitorea el Proceso

- Después de cada push, verifica que la actualización se completó
- Revisa los logs si algo falla
- Ten un plan de rollback manual por si algo sale mal

### 5. Backups

Antes de aplicar actualizaciones importantes:
```bash
# Backup de la base de datos
mysqldump -u root -p area_privada > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos subidos
tar -czf uploads_$(date +%Y%m%d_%H%M%S).tar.gz uploads/
```

## 📝 Ejemplo de Uso

```bash
# 1. Hacer cambios en tu código
vim client/src/pages/dashboard.tsx

# 2. Commit y push
git add .
git commit -m "feat: Mejorar dashboard con nuevos widgets"
git push origin main

# 3. (Automático) GitHub envía webhook a tu servidor
# 4. (Automático) Servidor recibe commit, lo registra
# 5. (Si auto-update ON) Servidor aplica actualización automáticamente
# 6. (Si auto-update OFF) Vas a /admin/github-updates y click en "Aplicar"

# 7. Verificar que funcionó
# - Recarga la app en el navegador
# - Verifica los cambios
# - Revisa los logs si hay problemas
```

## 🔗 Enlaces Útiles

- **Panel de actualizaciones**: https://digitalnexo.es/admin/github-updates
- **GitHub Webhooks**: https://github.com/DigitalNexo/Asesoria-la-Llave-V2/settings/hooks
- **GitHub Tokens**: https://github.com/settings/tokens
- **Logs del servidor**: `sudo journalctl -u asesoria-llave.service -f`

## ⚙️ Configuración Avanzada

### Cambiar el nombre del servicio systemd

Si tu servicio no se llama `asesoria-llave.service`, edita:

```typescript
// server/services/git-update.service.ts
const SERVICE_NAME = 'tu-servicio.service';
```

### Cambiar la ruta del proyecto

Si la app no está en `/root/www/Asesoria-la-Llave-V2`:

```typescript
// server/services/git-update.service.ts
const PROJECT_PATH = '/ruta/a/tu/proyecto';
```

### Añadir comandos personalizados

Edita `server/services/git-update.service.ts` y añade pasos en `executeGitUpdate()`:

```typescript
// Ejemplo: ejecutar migraciones de base de datos
addLog('🗃️  Ejecutando migraciones...');
await execAsync('npx prisma migrate deploy', { cwd: PROJECT_PATH });
```

---

**¿Necesitas ayuda?** Revisa los logs del servidor o contacta al equipo de desarrollo.
