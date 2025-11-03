#!/bin/bash
# Script para configurar dominio con SSL automáticamente
# Uso: ./setup-domain-ssl.sh tu-dominio.com

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
WWW_DOMAIN="www.$DOMAIN"
EMAIL=""

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Configuración de Dominio con SSL - Asesoría La Llave   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Dominio a configurar: ${GREEN}$DOMAIN${NC}"
echo ""

# Verificar si somos root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Este script debe ejecutarse como root${NC}"
    echo "Intenta: sudo $0 $DOMAIN"
    exit 1
fi

# 1. Verificar DNS
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔍 Paso 1/7: Verificando DNS${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SERVER_IP=$(hostname -I | awk '{print $1}')
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

echo "IP del servidor: $SERVER_IP"
echo "IP del dominio: $DOMAIN_IP"

if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
    echo -e "${RED}⚠️  ADVERTENCIA: El dominio no apunta a este servidor${NC}"
    echo ""
    echo "Debes configurar el registro DNS A:"
    echo "  Tipo: A"
    echo "  Nombre: @ (o $DOMAIN)"
    echo "  Valor: $SERVER_IP"
    echo ""
    read -p "¿Quieres continuar de todos modos? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ DNS configurado correctamente${NC}"
fi
echo ""

# 2. Instalar Certbot
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📦 Paso 2/7: Instalando Certbot${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command -v certbot &> /dev/null; then
    echo "Instalando Certbot..."
    apt update -qq
    apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot instalado${NC}"
else
    echo -e "${GREEN}✅ Certbot ya está instalado${NC}"
fi
echo ""

# 3. Crear configuración temporal de Nginx (para verificación Let's Encrypt)
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔧 Paso 3/7: Configurando Nginx (temporal)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cat > /etc/nginx/sites-available/asesoria-llave << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Deshabilitar default si existe
if [ -L /etc/nginx/sites-enabled/default ]; then
    rm /etc/nginx/sites-enabled/default
fi

# Habilitar sitio
ln -sf /etc/nginx/sites-available/asesoria-llave /etc/nginx/sites-enabled/

# Verificar configuración
nginx -t

# Recargar Nginx
systemctl reload nginx

echo -e "${GREEN}✅ Nginx configurado temporalmente${NC}"
echo ""

# 4. Obtener email para Let's Encrypt
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📧 Paso 4/7: Email para Let's Encrypt${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

read -p "Introduce tu email para notificaciones de SSL: " EMAIL

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email es requerido${NC}"
    exit 1
fi
echo ""

# 5. Obtener certificado SSL
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔒 Paso 5/7: Obteniendo certificado SSL${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

certbot --nginx -d $DOMAIN -d $WWW_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL \
    --redirect

echo -e "${GREEN}✅ Certificado SSL obtenido${NC}"
echo ""

# 6. Actualizar .env
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}⚙️  Paso 6/7: Actualizando .env${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd /root/www/Asesoria-la-Llave-V2

# Backup del .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Actualizar FRONTEND_URL
sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env

echo -e "${GREEN}✅ FRONTEND_URL actualizado a https://$DOMAIN${NC}"
echo ""

# 7. Reiniciar aplicación
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}🔄 Paso 7/7: Reiniciando aplicación${NC}"
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
echo -e "   ${BLUE}https://$DOMAIN${NC}"
echo -e "   ${BLUE}https://$WWW_DOMAIN${NC}"
echo ""
echo -e "${YELLOW}📋 Información importante:${NC}"
echo "   • El certificado SSL se renovará automáticamente"
echo "   • HTTP redirige automáticamente a HTTPS"
echo "   • Logs de Nginx: /var/log/nginx/"
echo "   • Certificado válido por 90 días (renovación automática)"
echo ""
echo -e "${YELLOW}🔧 Comandos útiles:${NC}"
echo "   • Ver certificados: sudo certbot certificates"
echo "   • Renovar SSL: sudo certbot renew"
echo "   • Test renovación: sudo certbot renew --dry-run"
echo "   • Ver logs Nginx: sudo tail -f /var/log/nginx/error.log"
echo ""
echo -e "${GREEN}✅ ¡Todo listo! Accede a tu aplicación desde el navegador${NC}"
echo ""
