#!/bin/bash

echo "🔧 Actualizando referencias de modelos en index.ts..."

cp server/index.ts server/index.ts.backup-hybrid

# Update model references in index.ts
perl -i -pe 's/prisma\.user\b/prisma.users/g' server/index.ts
perl -i -pe 's/prisma\.client\b/prisma.clients/g' server/index.ts
perl -i -pe 's/prisma\.task\b/prisma.tasks/g' server/index.ts
perl -i -pe 's/prisma\.role\b/prisma.roles/g' server/index.ts
perl -i -pe 's/prisma\.permission\b/prisma.permissions/g' server/index.ts
perl -i -pe 's/prisma\.session\b/prisma.sessions/g' server/index.ts

echo "✅ index.ts actualizado"
