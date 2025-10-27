#!/bin/bash

FILE="server/prisma-storage.ts"

# Backup
cp "$FILE" "$FILE.before-field-fixes"

# Reemplazar nombres de campos comunes (camelCase -> snake_case)
sed -i '' 's/allowedTypes:/allowed_types:/g' "$FILE"
sed -i '' 's/allowedPeriods:/allowed_periods:/g' "$FILE"
sed -i '' 's/isActive:/is_active:/g' "$FILE"
sed -i '' 's/createdAt:/created_at:/g' "$FILE"
sed -i '' 's/updatedAt:/updated_at:/g' "$FILE"

echo "✅ Nombres de campos corregidos a snake_case"
