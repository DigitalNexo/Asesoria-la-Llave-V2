#!/bin/bash
# Script de build optimizado para Asesoria-la-Llave-V2

set -e

echo "🚀 Iniciando build optimizado..."

# Variables
BUILD_START=$(date +%s)
NODE_OPTIONS="--max-old-space-size=4096"

# Función para calcular tiempo transcurrido
elapsed_time() {
    local END=$(date +%s)
    local DIFF=$((END - BUILD_START))
    echo "⏱️  Tiempo total: ${DIFF}s"
}

# 1. Limpiar dist anterior (opcional, comentar si quieres builds incrementales)
echo "🧹 Limpiando build anterior..."
rm -rf dist/public dist/index.js 2>/dev/null || true

# 2. Build del frontend con Vite (paralelo si es posible)
echo "📦 Compilando frontend con Vite..."
STEP_START=$(date +%s)
NODE_ENV=production NODE_OPTIONS="$NODE_OPTIONS" npx vite build --logLevel warn
STEP_END=$(date +%s)
echo "✅ Frontend compilado en $((STEP_END - STEP_START))s"

# 3. Build del backend con esbuild (más rápido)
echo "⚙️  Compilando backend con esbuild..."
STEP_START=$(date +%s)
npx esbuild server/index.ts \
  --platform=node \
  --packages=external \
  --bundle \
  --format=esm \
  --outdir=dist \
  --minify \
  --tree-shaking=true \
  --log-level=warning \
  --target=node18
STEP_END=$(date +%s)
echo "✅ Backend compilado en $((STEP_END - STEP_START))s"

# 4. Generar Prisma Client si es necesario
if [ ! -d "node_modules/.prisma/client" ] || [ "prisma/schema.prisma" -nt "node_modules/.prisma/client" ]; then
    echo "🔧 Generando Prisma Client..."
    STEP_START=$(date +%s)
    npx prisma generate --silent
    STEP_END=$(date +%s)
    echo "✅ Prisma Client generado en $((STEP_END - STEP_START))s"
else
    echo "⏭️  Prisma Client ya está actualizado"
fi

echo ""
echo "✨ Build completado exitosamente!"
elapsed_time
