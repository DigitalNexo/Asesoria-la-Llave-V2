#!/bin/bash

FILE="server/prisma-storage.ts"

echo "🔧 Aplicando correcciones Prisma v3 (final) en $FILE..."

# Crear backup
cp "$FILE" "$FILE.backup-v3"

# 1. Corregir tipos Prisma restantes
sed -i '' 's/fiscalPeriodWhereInput/fiscal_periodsWhereInput/g' "$FILE"
sed -i '' 's/client\.taxModelsConfig\./client.tax_models_config./g' "$FILE"
sed -i '' 's/client\.clientTaxAssignment\./client.client_tax_assignments./g' "$FILE"
sed -i '' 's/client\.clientTaxFiling\./client.client_tax_filings./g' "$FILE"

# 2. Corregir más relaciones en include que faltaron
sed -i '' 's/taxModel: true/tax_models_config: true/g' "$FILE"
sed -i '' 's/period: true/fiscal_periods: true/g' "$FILE"  
sed -i '' 's/user: {/users: {/g' "$FILE"

# 3. Corregir orderBy con period
sed -i '' 's/{ period: {/{ fiscal_periods: {/g' "$FILE"

# 4. Corregir presentedAt
sed -i '' 's/presentedAt:/presented_at:/g' "$FILE"
sed -i '' 's/\.presentedAt/.presented_at/g' "$FILE"

# 5. Corregir accesos a period
sed -i '' 's/filing\.period/filing.fiscal_periods/g' "$FILE"
sed -i '' 's/assignment\.period/assignment.fiscal_periods/g' "$FILE"

# 6. Corregir variables con camelCase en where que quedaron
sed -i '' 's/{ clientId }/{ client_id: clientId }/g' "$FILE"
sed -i '' 's/where: { clientId,/where: { client_id: clientId,/g' "$FILE"

# 7. Corregir activeFlag
sed -i '' 's/activeFlag:/active_flag:/g' "$FILE"

# 8. Corregir assignment property access
sed -i '' 's/assignment\.clientId/assignment.client_id/g' "$FILE"
sed -i '' 's/assignment\.taxModelCode/assignment.tax_model_code/g' "$FILE"

# 9. Corregir data.tax_model_code en parametros (debe volver a taxModelCode para parametros)
# Nota: en data object properties debemos usar snake_case, pero en parámetros de funciones es camelCase

# 10. Corregir nifCif en select
sed -i '' 's/nifCif: true/nif_cif: true/g' "$FILE"

# 11. Corregir periodicity, startsAt, endsAt en fiscal_periods
sed -i '' 's/\.startsAt/.starts_at/g' "$FILE"
sed -i '' 's/\.endsAt/.ends_at/g' "$FILE"

# 12. Corregir updated_at requerido en tax_models_config
sed -i '' '/allowed_periods: JSON\.stringify.*,$/a\              updated_at: new Date(),' "$FILE"
sed -i '' '/labels:.*is_active: true,/!b; N; s/is_active: true,/updated_at: new Date(),\n              is_active: true,/' "$FILE"

# 13. Corregir where con endDate
sed -i '' 's/{ endDate:/{end_date:/g' "$FILE"

echo "✅ Correcciones v3 aplicadas a $FILE"  
echo "📋 Backup guardado en $FILE.backup-v3"
