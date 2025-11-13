#!/bin/bash
# Script para aplicar optimizaciones de build

echo "🚀 Aplicando optimizaciones de build..."

# 1. Respaldar configuración actual
if [ -f "vite.config.ts" ]; then
    cp vite.config.ts vite.config.ts.backup
    echo "✅ Backup creado: vite.config.ts.backup"
fi

# 2. Aplicar configuración optimizada
if [ -f "vite.config.optimized.ts" ]; then
    cp vite.config.optimized.ts vite.config.ts
    echo "✅ Configuración de Vite optimizada aplicada"
else
    echo "❌ No se encontró vite.config.optimized.ts"
fi

# 3. Hacer ejecutable el script de build
if [ -f "build-optimized.sh" ]; then
    chmod +x build-optimized.sh
    echo "✅ Script build-optimized.sh es ejecutable"
fi

# 4. Crear archivo .nvmrc si no existe (para especificar versión de Node)
if [ ! -f ".nvmrc" ]; then
    echo "18" > .nvmrc
    echo "✅ Archivo .nvmrc creado (Node 18)"
fi

echo ""
echo "✨ Optimizaciones aplicadas!"
echo ""
echo "Para construir el proyecto más rápido:"
echo "  ./build-optimized.sh"
echo ""
echo "O agregar a package.json:"
echo '  "build:fast": "bash build-optimized.sh"'
echo ""
echo "Para volver a la configuración anterior:"
echo "  cp vite.config.ts.backup vite.config.ts"
