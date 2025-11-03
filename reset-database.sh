#!/bin/bash
# Script para resetear la base de datos y crear usuario Owner desde .env
# ⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║        ⚠️  ADVERTENCIA: RESETEO DE BASE DE DATOS         ║${NC}"
echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Este script eliminará TODOS los datos de la base de datos:${NC}"
echo "  • Todos los usuarios (excepto el nuevo admin)"
echo "  • Todos los clientes"
echo "  • Todos los documentos"
echo "  • Todas las tareas"
echo "  • TODO el contenido"
echo ""
echo -e "${RED}Esta acción NO se puede deshacer.${NC}"
echo ""
read -p "¿Estás seguro de que quieres continuar? Escribe 'RESETEAR' para confirmar: " CONFIRM

if [ "$CONFIRM" != "RESETEAR" ]; then
    echo -e "${YELLOW}Operación cancelada.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Iniciando reseteo...${NC}"
echo ""

# Cargar variables de .env
source .env

# Variables de la base de datos
DB_USER="app_area"
DB_PASS="masjic-natjew-9wyvBe"
DB_NAME="area_privada"

# 1. Detener la aplicación
echo -e "${YELLOW}1/5: Deteniendo aplicación...${NC}"
systemctl stop asesoria-llave
echo -e "${GREEN}✅ Aplicación detenida${NC}"
echo ""

# 2. Eliminar todas las tablas y recrearlas
echo -e "${YELLOW}2/5: Eliminando todas las tablas...${NC}"

mysql -u $DB_USER -p"$DB_PASS" $DB_NAME <<EOF
-- Deshabilitar verificación de foreign keys
SET FOREIGN_KEY_CHECKS = 0;

-- Obtener todas las tablas y eliminarlas
DROP TABLE IF EXISTS _prisma_migrations;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS audit_trail;
DROP TABLE IF EXISTS budget_email_logs;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS budget_parameters;
DROP TABLE IF EXISTS budget_pdfs;
DROP TABLE IF EXISTS budget_templates;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS calendario_aeat;
DROP TABLE IF EXISTS client_employees;
DROP TABLE IF EXISTS client_tax;
DROP TABLE IF EXISTS client_tax_assignments;
DROP TABLE IF EXISTS client_tax_filings;
DROP TABLE IF EXISTS client_tax_requirements;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS declaraciones;
DROP TABLE IF EXISTS document_signatures;
DROP TABLE IF EXISTS document_templates;
DROP TABLE IF EXISTS document_versions;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS fiscal_periods;
DROP TABLE IF EXISTS impuestos;
DROP TABLE IF EXISTS job_runs;
DROP TABLE IF EXISTS manual_attachments;
DROP TABLE IF EXISTS manual_versions;
DROP TABLE IF EXISTS manuals;
DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS notification_logs;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS obligaciones_fiscales;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS price_catalog;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS scheduled_notifications;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS smtp_accounts;
DROP TABLE IF EXISTS smtp_config;
DROP TABLE IF EXISTS storage_configs;
DROP TABLE IF EXISTS system_backups;
DROP TABLE IF EXISTS system_config;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS system_updates;
DROP TABLE IF EXISTS task_activities;
DROP TABLE IF EXISTS task_attachments;
DROP TABLE IF EXISTS task_comments;
DROP TABLE IF EXISTS task_time_entries;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS tax_calendar;
DROP TABLE IF EXISTS tax_files;
DROP TABLE IF EXISTS tax_models;
DROP TABLE IF EXISTS tax_models_config;
DROP TABLE IF EXISTS tax_periods;
DROP TABLE IF EXISTS users;

-- Rehabilitar verificación de foreign keys
SET FOREIGN_KEY_CHECKS = 1;
EOF

echo -e "${GREEN}✅ Tablas eliminadas${NC}"
echo ""

# 3. Aplicar el schema de Prisma
echo -e "${YELLOW}3/5: Recreando schema de base de datos...${NC}"
npm run prisma:push --force-reset
echo -e "${GREEN}✅ Schema recreado${NC}"
echo ""

# 4. Iniciar la aplicación (creará el usuario admin automáticamente)
echo -e "${YELLOW}4/5: Iniciando aplicación...${NC}"
echo "   La aplicación creará automáticamente el usuario admin"
echo "   desde las variables ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD"
echo ""
systemctl start asesoria-llave

# Esperar a que inicie
echo "Esperando a que la aplicación inicie..."
sleep 10

if systemctl is-active --quiet asesoria-llave; then
    echo -e "${GREEN}✅ Aplicación iniciada${NC}"
else
    echo -e "${RED}❌ Error al iniciar la aplicación${NC}"
    journalctl -u asesoria-llave -n 30 --no-pager
    exit 1
fi
echo ""

# 5. Verificar usuario creado
echo -e "${YELLOW}5/5: Verificando usuario admin...${NC}"
sleep 3

ADMIN_USER=$(mysql -u $DB_USER -p"$DB_PASS" $DB_NAME -N -e "SELECT username, email, is_owner FROM users LIMIT 1;")

if [ -n "$ADMIN_USER" ]; then
    echo -e "${GREEN}✅ Usuario admin creado correctamente:${NC}"
    echo ""
    mysql -u $DB_USER -p"$DB_PASS" $DB_NAME -e "SELECT username as 'Usuario', email as 'Email', is_owner as 'Owner', is_active as 'Activo' FROM users;"
    echo ""
else
    echo -e "${RED}❌ No se encontró ningún usuario${NC}"
    exit 1
fi

# Resumen
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✅ RESETEO COMPLETADO EXITOSAMENTE           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Base de datos limpia y lista para usar.${NC}"
echo ""
echo -e "${YELLOW}Credenciales del usuario admin:${NC}"
echo "  Usuario: \$ADMIN_USERNAME (del .env)"
echo "  Email: \$ADMIN_EMAIL (del .env)"
echo "  Contraseña: \$ADMIN_PASSWORD (del .env)"
echo ""
echo -e "${YELLOW}Accede a la aplicación:${NC}"
echo "  https://digitalnexo.es"
echo ""