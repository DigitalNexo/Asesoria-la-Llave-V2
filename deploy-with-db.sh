#!/bin/bash
# Script de despliegue con actualización de base de datos
# Uso: ./deploy-with-db.sh

set -e  # Detener si hay error

echo "🚀 Iniciando despliegue con actualización de base de datos..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. Generar cliente Prisma
echo -e "${YELLOW}🔧 Generando cliente Prisma...${NC}"
npm run prisma:generate
echo -e "${GREEN}✅ Cliente Prisma generado${NC}"
echo ""

# 2. Aplicar cambios a la base de datos
echo -e "${YELLOW}🗄️  Aplicando cambios a la base de datos...${NC}"
npm run prisma:push
echo -e "${GREEN}✅ Base de datos actualizada${NC}"
echo ""

# 3. Build
echo -e "${YELLOW}📦 Construyendo aplicación...${NC}"
npm run build
echo -e "${GREEN}✅ Build completado${NC}"
echo ""

# 4. Reiniciar servicio
echo -e "${YELLOW}🔄 Reiniciando servicio...${NC}"
systemctl restart asesoria-llave
echo -e "${GREEN}✅ Servicio reiniciado${NC}"
echo ""

# 5. Esperar
sleep 3

# 6. Verificar
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
echo -e "${GREEN}🎉 Despliegue con DB completado exitosamente${NC}"
echo ""
echo "📝 Comandos útiles:"
echo "  Ver logs:         journalctl -u asesoria-llave -f"
echo "  Ver estado:       systemctl status asesoria-llave"
echo "  Ver últimos logs: journalctl -u asesoria-llave -n 50"