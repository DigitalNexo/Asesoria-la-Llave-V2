# Asesoría La Llave - Sistema de Gestión Profesional

## Descripción del Proyecto

Sistema completo de gestión para asesorías y gestorías con módulos de clientes, impuestos, tareas y manuales internos. Desarrollado con Node.js + Express + React + TypeScript.

## Estado Actual del Proyecto

✅ **MVP COMPLETADO** - Todas las funcionalidades requeridas están implementadas y funcionando:

### Módulos Implementados

1. **🔐 Autenticación y Autorización**
   - Login/Registro con JWT (tokens guardados en localStorage)
   - 3 roles: ADMIN, GESTOR, LECTURA
   - Middleware de permisos por rol
   - Rate limiting (5 intentos por 15 minutos)

2. **👥 Gestión de Clientes**
   - CRUD completo con validación
   - Tipos: Autónomo y Empresa
   - Filtros por tipo y gestor
   - Exportación a CSV
   - Asignación de responsables

3. **🧾 Gestión de Impuestos**
   - Modelos fiscales: 303, 390, 130, 131
   - Periodos tributarios (trimestral/mensual/anual)
   - Estados: PENDIENTE, CALCULADO, REALIZADO
   - Asignación a clientes
   - **Sistema de archivos con Multer (10MB max)**

4. **📋 Sistema de Tareas**
   - Tareas generales y personales
   - Prioridades: BAJA, MEDIA, ALTA
   - Estados: PENDIENTE, EN_PROGRESO, COMPLETADA
   - Vista tabla y Kanban (drag & drop)
   - Asignación a usuarios
   - Fechas de vencimiento

5. **📚 Manuales Internos**
   - Editor WYSIWYG con TipTap
   - Inserción de imágenes y enlaces
   - Etiquetas y categorías
   - Publicación/Borrador
   - Exportación a PDF
   - Permisos por rol

6. **⚙️ Panel Administrativo**
   - CRUD de usuarios
   - Gestión de roles
   - Logs de actividad
   - **Configuración SMTP funcional**
   - Estadísticas del sistema

7. **📧 Notificaciones Automáticas**
   - Sistema de email con Nodemailer
   - Recordatorios de tareas (3 días antes)
   - Recordatorios de impuestos (7 días antes)
   - Plantillas HTML profesionales
   - Verificación cada hora (setInterval)

8. **📊 Dashboard**
   - Métricas visuales con Recharts
   - Resumen de clientes activos
   - Estado de impuestos
   - Distribución de tareas
   - Manuales publicados

9. **🔍 Búsqueda Global**
   - Búsqueda en tiempo real con ⌘K (Cmd+K / Ctrl+K)
   - Busca en clientes, tareas, impuestos y manuales
   - Resultados agrupados por tipo
   - Mínimo 2 caracteres para búsqueda
   - Navegación rápida a resultados

10. **📝 Sistema de Auditoría**
   - Registro completo de cambios (CREATE/UPDATE/DELETE)
   - Valores antes/después en JSON
   - Filtros por tabla, registro y usuario
   - Diff viewer visual para comparar cambios
   - Trazabilidad completa de operaciones

11. **🔔 Notificaciones en Tiempo Real**
   - WebSockets con Socket.IO
   - Notificaciones instantáneas de eventos
   - Indicador de usuarios conectados
   - Sistema de eventos para tareas e impuestos

## Stack Tecnológico

### Backend
- Node.js + Express + TypeScript
- JWT + bcrypt (autenticación)
- Multer (subida de archivos)
- Nodemailer (emails)
- express-validator (validación)
- express-rate-limit (rate limiting)
- Helmet + CORS (seguridad)

### Frontend
- React 18 + Vite + TypeScript
- TailwindCSS + Shadcn UI
- TanStack Query v5 (React Query)
- React Hook Form + Zod
- Wouter (routing)
- TipTap (editor WYSIWYG)
- Recharts (gráficas)

