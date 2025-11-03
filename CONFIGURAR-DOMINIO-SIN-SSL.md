# 🌐 Configurar Dominio con SSL Externo (Cloudflare/Proxy)

## ✅ Tu Caso: SSL Manejado por el Proveedor

Si tu proveedor de dominio maneja el SSL (como Cloudflare, o un proxy SSL), **NO necesitas** configurar Let's Encrypt en el servidor.

---

## 🚀 Configuración Rápida (1 Comando)

```bash
sudo ./setup-domain-no-ssl.sh TU_DOMINIO.com
```

Este script:
- ✅ Configura Nginx como proxy reverso
- ✅ Detecta si usas proxy SSL (Cloudflare, etc.)
- ✅ Actualiza el archivo `.env`
- ✅ Reinicia la aplicación
- ✅ **NO** instala certificados SSL locales

---

## 📋 Antes de Ejecutar el Script

### 1. Configurar DNS en tu Proveedor

En tu panel de control de dominios, añade:

```
Tipo: A
Nombre: @ (o tu dominio)
Valor: 185.239.239.43
TTL: Automático
```

Si quieres `www`:
```
Tipo: A
Nombre: www
Valor: 185.239.239.43
TTL: Automático
```

### 2. Si usas Cloudflare:

1. Añade tu sitio a Cloudflare
2. Apunta los nameservers de tu dominio a Cloudflare
3. En Cloudflare → SSL/TLS, configura:
   - **Modo SSL**: `Flexible` o `Full`
   - **Proxy**: Activado (nube naranja)

### 3. Verificar DNS

```bash
dig TU_DOMINIO.com +short
```

Si usas Cloudflare, verás una IP de Cloudflare (no la tuya), **esto es normal**.

---

## 🎯 Ejecutar Configuración

```bash
# Ejemplo con tu dominio
sudo ./setup-domain-no-ssl.sh midominio.com
```

El script te preguntará:
- ¿Tu proveedor maneja HTTPS/SSL? → **Sí** (si usas Cloudflare/proxy)

---

## 🔧 Cómo Funciona

```
Usuario → HTTPS → Cloudflare/Proxy (SSL) → HTTP → Tu Servidor (puerto 80) → Nginx → App (puerto 5000)
```

- El **SSL/HTTPS** lo maneja Cloudflare/tu proveedor
- Tu servidor recibe tráfico **HTTP** en el puerto 80
- Nginx hace proxy a la aplicación en el puerto 5000

---

## ⚙️ Configuración de Cloudflare (Si aplica)

### SSL/TLS Settings:

1. **Modo SSL**: `Flexible` (recomendado para empezar)
   - Cloudflare ↔ Visitante: HTTPS
   - Cloudflare ↔ Tu servidor: HTTP

2. O **Full**: Si quieres más seguridad
   - Requiere certificado en tu servidor (usa `setup-domain-ssl.sh` en su lugar)

### Firewall:

- Asegúrate de permitir el tráfico al puerto 80

### Speed Optimization:

- **Auto Minify**: Activado
- **Brotli**: Activado
- **HTTP/2**: Activado

---

## 🔍 Verificación

### 1. Verificar Nginx:
```bash
sudo nginx -t
systemctl status nginx
```

### 2. Verificar Aplicación:
```bash
systemctl status asesoria-llave
curl -I http://localhost:5000/health
```

### 3. Verificar desde Navegador:
```
https://TU_DOMINIO.com
```

### 4. Ver Logs:
```bash
# Logs de Nginx
sudo tail -f /var/log/nginx/asesoria-llave-error.log

# Logs de la aplicación
journalctl -u asesoria-llave -f
```

---

## 🚨 Solución de Problemas

### Error 502 Bad Gateway

```bash
# Verificar que la app esté corriendo
systemctl status asesoria-llave

# Verificar puerto 5000
ss -tlnp | grep 5000

# Ver logs
journalctl -u asesoria-llave -n 50
```

### Error 521 (Cloudflare)

Significa que Cloudflare no puede conectar con tu servidor:

```bash
# Verificar que Nginx esté corriendo
systemctl status nginx

# Verificar que el puerto 80 esté abierto
sudo ufw allow 80/tcp

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### La página no carga

```bash
# Ejecutar verificación completa
./check-status.sh

# Verificar DNS
dig TU_DOMINIO.com +short

# Ping al dominio
ping TU_DOMINIO.com
```

---

## 🔒 Seguridad con Cloudflare

### Ventajas:
- ✅ SSL/HTTPS gratuito
- ✅ Protección DDoS
- ✅ Cache CDN global
- ✅ Firewall de aplicaciones web (WAF)

### Configuración Recomendada:

1. **SSL/TLS**: Flexible o Full
2. **Firewall**: Activar reglas de seguridad
3. **Page Rules**: Cache para archivos estáticos
4. **Auto Minify**: Activar para JS/CSS/HTML

---

## 📝 Archivo .env

Después de ejecutar el script, tu `.env` tendrá:

```env
FRONTEND_URL=https://TU_DOMINIO.com
```

Si necesitas cambiarlo manualmente:

```bash
nano /root/www/Asesoria-la-Llave-V2/.env

# Cambia esta línea:
FRONTEND_URL=https://TU_DOMINIO.com

# Luego reinicia:
./quick-restart.sh
```

---

## 🎯 Resumen Ultra Rápido

1. **Configurar DNS** → Apuntar a `185.239.239.43`
2. **Esperar** → Propagación DNS (5 min - 48h)
3. **Ejecutar**:
   ```bash
   sudo ./setup-domain-no-ssl.sh TU_DOMINIO.com
   ```
4. **Listo** → Acceder a `https://TU_DOMINIO.com`

---

## 🆚 ¿Cuándo Usar Qué Script?

### `setup-domain-no-ssl.sh` ← **USA ESTE**
- ✅ Tu proveedor maneja el SSL (Cloudflare, proxy)
- ✅ Quieres SSL pero no configurarlo en el servidor
- ✅ Usas un CDN o servicio de proxy

### `setup-domain-ssl.sh`
- ✅ Quieres SSL local con Let's Encrypt
- ✅ No usas proxy/CDN
- ✅ Conexión directa al servidor

---

## 💡 Ejemplo Completo: Cloudflare

```bash
# 1. Añadir sitio a Cloudflare
# 2. Cambiar nameservers en tu registrador
# 3. En Cloudflare: Añadir registro A
#    Tipo: A
#    Nombre: @
#    Valor: 185.239.239.43
#    Proxy: Activado (nube naranja)

# 4. Esperar unos minutos

# 5. Verificar
dig midominio.com +short
# (Verás IP de Cloudflare, es normal)

# 6. Configurar servidor
sudo ./setup-domain-no-ssl.sh midominio.com

# 7. ¡Listo!
# Accede a https://midominio.com
```

---

**¿Cuál es tu dominio?** Te ayudo a configurarlo ahora mismo 🚀