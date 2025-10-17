# 🔑 Asesoría La Llave - Sistema de Gestión Profesional

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.14-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

Sistema completo de gestión para asesorías y gestorías con módulos de clientes, impuestos, tareas y manuales internos.

[🚀 Quick Start](#-quick-start) •
[📚 Documentación](#-documentación) •
[🐛 Issues](../../issues)

</div>

---

## 📋 Tabla de Contenidos

- [Características](#-características-principales)
- [Stack Tecnológico](#-stack-tecnológico)
- [Quick Start](#-quick-start)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Deployment](#-deployment)
- [Documentación](#-documentación)

---

## ✨ Características Principales

### 🔐 **Autenticación y Seguridad**
- Login/Registro con JWT (tokens en localStorage)
- 3 roles: `ADMIN`, `GESTOR`, `LECTURA`
- Rate limiting (5 intentos por 15 minutos)
- Headers de seguridad (Helmet, CSP, HSTS)
- CORS configurado

### 👥 **Gestión de Clientes**
- CRUD completo con validación
- Tipos: Autónomo y Empresa
- Filtros por tipo y gestor
- Exportación a CSV
- Asignación de responsables

### 🧾 **Gestión de Impuestos**
- Modelos fiscales: 303, 390, 130, 131
- Periodos tributarios (trimestral/mensual/anual)
- Estados: PENDIENTE, CALCULADO, REALIZADO
- Sistema de archivos con Multer (10MB max)

### 📋 **Sistema de Tareas**
- Tareas generales y personales
- Prioridades: BAJA, MEDIA, ALTA
- Estados: PENDIENTE, EN_PROGRESO, COMPLETADA
- Vista tabla y Kanban (drag & drop)
- Asignación a usuarios y fechas de vencimiento

### 📚 **Manuales Internos**
- Editor WYSIWYG con TipTap
- Inserción de imágenes y enlaces
- Sistema de etiquetas y categorías
- Publicación/Borrador
- Exportación a PDF
- Permisos por rol

### 📧 **Notificaciones Automáticas**
- Sistema de email con Nodemailer
- Recordatorios de tareas (3 días antes)
- Recordatorios de impuestos (7 días antes)
- Plantillas HTML profesionales

### 📊 **Dashboard y Analytics**
- Métricas visuales con Recharts
- Resumen de clientes activos
- Estado de impuestos
- Distribución de tareas
- Manuales publicados

### 🔍 **Búsqueda Global**
- Búsqueda en tiempo real (⌘K / Ctrl+K)
- Busca en clientes, tareas, impuestos y manuales
- Resultados agrupados por tipo

### 📝 **Sistema de Auditoría**
- Registro completo de cambios (CREATE/UPDATE/DELETE)
- Valores antes/después en JSON
- Filtros por tabla, registro y usuario
- Diff viewer visual

### 🔔 **Notificaciones en Tiempo Real**
- WebSockets con Socket.IO
- Notificaciones instantáneas de eventos
- Indicador de usuarios conectados

---

## 🛠 Stack Tecnológico

### **Frontend**
- ⚛️ React 18 + Vite + TypeScript
- 🎨 TailwindCSS + Shadcn UI
- 📊 TanStack Query v5 (React Query)
- 📝 React Hook Form + Zod
- 🎭 Wouter (routing)
- ✍️ TipTap (editor WYSIWYG)
- 📈 Recharts (gráficas)

### **Backend**
- 🟢 Node.js + Express + TypeScript
- 🔐 JWT + bcrypt (autenticación)
- 📤 Multer (subida de archivos)
- 📧 Nodemailer (emails)
- ✅ express-validator (validación)
- 🛡️ Helmet + CORS (seguridad)
- 📝 Pino (logging estructurado)

### **Base de Datos**
- 🗄️ PostgreSQL / MariaDB / MySQL
- 🔷 Prisma ORM
- 🔄 Migraciones automáticas

---

## 🚀 Quick Start

### **Opción 1: GitHub Codespaces** (Recomendado)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new)

1. Abre este repo en Codespaces
2. Espera a que se configure automáticamente
3. Configura tu `.env`:
   ```bash
   cp .env.example .env
   nano .env  # Edita con tus valores
   ```
4. Sincroniza la base de datos:
   ```bash
   npm run db:push
   npm run seed  # Opcional: datos de ejemplo
   ```
5. Inicia el servidor:
   ```bash
   npm run dev
   ```

### **Opción 2: Instalación Local**

#### **Requisitos Previos**
- Node.js 20.x o superior
- npm 10.x o superior
- Base de datos MySQL/MariaDB/PostgreSQL

#### **Instalación Rápida**

```bash
# 1. Clonar el repositorio
git clone <tu-repositorio>
cd asesoria-llave

# 2. Ejecutar script de setup automático
chmod +x setup.sh
./setup.sh

# 3. Editar .env con tus credenciales
nano .env

# 4. Sincronizar base de datos
npm run db:push

# 5. (Opcional) Poblar con datos de ejemplo
npm run seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5000`

---

## ⚙️ Configuración

### **Variables de Entorno**

Copia `.env.example` a `.env` y configura:

```env
# Server
PORT=5000
NODE_ENV=development

# Cron Jobs (solo en Reserved VM o desarrollo)
ENABLE_CRON_JOBS=false

# Autenticación
JWT_SECRET=tu-secret-key-cambiar-en-produccion
SESSION_SECRET=tu-session-secret-cambiar-en-produccion

# Base de Datos (MariaDB/MySQL/PostgreSQL)
DATABASE_URL="mysql://user:password@host:3306/asesoria_llave"

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu_app_password

# S3 Storage (Backblaze B2, MinIO, AWS S3)
S3_ENDPOINT=https://s3.us-west-002.backblazeb2.com
S3_BUCKET=asesoria-files
S3_ACCESS_KEY=tu_access_key
S3_SECRET_KEY=tu_secret_key
S3_REGION=us-west-002

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:5000
```

### **Base de Datos**

#### **Migrar Schema**
```bash
npm run db:push         # Sincronizar schema
npm run db:push --force # Forzar sincronización (reset)
```

#### **Poblar con Datos de Ejemplo**
```bash
npm run seed
```

Esto crea:
- 3 usuarios: `admin`, `gestor`, `lectura` (contraseña: `admin123`)
- 5 clientes de ejemplo
- 4 modelos fiscales
- 12 periodos tributarios
- 5 tareas de ejemplo
- 2 manuales internos

---

## 💻 Desarrollo

### **Scripts Disponibles**

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo (puerto 5000)
npm run build            # Build para producción
npm start                # Servidor de producción

# Base de Datos
npm run db:push          # Sincronizar schema con BD
npm run db:studio        # Abrir Prisma Studio (GUI)
npm run seed             # Poblar BD con datos de ejemplo

# Prisma
npx prisma generate      # Generar Prisma Client
npx prisma migrate dev   # Crear migración (desarrollo)
npx prisma migrate deploy # Aplicar migraciones (producción)
```

### **Estructura del Proyecto**

```
asesoria-llave/
├── client/              # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes React
│   │   ├── pages/       # Páginas de la app
│   │   ├── contexts/    # React Contexts (Auth, Theme, etc.)
│   │   └── lib/         # Utilidades
│   └── index.html
├── server/              # Backend Express
│   ├── index.ts         # Punto de entrada
│   ├── routes.ts        # Rutas API
│   ├── prisma-storage.ts # Capa de almacenamiento
│   ├── jobs.ts          # Cron jobs
│   ├── logger.ts        # Logging con Pino
│   ├── s3.ts            # Utilidad S3
│   └── scheduled/       # Scripts para Scheduled Deployments
├── prisma/
│   ├── schema.prisma    # Schema de Prisma
│   └── seed.ts          # Datos de ejemplo
├── scripts/             # Scripts de utilidad
│   ├── backup.sh        # Backup de BD
│   └── restore.sh       # Restaurar backup
└── .devcontainer/       # Configuración Codespaces
```

### **Usuarios de Prueba**

| Usuario | Contraseña | Rol     | Descripción              |
|---------|------------|---------|--------------------------|
| admin   | admin123   | ADMIN   | Acceso total             |
| gestor  | admin123   | GESTOR  | Gestión clientes/tareas  |
| lectura | admin123   | LECTURA | Solo lectura             |

---

## 🚢 Deployment

### **GitHub + Codespaces**

1. Sube tu código a GitHub
2. Abre en Codespaces
3. Configura variables de entorno
4. Ejecuta `npm run build`

### **Hostinger VPS**

Ver guía completa: [README_DEPLOY.md](./README_DEPLOY.md)

```bash
# 1. Clonar repo en VPS
git clone <tu-repo>
cd asesoria-llave

# 2. Instalar dependencias
npm install

# 3. Configurar .env
cp .env.example .env
nano .env

# 4. Build
npm run build

# 5. Ejecutar con PM2
npm install -g pm2
pm2 start npm --name "asesoria" -- start
pm2 save
pm2 startup
```

### **Docker**

```bash
# Build y ejecutar
docker-compose up -d

# Ver logs
docker-compose logs -f api

# Detener
docker-compose down
```

### **⚠️ Importante: Cron Jobs**

Los cron jobs **NO funcionan en Autoscale Deployments** (Replit, Vercel, etc.).

**Soluciones:**
- **Scheduled Deployments de Replit** (recomendado)
- **Reserved VM** con `ENABLE_CRON_JOBS=true`
- **VPS tradicional** con cron jobs

Ver: [Guía de Tareas Programadas](./README_DEPLOY.md#-tareas-programadas-cron-jobs)

---

## 📚 Documentación

- **[README_DEPLOY.md](./README_DEPLOY.md)** - Guía completa de deployment
- **[server/scheduled/README.md](./server/scheduled/README.md)** - Configuración de tareas programadas
- **[.env.example](./.env.example)** - Ejemplo de variables de entorno
- **[prisma/schema.prisma](./prisma/schema.prisma)** - Schema de base de datos

---

## 🐛 Troubleshooting

### **Error: "Cannot find module '@prisma/client'"**

```bash
npx prisma generate
```

### **Error: "Prisma schema sync failed"**

```bash
npm run db:push --force
```

### **Error: "SMTP not configured"**

Configura las variables SMTP en `.env` o usa la configuración desde el panel Admin.

### **Error: "Database connection failed"**

Verifica `DATABASE_URL` en `.env`:
```env
DATABASE_URL="mysql://user:password@host:3306/database"
```

### **Puerto 5000 ya en uso**

```bash
# Cambiar puerto en .env
PORT=3000
```

---

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 📞 Soporte

- 📧 Email: soporte@asesoriallave.com
- 🐛 Issues: [GitHub Issues](../../issues)
- 📖 Docs: [README_DEPLOY.md](./README_DEPLOY.md)

---

<div align="center">

**Hecho con ❤️ por el equipo de Asesoría La Llave**

[⬆ Volver arriba](#-asesoría-la-llave---sistema-de-gestión-profesional)

</div>
