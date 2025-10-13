#!/bin/bash

#########################################
# Script de Restauración de Backup
# Asesoría La Llave - MariaDB Restore
#########################################

# Configuración
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"

# Variables de base de datos
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-asesoria_llave}"
DB_USER="${DB_USER:-asesoria_user}"
DB_PASSWORD="${DB_PASSWORD:-change_this_password}"

# Colores para logs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función de log
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_prompt() {
    echo -e "${BLUE}[PROMPT]${NC} $1"
}

# Verificar que existe el directorio de backups
if [ ! -d "$BACKUP_DIR" ]; then
    log_error "El directorio de backups no existe: $BACKUP_DIR"
    exit 1
fi

# Listar backups disponibles
log_info "Backups disponibles en $BACKUP_DIR:"
echo ""
BACKUPS=($(find "$BACKUP_DIR" -name "asesoria_backup_*.sql*" -type f | sort -r))

if [ ${#BACKUPS[@]} -eq 0 ]; then
    log_error "No se encontraron backups en el directorio"
    exit 1
fi

# Mostrar lista de backups
for i in "${!BACKUPS[@]}"; do
    BACKUP_FILE=$(basename "${BACKUPS[$i]}")
    BACKUP_SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
    BACKUP_DATE=$(stat -c %y "${BACKUPS[$i]}" 2>/dev/null || stat -f "%Sm" "${BACKUPS[$i]}" 2>/dev/null)
    echo "  [$i] $BACKUP_FILE ($BACKUP_SIZE) - $BACKUP_DATE"
done

echo ""

# Si se proporciona un argumento, usar ese backup
if [ -n "$1" ]; then
    BACKUP_INDEX="$1"
else
    # Solicitar selección
    log_prompt "Seleccione el número del backup a restaurar (0-$((${#BACKUPS[@]}-1))): "
    read -r BACKUP_INDEX
fi

# Validar selección
if ! [[ "$BACKUP_INDEX" =~ ^[0-9]+$ ]] || [ "$BACKUP_INDEX" -ge "${#BACKUPS[@]}" ]; then
    log_error "Selección inválida"
    exit 1
fi

SELECTED_BACKUP="${BACKUPS[$BACKUP_INDEX]}"
log_info "Backup seleccionado: $(basename "$SELECTED_BACKUP")"

# Advertencia
echo ""
log_warning "⚠️  ADVERTENCIA: Esta operación sobrescribirá TODOS los datos actuales en la base de datos"
log_warning "⚠️  Base de datos: $DB_NAME@$DB_HOST:$DB_PORT"
echo ""
log_prompt "¿Está seguro de continuar? (escriba 'SI' para confirmar): "
read -r CONFIRMATION

if [ "$CONFIRMATION" != "SI" ]; then
    log_info "Restauración cancelada por el usuario"
    exit 0
fi

# Determinar si el archivo está comprimido
RESTORE_FILE="$SELECTED_BACKUP"
if [[ "$SELECTED_BACKUP" == *.gz ]]; then
    log_info "Descomprimiendo backup..."
    gunzip -c "$SELECTED_BACKUP" > "/tmp/restore_temp.sql"
    RESTORE_FILE="/tmp/restore_temp.sql"
fi

# Realizar restauración
log_info "Iniciando restauración de la base de datos..."
log_info "Esto puede tardar varios minutos dependiendo del tamaño del backup..."

if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$RESTORE_FILE"; then
    log_info "✅ Restauración completada exitosamente"
    
    # Limpiar archivo temporal si existe
    if [ "$RESTORE_FILE" != "$SELECTED_BACKUP" ]; then
        rm -f "$RESTORE_FILE"
    fi
else
    log_error "❌ Error durante la restauración"
    
    # Limpiar archivo temporal si existe
    if [ "$RESTORE_FILE" != "$SELECTED_BACKUP" ]; then
        rm -f "$RESTORE_FILE"
    fi
    
    exit 1
fi

# Verificar conexión a la base de datos
log_info "Verificando integridad de la base de datos..."
if mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME; SHOW TABLES;" > /dev/null 2>&1; then
    log_info "✅ La base de datos está accesible y operativa"
else
    log_warning "⚠️  No se pudo verificar la integridad de la base de datos"
fi

log_info "Proceso de restauración finalizado"

exit 0
