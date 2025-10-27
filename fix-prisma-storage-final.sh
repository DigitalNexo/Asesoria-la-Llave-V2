#!/bin/bash

echo "🔧 Arreglando prisma-storage.ts comprehensivamente..."

FILE="server/prisma-storage.ts"

# client → clients (includes/where)
perl -i -pe 's/client: \{/clients: {/g' "$FILE"
perl -i -pe 's/filing\.client/filing.clients/g' "$FILE"

# clientTaxFilingWhereInput → client_tax_filingsWhereInput
perl -i -pe 's/clientTaxFilingWhereInput/client_tax_filingsWhereInput/g' "$FILE"

# ClientWhereInput → clientsWhereInput
perl -i -pe 's/ClientWhereInput/clientsWhereInput/g' "$FILE"

# taxModels → tax_models
perl -i -pe 's/taxModels:/tax_models:/g' "$FILE"
perl -i -pe 's/c\.taxModels/c.tax_models/g' "$FILE"

# fechaAlta → fechaAlta (este ya está bien, es la property del select)
# fecha_inicio, fecha_asignacion, fecha_fin
perl -i -pe 's/ob\.fechaInicio/ob.fecha_inicio/g' "$FILE"
perl -i -pe 's/ob\.fechaAsignacion/ob.fecha_asignacion/g' "$FILE"
perl -i -pe 's/ob\.fechaFin/ob.fecha_fin/g' "$FILE"

# ob.impuestos → no existe esa relación directa, hay que usar include

# Eliminar tax_periods de orderBy (no es una relación)
perl -i -pe 's/\{ tax_periods: \{ starts_at: .desc. \} \}, //g' "$FILE"

# filing.period → debe ser fetched via include, no existe directo
# Esto requiere cambios manuales más complejos

echo "✅ prisma-storage.ts parcialmente arreglado"
echo "⚠️  Requiere arreglos manuales para relaciones de period y filings"
