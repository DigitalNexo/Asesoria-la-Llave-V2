#!/bin/bash

# Script para marcar al usuario admin como Owner

mysql -h 185.239.239.43 -u "${DB_USER}" -p"${DB_PASSWORD}" area_privada <<EOF

-- Actualizar el usuario admin para marcarlo como owner
UPDATE users 
SET is_owner = true 
WHERE username = 'CarlosAdmin' 
LIMIT 1;

-- Verificar que se actualizó correctamente
SELECT id, username, email, is_owner FROM users WHERE username = 'CarlosAdmin';

EOF

echo "✅ Usuario admin marcado como Owner"
