# 🌐 Configuración de Dominio para Asesoría La Llave

## 📋 Información del Servidor

- **IP del servidor**: `185.239.239.43`
- **Puerto de la aplicación**: `5000`
- **Nginx**: Instalado y funcionando
- **Certbot**: Por instalar (para SSL)

---

## 🎯 Pasos para Configurar tu Dominio

### 1️⃣ Configurar DNS en tu Proveedor de Dominio

Debes apuntar tu dominio a la IP del servidor. Entra al panel de control de tu proveedor de dominios (GoDaddy, Namecheap, Cloudflare, etc.) y añade estos registros DNS:

#### Opción A: Dominio Principal (ejemplo: asesorialallave.com)
```
Tipo: A
Nombre: @
Valor: 185.239.239.43
TTL: 3600
```

#### Opción B: Subdominio (ejemplo: app.asesorialallave.com)
```
Tipo: A
Nombre: app
Valor: 185.239.239.43
TTL: 3600
```

#### Opción C: Ambos (dominio y www)
```
Tipo: A
Nombre: @
Valor: 185.239.239.43
TTL: 3600

Tipo: A
Nombre: www
Valor: 185.239.239.43
TTL: 3600
```

**⏰ Tiempo de propagación**: Los cambios DNS pueden tardar de 5 minutos a 48 horas en propagarse.

---

### 2️⃣ Verificar que el Dominio Apunta al Servidor

Antes de configurar Nginx, verifica que tu dominio apunte correctamente:

```bash
# Reemplaza TU_DOMINIO.com con tu dominio real
dig TU_DOMINIO.com +short

# O con nslookup
nslookup TU_DOMINIO.com
```

Debe devolver: `185.239.239.43`

---

### 3️⃣ Configurar Nginx (Ejecutar Scripts)

Una vez que el DNS esté configurado, ejecuta:

```bash
# Para dominio SIN SSL (HTTP)
./setup-domain.sh TU_DOMINIO.com

# Para dominio CON SSL (HTTPS) - RECOMENDADO
./setup-domain-ssl.sh TU_DOMINIO.com
```

---

## 🔒 Configuración SSL/HTTPS con Let's Encrypt

### Instalar Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### Obtener Certificado SSL

```bash
sudo certbot --nginx -d TU_DOMINIO.com -d www.TU_DOMINIO.com
```

Certbot te hará algunas preguntas:
- Email: (tu email para notificaciones)
- Términos de servicio: Sí
- Compartir email: No (opcional)
- Redirección HTTPS: Sí (recomendado)

### Renovación Automática

Los certificados de Let's Encrypt caducan cada 90 días. Certbot crea automáticamente un cron job para renovarlos.

Verificar renovación automática:
```bash
sudo certbot renew --dry-run
```

---

## 🛠️ Configuración Manual (Si prefieres hacerlo paso a paso)

### Crear Configuración de Nginx

```bash
sudo nano /etc/nginx/sites-available/asesoria-llave
```

Pega esta configuración (reemplaza `TU_DOMINIO.com`):

```nginx
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name TU_DOMINIO.com www.TU_DOMINIO.com;

    # Permitir verificación de Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirigir todo lo demás a HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name TU_DOMINIO.com www.TU_DOMINIO.com;

    # Certificados SSL (Let's Encrypt los configurará aquí)
    ssl_certificate /etc/letsencrypt/live/TU_DOMINIO.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/TU_DOMINIO.com/privkey.pem;

    # Configuración SSL mejorada
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/asesoria-llave-access.log;
    error_log /var/log/nginx/asesoria-llave-error.log;

    # Tamaño máximo de archivo
    client_max_body_size 100M;

    # Proxy a la aplicación Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # Headers para proxy
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Cache bypass
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support (si tu app usa WebSockets)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Habilitar el Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/asesoria-llave /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

---

## 🔧 Actualizar Frontend URL en .env

Después de configurar el dominio, actualiza tu archivo `.env`:

```bash
nano /root/www/Asesoria-la-Llave-V2/.env
```

Cambia:
```env
FRONTEND_URL=http://localhost:5000
```

Por:
```env
FRONTEND_URL=https://TU_DOMINIO.com
```

Luego reinicia la aplicación:
```bash
./quick-restart.sh
```

---

## ✅ Verificación Final

### Verificar que todo funciona:

```bash
# 1. Verificar DNS
dig TU_DOMINIO.com +short

# 2. Verificar Nginx
sudo nginx -t
systemctl status nginx

# 3. Verificar aplicación
systemctl status asesoria-llave

# 4. Verificar SSL (si está configurado)
sudo certbot certificates

# 5. Probar en el navegador
curl -I https://TU_DOMINIO.com
```

### Accede desde el navegador:
- HTTP: `http://TU_DOMINIO.com`
- HTTPS: `https://TU_DOMINIO.com` (si configuraste SSL)

---

## 🚨 Solución de Problemas

### El dominio no resuelve
```bash
# Verificar DNS
dig TU_DOMINIO.com
# Esperar a que propague (puede tardar hasta 48h)
```

### Error 502 Bad Gateway
```bash
# Verificar que la aplicación esté corriendo
systemctl status asesoria-llave
./check-status.sh

# Verificar logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Error de certificado SSL
```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew
```

### Nginx no inicia
```bash
# Ver errores
sudo nginx -t

# Ver logs
sudo journalctl -u nginx -n 50
```

---

## 📝 Firewall (UFW)

Si usas firewall, asegúrate de permitir HTTP y HTTPS:

```bash
# Verificar estado
sudo ufw status

# Permitir HTTP y HTTPS
sudo ufw allow 'Nginx Full'

# O manualmente
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🔄 Scripts Automatizados Disponibles

Hemos creado scripts para facilitar todo:

- `setup-domain.sh` - Configuración básica sin SSL
- `setup-domain-ssl.sh` - Configuración completa con SSL
- `renew-ssl.sh` - Renovar certificados SSL manualmente

---

## 📞 Checklist Completo

- [ ] Configurar registros DNS (A record)
- [ ] Esperar propagación DNS (verificar con `dig`)
- [ ] Instalar Certbot (`apt install certbot python3-certbot-nginx`)
- [ ] Configurar Nginx para el dominio
- [ ] Obtener certificado SSL con Certbot
- [ ] Actualizar `FRONTEND_URL` en `.env`
- [ ] Reiniciar aplicación
- [ ] Verificar en navegador
- [ ] Probar HTTPS
- [ ] Verificar renovación automática de SSL

---

**¿Necesitas ayuda?** Ejecuta el script interactivo:
```bash
./setup-domain-interactive.sh
```