#!/bin/bash

echo "🔧 Comprehensive final fixes for remaining errors..."

cd /Users/usuario/Documents/Repositorios/Asesoria-La-Llave

# Fix closedBy → closed_by
perl -i -pe 's/updates\.closedBy/updates.closed_by/g' server/prisma-storage.ts

# Fix endsAt → ends_at in select
perl -i -pe 's/endsAt: true,/ends_at: true,/g' server/prisma-storage.ts

# Fix filingWhere.period → filingWhere.fiscal_periods
perl -i -pe 's/filingWhere\.period\b/filingWhere.fiscal_periods/g' server/prisma-storage.ts

# Fix cliente → clients in includes
perl -i -pe 's/cliente: true,/clients: true,/g' server/prisma-storage.ts

# Fix fechaInicio → fecha_inicio
perl -i -pe 's/fechaInicio:/fecha_inicio:/g' server/prisma-storage.ts

# Fix taxCalendarId (invalid field)
perl -i -pe 's/taxCalendarId:/tax_calendar_id:/g' server/prisma-storage.ts

# Fix period.kind reference (undefined period variable)
# This needs context - will handle manually

echo "✅ Automated fixes applied"
echo "⚠️  Manual fixes still needed for:"
echo "  - Undefined 'period' variable"
echo "  - Missing relation includes (updateFiling needs includes)"
echo "  - Missing 'id' fields in creates"
echo "  - Property mismatches (asignado_a vs asignadoA)"