### Base de Datos
- **PostgreSQL con Drizzle ORM** - Totalmente implementado y funcionando
- Driver: Neon HTTP (serverless compatible)
- Migraciones: `npm run db:push`
- Seed data: `tsx server/seed.ts`

## Arquitectura

### Frontend
- `/client/src/pages` - Páginas de la aplicación
- `/client/src/components/ui` - Componentes Shadcn
- `/client/src/contexts` - Contextos React (Auth)
- `/client/src/lib` - Utilidades y configuración

### Backend
- `/server/routes.ts` - Rutas y endpoints API
- `/server/storage.ts` - Capa de almacenamiento (IStorage)
- `/server/email.ts` - Sistema de notificaciones
- `/server/index.ts` - Configuración del servidor

### Compartido
- `/shared/schema.ts` - Schemas Drizzle y Zod

## Usuarios de Prueba

| Usuario | Contraseña | Rol     |
|---------|------------|---------|
| admin   | admin123   | ADMIN   |
| gestor  | admin123   | GESTOR  |
| lectura | admin123   | LECTURA |

## Datos Semilla

- 3 usuarios (admin, gestor, lectura)
- 5 clientes (autónomos y empresas)
- 4 modelos fiscales (303, 390, 130, 131)
- 4 periodos tributarios (trimestres 2024)
- 5 tareas de ejemplo
- 2 manuales de procedimientos

## Endpoints API Principales

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Perfil
- `POST /api/auth/logout` - Logout

### Usuarios
- `GET /api/users` - Listar
- `POST /api/users` - Crear (Admin)
- `PATCH /api/users/:id` - Actualizar (Admin)
- `DELETE /api/users/:id` - Eliminar (Admin)

### Clientes
- `GET /api/clients` - Listar
- `POST /api/clients` - Crear
- `PATCH /api/clients/:id` - Actualizar
- `DELETE /api/clients/:id` - Eliminar

### Impuestos
- `GET /api/tax-models` - Modelos fiscales
- `GET /api/tax-periods` - Periodos
- `GET /api/client-tax` - Impuestos asignados
- `POST /api/client-tax` - Asignar impuesto
- `PATCH /api/client-tax/:id` - Actualizar

### Archivos
- `POST /api/tax-files/upload` - Subir archivo (Multer)
- `GET /api/tax-files/:clientTaxId` - Listar archivos
- `DELETE /api/tax-files/:id` - Eliminar archivo

### Tareas
- `GET /api/tasks` - Listar
- `POST /api/tasks` - Crear
- `PATCH /api/tasks/:id` - Actualizar

### Manuales
- `GET /api/manuals` - Listar
- `GET /api/manuals/:id` - Obtener uno
- `POST /api/manuals` - Crear (Admin/Gestor)
- `PATCH /api/manuals/:id` - Actualizar (Admin/Gestor)

### Admin
- `POST /api/admin/smtp-config` - Configurar SMTP
- `GET /api/admin/smtp-config` - Obtener config SMTP
- `GET /api/activity-logs` - Logs de actividad

### Dashboard
- `GET /api/dashboard/stats` - Estadísticas

## Seguridad Implementada

- ✅ JWT con expiración 24h
- ✅ Bcrypt (10 rounds) para contraseñas
- ✅ Rate limiting en login
- ✅ Validación con express-validator
- ✅ Middleware de autorización por roles
- ✅ Headers de seguridad (Helmet)
- ✅ CORS configurado
- ✅ Tokens en Authorization headers

## Notificaciones Automáticas

### Configuración SMTP
Se configura desde el panel de administración (Admin → Configuración):
- Servidor SMTP (ej: smtp.gmail.com)
- Puerto (587 o 465)
- Usuario y contraseña

### Recordatorios
- **Tareas**: 3 días antes del vencimiento (si asignada a usuario con email)
- **Impuestos**: 7 días antes de la fecha límite (si cliente tiene email)
- **Verificación**: Cada hora mediante setInterval()

## Gestión de Archivos

