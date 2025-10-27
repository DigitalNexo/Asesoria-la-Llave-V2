#!/bin/bash

echo "🔧 Arreglando prisma/seed.ts correctamente..."

# Cambiar inicioPresentacion → inicio_presentacion
perl -i -pe 's/inicioPresentacion:/inicio_presentacion:/g' prisma/seed.ts

# Buscar y arreglar creación de roles manualmente es mejor
# Para system_config, buscar donde se crean y agregar updatedAt

echo "✅ seed.ts arreglado parcialmente"
echo "⚠️  Necesita revisión manual para roles, tasks, manuals y system_config"
