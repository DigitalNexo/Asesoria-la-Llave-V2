# 🚀 Guía de Despliegue - Asesoría La Llave

## Índice
1. [Requisitos](#requisitos)
2. [Configuración Inicial](#configuración-inicial)
3. [Despliegue con Docker](#despliegue-con-docker)
4. [Despliegue en VPS (Ubuntu)](#despliegue-en-vps-ubuntu)
5. [Configuración MariaDB Externa](#configuración-mariadb-externa)
6. [Backups y Restauración](#backups-y-restauración)
7. [SSL/TLS (HTTPS)](#ssltls-https)
8. [Monitoreo y Logs](#monitoreo-y-logs)
9. [Troubleshooting](#troubleshooting)

---

## Requisitos

### Para Desarrollo Local
- **Node.js**: 20.x o superior
- **npm**: 10.x o superior
- **MariaDB**: 10.11+ (local o remota)

### Para Producción (VPS)
- **Sistema Operativo**: Ubuntu 22.04 LTS o superior
- **RAM**: Mínimo 2GB (Recomendado 4GB)
- **Disco**: Mínimo 20GB SSD
- **Docker**: 24.x o superior
- **Docker Compose**: 2.x o superior

---

## Configuración Inicial

### 1. Clonar el Repositorio
```bash
git clone <tu-repositorio>
cd asesoria-llave
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env
```

Edita `.env` con tus valores reales:

```env
# Base de Datos (ejemplo VPS)
DATABASE_URL="mysql://asesoria_user:TU_PASSWORD_SEGURO@192.168.1.100:3306/asesoria_llave?socket_timeout=60&connect_timeout=60"

# Seguridad
JWT_SECRET=cambiar_por_valor_aleatorio_largo
SESSION_SECRET=cambiar_por_otro_valor_aleatorio

# S3 Storage (Backblaze B2 / AWS S3 / MinIO)
S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
S3_BUCKET=asesoria-llave
S3_ACCESS_KEY=tu_access_key
S3_SECRET_KEY=tu_secret_key
S3_REGION=us-west-002

# SMTP (Gmail ejemplo)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu_app_password
```

---

## Despliegue con Docker

### Opción 1: Todo en Docker (Recomendado para comenzar)

```bash
# 1. Construir y levantar servicios
docker-compose up -d

# 2. Generar Prisma Client
docker-compose exec api npx prisma generate

# 3. Ejecutar migraciones
docker-compose exec api npx prisma migrate deploy

# 4. Poblar base de datos con datos iniciales
docker-compose exec api npx tsx prisma/seed.ts

# 5. Verificar logs
docker-compose logs -f api
```

### Opción 2: Solo MariaDB en Docker, App en Host

```bash
# 1. Levantar solo MariaDB
docker-compose up -d db

# 2. Instalar dependencias
npm install

# 3. Generar Prisma Client
npx prisma generate

# 4. Ejecutar migraciones
npx prisma migrate deploy

# 5. Poblar base de datos
npx tsx prisma/seed.ts

# 6. Iniciar aplicación
npm run dev
```

---

## Despliegue en VPS (Ubuntu)

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y git curl wget

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin

# Verificar instalación
docker --version
docker compose version
```

### 2. Clonar y Configurar

```bash
# Clonar repositorio
git clone <tu-repositorio>
cd asesoria-llave

# Configurar .env
cp .env.example .env
nano .env  # Editar con tus valores
```

### 3. Configurar Firewall

```bash
# Permitir SSH, HTTP, HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verificar
sudo ufw status
```

### 4. Levantar Aplicación

```bash
# Iniciar servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar estado
docker-compose ps
```

### 5. Configurar Dominio (Opcional)

Apunta tu dominio a la IP del VPS:
- Tipo: A Record
- Host: @ (o www)
- Valor: IP_DE_TU_VPS
- TTL: 3600

---

## ⚠️ Tareas Programadas (Cron Jobs)

### Importante: Limitaciones en Autoscale Deployments

**Los cron jobs NO funcionan en Autoscale Deployments de Replit** porque:
- Se escalan a **cero cuando están inactivos** (no hay proceso persistente)
- Solo responden a peticiones HTTP
- No soportan tareas en segundo plano fuera del manejo de peticiones

### ✅ Soluciones para Tareas Programadas

#### Opción 1: Scheduled Deployments (Recomendado para Replit)

Replit ofrece **Scheduled Deployments** específicamente para tareas programadas. Ideal para:
- Recordatorios de tareas y obligaciones fiscales
- Backups automáticos de base de datos
- Limpieza de sesiones expiradas

Ver sección [Configuración de Scheduled Deployments](#scheduled-deployments-replit) más abajo.

#### Opción 2: Reserved VM Deployments

Para procesos persistentes que deben estar siempre activos:
- Los cron jobs funcionan normalmente
- Proceso se mantiene corriendo 24/7
- Ideal para webhooks, bots, y tareas en segundo plano

**Configuración:**
Agrega la variable de entorno en tu Reserved VM Deployment:
```env
ENABLE_CRON_JOBS=true
```

#### Opción 3: Cron Jobs Tradicionales (VPS/Docker)

En tu propio servidor VPS o contenedor Docker, los cron jobs funcionan normalmente:

```bash
# Ver configuración del cron
cat scripts/crontab.example

# Configurar en el servidor
crontab -e

# Agregar:
0 3 * * * cd /ruta/asesoria-llave && bash scripts/backup.sh >> /var/log/asesoria-backup.log 2>&1
```

### 📅 Scheduled Deployments (Replit)

Para configurar tareas programadas en Replit:

1. **Crear un Scheduled Deployment:**
   - Ve a tu Repl → Deployments → Create → Scheduled Deployment
   - Configura el horario (cron syntax)
   - Selecciona el script a ejecutar

2. **Ejemplos de tareas:**

**Recordatorios de Tareas (Diario 09:00):**
```bash
# Cron: 0 9 * * *
npx tsx server/scheduled/task-reminders.ts
```

**Recordatorios Fiscales (Diario 08:00):**
```bash
# Cron: 0 8 * * *
npx tsx server/scheduled/tax-reminders.ts
```

**Backup de Base de Datos (Diario 03:00):**
```bash
# Cron: 0 3 * * *
bash scripts/backup.sh
```

**Limpieza de Sesiones (Cada hora):**
```bash
# Cron: 0 * * * *
npx tsx server/scheduled/cleanup-sessions.ts
```

3. **Variables de entorno:**
   - Asegúrate de configurar las mismas variables que tu deployment principal
   - Especialmente: `DATABASE_URL`, `S3_*`, `SMTP_*`

Ver archivo `server/scheduled/README.md` para más detalles.

---

## Configuración MariaDB Externa

### Si tienes tu propia MariaDB en otro servidor:

```bash
# 1. En tu servidor MariaDB, crear base de datos y usuario
mysql -u root -p

CREATE DATABASE asesoria_llave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'asesoria_user'@'%' IDENTIFIED BY 'tu_password_seguro';
GRANT ALL PRIVILEGES ON asesoria_llave.* TO 'asesoria_user'@'%';
FLUSH PRIVILEGES;
EXIT;

# 2. Permitir conexiones remotas (editar my.cnf)
sudo nano /etc/mysql/mariadb.conf.d/50-server.cnf

# Cambiar bind-address a:
bind-address = 0.0.0.0

# Reiniciar MariaDB
sudo systemctl restart mariadb

# 3. En tu aplicación, configurar DATABASE_URL en .env:
DATABASE_URL="mysql://asesoria_user:tu_password@IP_SERVIDOR_MARIADB:3306/asesoria_llave"

# 4. No levantar el servicio 'db' en docker-compose
docker-compose up -d api web jobs
```

---

## Backups y Restauración

### Backups Automáticos

El sistema incluye backups automáticos programados cada noche a las 03:00:

```bash
# Ver configuración del cron
cat scripts/crontab.example

# Configurar en el servidor
crontab -e

# Agregar:
0 3 * * * cd /ruta/asesoria-llave && bash scripts/backup.sh >> /var/log/asesoria-backup.log 2>&1
```

### Backup Manual

```bash
# Dentro del contenedor
docker-compose exec api bash scripts/backup.sh

# Fuera del contenedor (con MariaDB local)
DB_HOST=localhost \
DB_USER=asesoria_user \
DB_PASSWORD=tu_password \
DB_NAME=asesoria_llave \
bash scripts/backup.sh
```

Los backups se guardan en `./backups/` con formato:
```
asesoria_backup_20250113_153045.sql.gz
```

### Restauración

```bash
# Listar backups disponibles y restaurar
docker-compose exec api bash scripts/restore.sh

# O especificar archivo directamente
docker-compose exec api bash scripts/restore.sh /app/backups/asesoria_backup_20250113_153045.sql.gz
```

---

## SSL/TLS (HTTPS)

### Opción 1: Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Detener Nginx temporal
docker-compose stop web

# Obtener certificado
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Los certificados estarán en:
# /etc/letsencrypt/live/tudominio.com/fullchain.pem
# /etc/letsencrypt/live/tudominio.com/privkey.pem

# Copiar a proyecto
sudo cp /etc/letsencrypt/live/tudominio.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/tudominio.com/privkey.pem ./ssl/key.pem
sudo chown $USER:$USER ./ssl/*.pem
```

Edita `nginx.conf` y descomenta las líneas SSL:
```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
```

Reinicia Nginx:
```bash
docker-compose restart web
```

### Opción 2: Cloudflare (Proxy)

1. Añade tu dominio en Cloudflare
2. Configura DNS apuntando a tu VPS
3. Activa SSL/TLS en modo "Full"
4. Cloudflare manejará el SSL automáticamente

---

## Monitoreo y Logs

### Ver Logs en Tiempo Real

```bash
# Todos los servicios
docker-compose logs -f

# Solo API
docker-compose logs -f api

# Solo Base de Datos
docker-compose logs -f db

# Solo Nginx
docker-compose logs -f web
```

### Logs de la Aplicación (Pino)

Los logs se guardan en `./logs/`:
```bash
# Ver logs de hoy
tail -f logs/app-$(date +%Y-%m-%d).log

# Ver logs con formato legible
cat logs/app-$(date +%Y-%m-%d).log | npx pino-pretty
```

### Health Checks

```bash
# Verificar salud de la aplicación
curl http://localhost/health

# Verificar estado de servicios
curl http://localhost/ready

# Desde el servidor
docker-compose ps
```

---

## Troubleshooting

### Problema: No se puede conectar a MariaDB

**Solución:**
```bash
# Verificar que MariaDB esté corriendo
docker-compose ps db

# Ver logs de MariaDB
docker-compose logs db

# Reiniciar MariaDB
docker-compose restart db

# Verificar conexión manual
docker-compose exec db mysql -u asesoria_user -p asesoria_llave
```

### Problema: Error "Prisma Client not generated"

**Solución:**
```bash
# Regenerar Prisma Client
docker-compose exec api npx prisma generate

# Si falla, reconstruir contenedor
docker-compose build --no-cache api
docker-compose up -d api
```

### Problema: Migraciones fallan

**Solución:**
```bash
# Ver estado de migraciones
docker-compose exec api npx prisma migrate status

# Forzar sincronización del schema (desarrollo)
docker-compose exec api npx prisma db push --force-reset

# Producción: aplicar migraciones pendientes
docker-compose exec api npx prisma migrate deploy
```

### Problema: Backups no se ejecutan

**Solución:**
```bash
# Verificar permisos
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh

# Verificar cron
sudo service cron status
sudo service cron restart

# Probar backup manual
bash scripts/backup.sh
```

### Problema: Archivos no se suben (S3)

**Solución:**
```bash
# Verificar variables S3 en .env
cat .env | grep S3_

# Probar conexión a S3 (MinIO ejemplo)
docker run --rm -it --entrypoint=/bin/sh minio/mc
mc alias set myminio $S3_ENDPOINT $S3_ACCESS_KEY $S3_SECRET_KEY
mc ls myminio/$S3_BUCKET
```

---

## Comandos Útiles

```bash
# Reiniciar todos los servicios
docker-compose restart

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (PELIGRO: borra datos)
docker-compose down -v

# Ver uso de recursos
docker stats

# Limpiar Docker (espacio en disco)
docker system prune -a

# Actualizar aplicación
git pull
docker-compose build --no-cache
docker-compose up -d

# Acceder a contenedor
docker-compose exec api bash
docker-compose exec db mysql -u root -p
```

---

## Siguientes Pasos

1. ✅ Configurar backups automáticos
2. ✅ Configurar SSL/HTTPS
3. ✅ Configurar dominio personalizado
4. ⬜ Configurar S3 para archivos
5. ⬜ Configurar SMTP para emails
6. ⬜ Monitoreo con Prometheus/Grafana (opcional)
7. ⬜ CI/CD con GitHub Actions (opcional)

---

## Soporte

Para problemas o consultas:
- 📧 Email: soporte@asesoriallave.com
- 📖 Documentación: `README.md`
- 🐛 Issues: GitHub Issues

---

**Versión**: 2.0.0  
**Última actualización**: Enero 2025
