Guía mínima para desplegar la aplicación en una VPS

Objetivo
- Proveer pasos reproducibles para desplegar la API+client en una VPS Linux (Debian/Ubuntu).
- Asegurar que la base de datos MariaDB sea accesible y que las migraciones estén aplicadas.

Requisitos en la VPS
- Node.js 18+ (preferible 20+), npm
- MariaDB accesible (puede ser en la misma VPS o externo)
- nginx (opcional, para reverse proxy y TLS)
- systemd (para servicio) o pm2

1) Variables de entorno
Crea un archivo `.env` en la raíz del proyecto con al menos:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL="mysql://DB_USER:DB_PASS@DB_HOST:3306/area_privada"
JWT_SECRET="una_clave_segura_y_larga"
ADMIN_EMAIL=carlos@asesorialallave.com
ADMIN_USERNAME=CarlosAdmin
ADMIN_PASSWORD="contraseña_segura"
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
FORCE_START_WITHOUT_DB=false
DB_CONNECT_RETRIES=5
DB_CONNECT_DELAY_MS=2000
ALLOW_LOCAL_DB=false
FRONTEND_URL=https://tudominio.com
```

Ajusta los valores según tu entorno. NEVER comitte .env al repositorio.

2) Instalar dependencias y build
```bash
# en la VPS, en la carpeta del repo
npm ci
# Si trabajas con TypeScript/tsx, no es necesario build para dev, pero para produccion:
# Si quieres compilar/transpilar (opcional):
# npm run build
```

3) Aplicar migraciones de Prisma
- Recomendado en producción: `npx prisma migrate deploy` (aplica migraciones SQL generadas)
- Si solo quieres sincronizar el cliente con el schema (no recomendado en produccion): `npx prisma db push`

Ejemplo:
```bash
npx prisma migrate deploy --preview-feature
```
Si tu MariaDB no es accesible directamente (por ejemplo está en una red privada), utiliza un túnel SSH:
```bash
ssh -L 33306:127.0.0.1:3306 usuario@host_remoto
# y luego ajusta DATABASE_URL para apuntar a 127.0.0.1:33306 temporalmente
```

4) Revisar que la base de datos sea accesible
```bash
# desde la VPS
nc -vz DB_HOST 3306
# o con mysql client
mysql -h DB_HOST -P 3306 -u DB_USER -p -D area_privada -e "SELECT 1;"
```

5) Iniciar la app (systemd)
- Crear archivo `/etc/systemd/system/asesoria.service`:
```
[Unit]
Description=Asesoria La Llave API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Asesoria-La-Llave
EnvironmentFile=/path/to/Asesoria-La-Llave/.env
ExecStart=/usr/bin/node node_modules/tsx/dist/tsx server/index.ts
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```
- Luego:
```bash
sudo systemctl daemon-reload
sudo systemctl enable asesoria
sudo systemctl start asesoria
sudo journalctl -u asesoria -f
```

Alternativa: usar pm2
```bash
npm install -g pm2
pm2 start --name asesoria --interpreter node -- server/index.ts --env production
pm2 save
pm2 startup
```

6) Configurar nginx (reverse proxy + TLS)
- Proxy a `http://127.0.0.1:5000`
- Usar Certbot para obtener certificados Let's Encrypt

7) Healthchecks y readiness
- Endpoints disponibles:
  - `/health` -> retorna status básico
  - `/ready` -> verifica DB (retorna 503 si DB desconectada)

8) Notas sobre seguridad y migraciones
- No habilites `FORCE_START_WITHOUT_DB=true` en producción salvo que entiendas las implicaciones — muchas rutas fallarán.
- En producción usa `npx prisma migrate deploy` para aplicar las migraciones generadas por `prisma migrate` en workflows controlados.
- Comprueba que la cuenta Owner (`is_owner=true`) exista y que la contraseña admin sea segura.

9) Limpieza final (recomendado)
- Elimina endpoints temporales de administración si no son necesarios (por ejemplo `POST /api/admin/apply-migrations` o `/api/users/:id/set-owner`) o documenta su uso y protegelos con IP restrictions.

Si quieres, puedo generar:
- Un archivo systemd completo adaptado a tu ruta y usuario en la VPS.
- Un script `deploy.sh` para automatizar `ci -> migrate -> restart`.

---
Cambios que hice en el código para mejorar despliegue:
- Añadí reintentos de conexión a la DB en `server/index.ts` (variables `DB_CONNECT_RETRIES`, `DB_CONNECT_DELAY_MS`).
- Añadí `FORCE_START_WITHOUT_DB=true` para arrancar en modo degradado (no inicializa tax_models_config).
- Permití que `registerRoutes` acepte `skipDbInit` para saltar inicialización de `tax_models_config` en casos donde la DB no está disponible.
- Añadí protección en `prisma-storage.deleteUser` para impedir borrar al Owner y mapeé el error en la ruta de borrado.

Si quieres, ahora genero el script `deploy.sh` y un archivo systemd personalizado con la ruta de tu repo. Puedo también buscar y arreglar los errores de tipos/linters detectados (relacionados con los nuevos campos de roles) si quieres que el proyecto compile limpio antes de desplegar.
