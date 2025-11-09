#!/bin/bash

# Script para reemplazar OFICIAL por ASESORIA_LA_LLAVE y ONLINE por GESTORIA_ONLINE

echo "🔄 Reemplazando OFICIAL → ASESORIA_LA_LLAVE y ONLINE → GESTORIA_ONLINE..."

# Archivos TypeScript en client
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/'OFICIAL' | 'ONLINE'/'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'/g" {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/"OFICIAL" | "ONLINE"/"ASESORIA_LA_LLAVE" | "GESTORIA_ONLINE"/g' {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/value=\"OFICIAL\"/value=\"ASESORIA_LA_LLAVE\"/g" {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/value=\"ONLINE\"/value=\"GESTORIA_ONLINE\"/g" {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/'OFICIAL'/'ASESORIA_LA_LLAVE'/g" {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s/'ONLINE'/'GESTORIA_ONLINE'/g" {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/"OFICIAL"/"ASESORIA_LA_LLAVE"/g' {} \;
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/"ONLINE"/"GESTORIA_ONLINE"/g' {} \;

# Archivos TypeScript en server
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i "s/'OFICIAL' | 'ONLINE'/'ASESORIA_LA_LLAVE' | 'GESTORIA_ONLINE'/g" {} \;
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/"OFICIAL" | "ONLINE"/"ASESORIA_LA_LLAVE" | "GESTORIA_ONLINE"/g' {} \;
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i "s/'OFICIAL'/'ASESORIA_LA_LLAVE'/g" {} \;
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i "s/'ONLINE'/'GESTORIA_ONLINE'/g" {} \;
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/"OFICIAL"/"ASESORIA_LA_LLAVE"/g' {} \;
find server -type f \( -name "*.ts" -o -name "*.js" \) -exec sed -i 's/"ONLINE"/"GESTORIA_ONLINE"/g' {} \;

echo "✅ Reemplazo completado!"
echo ""
echo "📝 Archivos modificados:"
git diff --name-only 2>/dev/null || echo "(git no disponible)"
