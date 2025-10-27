#!/bin/bash

FILE="server/prisma-storage.ts"

echo "🔧 Aplicando correcciones completas de Prisma en $FILE..."

# Crear backup
cp "$FILE" "$FILE.backup-complete"

# 1. Eliminar importación inválida
sed -i '' '/fiscalPeriod/d' "$FILE"

# 2. Corregir nombres de tipos Prisma (ClientTaxAssignment -> client_tax_assignments)
sed -i '' 's/ClientTaxAssignmentWhereInput/client_tax_assignmentsWhereInput/g' "$FILE"
sed -i '' 's/ClientTaxFilingWhereInput/client_tax_filingsWhereInput/g' "$FILE"

# 3. Corregir accesos a modelos en transacciones (tx.clientTaxAssignment -> tx.client_tax_assignments)
sed -i '' 's/tx\.clientTaxAssignment\./tx.client_tax_assignments./g' "$FILE"
sed -i '' 's/tx\.clientTaxFiling\./tx.client_tax_filings./g' "$FILE"

# 4. Corregir nombres de campos - users model
sed -i '' 's/roleId:/role_id:/g' "$FILE"

# 5. Corregir nombres de campos - clients model  
sed -i '' 's/razonSocial:/razon_social:/g' "$FILE"
sed -i '' 's/nifCif:/nif_cif:/g' "$FILE"
sed -i '' 's/fechaAlta:/fecha_alta:/g' "$FILE"
sed -i '' 's/fechaBaja:/fecha_baja:/g' "$FILE"
sed -i '' 's/responsableAsignado:/responsable_asignado:/g' "$FILE"

# 6. Corregir accesos a propiedades - clients
sed -i '' 's/\.razonSocial/.razon_social/g' "$FILE"
sed -i '' 's/\.nifCif/.nif_cif/g' "$FILE"
sed -i '' 's/\.fechaAlta/.fecha_alta/g' "$FILE"
sed -i '' 's/\.fechaBaja/.fecha_baja/g' "$FILE"
sed -i '' 's/\.responsableAsignado/.responsable_asignado/g' "$FILE"
sed -i '' 's/\.isActive/.is_active/g' "$FILE"

# 7. Corregir where conditions
sed -i '' 's/where: { nifCif }/where: { nif_cif: nifCif }/g' "$FILE"
sed -i '' 's/clientId:/client_id:/g' "$FILE"
sed -i '' 's/taxModelCode:/tax_model_code:/g' "$FILE"
sed -i '' 's/startDate:/start_date:/g' "$FILE"
sed -i '' 's/endDate:/end_date:/g' "$FILE"

# 8. Corregir accesos a propiedades - client_tax_assignments
sed -i '' 's/\.taxModelCode/.tax_model_code/g' "$FILE"

# 9. Corregir nombres de relaciones (include)
sed -i '' 's/include: { role: true }/include: { roles: true }/g' "$FILE"
sed -i '' 's/role: {/roles: {/g' "$FILE"
sed -i '' 's/include: { taxModel: true }/include: { tax_models_config: true }/g' "$FILE"
sed -i '' 's/include: { employees: true }/include: { client_employees: true }/g' "$FILE"
sed -i '' 's/include: { taxAssignments: true }/include: { client_tax_assignments: true }/g' "$FILE"

# 10. Corregir orderBy
sed -i '' 's/orderBy: { razonSocial:/orderBy: { razon_social:/g' "$FILE"
sed -i '' 's/{ startDate:/{ start_date:/g' "$FILE"
sed -i '' 's/{ taxModelCode:/{ tax_model_code:/g' "$FILE"

# 11. Corregir select statements
sed -i '' 's/razonSocial: true/razon_social: true/g' "$FILE"
sed -i '' 's/taxModelCode: true/tax_model_code: true/g' "$FILE"

# 12. Corregir tipos de datos JSON -> String (allowed_types, allowed_periods, labels son String en schema)
sed -i '' 's/as unknown as Prisma\.JsonArray/JSON.stringify/g' "$FILE"

# 13. Corregir variable isActive que no existe
sed -i '' 's/return isActive/return is_active/g' "$FILE"

# 14. Corregir created_at en manual_versions (debe ser createdAt)
sed -i '' 's/created_at: version\.createdAt/createdAt: version.createdAt/g' "$FILE"

# 15. Corregir updated_at en system_config
sed -i '' 's/updated_at: new Date()/updatedAt: new Date()/g' "$FILE"

echo "✅ Correcciones completas aplicadas a $FILE"
echo "📋 Backup guardado en $FILE.backup-complete"
