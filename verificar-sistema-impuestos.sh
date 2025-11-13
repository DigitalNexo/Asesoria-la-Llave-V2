#!/bin/bash
# Script de verificación post-aplicación de cambios

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  VERIFICACIÓN DEL SISTEMA DE CONTROL DE IMPUESTOS                ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Variables
DB_USER="app_area"
DB_PASS="masjic-natjew-9wyvBe"
DB_NAME="area_privada"

# 1. Verificar servicio
echo -e "${YELLOW}[1/6] Verificando estado del servicio...${NC}"
if sudo systemctl is-active --quiet asesoria-llave.service; then
    echo -e "${GREEN}✓ Servicio activo${NC}"
else
    echo -e "${RED}✗ Servicio NO activo${NC}"
    echo "Ver logs: sudo journalctl -u asesoria-llave.service -n 50"
fi
echo ""

# 2. Verificar campo period_type en BD
echo -e "${YELLOW}[2/6] Verificando campo period_type en tax_calendar...${NC}"
FIELD_EXISTS=$(mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -se "SHOW COLUMNS FROM tax_calendar LIKE 'period_type';" 2>/dev/null | wc -l)
if [ "$FIELD_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✓ Campo period_type existe${NC}"
else
    echo -e "${RED}✗ Campo period_type NO existe${NC}"
    echo "Ejecutar: migrations/add-period-type-to-tax-calendar.sql"
fi
echo ""

# 3. Verificar períodos abiertos
echo -e "${YELLOW}[3/6] Verificando períodos abiertos (por fechas)...${NC}"
echo "Períodos que deberían estar abiertos HOY:"
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    modelCode as Modelo,
    period as Periodo,
    year as Año,
    startDate as Inicio,
    endDate as Fin,
    DATEDIFF(endDate, CURDATE()) as 'Días restantes'
FROM tax_calendar
WHERE CURDATE() BETWEEN startDate AND endDate
AND active = 1;
" 2>/dev/null
echo ""

# 4. Verificar clientes con modelos activos
echo -e "${YELLOW}[4/6] Verificando clientes con modelos activos...${NC}"
mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
SELECT 
    c.razonSocial as Cliente,
    ctm.model_number as Modelo,
    ctm.period_type as 'Tipo Período',
    ctm.start_date as Desde,
    ctm.end_date as Hasta,
    ctm.is_active as Activo
FROM client_tax_models ctm
JOIN clients c ON c.id = ctm.client_id
WHERE ctm.is_active = 1
AND (ctm.end_date IS NULL OR ctm.end_date >= CURDATE());
" 2>/dev/null
echo ""

# 5. Verificar obligaciones generadas
echo -e "${YELLOW}[5/6] Verificando obligaciones de períodos abiertos...${NC}"
OBLIGATIONS_COUNT=$(mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -se "
SELECT COUNT(*) 
FROM client_tax_obligations cto
JOIN tax_calendar tc ON tc.id = cto.tax_calendar_id
WHERE CURDATE() BETWEEN tc.startDate AND tc.endDate;" 2>/dev/null)

if [ "$OBLIGATIONS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Se encontraron $OBLIGATIONS_COUNT obligaciones activas${NC}"
    mysql -u"$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "
    SELECT 
        c.razonSocial as Cliente,
        cto.model_number as Modelo,
        cto.period as Periodo,
        cto.year as Año,
        tc.endDate as 'Fecha Límite',
        DATEDIFF(tc.endDate, CURDATE()) as 'Días restantes',
        cto.status as Estado
    FROM client_tax_obligations cto
    JOIN clients c ON c.id = cto.client_id
    JOIN tax_calendar tc ON tc.id = cto.tax_calendar_id
    WHERE CURDATE() BETWEEN tc.startDate AND tc.endDate
    LIMIT 10;
    " 2>/dev/null
else
    echo -e "${YELLOW}⚠ No se encontraron obligaciones activas${NC}"
    echo "Puede que necesites ejecutar la generación automática:"
    echo "  curl -X POST http://localhost:5000/api/tax-obligations/generate-auto"
fi
echo ""

# 6. Verificar rutas registradas
echo -e "${YELLOW}[6/6] Verificando rutas registradas...${NC}"
if grep -q "taxCalendarRouter" /root/www/Asesoria-la-Llave-V2/server/routes.ts 2>/dev/null; then
    echo -e "${GREEN}✓ Rutas registradas correctamente${NC}"
else
    echo -e "${RED}✗ Rutas NO registradas${NC}"
    echo "Ejecutar: ./register-tax-routes.sh"
fi
echo ""

# Resumen final
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║  RESUMEN DE VERIFICACIÓN                                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""
echo "Si todos los checks están en verde ✓, el sistema está funcionando correctamente."
echo ""
echo "Próximos pasos:"
echo "1. Acceder a la aplicación web"
echo "2. Ir a 'Control de Impuestos'"
echo "3. Verificar que aparecen las tarjetas de todos los clientes"
echo "4. Comprobar que se muestran los días restantes"
echo ""
echo "Para diagnosticar problemas:"
echo "  ./fix-tarjetas-faltantes.sh"
echo "  mysql -u$DB_USER -p$DB_PASS $DB_NAME < DIAGNOSTICO_Y_SOLUCION_TARJETAS.sql"
echo ""
