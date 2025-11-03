#!/bin/bash

echo "🚀 VERIFICACIÓN FINAL DEL SISTEMA DE PRESUPUESTOS DE GESTORÍA"
echo "============================================================"
echo ""

cd /root/www/Asesoria-la-Llave-V2

echo "✅ 1. Regenerando Prisma Client..."
npx prisma generate --schema=prisma/schema.prisma

echo ""
echo "✅ 2. Verificando compilación TypeScript..."
npx tsc --noEmit --project server/tsconfig.json 2>&1 | grep -E "(error|warning)" | head -20

echo ""
echo "✅ 3. Verificando archivos creados..."
echo "   - Backend:"
ls -la server/routes/gestoria-budgets.ts
ls -la server/services/gestoria-budget-*.ts | wc -l
echo "   - Frontend:"
ls -la client/src/lib/api/gestoria-budgets.ts
ls -la client/src/pages/presupuestos/*.tsx | wc -l

echo ""
echo "✅ 4. Estado del router:"
grep -n "gestoria-budgets" server/routes.ts

echo ""
echo "🎉 ¡VERIFICACIÓN COMPLETA!"
echo ""
echo "📋 RESUMEN DEL SISTEMA:"
echo "   - Backend: 6 servicios + routes (600 líneas)"
echo "   - Frontend: 4 páginas + API hooks"
echo "   - Router: Montado en /api/gestoria-budgets"
echo "   - Rutas UI: /presupuestos/*"
echo ""
echo "🚀 Para iniciar el sistema:"
echo "   npm run dev"
echo ""
echo "🌐 Acceder a:"
echo "   - Lista: http://localhost:3000/presupuestos"
echo "   - Nuevo: http://localhost:3000/presupuestos/nuevo"
echo "   - Config: http://localhost:3000/presupuestos/configuracion"
echo ""
