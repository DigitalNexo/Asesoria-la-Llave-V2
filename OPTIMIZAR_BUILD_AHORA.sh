#!/bin/bash
# COMANDOS RÁPIDOS PARA OPTIMIZAR EL BUILD

echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║         OPTIMIZACIÓN DEL BUILD - COMANDOS RÁPIDOS                 ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo ""

# Ir al directorio del proyecto
cd /root/www/Asesoria-la-Llave-V2

# Aplicar optimizaciones
echo "1️⃣  Aplicando optimizaciones..."
chmod +x aplicar-optimizaciones-build.sh
./aplicar-optimizaciones-build.sh

echo ""
echo "2️⃣  Probando build optimizado..."
echo "Midiendo tiempo..."
time ./build-optimized.sh

echo ""
echo "✅ ¡Listo! El build ahora debería ser mucho más rápido."
echo ""
echo "Comandos disponibles:"
echo "  ./build-optimized.sh          - Build optimizado completo"
echo "  npm run build                 - Build normal (ahora optimizado)"
echo ""
echo "Para comparar tiempos:"
echo "  time npm run build"
echo "  time ./build-optimized.sh"
