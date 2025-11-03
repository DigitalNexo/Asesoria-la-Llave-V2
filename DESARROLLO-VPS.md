# 🚀 Guía de Desarrollo en VPS - Asesoría La Llave

Esta guía te explica cómo trabajar cuando programas desde VSCode conectado remotamente por SSH a tu VPS.

---

## 📋 Flujo de Trabajo Rápido

### Cuando Haces Cambios en el Código

```bash
# 1️⃣ Reconstruir la aplicación
npm run build

# 2️⃣ Reiniciar el servicio
systemctl restart asesoria-llave

# 3️⃣ Verificar que todo funciona
systemctl status asesoria-llave
```

**¡Eso es todo!** Con estos 3 comandos ya tienes tus cambios en producción.

---

## 🛠️ Script Rápido de Despliegue

Para hacerlo aún más fácil, usa el script que se ha creado:

```bash
# Despliega tus cambios automáticamente
./deploy.sh
```

Este script hace:
- ✅ Construye la aplicación
- ✅ Reinicia el servicio
- ✅ Verifica el estado
- ✅ Muestra los logs

---

## 📦 Comandos Útiles del Día a Día

### Ver Logs en Tiempo Real
```bash
# Ver todos los logs del servidor
journalctl -u asesoria-llave -f

# Ver solo los últimos 50 logs
journalctl -u asesoria-llave -n 50
```

### Gestión del Servicio
```bash
# Ver estado actual
systemctl status asesoria-llave

# Reiniciar el servicio
systemctl restart asesoria-llave

# Detener el servicio
systemctl stop asesoria-llave

# Iniciar el servicio
systemctl start asesoria-llave

# Ver si está habilitado para inicio automático
systemctl is-enabled asesoria-llave
```

### Verificar Salud de la Aplicación
```bash
# Verificar que el servidor responde
curl http://localhost:5000/health

# Ver puerto 5000 activo
ss -tlnp | grep 5000
```

### Ver Procesos Node
```bash
# Ver procesos de Node activos
ps aux | grep node

# Ver uso de recursos
top -p $(pgrep -f "node dist/index.js")
```

---

## 🔧 Cuando Cambias Variables de Entorno (.env)

Si modificas el archivo `.env`:

```bash
# 1️⃣ Edita el archivo .env
nano .env
# o edítalo desde VSCode

# 2️⃣ Reinicia el servicio para cargar las nuevas variables
systemctl restart asesoria-llave

# 3️⃣ Verifica que todo está bien
systemctl status asesoria-llave
```

**IMPORTANTE**: NO necesitas reconstruir (`npm run build`) cuando solo cambias `.env`.

---

## 🗄️ Cuando Cambias el Schema de la Base de Datos

Si modificas `prisma/schema.prisma`:

```bash
# 1️⃣ Generar nuevo cliente Prisma
npm run prisma:generate

# 2️⃣ Aplicar cambios a la base de datos
npm run prisma:push

# 3️⃣ Reconstruir la aplicación
npm run build

# 4️⃣ Reiniciar el servicio
systemctl restart asesoria-llave

# 5️⃣ Verificar
systemctl status asesoria-llave
```

O usa el script:
```bash
./deploy-with-db.sh
```

---

## 🐛 Resolución de Problemas

### El servicio no inicia
```bash
# Ver errores detallados
journalctl -u asesoria-llave -n 100 --no-pager

# Verificar configuración del servicio
systemctl cat asesoria-llave

# Recargar configuración de systemd (si editaste el .service)
systemctl daemon-reload
systemctl restart asesoria-llave
```

### El puerto 5000 está ocupado
```bash
# Ver qué proceso usa el puerto 5000
ss -tlnp | grep 5000

# Matar proceso manual si existe (normalmente no debería pasar)
pkill -f "node dist/index.js"

# Reiniciar el servicio
systemctl restart asesoria-llave
```

### Error "FATAL: DATABASE_URL"
```bash
# Verificar que .env tiene DATABASE_URL
grep DATABASE_URL .env

# Verificar que MariaDB está corriendo
systemctl status mariadb

# Probar conexión a la base de datos
mysql -u app_area -p'masjic-natjew-9wyvBe' -e "SELECT 1;"
```

### Error de JWT_SECRET
```bash
# Generar nuevo JWT_SECRET (si es necesario)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Editar .env con el nuevo secret
nano .env

# Reiniciar
systemctl restart asesoria-llave
```

---

## 📁 Estructura de Archivos Importantes

