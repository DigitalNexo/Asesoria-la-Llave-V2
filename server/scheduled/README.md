# 📅 Scheduled Deployments - Scripts

Este directorio contiene scripts diseñados para ejecutarse como **Scheduled Deployments** en Replit.

## ⚠️ Importante

Estos scripts están diseñados para:
- ✅ **Scheduled Deployments** de Replit
- ✅ **Cron Jobs** en VPS/Docker tradicionales
- ❌ **NO para Autoscale Deployments** (se escalan a cero cuando están inactivos)

## 📋 Scripts Disponibles

### 1. `task-reminders.ts`
**Frecuencia:** Diario a las 09:00  
**Cron:** `0 9 * * *`

Envía recordatorios de tareas próximas a vencer:
- Tareas que vencen en 1 día: URGENTE
- Tareas que vencen en 3 días: Próximo
- Tareas que vencen en 7 días: Recordatorio

```bash
npx tsx server/scheduled/task-reminders.ts
```

### 2. `tax-reminders.ts`
**Frecuencia:** Diario a las 08:00  
**Cron:** `0 8 * * *`

Envía recordatorios de obligaciones fiscales:
- Recordatorios en días 7, 3 y 1 antes del vencimiento
- Incluye información del modelo, periodo y cliente

```bash
npx tsx server/scheduled/tax-reminders.ts
```

### 3. `cleanup-sessions.ts`
**Frecuencia:** Cada hora  
**Cron:** `0 * * * *`

Limpia sesiones expiradas de la base de datos:
- Elimina sesiones más antiguas de 7 días
- Mantiene la base de datos limpia

```bash
npx tsx server/scheduled/cleanup-sessions.ts
```

### 4. `backup-database.ts`
**Frecuencia:** Diario a las 03:00  
**Cron:** `0 3 * * *`

Ejecuta backup automático de la base de datos:
- Usa el script `scripts/backup.sh`
- Guarda backups en formato comprimido
- Incluye timestamp en el nombre del archivo

```bash
npx tsx server/scheduled/backup-database.ts
```

## 🔧 Configuración en Replit

### Paso 1: Crear Scheduled Deployment

1. Ve a tu Repl
2. Click en **Deployments**
3. Click en **Create** → **Scheduled Deployment**
4. Configura:
   - **Name:** Task Reminders
   - **Schedule:** `0 9 * * *`
   - **Run command:** `npx tsx server/scheduled/task-reminders.ts`

### Paso 2: Variables de Entorno

Asegúrate de configurar las mismas variables que tu deployment principal:

```env
DATABASE_URL=mysql://...
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password
S3_ENDPOINT=...
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

### Paso 3: Repetir para cada Script

Crea un Scheduled Deployment separado para cada script:

| Script | Frecuencia | Cron | Comando |
|--------|-----------|------|---------|
| Task Reminders | Diario 09:00 | `0 9 * * *` | `npx tsx server/scheduled/task-reminders.ts` |
| Tax Reminders | Diario 08:00 | `0 8 * * *` | `npx tsx server/scheduled/tax-reminders.ts` |
| Cleanup Sessions | Cada hora | `0 * * * *` | `npx tsx server/scheduled/cleanup-sessions.ts` |
| Database Backup | Diario 03:00 | `0 3 * * *` | `npx tsx server/scheduled/backup-database.ts` |

## 📝 Sintaxis Cron

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-7, donde 0 y 7 = Domingo)
│ │ │ └───── Mes (1-12)
│ │ └─────── Día del mes (1-31)
│ └───────── Hora (0-23)
└─────────── Minuto (0-59)
```

**Ejemplos:**
- `0 9 * * *` - Diario a las 09:00
- `0 */6 * * *` - Cada 6 horas
- `0 0 * * 0` - Cada domingo a medianoche
- `30 8 * * 1-5` - Lunes a viernes a las 08:30

## 🧪 Testing Local

Puedes probar los scripts localmente:

```bash
# Probar recordatorios de tareas
npx tsx server/scheduled/task-reminders.ts

# Probar recordatorios fiscales
npx tsx server/scheduled/tax-reminders.ts

# Probar limpieza de sesiones
npx tsx server/scheduled/cleanup-sessions.ts

# Probar backup
npx tsx server/scheduled/backup-database.ts
```

## 📊 Monitoreo

Los scripts incluyen logging estructurado con Pino:

```bash
# Ver logs de un scheduled deployment
# (En Replit, ve a Deployments → [tu scheduled deployment] → Logs)
```

Cada script registra:
- ✅ Ejecuciones exitosas
- ⚠️ Advertencias (ej: SMTP no configurado)
- ❌ Errores con detalles completos

## 🔍 Troubleshooting

### Error: "Cannot find module '@prisma/client'"

**Solución:**
```bash
npm install
npx prisma generate
```

### Error: "SMTP not configured"

**Solución:** Configura las variables de entorno SMTP:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password
```

### Error: "Database connection failed"

**Solución:** Verifica `DATABASE_URL` en las variables de entorno

## 📚 Recursos

- [Replit Scheduled Deployments Docs](https://docs.replit.com/hosting/deployments/scheduled-deployments)
- [Cron Syntax Reference](https://crontab.guru/)
- [Prisma Client Docs](https://www.prisma.io/docs/concepts/components/prisma-client)
