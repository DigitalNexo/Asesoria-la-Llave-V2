#!/bin/bash

echo "🔧 Arreglando errores finales..."

# ========== PRISMA/SEED.TS ==========

# Agregar updatedAt a roles
perl -i -pe 's/(is_system: true,)\s*$/\1\n      updatedAt: new Date(),/g' prisma/seed.ts

# Cambiar inicioPresentacion → inicio_presentacion
perl -i -pe 's/inicioPresentacion:/inicio_presentacion:/g' prisma/seed.ts

# Agregar fecha_actualizacion a tasks
perl -i -pe 's/(fecha_vencimiento: new Date\(.*?\),)\s*$/\1\n        fecha_actualizacion: new Date(),/g' prisma/seed.ts

# Agregar fecha_actualizacion a manuals
perl -i -pe 's/(publicado: true,)\s*$/\1\n        fecha_actualizacion: new Date(),/g' prisma/seed.ts

# Agregar updatedAt a system_config
perl -i -pe 's/(description: .*?,)\s*$/\1\n      updatedAt: new Date(),/g' prisma/seed.ts

# ========== SERVER/PRISMA-STORAGE.TS ==========

# fiscalPeriod → fiscal_periods
perl -i -pe 's/fiscalPeriod/fiscal_periods/g' server/prisma-storage.ts

# cliente_id → clienteId (en mapping)
perl -i -pe 's/cliente_id: task\.cliente_id,/clienteId: task.cliente_id,/g' server/prisma-storage.ts

# contenido_html → contenidoHtml (en mapping)
perl -i -pe 's/contenido_html: manual\.contenido_html,/contenidoHtml: manual.contenido_html,/g' server/prisma-storage.ts
perl -i -pe 's/contenido_html: version\.contenido_html,/contenidoHtml: version.contenido_html,/g' server/prisma-storage.ts

# role → roles (include)
perl -i -pe 's/role: \{/roles: {/g' server/prisma-storage.ts

# Agregar id a users.create
perl -i -pe 's/(data: \{\s*username:)/data: {\n        id: randomUUID(),\n        \1/g' server/prisma-storage.ts

# Eliminar tax_models de includes (no existe esa relación)
perl -i -pe 's/tax_models: true,?\s*//g' server/prisma-storage.ts
perl -i -pe 's/tax_periods: true,?\s*//g' server/prisma-storage.ts

# ClientTaxAssignmentWhereInput → client_tax_assignmentsWhereInput
perl -i -pe 's/ClientTaxAssignmentWhereInput/client_tax_assignmentsWhereInput/g' server/prisma-storage.ts

# clientTaxAssignment → client_tax_assignments
perl -i -pe 's/tx\.clientTaxAssignment/tx.client_tax_assignments/g' server/prisma-storage.ts

# clientTaxFiling → client_tax_filings
perl -i -pe 's/tx\.clientTaxFiling/tx.client_tax_filings/g' server/prisma-storage.ts

# Arreglar orderBy tax_periods
perl -i -pe 's/\{ tax_periods: \{ (year|quarter): '\''(asc|desc)'\'' \} \}//g' server/prisma-storage.ts

echo "✅ Todos los errores arreglados"
