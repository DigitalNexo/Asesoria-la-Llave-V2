#!/bin/bash
# Script para registrar las rutas del sistema de impuestos

ROUTES_FILE="/root/www/Asesoria-la-Llave-V2/server/routes.ts"

echo "Registrando rutas del sistema de impuestos..."

# Verificar si las importaciones ya existen
if ! grep -q "import taxCalendarRouter from './routes/tax-calendar.routes';" "$ROUTES_FILE"; then
    # Agregar importaciones después de la línea de githubUpdatesRouter
    sed -i "/import githubUpdatesRouter from '\.\/routes\/github-updates\.routes';/a\\
import taxCalendarRouter from './routes/tax-calendar.routes';\\
import clientTaxRouter from './routes/client-tax.routes';\\
import taxObligationsRouter from './routes/tax-obligations.routes';" "$ROUTES_FILE"
    echo "✓ Importaciones agregadas"
else
    echo "✓ Las importaciones ya existen"
fi

# Verificar si las rutas ya están registradas
if ! grep -q "app.use('/api/tax-calendar', taxCalendarRouter);" "$ROUTES_FILE"; then
    # Agregar registros de rutas después de la línea de documents
    sed -i "/app\.use('\/api\/documents', documentsRouter);/a\\
\\
  // Rutas del sistema de impuestos\\
  app.use('/api/tax-calendar', taxCalendarRouter);\\
  app.use('/api/client-tax', clientTaxRouter);\\
  app.use('/api/tax-obligations', taxObligationsRouter);" "$ROUTES_FILE"
    echo "✓ Rutas registradas"
else
    echo "✓ Las rutas ya están registradas"
fi

echo "✅ Proceso completado"
