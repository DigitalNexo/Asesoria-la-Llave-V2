#!/bin/bash

FILE="server/prisma-storage.ts"

# Hacer backup
cp "$FILE" "$FILE.pre-snake-case"

# Reemplazos: camelCase -> snake_case
sed -i '' 's/prisma\.taxModelsConfig\./prisma.tax_models_config./g' "$FILE"
sed -i '' 's/prisma\.clientTaxAssignment\./prisma.client_tax_assignments./g' "$FILE"
sed -i '' 's/prisma\.clientTaxFiling\./prisma.client_tax_filings./g' "$FILE"
sed -i '' 's/prisma\.fiscalPeriod\./prisma.fiscal_periods./g' "$FILE"
sed -i '' 's/prisma\.obligacionFiscal\./prisma.obligaciones_fiscales./g' "$FILE"
sed -i '' 's/prisma\.taxCalendar\./prisma.tax_calendar./g' "$FILE"
sed -i '' 's/prisma\.declaracion\./prisma.declaraciones./g' "$FILE"
sed -i '' 's/prisma\.impuesto\./prisma.impuestos./g' "$FILE"
sed -i '' 's/prisma\.manualAttachment\./prisma.manual_attachments./g' "$FILE"
sed -i '' 's/prisma\.manualVersion\./prisma.manual_versions./g' "$FILE"
sed -i '' 's/prisma\.manual\./prisma.manuals./g' "$FILE"
sed -i '' 's/prisma\.task\./prisma.tasks./g' "$FILE"
sed -i '' 's/prisma\.client\./prisma.clients./g' "$FILE"
sed -i '' 's/prisma\.user\./prisma.users./g' "$FILE"

echo "✅ Convertidos todos los modelos a snake_case (nombres reales de Prisma)"
