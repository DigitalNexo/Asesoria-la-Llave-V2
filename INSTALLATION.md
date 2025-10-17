# 📦 Manual de Instalación - Asesoría La Llave

Guía completa paso a paso para instalar **Asesoría La Llave** en cualquier sistema operativo o servidor.

---

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Instalación en Linux (Ubuntu/Debian)](#instalación-en-linux-ubuntudebian)
3. [Instalación en Linux (CentOS/RHEL)](#instalación-en-linux-centosrhel)
4. [Instalación en Windows Server](#instalación-en-windows-server)
5. [Instalación con Docker](#instalación-con-docker)
6. [Configuración de Base de Datos](#configuración-de-base-de-datos)
7. [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)
8. [Ejecución de Migraciones](#ejecución-de-migraciones)
9. [Inicio de la Aplicación](#inicio-de-la-aplicación)
10. [Configuración en Producción](#configuración-en-producción)
11. [Vinculación de Dominio Personalizado](#vinculación-de-dominio-personalizado)
12. [Configuración de SMTP (Opcional)](#configuración-de-smtp-opcional)
13. [Actualización de la Aplicación](#actualización-de-la-aplicación)
14. [Troubleshooting](#troubleshooting)

---

## 📌 Requisitos Previos

Antes de instalar, asegúrate de tener:

### Software Necesario:
- **Node.js** versión 18 o superior
- **npm** o **yarn** (viene con Node.js)
- **MariaDB** versión 10.5+ o **MySQL** 8.0+
- **Git** (para clonar el repositorio)

### Recursos del Servidor:
- **Mínimo**: 2GB RAM, 2 CPU cores, 10GB disco
- **Recomendado**: 4GB RAM, 4 CPU cores, 20GB disco

---

## 🐧 Instalación en Linux (Ubuntu/Debian)

### Paso 1: Actualizar el Sistema

Abre una terminal y ejecuta:

```bash
sudo apt update
sudo apt upgrade -y
```

### Paso 2: Instalar Node.js

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version
npm --version
```

### Paso 3: Instalar MariaDB

```bash
# Instalar MariaDB
sudo apt install -y mariadb-server

# Iniciar servicio
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Configurar seguridad (sigue las instrucciones en pantalla)
sudo mysql_secure_installation
```

Durante `mysql_secure_installation`:
- Establece una contraseña para root
- Responde "Y" a todas las preguntas de seguridad

### Paso 4: Instalar Git

```bash
sudo apt install -y git
```

### Paso 5: Clonar el Repositorio

```bash
# Navega a donde quieres instalar
cd /var/www

# Clona el repositorio (reemplaza con tu URL)
sudo git clone https://github.com/tu-usuario/asesoria-llave.git
cd asesoria-llave

# Da permisos al usuario actual
sudo chown -R $USER:$USER /var/www/asesoria-llave
```

### Paso 6: Instalar Dependencias

```bash
npm install
```

### Paso 7: Configurar Base de Datos

```bash
# Conectar a MariaDB como root
sudo mysql -u root -p

# Dentro de MySQL, ejecuta:
CREATE DATABASE asesoria_llave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'asesoria_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON asesoria_llave.* TO 'asesoria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 8: Configurar Variables de Entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tu editor favorito (nano, vim, etc.)
nano .env
```

Edita el archivo `.env` con tus datos (ver sección [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)).

### Paso 9: Ejecutar Migraciones

```bash
# Generar cliente Prisma
npm run db:generate

# Aplicar migraciones
npm run db:push

# Ejecutar script RBAC para crear roles y permisos
npm run migrate:rbac

# Crear plantillas de notificación predefinidas
npm run seed:templates
```

### Paso 10: Iniciar la Aplicación

```bash
# Modo desarrollo
npm run dev

# O modo producción
npm run build
npm start
```

La aplicación estará disponible en `http://localhost:5000`

---

## 🐧 Instalación en Linux (CentOS/RHEL)

### Paso 1: Actualizar el Sistema

```bash
sudo yum update -y
# O en versiones nuevas:
sudo dnf update -y
```

### Paso 2: Instalar Node.js

```bash
# Instalar Node.js 20 LTS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
# O: sudo dnf install -y nodejs

# Verificar
node --version
npm --version
```

### Paso 3: Instalar MariaDB

```bash
# Instalar MariaDB
sudo yum install -y mariadb-server
# O: sudo dnf install -y mariadb-server

# Iniciar servicio
sudo systemctl start mariadb
sudo systemctl enable mariadb

# Configurar seguridad
sudo mysql_secure_installation
```

### Paso 4: Instalar Git

```bash
sudo yum install -y git
# O: sudo dnf install -y git
```

### Paso 5 en adelante

Sigue los mismos pasos que Ubuntu/Debian desde el **Paso 5** (Clonar el Repositorio).

---

## 🪟 Instalación en Windows Server

### Paso 1: Instalar Node.js

1. Descarga Node.js desde: https://nodejs.org/
2. Ejecuta el instalador `.msi`
3. Sigue el asistente de instalación (acepta todas las opciones por defecto)
4. Abre **PowerShell** o **CMD** y verifica:

```powershell
node --version
npm --version
```

### Paso 2: Instalar MariaDB

1. Descarga MariaDB desde: https://mariadb.org/download/
2. Ejecuta el instalador `.msi`
3. Durante la instalación:
   - Establece una contraseña para el usuario `root`
   - Marca la opción "Enable networking"
   - Puerto por defecto: 3306
4. Al finalizar, MariaDB se instalará como servicio de Windows

### Paso 3: Instalar Git

1. Descarga Git desde: https://git-scm.com/download/win
2. Ejecuta el instalador
3. Acepta las opciones por defecto
4. Verifica en PowerShell:

```powershell
git --version
```

### Paso 4: Clonar el Repositorio

Abre **PowerShell** como Administrador:

```powershell
# Navega a donde quieres instalar (ejemplo: C:\inetpub\)
cd C:\inetpub\

# Clona el repositorio
git clone https://github.com/tu-usuario/asesoria-llave.git
cd asesoria-llave
```

### Paso 5: Instalar Dependencias

```powershell
npm install
```

### Paso 6: Configurar Base de Datos

Abre **MySQL Command Line Client** (instalado con MariaDB):

```sql
CREATE DATABASE asesoria_llave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'asesoria_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';
GRANT ALL PRIVILEGES ON asesoria_llave.* TO 'asesoria_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 7: Configurar Variables de Entorno

```powershell
# Copiar archivo de ejemplo
Copy-Item .env.example .env

# Editar con Notepad
notepad .env
```

Edita el archivo `.env` con tus datos (ver sección [Configuración de Variables de Entorno](#configuración-de-variables-de-entorno)).

### Paso 8: Ejecutar Migraciones

```powershell
npm run db:generate
npm run db:push
npm run migrate:rbac
npm run seed:templates
```

### Paso 9: Iniciar la Aplicación

```powershell
# Modo desarrollo
npm run dev

# O modo producción
npm run build
npm start
```

### Paso 10: Configurar como Servicio de Windows (Opcional)

Para que la aplicación se ejecute automáticamente al iniciar Windows:

1. Instala `node-windows`:

```powershell
npm install -g node-windows
```

2. Crea un script `install-service.js`:

```javascript
var Service = require('node-windows').Service;

var svc = new Service({
  name: 'Asesoria La Llave',
  description: 'Sistema de gestión Asesoría La Llave',
  script: 'C:\\inetpub\\asesoria-llave\\server\\index.js',
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ]
});

svc.on('install', function(){
  svc.start();
});

svc.install();
```

3. Ejecuta como Administrador:

```powershell
node install-service.js
```

### Paso 11: Configuración de Producción con Dominio Personalizado (Opcional)

#### 1. Instalar y Configurar IIS como Reverse Proxy

**Instalar IIS:**

1. Abre **Server Manager**
2. Ve a **Add Roles and Features**
3. Selecciona **Web Server (IIS)**
4. Incluye las siguientes características:
   - Application Development → ASP.NET 4.8 (o superior)
   - Management Tools → IIS Management Console

**Instalar módulos necesarios:**

1. **URL Rewrite Module**: 
   - Descarga desde: https://www.iis.net/downloads/microsoft/url-rewrite
   - Ejecuta el instalador

2. **Application Request Routing (ARR)**:
   - Descarga desde: https://www.iis.net/downloads/microsoft/application-request-routing
   - Ejecuta el instalador
   - Abre IIS Manager → Selecciona el servidor
   - Doble clic en **Application Request Routing Cache**
   - Click en **Server Proxy Settings** (panel derecho)
   - Marca **Enable proxy** → **Apply**

**Crear sitio en IIS:**

1. Abre **IIS Manager**
2. Click derecho en **Sites** → **Add Website**
3. Configura:
   - **Site name**: Asesoria La Llave
   - **Physical path**: `C:\inetpub\wwwroot\empty` (crear carpeta vacía)
   - **Binding**: 
     - Type: http
     - IP: All Unassigned
     - Port: 80
     - Host name: `tu-dominio.com`

4. Agrega otro binding para www:
   - Click derecho en el sitio → **Edit Bindings** → **Add**
   - Type: http, Port: 80, Host name: `www.tu-dominio.com`

**Configurar reglas de rewrite:**

1. Selecciona el sitio creado
2. Doble clic en **URL Rewrite**
3. Click en **Add Rule(s)** → **Reverse Proxy**
4. Si pregunta sobre ARR, acepta habilitarlo
5. Configura:
   - **Inbound Rules**: `localhost:5000`
   - Marca **Enable SSL Offloading**
   - **Outbound Rules**: No modificar
6. Click **OK**

7. Edita la regla creada:
   - Doble clic en la regla
   - En **Server Variables**, agrega:
     - `HTTP_X_FORWARDED_PROTO` = `https`
     - `HTTP_X_FORWARDED_FOR` = `{REMOTE_ADDR}`

#### 2. Configurar Certificado SSL

**Opción A: Let's Encrypt (Gratuito) con win-acme**

1. Descarga win-acme desde: https://www.win-acme.com/
2. Extrae en `C:\Tools\win-acme\`
3. Ejecuta como Administrador `wacs.exe`
4. Selecciona:
   - `N` para crear nuevo certificado
   - `2` para IIS binding
   - Selecciona tu sitio **"Asesoria La Llave"**
   - **IMPORTANTE**: Asegúrate de que ambos bindings estén seleccionados:
     - ✓ `tu-dominio.com`
     - ✓ `www.tu-dominio.com`
   - `1` para validación HTTP
   - `2` para instalar certificado en IIS
   - `1` para renovación automática
5. El certificado se instalará automáticamente para AMBOS dominios (con SAN entries)

**Opción B: Certificado Comercial**

1. Compra un certificado SSL **wildcard** (*.tu-dominio.com) o **multi-domain** que incluya:
   - `tu-dominio.com`
   - `www.tu-dominio.com`
2. Descarga el archivo `.pfx` o `.cer` + `.key`
3. En IIS Manager:
   - Selecciona el servidor → **Server Certificates**
   - Click **Import** (para .pfx) o **Complete Certificate Request** (para .cer)
4. Importa el certificado
5. Agrega binding HTTPS para el dominio principal:
   - Selecciona tu sitio → **Edit Bindings** → **Add**:
     - Type: https
     - Port: 443
     - Host name: `tu-dominio.com`
     - SSL certificate: Selecciona el importado
6. Agrega binding HTTPS para www:
   - Click **Add** nuevamente:
     - Type: https
     - Port: 443
     - Host name: `www.tu-dominio.com`
     - SSL certificate: Selecciona el mismo certificado

**Configurar redirección HTTP → HTTPS:**

1. En IIS → Selecciona tu sitio
2. URL Rewrite → **Add Rule** → **Blank rule**
3. Configura:
   - Name: `HTTP to HTTPS`
   - Match URL: `.*`
   - Conditions → Add:
     - Input: `{HTTPS}`
     - Pattern: `^OFF$`
   - Action:
     - Type: Redirect
     - URL: `https://{HTTP_HOST}/{R:0}`
     - Redirect type: Permanent (301)

#### 3. Configurar DNS

En tu proveedor de dominio (GoDaddy, Namecheap, Cloudflare, etc.):

**Agregar registros A:**

| Tipo | Nombre/Host | Valor | TTL |
|------|-------------|-------|-----|
| A | @ | IP_DE_TU_SERVIDOR | 3600 |
| A | www | IP_DE_TU_SERVIDOR | 3600 |

**Nota**: Reemplaza `IP_DE_TU_SERVIDOR` con la IP pública de tu servidor Windows.

La propagación DNS puede tomar de 5 minutos a 48 horas (normalmente 10-30 minutos).

#### 4. Configurar Firewall de Windows

Abre **PowerShell como Administrador**:

```powershell
# Permitir HTTP (puerto 80)
New-NetFirewallRule -DisplayName "HTTP Inbound" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Permitir HTTPS (puerto 443)
New-NetFirewallRule -DisplayName "HTTPS Inbound" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Ver reglas creadas
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*HTTP*"}
```

#### 5. Verificar Configuración

1. Asegúrate de que el servicio Node.js esté corriendo:
   ```powershell
   Get-Service "Asesoria La Llave"
   ```

2. Verifica que IIS esté funcionando:
   ```powershell
   Get-Service W3SVC
   ```

3. Prueba tus dominios:
   - Abre `http://tu-dominio.com` → Debe redirigir a `https://tu-dominio.com`
   - Abre `http://www.tu-dominio.com` → Debe redirigir a `https://www.tu-dominio.com`
   - Abre `https://tu-dominio.com` → Debe mostrar la aplicación
   - Abre `https://www.tu-dominio.com` → Debe mostrar la aplicación

4. Verifica el certificado SSL en AMBOS dominios:
   - En `https://tu-dominio.com` → Click en el candado → "Conexión segura"
   - En `https://www.tu-dominio.com` → Click en el candado → "Conexión segura"
   - Verifica que el certificado incluya ambos nombres (SAN entries)

#### 6. Renovación Automática de Certificados

**Si usas win-acme (Let's Encrypt):**
- La renovación es automática (tarea programada creada automáticamente)
- Verifica en **Task Scheduler** → **Task Scheduler Library** → busca `win-acme`

**Si usas certificado comercial:**
- Configura un recordatorio para renovar 30 días antes del vencimiento
- Repite el proceso de importación con el nuevo certificado

---

## 🐳 Instalación con Docker

### Opción 1: Docker Compose (Recomendado)

Crea un archivo `docker-compose.yml` en la raíz del proyecto:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://asesoria_user:${DB_PASSWORD}@db:3306/asesoria_llave
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    depends_on:
      - db
    volumes:
      - ./uploads:/app/uploads
    restart: unless-stopped

  db:
    image: mariadb:10.11
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=asesoria_llave
      - MYSQL_USER=asesoria_user
      - MYSQL_PASSWORD=${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

volumes:
  db_data:
```

Crea un archivo `Dockerfile` en la raíz:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

Ejecuta:

```bash
# Copia el archivo de entorno
cp .env.example .env

# Edita las variables (especialmente contraseñas)
nano .env

# Inicia los contenedores
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Ejecutar migraciones (primera vez)
docker-compose exec app npm run db:push
docker-compose exec app npm run migrate:rbac
docker-compose exec app npm run seed:templates
```

### Opción 2: Docker Manual

```bash
# Construir imagen
docker build -t asesoria-llave .

# Ejecutar contenedor (asumiendo MariaDB local)
docker run -d \
  --name asesoria-llave \
  -p 5000:5000 \
  -e DATABASE_URL="mysql://user:pass@host.docker.internal:3306/asesoria_llave" \
  -e JWT_SECRET="tu-secreto" \
  -e SESSION_SECRET="otro-secreto" \
  -e ADMIN_EMAIL="admin@asesoriallave.com" \
  -e ADMIN_USERNAME="admin" \
  -e ADMIN_PASSWORD="Admin123!" \
  -v $(pwd)/uploads:/app/uploads \
  asesoria-llave
```

---

## 🗄️ Configuración de Base de Datos

### Conexión Local (mismo servidor)

```bash
DATABASE_URL="mysql://asesoria_user:tu_contraseña@localhost:3306/asesoria_llave"
```

### Conexión Remota (VPS externo)

```bash
DATABASE_URL="mysql://usuario:contraseña@185.239.239.43:3306/asesoria_llave?socket_timeout=60&connect_timeout=60"
```

### Parámetros de Conexión Importantes

- `socket_timeout`: Tiempo de espera para operaciones (segundos)
- `connect_timeout`: Tiempo de espera para conexión inicial
- `ssl`: Agrega `?ssl=true` si tu servidor MariaDB requiere SSL

### Crear Base de Datos desde Cero

Si no tienes la base de datos creada:

```sql
-- Conecta a MariaDB
mysql -u root -p

-- Crea la base de datos
CREATE DATABASE asesoria_llave CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crea el usuario
CREATE USER 'asesoria_user'@'localhost' IDENTIFIED BY 'contraseña_segura_aquí';

-- Da permisos
GRANT ALL PRIVILEGES ON asesoria_llave.* TO 'asesoria_user'@'localhost';

-- Si necesitas acceso remoto
GRANT ALL PRIVILEGES ON asesoria_llave.* TO 'asesoria_user'@'%' IDENTIFIED BY 'contraseña_segura_aquí';

FLUSH PRIVILEGES;
EXIT;
```

---

## ⚙️ Configuración de Variables de Entorno

Edita el archivo `.env` y configura las siguientes variables:

### Variables Obligatorias

```bash
# Puerto del servidor
PORT=5000

# Entorno (development o production)
NODE_ENV=production

# Secretos de autenticación (CÁMBIALOS)
JWT_SECRET=genera-un-secreto-aleatorio-muy-largo-aquí
SESSION_SECRET=otro-secreto-aleatorio-diferente-aquí

# Base de datos
DATABASE_URL="mysql://usuario:contraseña@host:3306/asesoria_llave"

# ⚠️⚠️⚠️ CRÍTICO: Usuario Administrador Inicial ⚠️⚠️⚠️
# El servidor NO iniciará sin estos valores únicos configurados
# NO uses los valores de ejemplo del .env.example
# Estos valores se usan para crear el primer administrador del sistema
ADMIN_EMAIL=tu-email-real@tuempresa.com
ADMIN_USERNAME=tu-usuario-unico
ADMIN_PASSWORD=tu-contraseña-muy-segura-aquí
```

> **⚠️ IMPORTANTE - SEGURIDAD:**
> 
> - El servidor **se detendrá** si las credenciales de admin no están configuradas
> - **NO copies** los valores de ejemplo de `.env.example` directamente
> - Usa credenciales **únicas y seguras** para tu instalación
> - Requisitos:
>   - Email válido (debe contener @ y .)
>   - Usuario: mínimo 3 caracteres
>   - Contraseña: mínimo 6 caracteres (recomendado 12+ caracteres)

### Variables Opcionales

```bash
# Cron jobs (true para VPS/servidores dedicados, false para Autoscale)
ENABLE_CRON_JOBS=true

# SMTP (opcional, puedes configurarlo desde el panel admin)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucorreo@gmail.com
SMTP_PASSWORD=tu_app_password

# S3/Almacenamiento (opcional)
S3_ENDPOINT=https://s3.region.backblazeb2.com
S3_BUCKET=asesoria-files
S3_ACCESS_KEY=tu_access_key
S3_SECRET_KEY=tu_secret_key
S3_REGION=us-west-002

# URL del frontend (para CORS)
FRONTEND_URL=https://tu-dominio.com
```

### Generar Secretos Seguros

En Linux/Mac:

```bash
openssl rand -base64 32
```

En Windows PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

En Node.js:

```javascript
require('crypto').randomBytes(32).toString('base64')
```

---

## 🔄 Ejecución de Migraciones

Las migraciones crean las tablas y estructuras necesarias en la base de datos.

### Paso a Paso

```bash
# 1. Generar el cliente Prisma
npm run db:generate

# 2. Aplicar schema a la base de datos
npm run db:push

# Si hay advertencias de pérdida de datos, fuerza el push:
npm run db:push -- --force

# 3. Crear roles y permisos del sistema (RBAC)
npm run migrate:rbac

# 4. Crear plantillas de notificación predefinidas
npm run seed:templates
```

### Verificar que las Migraciones Funcionaron

Conecta a la base de datos y verifica:

```sql
-- Conectar
mysql -u asesoria_user -p asesoria_llave

-- Ver tablas creadas
SHOW TABLES;

-- Ver roles creados
SELECT * FROM Role;

-- Ver permisos
SELECT * FROM Permission;

EXIT;
```

Deberías ver tablas como: `User`, `Role`, `Permission`, `Client`, `Tax`, `Task`, `Manual`, etc.

---

## 🚀 Inicio de la Aplicación

### Modo Desarrollo

```bash
npm run dev
```

Abre tu navegador en: `http://localhost:5000`

### Modo Producción

```bash
# 1. Compilar TypeScript y frontend
npm run build

# 2. Iniciar servidor
npm start
```

### Verificar que Funciona

1. Abre `http://localhost:5000` (o tu dominio)
2. Verás la página de login
3. Inicia sesión con las credenciales del admin inicial:
   - **Usuario**: El que configuraste en `ADMIN_USERNAME`
   - **Contraseña**: La que configuraste en `ADMIN_PASSWORD`

---

## 🔐 Configuración en Producción

### 1. Instalar PM2 (Gestor de Procesos)

PM2 mantiene tu aplicación corriendo permanentemente y la reinicia si falla.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Iniciar aplicación con PM2
pm2 start npm --name "asesoria-llave" -- start

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
# Ejecuta el comando que PM2 te muestre
```

### Comandos Útiles de PM2

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
```

### 2. Configurar Nginx como Reverse Proxy

Instala Nginx:

```bash
sudo apt install -y nginx
```

Crea la configuración:

```bash
sudo nano /etc/nginx/sites-available/asesoria-llave
```

Contenido del archivo:

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Archivos estáticos (uploads)
    location /uploads {
        alias /var/www/asesoria-llave/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Activa la configuración:

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/asesoria-llave /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 3. Configurar SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# El certificado se renovará automáticamente
```

### 4. Configurar Firewall

```bash
# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# Permitir SSH (si lo usas)
sudo ufw allow OpenSSH

# Activar firewall
sudo ufw enable

# Ver estado
sudo ufw status
```

---

## 🌐 Vinculación de Dominio Personalizado

Esta sección te guiará paso a paso para configurar tu dominio personalizado (comprado en IONOS, GoDaddy, Namecheap, etc.) para que apunte a tu servidor VPS donde está instalado **Asesoría La Llave**.

### 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
- ✅ Un dominio registrado (ejemplo: `mi-asesoria.com`)
- ✅ Un VPS con Ubuntu/Debian con IP pública estática
- ✅ **Asesoría La Llave** instalado y funcionando en el puerto 5000
- ✅ Acceso al panel de control de tu proveedor de dominio
- ✅ Acceso SSH a tu servidor VPS

---

### 🔧 Paso 1: Configurar DNS en tu Proveedor de Dominio

#### A. Configuración DNS en IONOS

Si compraste tu dominio en **IONOS**, sigue estos pasos:

1. **Accede a tu cuenta de IONOS**
   - Ve a [https://www.ionos.es](https://www.ionos.es)
   - Inicia sesión con tu cuenta

2. **Navega a la gestión de DNS**
   - Ve a **Dominios y SSL** → **Dominios**
   - Haz clic en el dominio que quieres configurar
   - Selecciona **DNS** en el menú lateral

3. **Agregar registro A para el dominio principal**
   - Haz clic en **Añadir registro**
   - Selecciona tipo: **A**
   - Configura:
     - **Nombre del host**: `@` (representa tu dominio raíz)
     - **Apunta a**: `TU_IP_PUBLICA_VPS` (ejemplo: `203.0.113.45`)
     - **TTL**: `3600` (1 hora)
   - Haz clic en **Guardar**

4. **Agregar registro A para el subdominio www**
   - Haz clic en **Añadir registro** nuevamente
   - Selecciona tipo: **A**
   - Configura:
     - **Nombre del host**: `www`
     - **Apunta a**: `TU_IP_PUBLICA_VPS` (la misma IP)
     - **TTL**: `3600`
   - Haz clic en **Guardar**

5. **Verificar la configuración**
   - Deberías ver dos registros A:
     ```
     @     A     TU_IP_VPS     TTL: 3600
     www   A     TU_IP_VPS     TTL: 3600
     ```

6. **Tiempo de propagación**
   - Los cambios DNS pueden tardar entre **5 minutos y 48 horas** en propagarse
   - Normalmente toma **10-30 minutos**

#### B. Configuración DNS Genérica (GoDaddy, Namecheap, Cloudflare, etc.)

Si tu dominio está en otro proveedor, los pasos son similares:

**GoDaddy:**
1. Ve a **Mi cuenta** → **Mis productos**
2. Junto a **Dominios**, haz clic en **DNS**
3. Busca la sección **Registros**
4. Agrega/edita registros A:
   - **Tipo**: A, **Nombre**: `@`, **Valor**: `TU_IP_VPS`, **TTL**: 600
   - **Tipo**: A, **Nombre**: `www`, **Valor**: `TU_IP_VPS`, **TTL**: 600

**Namecheap:**
1. Ve a **Domain List** → Haz clic en **Manage** junto a tu dominio
2. Ve a **Advanced DNS**
3. Agrega/edita registros:
   - **Tipo**: A Record, **Host**: `@`, **Value**: `TU_IP_VPS`, **TTL**: Automatic
   - **Tipo**: A Record, **Host**: `www`, **Value**: `TU_IP_VPS`, **TTL**: Automatic

**Cloudflare:**
1. Selecciona tu dominio en el dashboard
2. Ve a **DNS** → **Records**
3. Agrega registros:
   - **Tipo**: A, **Name**: `@`, **IPv4 address**: `TU_IP_VPS`, **Proxy status**: Desactivado (nube gris)
   - **Tipo**: A, **Name**: `www`, **IPv4 address**: `TU_IP_VPS`, **Proxy status**: Desactivado

**⚠️ Importante**: Si usas Cloudflare, **desactiva el proxy (nube naranja)** temporalmente hasta que SSL esté configurado.

#### C. Verificar que DNS está Propagado

Espera unos minutos y verifica que tu dominio apunta correctamente:

```bash
# Verificar dominio principal
nslookup tu-dominio.com

# Verificar subdominio www
nslookup www.tu-dominio.com

# Alternativa con dig
dig tu-dominio.com +short
dig www.tu-dominio.com +short
```

Deberías ver tu IP pública del VPS como respuesta.

---

### 🔧 Paso 2: Instalar y Configurar Nginx como Reverse Proxy

Nginx actuará como intermediario entre el mundo exterior (puerto 80/443) y tu aplicación (puerto 5000).

#### 2.1. Instalar Nginx

```bash
# Actualizar repositorios
sudo apt update

# Instalar Nginx
sudo apt install -y nginx

# Verificar que está corriendo
sudo systemctl status nginx

# Si no está activo, iniciarlo
sudo systemctl start nginx
sudo systemctl enable nginx
```

#### 2.2. Crear Configuración para tu Dominio

```bash
# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/asesoria-llave
```

**Contenido del archivo** (copia y pega, luego reemplaza `tu-dominio.com` con tu dominio real):

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Logs específicos
    access_log /var/log/nginx/asesoria-llave-access.log;
    error_log /var/log/nginx/asesoria-llave-error.log;

    # Tamaño máximo de archivos (para uploads)
    client_max_body_size 10M;

    # Proxy pass a Node.js (puerto 5000)
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        
        # Headers necesarios para reverse proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Headers para WebSocket (Socket.IO)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Bypass cache
        proxy_cache_bypass $http_upgrade;
    }

    # Servir archivos estáticos de uploads (opcional)
    location /uploads {
        alias /var/www/asesoria-llave/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Explicación de configuraciones importantes:**
- `proxy_set_header Upgrade` y `Connection`: Permiten que Socket.IO funcione correctamente
- `client_max_body_size 10M`: Permite subir archivos de hasta 10MB
- `proxy_read_timeout 60s`: Evita timeouts en operaciones largas

#### 2.3. Activar la Configuración

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/asesoria-llave /etc/nginx/sites-enabled/

# Verificar que la configuración es correcta
sudo nginx -t

# Si todo está OK, reiniciar Nginx
sudo systemctl restart nginx
```

#### 2.4. Verificar que Nginx Funciona

```bash
# Ver logs en tiempo real
sudo tail -f /var/log/nginx/asesoria-llave-access.log

# En otro terminal, prueba acceder
curl -I http://tu-dominio.com
```

Deberías ver que Nginx responde con código 200.

---

### 🔧 Paso 3: Configurar SSL/TLS con Let's Encrypt (Certificado Gratuito)

Let's Encrypt proporciona certificados SSL **gratuitos** y **renovables automáticamente**.

#### 3.1. Instalar Certbot

```bash
# Instalar Certbot con plugin de Nginx
sudo apt install -y certbot python3-certbot-nginx
```

#### 3.2. Obtener Certificado SSL

```bash
# Generar certificado para ambos dominios (principal y www)
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

**Durante el proceso, Certbot te preguntará:**

1. **Email**: Proporciona un email válido (para notificaciones de renovación)
2. **Términos de servicio**: Acepta (`A`)
3. **Compartir email con EFF**: Opcional (`Y` o `N`)
4. **Redirección HTTPS**: Selecciona `2` (Redirect - Redirigir HTTP a HTTPS)

Certbot automáticamente:
- ✅ Genera los certificados SSL
- ✅ Modifica tu configuración de Nginx para usar HTTPS
- ✅ Agrega redirección automática de HTTP → HTTPS
- ✅ Configura renovación automática

#### 3.3. Verificar Certificado SSL

```bash
# Ver certificados instalados
sudo certbot certificates

# Verificar renovación automática
sudo certbot renew --dry-run
```

#### 3.4. Configuración Final de Nginx (post-SSL)

Después de Certbot, tu archivo `/etc/nginx/sites-available/asesoria-llave` se habrá modificado automáticamente. Debería verse similar a esto:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tu-dominio.com www.tu-dominio.com;
    
    # Redirigir HTTP a HTTPS (agregado por Certbot)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tu-dominio.com www.tu-dominio.com;

    # Certificados SSL (agregados por Certbot)
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Logs
    access_log /var/log/nginx/asesoria-llave-access.log;
    error_log /var/log/nginx/asesoria-llave-error.log;

    # Tamaño máximo de archivos
    client_max_body_size 10M;

    # Proxy pass a Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
    }

    # Uploads estáticos
    location /uploads {
        alias /var/www/asesoria-llave/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 3.5. Renovación Automática

Certbot instala automáticamente un cron job o systemd timer para renovar certificados. Puedes verificarlo:

```bash
# Ver timer de renovación automática
sudo systemctl list-timers | grep certbot

# Logs de renovación
sudo journalctl -u certbot.timer
```

Los certificados se renovarán automáticamente cada 60 días (antes de expirar a los 90 días).

---

### 🔧 Paso 4: Configurar Firewall (UFW)

Configura el firewall para permitir solo tráfico necesario.

```bash
# Verificar estado actual
sudo ufw status

# Si UFW está inactivo, configurarlo
# Permitir SSH (IMPORTANTE: antes de activar UFW)
sudo ufw allow OpenSSH

# Permitir HTTP (puerto 80)
sudo ufw allow 80/tcp

# Permitir HTTPS (puerto 443)
sudo ufw allow 443/tcp

# O simplemente permitir "Nginx Full" (80 + 443)
sudo ufw allow 'Nginx Full'

# OPCIONAL: Si Nginx HTTP está permitido, eliminarlo (ya solo necesitas Full)
sudo ufw delete allow 'Nginx HTTP'

# Activar firewall
sudo ufw enable

# Verificar reglas
sudo ufw status verbose
```

**⚠️ Importante**: NO permitas el puerto 5000 al exterior. Solo Nginx (localhost) debe acceder a él.

**Reglas recomendadas:**
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
OpenSSH (v6)               ALLOW       Anywhere (v6)
Nginx Full (v6)            ALLOW       Anywhere (v6)
```

---

### 🔧 Paso 5: Verificación y Testing

#### 5.1. Verificar DNS

```bash
# Verificar que tu dominio resuelve correctamente
dig tu-dominio.com +short
# Debe mostrar: TU_IP_VPS

nslookup www.tu-dominio.com
# Debe mostrar: TU_IP_VPS
```

#### 5.2. Verificar HTTP → HTTPS Redirection

```bash
# Debe redirigir automáticamente a HTTPS
curl -I http://tu-dominio.com
# Busca: HTTP/1.1 301 Moved Permanently
# Location: https://tu-dominio.com/

curl -I http://www.tu-dominio.com
# Debe redirigir a: https://www.tu-dominio.com/
```

#### 5.3. Verificar HTTPS Funciona

```bash
# Debe responder con código 200
curl -I https://tu-dominio.com
# HTTP/2 200

curl -I https://www.tu-dominio.com
# HTTP/2 200
```

#### 5.4. Verificar SSL Certificate

```bash
# Ver información del certificado
openssl s_client -connect tu-dominio.com:443 -servername tu-dominio.com < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Debe mostrar:
# notBefore: [fecha]
# notAfter: [fecha] (90 días después)
```

#### 5.5. Probar en el Navegador

1. Abre tu navegador
2. Visita `https://tu-dominio.com`
3. Deberías ver:
   - ✅ Candado verde/gris (conexión segura)
   - ✅ La página de login de **Asesoría La Llave**
   - ✅ Sin advertencias de certificado

4. Verifica que `http://tu-dominio.com` redirige automáticamente a `https://`

5. Verifica que `www.tu-dominio.com` también funciona

#### 5.6. Verificar WebSocket/Socket.IO

Inicia sesión en la aplicación y verifica:
- ✅ Notificaciones en tiempo real funcionan
- ✅ No hay errores de WebSocket en la consola del navegador (F12)

```javascript
// En la consola del navegador (F12), no deberías ver:
// WebSocket connection to 'wss://tu-dominio.com/socket.io/...' failed
```

---

### 🔧 Paso 6: Troubleshooting de Dominios

#### Problema 1: DNS No Propaga (Dominio No Resuelve)

**Síntomas:**
```bash
dig tu-dominio.com +short
# (sin resultado o IP incorrecta)
```

**Causas comunes:**
1. Configuración DNS incorrecta en el proveedor
2. DNS aún no ha propagado (esperar 10-30 minutos)
3. Registro A apuntando a IP incorrecta

**Solución:**
```bash
# Verificar DNS directamente en servidores del proveedor
# Google DNS
dig @8.8.8.8 tu-dominio.com

# Cloudflare DNS
dig @1.1.1.1 tu-dominio.com

# Si no resuelve, revisar configuración en panel del proveedor
# Asegúrate de que el registro A tenga:
# - Nombre: @ (o vacío)
# - Tipo: A
# - Valor: TU_IP_VPS
```

#### Problema 2: "502 Bad Gateway" al Acceder por Dominio

**Síntomas:**
- Navegador muestra "502 Bad Gateway"
- Nginx logs: `connect() failed (111: Connection refused)`

**Causas comunes:**
1. La aplicación Node.js no está corriendo
2. Node.js no escucha en el puerto 5000
3. Firewall local bloqueando puerto 5000 (desde localhost)

**Solución:**
```bash
# Verificar que la app está corriendo
pm2 status
# Debe mostrar: asesoria-llave | online

# Verificar que escucha en puerto 5000
sudo netstat -tlnp | grep 5000
# Debe mostrar: 0.0.0.0:5000 ... node

# Reiniciar aplicación
pm2 restart asesoria-llave

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs de Nginx
sudo tail -f /var/log/nginx/asesoria-llave-error.log

# Ver logs de la aplicación
pm2 logs asesoria-llave
```

#### Problema 3: Certificado SSL No Funciona / Advertencia de Seguridad

**Síntomas:**
- Navegador muestra "Tu conexión no es privada"
- Error: `NET::ERR_CERT_AUTHORITY_INVALID`

**Causas comunes:**
1. Certificado no se generó correctamente
2. Nginx no está usando los certificados
3. Dominio en el certificado no coincide con el visitado

**Solución:**
```bash
# Ver certificados instalados
sudo certbot certificates
# Verifica que tu dominio está listado

# Verificar configuración de Nginx
sudo nginx -t

# Regenerar certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com --force-renewal

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar en navegador (Ctrl+Shift+R para refrescar sin cache)
```

#### Problema 4: WebSocket No Funciona (Socket.IO)

**Síntomas:**
- Consola del navegador: `WebSocket connection failed`
- Notificaciones en tiempo real no llegan

**Causas comunes:**
1. Headers de Upgrade no configurados en Nginx
2. Proxy timeout muy corto
3. Cloudflare proxy activado (si usas Cloudflare)

**Solución:**

Verifica que tu configuración de Nginx incluye:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;  # 24 horas para WebSocket
```

Si usas **Cloudflare**, desactiva el proxy (nube gris) o configura reglas específicas.

```bash
# Editar configuración
sudo nano /etc/nginx/sites-available/asesoria-llave

# Agregar/verificar headers de WebSocket en location /
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";

# Reiniciar Nginx
sudo systemctl restart nginx
```

#### Problema 5: "Connection Timed Out" al Acceder por Dominio

**Síntomas:**
- Navegador no carga, muestra timeout
- `curl https://tu-dominio.com` nunca responde

**Causas comunes:**
1. Firewall bloqueando puertos 80/443
2. IP del servidor incorrecta en DNS
3. Nginx no está corriendo

**Solución:**
```bash
# Verificar firewall
sudo ufw status
# Debe mostrar: 80/tcp y 443/tcp ALLOW

# Verificar Nginx
sudo systemctl status nginx
# Debe mostrar: active (running)

# Verificar que Nginx escucha en 80 y 443
sudo netstat -tlnp | grep nginx
# Debe mostrar: 0.0.0.0:80 y 0.0.0.0:443

# Verificar IP pública del servidor
curl -4 ifconfig.me
# Debe coincidir con la IP en tu DNS

# Si firewall estaba bloqueando
sudo ufw allow 'Nginx Full'
sudo ufw reload
```

#### Problema 6: Dominio Funciona pero `www.` No Funciona (o viceversa)

**Causas comunes:**
1. Falta registro DNS para `www`
2. Certificado SSL no incluye `www`
3. Nginx `server_name` no incluye `www`

**Solución:**
```bash
# 1. Verificar DNS para www
dig www.tu-dominio.com +short
# Debe mostrar tu IP

# Si no resuelve, agregar registro A en tu proveedor:
# Nombre: www
# Tipo: A
# Valor: TU_IP_VPS

# 2. Verificar certificado incluye www
sudo certbot certificates
# Debe mostrar: Domains: tu-dominio.com www.tu-dominio.com

# Si no incluye www, regenerar:
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com --force-renewal

# 3. Verificar server_name en Nginx
sudo nano /etc/nginx/sites-available/asesoria-llave
# Debe tener: server_name tu-dominio.com www.tu-dominio.com;

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

### 📊 Comandos Útiles de Diagnóstico

```bash
# Estado de servicios
sudo systemctl status nginx
sudo systemctl status certbot.timer
pm2 status

# Logs en tiempo real
sudo tail -f /var/log/nginx/asesoria-llave-access.log
sudo tail -f /var/log/nginx/asesoria-llave-error.log
pm2 logs asesoria-llave --lines 50

# Verificar DNS
dig tu-dominio.com
nslookup tu-dominio.com

# Verificar puertos abiertos
sudo netstat -tlnp | grep -E ':(80|443|5000)'

# Verificar firewall
sudo ufw status verbose

# Test de conectividad
curl -I https://tu-dominio.com
curl -I http://tu-dominio.com

# Verificar SSL
openssl s_client -connect tu-dominio.com:443 -servername tu-dominio.com < /dev/null
```

---

### ✅ Checklist de Vinculación de Dominio

Usa este checklist para verificar que todo está configurado correctamente:

- [ ] **DNS configurado correctamente**
  - [ ] Registro A para `@` apunta a IP del VPS
  - [ ] Registro A para `www` apunta a IP del VPS
  - [ ] DNS propagado (verificado con `dig`)

- [ ] **Nginx instalado y configurado**
  - [ ] Nginx instalado y corriendo
  - [ ] Archivo de configuración creado en `/etc/nginx/sites-available/`
  - [ ] Enlace simbólico creado en `/etc/nginx/sites-enabled/`
  - [ ] Configuración verificada con `sudo nginx -t`
  - [ ] Headers de WebSocket configurados

- [ ] **SSL/TLS configurado**
  - [ ] Certbot instalado
  - [ ] Certificado SSL generado para ambos dominios
  - [ ] Renovación automática verificada
  - [ ] Redirección HTTP → HTTPS funcionando

- [ ] **Firewall configurado**
  - [ ] UFW activo
  - [ ] Puerto 22 (SSH) permitido
  - [ ] Puertos 80 y 443 permitidos
  - [ ] Puerto 5000 NO expuesto al exterior

- [ ] **Verificación final**
  - [ ] `https://tu-dominio.com` carga correctamente
  - [ ] `https://www.tu-dominio.com` carga correctamente
  - [ ] `http://tu-dominio.com` redirige a HTTPS
  - [ ] Candado SSL verde/gris en navegador
  - [ ] WebSocket/Socket.IO funciona (notificaciones en tiempo real)
  - [ ] Sin errores en logs de Nginx o aplicación

---

## 📧 Configuración de SMTP (Opcional)

Puedes configurar SMTP de dos formas:

### Opción 1: Variables de Entorno (Global)

En el archivo `.env`:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucorreo@gmail.com
SMTP_PASSWORD=tu_app_password_de_gmail
```

**Para Gmail**: Necesitas una "Contraseña de Aplicación":
1. Ve a tu cuenta de Google → Seguridad
2. Activa "Verificación en 2 pasos"
3. En "Contraseñas de aplicaciones", genera una nueva
4. Usa esa contraseña en `SMTP_PASSWORD`

### Opción 2: Panel de Administración (Multi-cuenta)

1. Inicia sesión como administrador
2. Ve a **Administración** → **Configuración SMTP**
3. Agrega cuentas SMTP con los datos:
   - Host: `smtp.gmail.com`
   - Puerto: `587`
   - Usuario: tu email
   - Contraseña: contraseña de app

Esta opción permite múltiples cuentas SMTP con cifrado AES-256-GCM.

---

## 🔄 Actualización de la Aplicación

### Actualización Manual

```bash
# 1. Detener la aplicación
pm2 stop asesoria-llave

# 2. Hacer backup de la base de datos
mysqldump -u asesoria_user -p asesoria_llave > backup_$(date +%Y%m%d).sql

# 3. Hacer backup de uploads
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# 4. Actualizar código
git pull origin main

# 5. Instalar nuevas dependencias
npm install

# 6. Ejecutar migraciones
npm run db:push
npm run migrate:rbac

# 7. Compilar
npm run build

# 8. Reiniciar
pm2 restart asesoria-llave
```

### Actualización Automática con Script

Crea un archivo `update.sh`:

```bash
#!/bin/bash

echo "🔄 Iniciando actualización de Asesoría La Llave..."

# Detener aplicación
pm2 stop asesoria-llave

# Backup BD
mysqldump -u asesoria_user -p"$DB_PASSWORD" asesoria_llave > backup_$(date +%Y%m%d).sql
echo "✅ Backup de base de datos creado"

# Actualizar código
git pull origin main
echo "✅ Código actualizado"

# Instalar dependencias
npm install
echo "✅ Dependencias instaladas"

# Migraciones
npm run db:push -- --force
npm run migrate:rbac
echo "✅ Migraciones ejecutadas"

# Compilar
npm run build
echo "✅ Compilación completada"

# Reiniciar
pm2 restart asesoria-llave
echo "✅ Aplicación reiniciada"

echo "🎉 Actualización completada"
```

Hazlo ejecutable:

```bash
chmod +x update.sh
./update.sh
```

### Auto-actualización desde GitHub (Sistema Integrado)

El sistema incluye un módulo de **auto-actualización** que permite actualizar la aplicación directamente desde el panel de administración, verificando nuevas versiones en GitHub.

#### 🎯 Características

- ✅ Verificación automática de nuevas versiones en GitHub
- ✅ Backup automático antes de actualizar (base de datos + código + archivos)
- ✅ Logs en tiempo real del proceso de actualización
- ✅ Rollback automático si la actualización falla
- ✅ Restauración manual de backups desde el panel admin
- ✅ Control de permisos RBAC (`admin:system`)

#### 📋 Requisitos

1. **Git instalado** en el servidor:
   ```bash
   # Verificar que Git esté instalado
   git --version
   
   # Si no está instalado:
   # Ubuntu/Debian:
   sudo apt install -y git
   
   # CentOS/RHEL:
   sudo yum install -y git
   ```

2. **Repositorio GitHub configurado**:
   ```bash
   # Verifica que el proyecto tenga un remote configurado
   git remote -v
   
   # Debe mostrar algo como:
   # origin  https://github.com/tu-usuario/asesoria-llave.git (fetch)
   # origin  https://github.com/tu-usuario/asesoria-llave.git (push)
   ```

3. **Permisos RBAC**: El usuario debe tener el rol **Administrador** con el permiso `admin:system`

4. **Configuración de nombres de backup** (opcional): Puedes personalizar los nombres de los backups automáticos

#### ⚙️ Configuración de Nombres de Backup

El sistema permite configurar patrones de nombres para los backups automáticos usando variables dinámicas:

**Variables disponibles**:
- `{fecha}` → Fecha actual (YYYYMMDD)
- `{hora}` → Hora actual (HHMMSS)
- `{version}` → Versión actual del sistema
- `{timestamp}` → Timestamp Unix

**Configurar desde el panel admin**:
1. Ve a **Administración** → **Actualizaciones**
2. Busca la sección **"Configuración de Backups"**
3. Edita los patrones:
   - **Base de datos**: `backup_db_{fecha}_{hora}.sql` (ejemplo)
   - **Código**: `backup_code_{version}_{timestamp}.zip` (ejemplo)
   - **Archivos**: `backup_files_{fecha}.tar.gz` (ejemplo)

**Vista previa**: El sistema muestra cómo se verán los nombres antes de guardar.

#### 🚀 Proceso de Actualización

**Desde el Panel de Administración**:

1. **Accede al módulo de actualizaciones**:
   - Inicia sesión como administrador
   - Ve a **Administración** → **Actualizaciones**

2. **Verifica la versión actual**:
   - La página muestra la versión instalada (ej: `v1.2.3`)
   - Botón **"Verificar actualizaciones"** para consultar GitHub

3. **Verifica actualizaciones disponibles**:
   - Click en **"Verificar actualizaciones"**
   - El sistema consulta la API de GitHub (`/repos/{owner}/{repo}/releases/latest`)
   - Si hay una nueva versión, se muestra un botón **"Actualizar a vX.X.X"**

4. **Inicia la actualización**:
   - Click en **"Actualizar a vX.X.X"**
   - Aparece un diálogo de confirmación: **"¿Estás seguro? Se creará un backup automático antes de actualizar"**
   - Confirma la actualización

5. **Proceso automático** (con logs en tiempo real):
   ```
   ℹ️ Iniciando proceso de actualización a v1.3.0...
   ℹ️ Creando backup de seguridad...
   ✅ Backup creado: backup_20250115_143022.tar.gz
   ℹ️ Descargando nueva versión desde GitHub...
   ✅ Código descargado correctamente
   ℹ️ Instalando dependencias...
   ✅ Dependencias instaladas
   ℹ️ Ejecutando migraciones de base de datos...
   ✅ Migraciones completadas
   ℹ️ Compilando aplicación...
   ✅ Compilación exitosa
   ℹ️ Reiniciando servidor...
   ✅ Actualización completada exitosamente
   ```

6. **Verificación post-actualización**:
   - El servidor se reinicia automáticamente
   - Recarga la página
   - Verifica que la nueva versión esté activa

#### 🔄 Rollback y Restauración

**Si la actualización falla**:
- El sistema realiza **rollback automático** al último backup
- Los logs mostrarán: `⚠️ Error en la actualización. Restaurando desde backup...`
- La aplicación volverá al estado anterior

**Restauración manual de un backup**:

1. Ve a **Administración** → **Actualizaciones**
2. En la pestaña **"Historial de Backups"**, verás todos los backups disponibles:
   - Fecha de creación
   - Tipo (automático/manual)
   - Tamaño
   - Botón **"Restaurar"**

3. Click en **"Restaurar"** del backup deseado
4. Confirma la acción: **"⚠️ ADVERTENCIA: Esta acción sobrescribirá la base de datos y el código actual. ¿Continuar?"**
5. El proceso de restauración inicia con logs en tiempo real:
   ```
   ℹ️ Iniciando restauración desde backup_20250115_120000.tar.gz...
   ℹ️ Deteniendo servicios...
   ✅ Servicios detenidos
   ℹ️ Restaurando base de datos...
   ✅ Base de datos restaurada
   ℹ️ Restaurando código fuente...
   ✅ Código restaurado
   ℹ️ Restaurando archivos de uploads...
   ✅ Archivos restaurados
   ℹ️ Reiniciando servidor...
   ✅ Restauración completada. El sistema se reiniciará.
   ```

6. El servidor se reinicia automáticamente
7. Recarga la página para acceder a la versión restaurada

#### 📊 Historial de Actualizaciones

El sistema mantiene un registro de todas las actualizaciones:

- **Pestaña "Historial de Actualizaciones"**:
  - Versión anterior → Versión nueva
  - Estado (exitosa/fallida)
  - Fecha y hora
  - Usuario que ejecutó la actualización
  - Notas de la versión (changelog de GitHub)

#### 🛠️ Troubleshooting de Actualizaciones

**Problema: "No se pudo verificar actualizaciones"**

**Causa**: No hay conexión con GitHub o el repositorio no está configurado

**Solución**:
```bash
# Verifica conexión a GitHub
ping github.com

# Verifica remote del repositorio
git remote -v

# Si no hay remote, agrégalo:
git remote add origin https://github.com/tu-usuario/asesoria-llave.git
```

**Problema: "Error al crear backup"**

**Causa**: Falta espacio en disco o permisos insuficientes

**Solución**:
```bash
# Verifica espacio disponible
df -h

# Verifica permisos de la carpeta backups/
ls -la backups/
sudo chown -R $USER:$USER backups/
chmod -R 755 backups/
```

**Problema: "La actualización se completó pero el servidor no arranca"**

**Causa**: Error en la nueva versión o dependencias faltantes

**Solución**:
```bash
# Ver logs del servidor
pm2 logs asesoria-llave --lines 50

# Restaurar manualmente desde backup
cd backups/
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
# Sigue el proceso de restauración del backup
```

**Problema: "Acceso denegado al módulo de actualizaciones"**

**Causa**: El usuario no tiene el permiso `admin:system`

**Solución**:
1. Inicia sesión con un usuario administrador completo
2. Ve a **Administración** → **Usuarios**
3. Edita el usuario y asigna el rol **Administrador**
4. El rol Administrador incluye automáticamente el permiso `admin:system`

**Problema: "Logs de actualización no se muestran en tiempo real"**

**Causa**: WebSocket no está conectado

**Solución**:
```bash
# Verifica que el servidor WebSocket esté corriendo
netstat -tulpn | grep 5000

# Verifica en el navegador (consola de desarrollador)
# Debe mostrar: "WebSocket connected"

# Si no conecta, verifica firewall
sudo ufw allow 5000/tcp
```

#### 🔒 Seguridad

- **Backups automáticos**: Cada actualización crea un backup completo antes de proceder
- **Validación de permisos**: Solo usuarios con `admin:system` pueden actualizar
- **Logs de auditoría**: Todas las actualizaciones se registran en el sistema de auditoría
- **Rollback automático**: Si falla la actualización, se restaura automáticamente
- **Cifrado de datos**: Las contraseñas de SMTP en backups se mantienen cifradas (AES-256-GCM)

#### 📝 Notas Importantes

- ⚠️ **No uses Git directamente**: Usa el sistema de auto-actualización para mantener consistencia
- ⚠️ **Backups regulares**: Aunque el sistema crea backups automáticos, mantén backups externos regulares
- ⚠️ **Prueba en desarrollo**: Prueba las actualizaciones en un entorno de desarrollo antes de producción
- ⚠️ **Mantén PM2 actualizado**: Actualiza PM2 regularmente (`npm update -g pm2`)
- ℹ️ **Changelog**: Las notas de cada versión se obtienen automáticamente de GitHub Releases

---

## 🔧 Troubleshooting

### Problema: Error de conexión a la base de datos

**Error**: `Can't connect to MySQL server`

**Solución**:
```bash
# Verifica que MariaDB esté corriendo
sudo systemctl status mariadb

# Si está detenido, inícialo
sudo systemctl start mariadb

# Verifica la conexión
mysql -u asesoria_user -p -h localhost asesoria_llave
```

### Problema: Puerto 5000 ya está en uso

**Error**: `Port 5000 is already in use`

**Solución**:
```bash
# Encuentra el proceso
sudo lsof -i :5000

# Mátalo (reemplaza PID con el número que veas)
kill -9 PID

# O cambia el puerto en .env
PORT=5001
```

### Problema: Permisos de archivos en uploads/

**Error**: `EACCES: permission denied`

**Solución**:
```bash
# Da permisos correctos
sudo chown -R $USER:$USER uploads/
chmod -R 755 uploads/
```

### Problema: El admin inicial no se crea

**Verificar**:
```bash
# Ver logs del servidor
pm2 logs asesoria-llave

# O si usas npm start:
npm start | grep admin
```

**Posibles causas**:
1. Ya existe un usuario admin → Revisa la base de datos
2. No se ejecutó `migrate:rbac` → Ejecuta: `npm run migrate:rbac`
3. Variables de entorno incorrectas → Verifica `.env`

### Problema: Migraciones fallan

**Error**: `P1001: Can't reach database server`

**Solución**:
```bash
# Verifica DATABASE_URL en .env
cat .env | grep DATABASE_URL

# Prueba conexión manual
mysql -u asesoria_user -p -h host -P 3306

# Regenera Prisma client
npm run db:generate
npm run db:push -- --force
```

### Problema: Olvidé la contraseña del admin

**Solución**:
```bash
# Conéctate a la base de datos
mysql -u asesoria_user -p asesoria_llave

# Genera un hash bcrypt de nueva contraseña (usa Node.js)
node -e "console.log(require('bcrypt').hashSync('NuevaContraseña123!', 10))"

# Actualiza en BD (reemplaza HASH con el resultado anterior)
UPDATE User SET password = 'HASH' WHERE username = 'admin';
EXIT;
```

### Problema: Nginx muestra "502 Bad Gateway"

**Causas comunes**:
1. La app Node.js no está corriendo → `pm2 status`
2. Puerto incorrecto en Nginx → Verifica `proxy_pass` en config
3. Firewall bloqueando → `sudo ufw status`

**Solución**:
```bash
# Reinicia todo
pm2 restart asesoria-llave
sudo systemctl restart nginx
```

### Problema: Las notificaciones por email no se envían

**Verificar**:
1. Configuración SMTP correcta en `.env` o panel admin
2. Si usas Gmail, usa "Contraseña de aplicación"
3. Puerto 587 (TLS) o 465 (SSL)
4. Ver logs: `pm2 logs asesoria-llave | grep email`

### Problema: Error "Out of Memory"

**Error**: `JavaScript heap out of memory`

**Solución**:
```bash
# Aumenta memoria para Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# O en PM2
pm2 start npm --name "asesoria-llave" -- start --node-args="--max-old-space-size=4096"
```

---

## 📞 Soporte Adicional

### Logs Útiles

```bash
# Logs de PM2
pm2 logs asesoria-llave --lines 100

# Logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Logs de MariaDB
sudo tail -f /var/log/mysql/error.log

# Logs del sistema
journalctl -u mariadb -f
```

### Comandos de Diagnóstico

```bash
# Estado de servicios
sudo systemctl status mariadb
sudo systemctl status nginx
pm2 status

# Uso de recursos
htop
df -h
free -m

# Puertos abiertos
sudo netstat -tulpn | grep LISTEN
```

---

## ✅ Checklist de Instalación

- [ ] Node.js 18+ instalado
- [ ] MariaDB instalado y corriendo
- [ ] Base de datos creada
- [ ] Usuario de BD creado con permisos
- [ ] Repositorio clonado
- [ ] Dependencias instaladas (`npm install`)
- [ ] `.env` configurado con todas las variables
- [ ] Migraciones ejecutadas (`db:push`, `migrate:rbac`, `seed:templates`)
- [ ] Admin inicial creado (verifica en logs)
- [ ] Aplicación iniciada (dev o production)
- [ ] Login exitoso con credenciales admin
- [ ] PM2 configurado (producción)
- [ ] Nginx configurado (producción)
- [ ] SSL configurado (producción)
- [ ] Dominio configurado y apuntando al VPS (opcional)
- [ ] Firewall configurado
- [ ] Backup automatizado configurado

---

## 🎉 ¡Instalación Completada!

Si seguiste todos los pasos, ahora tienes **Asesoría La Llave** funcionando correctamente.

**Primeros pasos después de instalar**:

1. **Cambia la contraseña del admin** desde el perfil de usuario
2. **Configura SMTP** si quieres enviar notificaciones
3. **Crea usuarios adicionales** desde Administración → Usuarios
4. **Configura roles y permisos** según tus necesidades
5. **Comienza a agregar clientes** y gestionar impuestos

---

**¿Necesitas ayuda?** Revisa la sección de [Troubleshooting](#troubleshooting) o consulta los logs del sistema.