```
/root/www/Asesoria-la-Llave-V2/
├── .env                          # Variables de entorno (NO subir a Git)
├── dist/                         # Código compilado (generado por build)
├── server/                       # Código fuente del backend
├── client/                       # Código fuente del frontend
├── prisma/schema.prisma          # Schema de base de datos
├── package.json                  # Dependencias
├── deploy.sh                     # Script rápido de despliegue
├── deploy-with-db.sh             # Script con actualización de DB
└── start-production.sh           # Script de inicio manual

/etc/systemd/system/
└── asesoria-llave.service        # Configuración del servicio systemd
```

---

## 🔄 Workflow Completo Típico

### Escenario 1: Cambio Simple de Código (UI, lógica)
```bash
# Editas código en VSCode...
npm run build
systemctl restart asesoria-llave
systemctl status asesoria-llave
```

### Escenario 2: Cambio en Base de Datos
```bash
# Editas prisma/schema.prisma...
npm run prisma:generate
npm run prisma:push
npm run build
systemctl restart asesoria-llave
systemctl status asesoria-llave
```

### Escenario 3: Cambio en Variables de Entorno
```bash
# Editas .env...
systemctl restart asesoria-llave
systemctl status asesoria-llave
```

### Escenario 4: Instalar Nuevas Dependencias
```bash
npm install nombre-paquete
npm run build
systemctl restart asesoria-llave
systemctl status asesoria-llave
```

---

## ⚡ Atajos y Alias Recomendados

Añade esto a tu `~/.bashrc` para comandos más rápidos:

```bash
# Atajos para Asesoría La Llave
alias ase-status='systemctl status asesoria-llave'
alias ase-restart='systemctl restart asesoria-llave'
alias ase-logs='journalctl -u asesoria-llave -f'
alias ase-stop='systemctl stop asesoria-llave'
alias ase-start='systemctl start asesoria-llave'
alias ase-deploy='cd /root/www/Asesoria-la-Llave-V2 && ./deploy.sh'
alias ase-cd='cd /root/www/Asesoria-la-Llave-V2'
```

Luego ejecuta:
```bash
source ~/.bashrc
```

Ahora puedes usar:
- `ase-status` → Ver estado
- `ase-restart` → Reiniciar
- `ase-logs` → Ver logs en tiempo real
- `ase-deploy` → Desplegar cambios
- `ase-cd` → Ir a la carpeta del proyecto

---

## 🔒 Seguridad y Buenas Prácticas

### ⚠️ NUNCA hagas esto en producción:
- ❌ NO expongas el puerto 5000 directamente a Internet sin Nginx
- ❌ NO subas el archivo `.env` a Git
- ❌ NO uses `npm run dev` en producción
- ❌ NO dejes contraseñas débiles en `.env`

### ✅ SÍ haz esto:
- ✅ Usa siempre `npm run build` + `systemctl restart`
- ✅ Revisa los logs después de cada despliegue
- ✅ Haz backups regulares de la base de datos
- ✅ Mantén las dependencias actualizadas (`npm audit`)

---

## 📞 Soporte Rápido

### Verificación Completa del Sistema
```bash
# Ejecuta este comando si algo no funciona
echo "=== Estado del Servicio ==="
systemctl status asesoria-llave --no-pager
echo ""
echo "=== Puerto 5000 ==="
ss -tlnp | grep 5000
echo ""
echo "=== Base de Datos ==="
systemctl status mariadb --no-pager
echo ""
echo "=== Últimos 10 Logs ==="
journalctl -u asesoria-llave -n 10 --no-pager
echo ""
echo "=== Health Check ==="
curl -s http://localhost:5000/health | jq .
```

---

## 🎯 Resumen Ultra Rápido

**¿Cambiaste código?**
→ `npm run build && systemctl restart asesoria-llave`

**¿Cambiaste .env?**
→ `systemctl restart asesoria-llave`

**¿Cambiaste DB?**
→ `npm run prisma:push && npm run build && systemctl restart asesoria-llave`

**¿Ver logs?**
→ `journalctl -u asesoria-llave -f`

**¿Ver estado?**
→ `systemctl status asesoria-llave`

---

## 📝 Notas Adicionales

- El servicio se llama `asesoria-llave` en systemd
- El puerto es `5000` (configurable en .env)
- Los logs se guardan en systemd journal
- El servicio se inicia automáticamente al reiniciar el VPS
- Si cambias el archivo de servicio en `/etc/systemd/system/`, ejecuta `systemctl daemon-reload`

---

**Última actualización**: $(date)
**Ubicación del proyecto**: /root/www/Asesoria-la-Llave-V2
**Usuario del servicio**: root
**Base de datos**: MariaDB (area_privada)