# 🚀 Guía de Deployment - Asesoría La Llave

Esta guía cubre múltiples opciones de deployment para producción.

---

## 📋 Índice

1. [GitHub + Codespaces](#-github--codespaces)
2. [Hostinger VPS](#-hostinger-vps)
3. [Variables de Entorno](#-variables-de-entorno)
4. [Troubleshooting](#-troubleshooting)

Ver también: [DEPLOYMENT_DOCKER.md](./DEPLOYMENT_DOCKER.md) para deployment con Docker.

---

## 🐙 GitHub + Codespaces

### **Preparación del Repositorio**

#### 1. **Inicializar Git (si no lo has hecho)**

```bash
git init
git add .
git commit -m "Initial commit: Asesoría La Llave v2.0"
```

#### 2. **Crear Repositorio en GitHub**

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `asesoria-la-llave`
3. Visibilidad: Private (recomendado para apps empresariales)
4. **NO** inicialices con README, .gitignore o license (ya los tienes)
5. Crea el repositorio

#### 3. **Subir a GitHub**

```bash
git remote add origin https://github.com/TU_USUARIO/asesoria-la-llave.git
git branch -M main
git push -u origin main
```

### **Trabajar en Codespaces**

#### 1. **Abrir Codespaces**

- Opción A: Ve a tu repo → Click en `Code` → `Codespaces` → `Create codespace on main`
- Opción B: Usa el badge del README
- Opción C: Directo: `https://codespaces.new/TU_USUARIO/asesoria-la-llave`

#### 2. **Configuración Automática**

El archivo `.devcontainer/devcontainer.json` configura automáticamente:
- ✅ Node.js 20
- ✅ Extensions de VSCode (ESLint, Prettier, Tailwind, Prisma)
- ✅ Puerto 5000 expuesto
- ✅ `npm install` y `npx prisma generate` automáticos

#### 3. **Configurar Variables de Entorno**

```bash
# Crear .env desde ejemplo
cp .env.example .env

# Editar con tus valores
nano .env
```

**Configuración mínima para testing:**

```env
# Base de datos (usa tu MySQL/MariaDB externo)
DATABASE_URL="mysql://user:password@185.239.239.43:3306/asesoria_llave"

# Autenticación
JWT_SECRET=codespaces-secret-key-change-this
SESSION_SECRET=codespaces-session-secret

# Email (opcional para testing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu_app_password
```

#### 4. **Sincronizar Base de Datos**

```bash
# Sincronizar schema
npx prisma db push

# Poblar con datos de ejemplo
npx tsx prisma/seed.ts
```

#### 5. **Iniciar Aplicación**

```bash
npm run dev
```

Codespaces mostrará una notificación con el puerto 5000 - haz click para abrir la app.

### **Ventajas de Codespaces**

- ✅ **Entorno preconfigurado** - Todo funciona de inmediato
- ✅ **Acceso desde cualquier lugar** - Solo necesitas un navegador
- ✅ **Gratis** - 60 horas/mes en cuenta gratuita
- ✅ **Colaboración** - Comparte tu Codespace con el equipo
- ✅ **Sin configuración local** - No necesitas instalar nada en tu PC

---

## 🌐 Hostinger VPS

### **Requisitos**

- VPS de Hostinger (desde $4.99/mes)
- Dominio (opcional pero recomendado)
- Conocimientos básicos de SSH

### **Opción 1: CloudPanel (Recomendado - Fácil)**

#### 1. **Contratar VPS con Node.js**

1. Ve a [Hostinger VPS](https://www.hostinger.com/vps/nodejs-hosting)
2. Selecciona plan (recomendado: KVM 2 - $6.99/mes)
3. Selecciona template: **Ubuntu 24.04 + Node.js + OpenLiteSpeed**
4. Completa compra

#### 2. **Acceder a CloudPanel**

```
URL: https://TU_IP_VPS:8443
Usuario: cloudpanel (recibirás credenciales por email)
```

#### 3. **Crear Sitio Node.js**

1. CloudPanel → **Sites** → **Add Site**
2. Configuración:
   - **Site Type**: Node.js
   - **Domain**: tudominio.com (o usa la IP por ahora)
   - **Node Version**: 20.x
   - **App Port**: 5000
   - **App Entry Point**: dist/index.js

3. Click **Create**

#### 4. **Subir Código**

**Opción A: Git (Recomendado)**

```bash
# En tu VPS, via SSH
cd /home/cloudpanel/htdocs/tudominio.com
git clone https://github.com/TU_USUARIO/asesoria-la-llave.git .
```

**Opción B: SFTP**

Usa FileZilla o WinSCP:
```
Host: TU_IP_VPS
Port: 22
User: cloudpanel
Password: tu_password
```

#### 5. **Instalar y Configurar**

```bash
# SSH a tu VPS
ssh cloudpanel@TU_IP_VPS

# Ir al directorio
cd /home/cloudpanel/htdocs/tudominio.com

# Instalar dependencias
npm install

# Configurar .env
cp .env.example .env
nano .env

# Variables importantes:
# NODE_ENV=production
# DATABASE_URL=mysql://...
# ENABLE_CRON_JOBS=true  # Para VPS
# JWT_SECRET=...
# SMTP_*=...

# Generar Prisma Client
npx prisma generate

# Sincronizar BD
npx prisma db push

# Build para producción
npm run build
```

#### 6. **Iniciar Aplicación**

CloudPanel maneja el proceso automáticamente:
- Auto-restart si falla
- Logs en CloudPanel → Sites → Tu Sitio → Logs

#### 7. **Configurar SSL (HTTPS)**

En CloudPanel:
1. Sites → Tu Sitio → SSL
2. Click **Let's Encrypt**
3. Ingresa email
4. Click **Install**

¡Listo! Tu app estará en `https://tudominio.com`

### **Opción 2: Configuración Manual con PM2**

#### 1. **Conectar por SSH**

```bash
ssh root@TU_IP_VPS
```

#### 2. **Instalar Node.js**

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Instalar Node.js 20
nvm install 20
nvm use 20
```

#### 3. **Clonar Proyecto**

```bash
# Crear directorio
mkdir -p /var/www
cd /var/www

# Clonar
git clone https://github.com/TU_USUARIO/asesoria-la-llave.git
cd asesoria-la-llave
```

#### 4. **Configurar**

```bash
# Instalar dependencias
npm install

# Variables de entorno
cp .env.example .env
nano .env

# Generar Prisma
npx prisma generate

# Sincronizar BD
npx prisma db push

# Build
npm run build
```

#### 5. **Instalar PM2**

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar app
pm2 start npm --name "asesoria-llave" -- start

# Guardar configuración
pm2 save

# Auto-start al reiniciar servidor
pm2 startup
# Ejecuta el comando que PM2 te muestra
```

#### 6. **Configurar Nginx (Reverse Proxy)**

```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/asesoria
```

Contenido:

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/asesoria /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### 7. **Configurar SSL con Certbot**

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Auto-renovación (ya está configurada)
sudo certbot renew --dry-run
```

### **Comandos Útiles PM2**

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs asesoria-llave

# Reiniciar
pm2 restart asesoria-llave

# Detener
pm2 stop asesoria-llave

# Eliminar
pm2 delete asesoria-llave

# Monitoreo
pm2 monit
```

---

## 🔑 Variables de Entorno

### **Producción Mínima**

```env
NODE_ENV=production
PORT=5000

# Autenticación (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=generate-strong-random-string-here
SESSION_SECRET=generate-another-random-string

# Base de Datos
DATABASE_URL="mysql://user:password@host:3306/database"

# Cron Jobs (solo VPS/Reserved VM)
ENABLE_CRON_JOBS=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu_app_password

# S3 (opcional)
S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
S3_BUCKET=asesoria-files
S3_ACCESS_KEY=your_key
S3_SECRET_KEY=your_secret
S3_REGION=us-west-002
```

### **Generar Secrets Seguros**

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔍 Troubleshooting

### **Error: "Cannot connect to database"**

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Probar conexión
npx prisma db execute --stdin <<< "SELECT 1"
```

### **Error: "Port 5000 already in use"**

```bash
# Ver qué usa el puerto
sudo lsof -i :5000

# Cambiar puerto en .env
PORT=3000
```

### **Error: "Prisma Client not generated"**

```bash
npx prisma generate
npm run build
```

### **Logs de PM2**

```bash
# Ver logs en tiempo real
pm2 logs asesoria-llave --lines 100

# Ver errores específicos
pm2 logs asesoria-llave --err
```

### **Reiniciar Aplicación**

```bash
# PM2
pm2 restart asesoria-llave

# CloudPanel
# CloudPanel → Sites → Tu Sitio → Restart
```

---

## 🔄 Actualizaciones

### **Actualizar Código**

```bash
# Detener app
pm2 stop asesoria-llave

# Pull cambios
git pull origin main

# Instalar nuevas dependencias
npm install

# Regenerar Prisma si cambió schema
npx prisma generate

# Aplicar migraciones
npx prisma migrate deploy

# Rebuild
npm run build

# Reiniciar
pm2 restart asesoria-llave
```

### **Backup Antes de Actualizar**

```bash
# Backup de BD
bash scripts/backup.sh

# Backup de código
tar -czf backup-$(date +%Y%m%d).tar.gz .
```

---

## 📞 Soporte

- 📖 [README.md](./README.md) - Documentación principal
- 📖 [README_DEPLOY.md](./README_DEPLOY.md) - Guía de deployment con Docker
- 🐛 [GitHub Issues](../../issues) - Reportar problemas

---

**¡Listo para producción! 🚀**
