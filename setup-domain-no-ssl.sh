#!/bin/bash
# Script para configurar dominio SIN SSL (el proveedor maneja SSL)
# Ideal para Cloudflare, proxies SSL externos, etc.
# Uso: ./setup-domain-no-ssl.sh tu-dominio.com

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar que se proporcionó un dominio
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar un dominio${NC}"
    echo ""
    echo "Uso: $0 tu-dominio.com"
    echo ""
    echo "Ejemplos:"
    echo "  $0 asesorialallave.com"
    echo "  $0 app.asesorialallave.com"
    exit 1
fi

DOMAIN=$1

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Configuración de Dominio (SSL Externo) - Asesoría     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Dominio a configurar: ${GREEN}$DOMAIN${NC}"
echo -e "${YELLOW}SSL manejado por: ${GREEN}Proveedor externo (Cloudflare, etc.)${NC}"
echo ""

# Verificar si somos root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script debe ejecutarse como root${NC}"
    echo "Intenta: sudo $0 $DOMAIN"
    exit 1
fi

# 1. Verificar DNS
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Paso 1/4: Verificando DNS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SERVER_IP=$(hostname -I | awk '{print $1}')
echo "IP del servidor: $SERVER_IP"

# Intentar resolver el dominio
DOMAIN_IP=$(dig +short $DOMAIN @1.1.1.1 | tail -n1)

if [ -n "$DOMAIN_IP" ]; then
    echo "IP detectada del dominio: $DOMAIN_IP"

    # Si usa Cloudflare u otro proxy, la IP será diferente
    if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
        echo -e "${YELLOW}ℹ️  El dominio parece usar un proxy (Cloudflare, etc.)${NC}"
        echo "   Esto es normal si tu proveedor maneja el SSL."
    else
        echo -e "${GREEN}✅ DNS apunta directamente a este servidor${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No se pudo resolver el dominio aún${NC}"
    echo "   Asegúrate de que el DNS esté configurado correctamente."
fi
echo ""

# 2. Crear configuración de Nginx
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 Paso 2/4: Configurando Nginx${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > /etc/nginx/sites-available/asesoria-llave << EOF
# Configuración para $DOMAIN
# SSL manejado externamente (Cloudflare, proxy, etc.)

server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Logs
    access_log /var/log/nginx/asesoria-llave-access.log;
    error_log /var/log/nginx/asesoria-llave-error.log;

    # Tamaño máximo de archivos
    client_max_body_size 100M;

    # Obtener IP real del visitante (importante con Cloudflare/proxy)
    real_ip_header X-Forwarded-For;
    set_real_ip_from 0.0.0.0/0;

    # Proxy a la aplicación Node.js
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;

        # Headers importantes para proxy
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;

        # Importante: Si el proxy externo usa HTTPS, informar a la app
        # Descomenta si tu proveedor usa SSL:
        # proxy_set_header X-Forwarded-Proto https;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Cache bypass
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket support (si tu app usa WebSockets o Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

echo -e "${GREEN}✅ Configuración de Nginx creada${NC}"
echo ""

# Deshabilitar default si existe
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "Deshabilitando configuración default..."
    rm /etc/nginx/sites-enabled/default
fi

# Habilitar sitio
ln -sf /etc/nginx/sites-available/asesoria-llave /etc/nginx/sites-enabled/

# Verificar configuración
echo "Verificando configuración de Nginx..."
if nginx -t; then
    echo -e "${GREEN}✅ Configuración de Nginx válida${NC}"
else
    echo -e "${RED}❌ Error en la configuración de Nginx${NC}"
    exit 1
fi
echo ""

# Recargar Nginx
echo "Recargando Nginx..."
systemctl reload nginx
echo -e "${GREEN}✅ Nginx recargado${NC}"
echo ""

# 3. Actualizar .env
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚙️  Paso 3/4: Actualizando .env${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd /root/www/Asesoria-la-Llave-V2

# Backup del .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Determinar protocolo (si el proveedor maneja SSL, usar https)
read -p "¿Tu proveedor maneja HTTPS/SSL? (s/n) [s]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]] || [[ -z $REPLY ]]; then
    PROTOCOL="https"
else
    PROTOCOL="http"
fi

# Actualizar FRONTEND_URL
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=$PROTOCOL://$DOMAIN|g" .env

echo -e "${GREEN}✅ FRONTEND_URL actualizado a $PROTOCOL://$DOMAIN${NC}"
echo ""

# 4. Reiniciar aplicación
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔄 Paso 4/4: Reiniciando aplicación${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

systemctl restart asesoria-llave

sleep 3

if systemctl is-active --quiet asesoria-llave; then
    echo -e "${GREEN}✅ Aplicación reiniciada correctamente${NC}"
else
    echo -e "${RED}❌ Error al reiniciar la aplicación${NC}"
    journalctl -u asesoria-llave -n 20 --no-pager
    exit 1
fi
echo ""

# Resumen final
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                ✅ CONFIGURACIÓN COMPLETADA               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}🎉 Tu aplicación está disponible en:${NC}"
echo -e "   ${BLUE}$PROTOCOL://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📋 Información importante:${NC}"
echo "   • El SSL es manejado por tu proveedor de dominio"
echo "   • Nginx actúa como proxy reverso en el puerto 80"
echo "   • La aplicación Node.js corre en el puerto 5000"
echo "   • Logs de Nginx: /var/log/nginx/asesoria-llave-*.log"
echo ""
echo -e "${YELLOW}🔧 Comandos útiles:${NC}"
echo "   • Ver logs Nginx: sudo tail -f /var/log/nginx/asesoria-llave-error.log"
echo "   • Ver logs app: journalctl -u asesoria-llave -f"
echo "   • Reiniciar Nginx: sudo systemctl reload nginx"
echo "   • Verificar Nginx: sudo nginx -t"
echo ""

if [[ $PROTOCOL == "https" ]]; then
    echo -e "${YELLOW}⚠️  IMPORTANTE - Cloudflare/Proxy SSL:${NC}"
    echo "   Si usas Cloudflare u otro proxy con SSL:"
    echo "   1. Configura el modo SSL en 'Flexible' o 'Full'"
    echo "   2. Asegúrate de que el puerto 80 esté abierto en firewall"
    echo "   3. El tráfico llega a tu servidor por HTTP (puerto 80)"
    echo "   4. El proxy maneja el HTTPS externamente"
    echo ""
fi

echo -e "${GREEN}✅ ¡Todo listo! Accede a tu aplicación desde el navegador${NC}"
echo ""