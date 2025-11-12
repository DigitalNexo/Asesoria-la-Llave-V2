#!/bin/bash

# Script para optimizar VS Code Server en túnel remoto
echo "🚀 Optimizando VS Code Server para máximo rendimiento..."

# Limpiar cachés de VS Code Server
echo "🧹 Limpiando cachés..."
rm -rf ~/.vscode-server/data/User/workspaceStorage/*
rm -rf ~/.vscode-server/data/CachedExtensions/*
rm -rf ~/.vscode-server/data/logs/*

# Configurar variables de entorno para Node.js (optimización)
export NODE_OPTIONS="--max-old-space-size=8192"
export TS_NODE_TRANSPILE_ONLY=true

# Crear archivo de configuración global de VS Code Server
mkdir -p ~/.vscode-server/data/Machine
cat > ~/.vscode-server/data/Machine/settings.json << 'EOF'
{
  "typescript.tsserver.maxTsServerMemory": 8192,
  "extensions.autoUpdate": false,
  "extensions.autoCheckUpdates": false,
  "telemetry.telemetryLevel": "off",
  "git.autofetch": false,
  "git.autorefresh": false,
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/.next/**": true,
    "**/dist/**": true,
    "**/build/**": true
  }
}
EOF

echo "✅ Optimización completada!"
echo ""
echo "📋 Pasos adicionales recomendados:"
echo "1. Reinicia VS Code o reconéctate al túnel"
echo "2. Solo instala las extensiones que realmente necesites"
echo "3. Evita abrir demasiados archivos simultáneamente"
echo ""
echo "🔧 Variables de entorno configuradas:"
echo "   NODE_OPTIONS=--max-old-space-size=8192"
echo "   TS_NODE_TRANSPILE_ONLY=true"
echo ""
echo "💡 Para hacerlas permanentes, agrégalas a tu ~/.bashrc o ~/.zshrc"
