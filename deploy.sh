#!/bin/bash
# Script de despliegue rápido - Asesoría La Llave
# Uso: ./deploy.sh

set -e  # Detener si hay error

echo "🚀 Iniciando despliegue..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Build
echo -e "${YELLOW}📦 Construyendo aplicación...${NC}"
npm run build
echo -e "${GREEN}✅ Build completado${NC}"
echo ""

# 2. Reiniciar servicio
echo -e "${YELLOW}🔄 Reiniciando servicio...${NC}"
systemctl restart asesoria-llave
echo -e "${GREEN}✅ Servicio reiniciado${NC}"
echo ""

# 3. Esperar un momento
sleep 3

# 4. Verificar estado
echo -e "${YELLOW}🔍 Verificando estado...${NC}"
if systemctl is-active --quiet asesoria-llave; then
    echo -e "${GREEN}✅ Servicio activo y funcionando${NC}"
    echo ""

    # Health check
    echo -e "${YELLOW}🏥 Verificando health endpoint...${NC}"
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Aplicación respondiendo correctamente${NC}"
        curl -s http://localhost:5000/health | jq . 2>/dev/null || curl -s http://localhost:5000/health
    else
        echo -e "${RED}⚠️  Aplicación no responde en /health${NC}"
    fi
else
    echo -e "${RED}❌ El servicio no está activo${NC}"
    echo ""
    echo "Ver logs con: journalctl -u asesoria-llave -n 50"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Despliegue completado exitosamente${NC}"
echo ""
echo "📝 Comandos útiles:"
echo "  Ver logs:        journalctl -u asesoria-llave -f"
echo "  Ver estado:      systemctl status asesoria-llave"
echo "  Ver últimos logs: journalctl -u asesoria-llave -n 50"