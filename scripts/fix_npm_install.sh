#!/usr/bin/env bash
set -euo pipefail

echo "=== Fix NPM install helper for Asesoria-La-Llave ==="
pwd

# Safety: run from repo root (detect package.json)
if [ ! -f package.json ]; then
  echo "ERROR: No se encontró package.json en el directorio actual. Ejecuta este script desde la raíz del repo." >&2
  exit 1
fi

TIMESTAMP=$(date +%s)
BACKUP_DIR="node_modules_backup_$TIMESTAMP"

# If node_modules exists, move it to a backup (safer than immediate delete)
if [ -d node_modules ]; then
  echo "Respaldando node_modules -> $BACKUP_DIR (se puede restaurar si hace falta)..."
  mv node_modules "$BACKUP_DIR" || { echo "No se pudo mover node_modules (permiso). Intentando eliminar directorios problemáticos en su lugar..."; }
fi

# Find directories with names that may cause ENOTEMPTY issues (e.g. 'bufferutil 2') and remove them
echo "Buscando directorios problemáticos en node_modules_backup (si existiera)..."
if [ -d "$BACKUP_DIR" ]; then
  # look for directories with spaces or suspicious suffixes matching common problematic packages
  find "$BACKUP_DIR" -type d -name '*bufferutil*' -print0 | while IFS= read -r -d '' dir; do
    echo "Eliminando directorio problemático: $dir"
    rm -rf "$dir"
  done
fi

# Also look for problematic leftover dirs in current node_modules (if move failed earlier)
echo "Buscando directorios problemáticos en node_modules (si existe)..."
if [ -d node_modules ]; then
  find node_modules -type d -name '*bufferutil*' -print0 | while IFS= read -r -d '' dir; do
    echo "Eliminando directorio problemático: $dir"
    rm -rf "$dir"
  done
fi

# Clean npm cache (force)
echo "Limpiando caché de npm..."
npm cache clean --force || true

# If package-lock.json exists, prefer npm ci for reproducible install
if [ -f package-lock.json ]; then
  echo "package-lock.json detectado -> ejecutando 'npm ci' para instalación reproducible..."
  # ensure no leftover node_modules
  rm -rf node_modules || true
  npm ci --unsafe-perm
else
  echo "No se encontró package-lock.json -> ejecutando 'npm install'..."
  npm install --unsafe-perm
fi

echo "Instalación finalizada correctamente. Si algo falla, revisa los logs arriba y ejecuta este script con permisos adecuados." 

echo "Si necesitas revertir, node_modules de respaldo (si existía) se encuentra en: $BACKUP_DIR" 

exit 0
