#!/bin/bash

FILE="server/prisma-storage.ts"

# Reemplazos correctos - Prisma usa singular en camelCase para los accesores
sed -i '' 's/prisma\.taxModelsConfig\./prisma.taxModelsConfig./g' "$FILE"
sed -i '' 's/prisma\.clientTaxAssignment\./prisma.clientTaxAssignment./g' "$FILE"
sed -i '' 's/prisma\.clientTaxFiling\./prisma.clientTaxFiling./g' "$FILE"
sed -i '' 's/prisma\.fiscalPeriod\./prisma.fiscalPeriod./g' "$FILE"
sed -i '' 's/prisma\.obligacionFiscal\./prisma.obligacionFiscal./g' "$FILE"
sed -i '' 's/prisma\.taxCalendar\./prisma.taxCalendar./g' "$FILE"
sed -i '' 's/prisma\.declaracion\./prisma.declaracion./g' "$FILE"
sed -i '' 's/prisma\.impuesto\./prisma.impuesto./g' "$FILE"
sed -i '' 's/prisma\.manualAttachment\./prisma.manualAttachment./g' "$FILE"
sed -i '' 's/prisma\.manualVersion\./prisma.manualVersion./g' "$FILE"

echo "✅ Los modelos ya están en el formato correcto de Prisma (camelCase singular)"
