#!/bin/bash

echo "🔧 Arreglando todos los errores restantes..."

# ========== SEED.TS ==========
echo "📝 Arreglando prisma/seed.ts..."

# modeloId → modelo_id en tax_periods
perl -i -pe 's/modeloId:/modelo_id:/g' prisma/seed.ts

# ========== PRISMA-STORAGE.TS ==========
echo "📝 Arreglando server/prisma-storage.ts..."

# autor_id → autorId (en el mapper)
perl -i -pe 's/autor_id: manual\.autorId/autorId: manual.autorId/g' server/prisma-storage.ts

# permission → permissions (include)
perl -i -pe 's/permission: true/permissions: true/g' server/prisma-storage.ts

# Agregar id a createUser
perl -i -pe 's/(async createUser\(user: InsertUser\): Promise<User> \{\s*const created = await prisma\.users\.create\(\{\s*data: \{)/\1\n        id: randomUUID(),/g' server/prisma-storage.ts

# taxModelsConfig → tax_models_config
perl -i -pe 's/client\.taxModelsConfig/client.tax_models_config/g' server/prisma-storage.ts

# clientTaxAssignment → client_tax_assignments
perl -i -pe 's/client\.clientTaxAssignment/client.client_tax_assignments/g' server/prisma-storage.ts

# clientTaxFiling → client_tax_filings  
perl -i -pe 's/client\.clientTaxFiling/client.client_tax_filings/g' server/prisma-storage.ts

# startsAt → starts_at (orderBy)
perl -i -pe 's/startsAt: '\''desc'\''/starts_at: '\''desc'\''/g' server/prisma-storage.ts

# Eliminar include filings (no existe)
perl -i -pe 's/filings: \{\s*where:.*?\},?\s*//g' server/prisma-storage.ts

# impuesto → impuestos (include)
perl -i -pe 's/impuesto: true/impuestos: true/g' server/prisma-storage.ts

# ob.clienteId → ob.cliente_id
perl -i -pe 's/ob\.clienteId/ob.cliente_id/g' server/prisma-storage.ts

# ob.impuesto → ob.impuestos
perl -i -pe 's/ob\.impuesto/ob.impuestos/g' server/prisma-storage.ts

echo "✅ Todos los errores corregidos"