- **Directorio**: `/uploads` (creado automáticamente)
- **Límite**: 10MB por archivo
- **Tipos**: PDF, Word, Excel, imágenes
- **Metadatos**: Nombre, tipo, fecha, usuario
- **Rutas**: Vinculados a client-tax específico

## Diseño UI/UX

### Paleta de Colores
- **Primario**: Azul marino (#1E3A8A)
- **Acento**: Naranja (#F97316)
- **Texto**: Gris oscuro (#374151)
- **Fondo**: Blanco (#FFFFFF)

### Tipografía
- **General**: Inter
- **Títulos**: Plus Jakarta Sans

### Características
- Modo oscuro/claro con persistencia
- Diseño responsive
- Componentes Shadcn UI
- Animaciones suaves
- Sistema de elevación hover/active

## ✅ Migración a PostgreSQL Completada

El sistema ahora utiliza PostgreSQL como base de datos persistente:

### Configuración Actual
- ✅ Base de datos PostgreSQL con Neon configurada
- ✅ Schema Drizzle migrado exitosamente
- ✅ PostgresStorage implementado con todos los métodos CRUD
- ✅ Datos de seed poblados (usuarios, clientes, tareas, etc.)
- ✅ Testing end-to-end validado con persistencia real

### Ejecutar Seed (Popular Base de Datos)
```bash
tsx server/seed.ts
```

Esto crea:
- 3 usuarios (admin, gestor, lectura) con contraseña "admin123"
- 5 clientes de ejemplo
- 4 modelos fiscales (303, 390, 130, 131)
- 4 periodos tributarios
- 5 tareas de ejemplo
- 2 manuales internos

## Siguientes Pasos (Producción)

### Despliegue con Docker
1. Crear docker-compose.yml con servicios (app, postgres, nginx)
2. Configurar Dockerfiles optimizados
3. Setup nginx como reverse proxy
4. Variables de entorno para producción

### Sistema de Backups
1. Script bash para dump diario PostgreSQL
2. Rotación automática de 14 días
3. Cron job configurado
4. Documentar proceso de restauración

### Características Avanzadas
1. WebSockets para notificaciones en tiempo real
2. Sistema de auditoría con trazabilidad
3. Búsqueda avanzada global full-text

## Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Producción
npm run build           # Construye para producción
npm start               # Inicia servidor de producción

# Base de Datos (PostgreSQL)
npm run db:generate     # Genera migraciones
npm run db:migrate      # Ejecuta migraciones
npm run db:studio       # Abre Drizzle Studio
```

## Variables de Entorno

Ver `.env.example` para la configuración completa:
- `PORT` - Puerto del servidor (default: 5000)
- `JWT_SECRET` - Secret para JWT
- `DATABASE_URL` - URL de PostgreSQL (producción)
- `FRONTEND_URL` - URL del frontend para CORS

## Notas Importantes

1. **SMTP**: La configuración se guarda en memoria, se pierde al reiniciar. En producción, guardar en base de datos.

2. **Archivos**: Se guardan en `/uploads`. En producción, considerar S3 o similar para escalabilidad.

3. **Recordatorios**: Se ejecutan cada hora. En producción, considerar usar cron jobs o servicios como Bull/Agenda.

4. **Seguridad**: El JWT_SECRET debe cambiarse en producción. Usar variables de entorno seguras.

5. **Base de Datos**: Sistema migrado exitosamente a PostgreSQL. Los datos persisten correctamente en la base de datos Neon.

## Documentación Adicional

- `README.md` - Documentación completa de instalación y uso
- `design_guidelines.md` - Guías de diseño UI/UX
- `.env.example` - Ejemplo de variables de entorno

## Estado del Proyecto

✅ **COMPLETADO** - Sistema MVP listo para testing y despliegue
- Todas las funcionalidades implementadas
- Backend completo con seguridad
- Frontend con todos los módulos
- Sistema de notificaciones operativo
- Gestión de archivos funcional
- Documentación completa

---

**Última actualización**: 13 de octubre de 2025
**Versión**: 1.0.0 MVP
