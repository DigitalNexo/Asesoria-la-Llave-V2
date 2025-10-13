# Guía de Despliegue - Asesoría La Llave

## 📋 Requisitos Previos

- Docker y Docker Compose instalados
- Servidor Linux (Ubuntu 20.04+ recomendado)
- Dominio configurado (opcional para HTTPS)
- Certificados SSL (opcional para HTTPS)

## 🚀 Despliegue con Docker Compose

### 1. Preparación del Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose -y

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER
```

### 2. Configuración del Proyecto

```bash
# Clonar o copiar el proyecto al servidor
cd /opt
sudo mkdir asesoria-la-llave
sudo chown $USER:$USER asesoria-la-llave
cd asesoria-la-llave

# Copiar archivos del proyecto
# (usar git clone, scp, o rsync)

# Crear archivo .env desde el ejemplo
cp .env.example .env
nano .env
```

### 3. Variables de Entorno (.env)

Editar `.env` con configuración de producción:

```bash
# Server Configuration
PORT=5000
NODE_ENV=production

# Authentication (CAMBIAR ESTOS VALORES)
JWT_SECRET=tu-secret-jwt-super-seguro-aqui
SESSION_SECRET=tu-session-secret-super-seguro-aqui

# Database Configuration
DATABASE_URL=postgresql://asesoria_user:tu-password-db@postgres:5432/asesoria_db
DB_PASSWORD=tu-password-db-seguro

# Email Configuration (opcional, se puede configurar desde el panel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password

# Frontend URL
FRONTEND_URL=https://tu-dominio.com
```

### 4. Construir y Ejecutar

```bash
# Construir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar estado
docker-compose ps

# Ver logs
docker-compose logs -f app
```

### 5. Inicializar Base de Datos

```bash
# Ejecutar migraciones
docker-compose exec app npm run db:push

# Poblar datos iniciales (usuarios, modelos fiscales, etc.)
docker-compose exec app tsx server/seed.ts
```

### 6. Configurar HTTPS (Opcional)

Para habilitar HTTPS con certificados SSL:

```bash
# Crear directorio para certificados
mkdir -p ssl

# Copiar certificados SSL
cp /ruta/a/cert.pem ssl/cert.pem
cp /ruta/a/key.pem ssl/key.pem

# Descomentar líneas SSL en nginx.conf
nano nginx.conf
```

Descomentar estas líneas en `nginx.conf`:

```nginx
# server {
#     listen 80;
#     server_name your-domain.com;
#     return 301 https://$server_name$request_uri;
# }

# listen 443 ssl http2;
# ssl_certificate /etc/nginx/ssl/cert.pem;
# ssl_certificate_key /etc/nginx/ssl/key.pem;
# ssl_protocols TLSv1.2 TLSv1.3;
# ssl_ciphers HIGH:!aNULL:!MD5;
```

Luego reiniciar nginx:

```bash
docker-compose restart nginx
```

## 🔄 Actualización de la Aplicación

```bash
# Detener servicios
docker-compose down

# Actualizar código (git pull, rsync, etc.)
git pull origin main

# Reconstruir imágenes
docker-compose build

# Iniciar servicios
docker-compose up -d

# Ejecutar migraciones si hay cambios en schema
docker-compose exec app npm run db:push
```

## 🗄️ Gestión de Backups

### Backup Manual

```bash
# Backup de base de datos
docker-compose exec postgres pg_dump -U asesoria_user asesoria_db > backup_$(date +%Y%m%d).sql

# Backup de archivos subidos
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

### Restauración

```bash
# Restaurar base de datos
docker-compose exec -T postgres psql -U asesoria_user asesoria_db < backup_20241013.sql

# Restaurar archivos
tar -xzf uploads_backup_20241013.tar.gz
```

## 📊 Monitoreo

### Ver Logs

```bash
# Logs de aplicación
docker-compose logs -f app

# Logs de base de datos
docker-compose logs -f postgres

# Logs de nginx
docker-compose logs -f nginx

# Todos los logs
docker-compose logs -f
```

### Estado de Servicios

```bash
# Estado general
docker-compose ps

# Recursos utilizados
docker stats

# Health checks
curl http://localhost/health
```

## 🔧 Comandos Útiles

```bash
# Reiniciar servicios
docker-compose restart

# Detener servicios
docker-compose stop

# Eliminar todo (incluyendo volúmenes)
docker-compose down -v

# Acceder a contenedor de app
docker-compose exec app sh

# Acceder a PostgreSQL
docker-compose exec postgres psql -U asesoria_user asesoria_db

# Ver logs en tiempo real
docker-compose logs -f --tail=100 app
```

## 🔐 Seguridad en Producción

1. **Cambiar todas las contraseñas y secretos** en `.env`
2. **Habilitar HTTPS** con certificados válidos
3. **Configurar firewall** para permitir solo puertos necesarios:
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```
4. **Actualizar regularmente** las imágenes Docker
5. **Monitorear logs** para detectar actividad sospechosa
6. **Configurar backups automáticos** (ver siguiente sección)

## 📁 Estructura de Volúmenes

- `postgres_data`: Datos de PostgreSQL
- `./uploads`: Archivos subidos por usuarios
- `./backups`: Backups de base de datos

## ⚠️ Troubleshooting

### Aplicación no inicia

```bash
# Verificar logs
docker-compose logs app

# Verificar variables de entorno
docker-compose exec app env

# Reconstruir sin caché
docker-compose build --no-cache app
```

### Base de datos no conecta

```bash
# Verificar estado de PostgreSQL
docker-compose ps postgres

# Verificar logs de PostgreSQL
docker-compose logs postgres

# Probar conexión
docker-compose exec app nc -zv postgres 5432
```

### Nginx errores 502

```bash
# Verificar que app esté corriendo
docker-compose ps app

# Verificar configuración nginx
docker-compose exec nginx nginx -t

# Reiniciar nginx
docker-compose restart nginx
```

## 📝 Notas Importantes

1. Los datos se guardan en volúmenes Docker persistentes
2. Los archivos subidos se guardan en `./uploads`
3. Configurar backups automáticos (ver script en siguiente sección)
4. La configuración SMTP se puede hacer desde el panel de admin
5. El sistema de recordatorios se ejecuta automáticamente cada hora

## 🆘 Soporte

Para problemas o dudas:
1. Revisar logs: `docker-compose logs -f`
2. Verificar estado: `docker-compose ps`
3. Consultar documentación en `/docs`
4. Contactar al equipo de desarrollo

---

**Última actualización**: 13 de octubre de 2025
