#!/bin/bash

echo "🔧 Arreglando server/routes.ts..."

# Fix colorTag → color_tag
perl -i -pe 's/colorTag:/color_tag:/g' server/routes.ts
perl -i -pe 's/, colorTag }/, color_tag: colorTag }/g' server/routes.ts

# Fix include: { client: true } → include: { clients: true }
perl -i -pe 's/include: \{ client: true \}/include: { clients: true }/g' server/routes.ts

echo "✅ server/routes.ts arreglado (parte 1)"
