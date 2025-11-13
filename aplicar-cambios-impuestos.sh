#!/bin/bash
# Script completo para aplicar todos los cambios del sistema de impuestos

set -e  # Salir si hay algún error

echo "======================================"
echo "APLICANDO CAMBIOS AL SISTEMA DE IMPUESTOS"
echo "======================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
PROJECT_DIR="/root/www/Asesoria-la-Llave-V2"
DB_USER="app_area"
DB_PASS="masjic-natjew-9wyvBe"
DB_NAME="area_privada"

cd "$PROJECT_DIR"

# Paso 1: Registrar rutas
echo -e "${YELLOW}[1/6] Registrando rutas del sistema de impuestos...${NC}"
if [ -f register-tax-routes.sh ]; then
    chmod +x register-tax-routes.sh
    ./register-tax-routes.sh
    echo -e "${GREEN}✓ Rutas registradas${NC}"
else
    echo -e "${RED}✗ No se encontró register-tax-routes.sh${NC}"
fi
echo ""

# Paso 2: Agregar campo period_type a la base de datos
echo -e "${YELLOW}[2/6] Agregando campo period_type a tax_calendar...${NC}"
if [ -f migrations/add-period-type-to-tax-calendar.sql ]; then
    mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" < migrations/add-period-type-to-tax-calendar.sql
    echo -e "${GREEN}✓ Campo agregado y datos actualizados${NC}"
else
    echo -e "${YELLOW}⚠ No se encontró el archivo de migración, ejecutando directamente...${NC}"
    mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "ALTER TABLE tax_calendar ADD COLUMN IF NOT EXISTS period_type VARCHAR(20) NULL COMMENT 'Tipo de período: MONTHLY, QUARTERLY, ANNUAL' AFTER period;"
    echo -e "${GREEN}✓ Campo agregado${NC}"
fi
echo ""

# Paso 3: Generar cliente de Prisma
echo -e "${YELLOW}[3/6] Generando cliente de Prisma...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Cliente de Prisma generado${NC}"
echo ""

# Paso 4: Compilar el proyecto
echo -e "${YELLOW}[4/6] Compilando el proyecto...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Proyecto compilado exitosamente${NC}"
else
    echo -e "${RED}✗ Error en la compilación${NC}"
    echo -e "${YELLOW}⚠ Revisa los errores anteriores${NC}"
    exit 1
fi
echo ""

# Paso 5: Reiniciar servicio
echo -e "${YELLOW}[5/6] Reiniciando servicio...${NC}"
sudo systemctl restart asesoria-llave.service
sleep 3
echo -e "${GREEN}✓ Servicio reiniciado${NC}"
echo ""

# Paso 6: Verificar estado del servicio
echo -e "${YELLOW}[6/6] Verificando estado del servicio...${NC}"
if sudo systemctl is-active --quiet asesoria-llave.service; then
    echo -e "${GREEN}✓ Servicio activo y corriendo${NC}"
    echo ""
    echo "======================================"
    echo -e "${GREEN}✅ TODOS LOS CAMBIOS APLICADOS EXITOSAMENTE${NC}"
    echo "======================================"
    echo ""
    echo "Próximos pasos:"
    echo "1. Accede a la aplicación y ve a Control de Impuestos"
    echo "2. Verifica que aparecen las tarjetas de todos los clientes"
    echo "3. Comprueba que se muestran los días restantes"
    echo ""
    echo "Para diagnosticar problemas, ejecuta:"
    echo "  mysql -u$DB_USER -p$DB_PASS $DB_NAME < DIAGNOSTICO_Y_SOLUCION_TARJETAS.sql"
    echo ""
else
    echo -e "${RED}✗ El servicio no está activo${NC}"
    echo ""
    echo "Ver logs del servicio:"
    echo "  sudo journalctl -u asesoria-llave.service -n 50"
    exit 1
fi
