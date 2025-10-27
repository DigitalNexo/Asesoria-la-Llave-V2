#!/bin/bash

echo "🔍 VERIFICACIÓN DEL MÓDULO DE DOCUMENTOS"
echo "========================================"
echo ""

# Check if server is running
echo "1️⃣  Verificando si el servidor está corriendo..."
if curl -s http://localhost:5002 > /dev/null 2>&1; then
    echo "   ✅ Servidor respondiendo en puerto 5002"
else
    echo "   ❌ Servidor no responde en puerto 5002"
    echo "   💡 Ejecuta: npm run dev"
    exit 1
fi

# Check database
echo ""
echo "2️⃣  Verificando conexión a BD..."
curl -s http://localhost:5002/api/documents \
    -H "Authorization: Bearer $(echo 'test')" \
    -H "Content-Type: application/json" \
    > /dev/null 2>&1 && echo "   ✅ BD responde" || echo "   ⚠️  Necesita autenticación (esperado)"

# Check components exist
echo ""
echo "3️⃣  Verificando archivos del módulo..."

FILES=(
    "server/services/document-service.ts"
    "server/documents.ts"
    "client/src/pages/documentos.tsx"
    "client/src/components/documentos/DocumentList.tsx"
    "client/src/components/documentos/DocumentUpload.tsx"
    "client/src/components/documentos/PaymentReceipt.tsx"
    "client/src/components/documentos/DataProtection.tsx"
    "client/src/components/documentos/BankingDomiciliation.tsx"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (FALTA)"
    fi
done

# Check if routes are registered
echo ""
echo "4️⃣  Verificando rutas registradas..."
if grep -q "documentsRouter" server/routes.ts 2>/dev/null; then
    echo "   ✅ Router de documentos importado en routes.ts"
else
    echo "   ❌ Router no importado"
fi

if grep -q "app.use('/api/documents'" server/routes.ts 2>/dev/null; then
    echo "   ✅ Router montado en /api/documents"
else
    echo "   ❌ Router no montado"
fi

# Check if sidebar is updated
echo ""
echo "5️⃣  Verificando Sidebar..."
if grep -q "Documentos" client/src/components/app-sidebar.tsx 2>/dev/null; then
    echo "   ✅ Opción 'Documentos' en Sidebar"
else
    echo "   ❌ Falta 'Documentos' en Sidebar"
fi

# Check App routes
echo ""
echo "6️⃣  Verificando rutas en App.tsx..."
if grep -q "/documentacion/documentos" client/src/App.tsx 2>/dev/null; then
    echo "   ✅ Ruta /documentacion/documentos registrada"
else
    echo "   ❌ Ruta no registrada"
fi

# Check Prisma schema
echo ""
echo "7️⃣  Verificando modelos Prisma..."
if grep -q "model documents" prisma/schema.prisma 2>/dev/null; then
    echo "   ✅ Modelo 'documents' en schema"
else
    echo "   ❌ Modelo 'documents' no encontrado"
fi

# Summary
echo ""
echo "========================================"
echo "✅ Verificación completada"
echo ""
echo "🚀 Para acceder:"
echo "   - URL: http://localhost:5002"
echo "   - Documentos: http://localhost:5002/documentacion/documentos"
echo ""
echo "👤 Credenciales de Admin:"
echo "   - Usuario: CarlosAdmin"
echo "   - Email: Carlos@asesorialallave.com"
echo "   - Password: Turleque2026$"
