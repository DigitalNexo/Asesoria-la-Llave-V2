#!/bin/bash

#########################################
# Script de Backup Automático
# Asesoría La Llave - MariaDB Backup
#########################################

# Configuración
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
RETENTION_DAYS=14
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="asesoria_backup_${DATE}.sql"

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

# Crear directorio de backups si no existe
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log_info "Directorio de backups creado: $BACKUP_DIR"
fi

# Realizar backup con mysqldump
log_info "Iniciando backup de la base de datos MariaDB..."
log_info "Base de datos: $DB_NAME@$DB_HOST:$DB_PORT"

if mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --hex-blob \
    --result-file="$BACKUP_DIR/$BACKUP_FILE" \
    "$DB_NAME"; then
    log_info "Backup completado exitosamente: $BACKUP_FILE"
    
    # Obtener tamaño del backup
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    log_info "Tamaño del backup: $BACKUP_SIZE"
else
    log_error "Error al realizar el backup"
    exit 1
fi

# Comprimir backup
log_info "Comprimiendo backup..."
if gzip "$BACKUP_DIR/$BACKUP_FILE"; then
    log_info "Backup comprimido: ${BACKUP_FILE}.gz"
    COMPRESSED_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
    log_info "Tamaño comprimido: $COMPRESSED_SIZE"
else
    log_warning "No se pudo comprimir el backup, pero el archivo .sql está disponible"
fi

# Limpiar backups antiguos (mantener solo los últimos N días)
log_info "Limpiando backups antiguos (manteniendo últimos $RETENTION_DAYS días)..."
find "$BACKUP_DIR" -name "asesoria_backup_*.sql*" -type f -mtime +$RETENTION_DAYS -exec rm -f {} \;

# Listar backups actuales
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "asesoria_backup_*.sql*" -type f | wc -l)
log_info "Backups actuales en el sistema: $BACKUP_COUNT"

# Mostrar espacio en disco
if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h "$BACKUP_DIR" | tail -1 | awk '{print $5}')
    log_info "Uso de disco: $DISK_USAGE"
fi

log_info "Proceso de backup finalizado"

exit 0
