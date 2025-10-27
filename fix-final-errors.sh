#!/bin/bash

echo "🔧 Arreglando errores restantes..."

# server/routes.ts
if [ -f "server/routes.ts" ]; then
  perl -i -pe 's/isPrimary:/is_primary:/g' server/routes.ts
  perl -i -pe 's/\.isPrimary/.is_primary/g' server/routes.ts
  perl -i -pe 's/\.basePath/.base_path/g' server/routes.ts
  perl -i -pe 's/basePath:/base_path:/g' server/routes.ts
  perl -i -pe 's/prisma\.client_taxRequirement/prisma.client_tax_requirements/g' server/routes.ts
fi

# prisma/seed.ts
if [ -f "prisma/seed.ts" ]; then
  perl -i -pe 's/isSystem:/is_system:/g' prisma/seed.ts
  perl -i -pe 's/prisma\.rolesPermission/prisma.role_permissions/g' prisma/seed.ts
  perl -i -pe 's/modeloId:/modelo_id:/g' prisma/seed.ts
  perl -i -pe 's/prisma\.clientsTax/prisma.client_tax/g' prisma/seed.ts
  perl -i -pe 's/clienteId:/cliente_id:/g' prisma/seed.ts
  perl -i -pe 's/asignadoA:/asignado_a:/g' prisma/seed.ts
  perl -i -pe 's/fechaVencimiento:/fecha_vencimiento:/g' prisma/seed.ts
  perl -i -pe 's/contenidoHtml:/contenido_html:/g' prisma/seed.ts
  perl -i -pe 's/autorId:/autor_id:/g' prisma/seed.ts
  perl -i -pe 's/taxPeriodId:/tax_period_id:/g' prisma/seed.ts
fi

# server/prisma-storage.ts
if [ -f "server/prisma-storage.ts" ]; then
  # Remover import fiscalPeriod
  perl -i -pe 's/import.*fiscalPeriod.*from.*@prisma\/client.*//g' server/prisma-storage.ts
  
  # Arreglar propiedades en mapeo
  perl -i -pe 's/cliente_id: task\.clienteId/cliente_id: task.cliente_id/g' server/prisma-storage.ts
  perl -i -pe 's/contenido_html: manual\.contenidoHtml/contenido_html: manual.contenido_html/g' server/prisma-storage.ts
  perl -i -pe 's/contenido_html: version\.contenidoHtml/contenido_html: version.contenido_html/g' server/prisma-storage.ts
  
  # includes
  perl -i -pe 's/user:/users:/g' server/prisma-storage.ts
  
  # Remover tax_models includes (no existe relación)
  perl -i -pe 's/,\s*tax_models: true//g' server/prisma-storage.ts
  perl -i -pe 's/include:\s*\{\s*tax_models:\s*true\s*\}/include: {}/g' server/prisma-storage.ts
fi

echo "✅ Errores restantes corregidos"
