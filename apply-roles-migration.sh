#!/bin/bash

# Script para aplicar migración manual de nuevos campos en tabla roles

# Conectarse a la BD y ejecutar ALTER TABLE
mysql -h 185.239.239.43 -u "${DB_USER}" -p"${DB_PASSWORD}" area_privada <<EOF

-- Agregar columnas a tabla roles si no existen
ALTER TABLE roles
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS icon VARCHAR(50) DEFAULT 'shield',
ADD COLUMN IF NOT EXISTS can_create_users BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_users BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_roles BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) NULL;

-- Mostrar estructura actualizada
SHOW COLUMNS FROM roles;

EOF

echo "✅ Migración completada"
