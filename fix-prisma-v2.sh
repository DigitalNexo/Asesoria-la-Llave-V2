#!/bin/bash

FILE="server/prisma-storage.ts"

echo "🔧 Aplicando correcciones Prisma v2 en $FILE..."

# Crear backup
cp "$FILE" "$FILE.backup-v2"

# 1. Eliminar importación inválida fiscalPeriod
sed -i '' '/import.*fiscalPeriod/d' "$FILE"
sed -i '' '/fiscalPeriod$/d' "$FILE"

# 2. Corregir tipos Prisma
sed -i '' 's/ClientTaxAssignmentWhereInput/client_tax_assignmentsWhereInput/g' "$FILE"
sed -i '' 's/ClientTaxFilingWhereInput/client_tax_filingsWhereInput/g' "$FILE"

# 3. Corregir modelos en transacciones
sed -i '' 's/tx\.clientTaxAssignment\./tx.client_tax_assignments./g' "$FILE"
sed -i '' 's/tx\.clientTaxFiling\./tx.client_tax_filings./g' "$FILE"

# 4. Corregir JSON -> String conversions (allowed_types, allowed_periods, labels)
sed -i '' 's/rule\.allowedTypes as unknown as Prisma\.JsonArray/JSON.stringify(rule.allowedTypes)/g' "$FILE"
sed -i '' 's/rule\.allowedPeriods as unknown as Prisma\.JsonArray/JSON.stringify(rule.allowedPeriods)/g' "$FILE"
sed -i '' 's/(rule\.labels as unknown as Prisma\.JsonArray)/JSON.stringify(rule.labels)/g' "$FILE"
sed -i '' 's/rule\.labels as unknown as Prisma\.JsonArray/JSON.stringify(rule.labels)/g' "$FILE"

# 5. Corregir nombres de campos - users
sed -i '' 's/roleId:/role_id:/g' "$FILE"

# 6. Corregir nombres de campos - clients  
sed -i '' 's/\brazonSocial:/razon_social:/g' "$FILE"
sed -i '' 's/\bnifCif:/nif_cif:/g' "$FILE"
sed -i '' 's/\bfechaAlta:/fecha_alta:/g' "$FILE"
sed -i '' 's/\bfechaBaja:/fecha_baja:/g' "$FILE"
sed -i '' 's/\bresponsableAsignado:/responsable_asignado:/g' "$FILE"

# 7. Corregir accesos a propiedades del objeto client
sed -i '' 's/c\.razonSocial/c.razon_social/g' "$FILE"
sed -i '' 's/c\.nifCif/c.nif_cif/g' "$FILE"
sed -i '' 's/c\.fechaAlta/c.fecha_alta/g' "$FILE"
sed -i '' 's/c\.fechaBaja/c.fecha_baja/g' "$FILE"
sed -i '' 's/c\.responsableAsignado/c.responsable_asignado/g' "$FILE"
sed -i '' 's/c\.isActive/c.is_active/g' "$FILE"

# 8. Corregir where con nifCif
sed -i '' 's/where: { nifCif }/where: { nif_cif: nifCif }/g' "$FILE"

# 9. Corregir where/data con clientId y taxModelCode
sed -i '' 's/\bclientId:/client_id:/g' "$FILE"
sed -i '' 's/\btaxModelCode:/tax_model_code:/g' "$FILE"
sed -i '' 's/\bstartDate:/start_date:/g' "$FILE"
sed -i '' 's/\bendDate:/end_date:/g' "$FILE"

# 10. Corregir accesos a propiedades de assignments/filings
sed -i '' 's/a\.taxModelCode/a.tax_model_code/g' "$FILE"
sed -i '' 's/f\.taxModelCode/f.tax_model_code/g' "$FILE"

# 11. Corregir relaciones en include
sed -i '' 's/include: { role: true }/include: { roles: true }/g' "$FILE"
sed -i '' 's/\brole: {/roles: {/g' "$FILE"
sed -i '' 's/include: { taxModel: true }/include: { tax_models_config: true }/g' "$FILE"
sed -i '' 's/taxModel: {/tax_models_config: {/g' "$FILE"
sed -i '' 's/include: { employees: true }/include: { client_employees: true }/g' "$FILE"
sed -i '' 's/employees: {/client_employees: {/g' "$FILE"
sed -i '' 's/include: { taxAssignments: true }/include: { client_tax_assignments: true }/g' "$FILE"
sed -i '' 's/taxAssignments: {/client_tax_assignments: {/g' "$FILE"

# 12. Corregir orderBy
sed -i '' 's/orderBy: { razonSocial:/orderBy: { razon_social:/g' "$FILE"
sed -i '' 's/{ startDate:/{ start_date:/g' "$FILE"
sed -i '' 's/{ taxModelCode:/{ tax_model_code:/g' "$FILE"

# 13. Corregir select
sed -i '' 's/razonSocial: true/razon_social: true/g' "$FILE"
sed -i '' 's/taxModelCode: true/tax_model_code: true/g' "$FILE"

# 14. Corregir variable isActive -> is_active
sed -i '' 's/\breturn isActive/return is_active/g' "$FILE"

# 15. Corregir created_at en manual_versions (debe mantenerse createdAt)
sed -i '' 's/created_at: version\.createdAt/createdAt: version.createdAt/g' "$FILE"

# 16. Corregir updated_at en system_config (debe mantenerse updatedAt)
sed -i '' 's/updated_at: new Date()/updatedAt: new Date()/g' "$FILE"

echo "✅ Correcciones v2 aplicadas a $FILE"
echo "📋 Backup guardado en $FILE.backup-v2"
