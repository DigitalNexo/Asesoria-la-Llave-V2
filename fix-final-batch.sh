#!/bin/bash

echo "🔧 Final batch of critical fixes..."

cd /Users/usuario/Documents/Repositorios/Asesoria-La-Llave

# Fix fiscal_periods create/update: startsAt → starts_at, endsAt → ends_at
# These are in the Prisma data objects, not the descriptor
perl -i -pe 's/startsAt: descriptor\.startsAt/starts_at: descriptor.startsAt/g' server/prisma-storage.ts
perl -i -pe 's/endsAt: descriptor\.endsAt/ends_at: descriptor.endsAt/g' server/prisma-storage.ts

# Fix data parameter access: data.starts_at → data.startsAt, data.ends_at → data.endsAt
perl -i -pe 's/starts_at: data\.starts_at/starts_at: data.startsAt/g' server/prisma-storage.ts
perl -i -pe 's/ends_at: data\.ends_at/ends_at: data.endsAt/g' server/prisma-storage.ts

# Fix where.client → where.clients
perl -i -pe 's/where\.client = /where.clients = /g' server/prisma-storage.ts

echo "✅ Pattern fixes completed"
echo "⚠️  Still need manual fixes for relation includes"
