#!/bin/bash
# SCRIPT PARA ARREGLAR TODO EL SISTEMA DE IMPUESTOS DE UNA VEZ

set -e
cd /root/www/Asesoria-la-Llave-V2

echo "🚀 ARREGLANDO TODO EL SISTEMA DE IMPUESTOS..."
echo ""

# 1. Agregar campo periodType
echo "1️⃣ Agregando campo periodType a tax_calendar..."
mysql -u app_area -p'masjic-natjew-9wyvBe' area_privada << 'EOF'
ALTER TABLE tax_calendar ADD COLUMN IF NOT EXISTS periodType VARCHAR(20) NULL AFTER period;
UPDATE tax_calendar SET periodType = 'QUARTERLY' WHERE period REGEXP '^[1-4]T$' OR period REGEXP '^T[1-4]$';
UPDATE tax_calendar SET periodType = 'MONTHLY' WHERE period REGEXP '^(0[1-9]|1[0-2])$';
UPDATE tax_calendar SET periodType = 'ANNUAL' WHERE period IN ('ANUAL', 'YEARLY', 'YEAR');
EOF
echo "✅ Campo agregado"

# 2. Generar obligaciones faltantes
echo ""
echo "2️⃣ Generando obligaciones para todos los clientes con modelos activos..."
mysql -u app_area -p'masjic-natjew-9wyvBe' area_privada << 'EOF'
-- Generar obligaciones para periodos abiertos HOY
INSERT INTO client_tax_obligations (id, client_id, tax_calendar_id, model_number, period, year, due_date, status, created_at, updated_at)
SELECT 
    UUID() as id,
    ctm.client_id,
    tc.id as tax_calendar_id,
    tc.modelCode as model_number,
    tc.period,
    tc.year,
    tc.endDate as due_date,
    'PENDING' as status,
    NOW() as created_at,
    NOW() as updated_at
FROM client_tax_models ctm
INNER JOIN clients c ON c.id = ctm.client_id
INNER JOIN tax_calendar tc ON tc.modelCode = ctm.model_number
WHERE ctm.is_active = 1
  AND (ctm.end_date IS NULL OR ctm.end_date >= CURDATE())
  AND CURDATE() BETWEEN tc.startDate AND tc.endDate
  AND tc.active = 1
  AND NOT EXISTS (
      SELECT 1 FROM client_tax_obligations cto2
      WHERE cto2.client_id = ctm.client_id
        AND cto2.tax_calendar_id = tc.id
  );

SELECT 
    CONCAT('✅ Generadas ', COUNT(*), ' obligaciones') as resultado
FROM client_tax_obligations
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE);
EOF
echo "✅ Obligaciones generadas"

# 3. Generar Prisma Client
echo ""
echo "3️⃣ Generando Prisma Client..."
npx prisma generate > /dev/null 2>&1
echo "✅ Prisma Client generado"

# 4. Build optimizado
echo ""
echo "4️⃣ Compilando proyecto..."
npm run build > build.log 2>&1 &
BUILD_PID=$!
echo "⏳ Build en progreso (PID: $BUILD_PID)..."
echo "   Puedes ver el progreso con: tail -f build.log"

# 5. Esperar un momento al build
sleep 5

# 6. Reiniciar servicio
echo ""
echo "5️⃣ Reiniciando servicio..."
sudo systemctl restart asesoria-llave.service
sleep 3
echo "✅ Servicio reiniciado"

# 7. Verificar estado
echo ""
echo "6️⃣ Verificando estado del servicio..."
if sudo systemctl is-active --quiet asesoria-llave.service; then
    echo "✅ Servicio ACTIVO"
else
    echo "❌ Servicio NO ACTIVO - ver logs: sudo journalctl -u asesoria-llave.service -n 50"
fi

# 8. Mostrar resultado
echo ""
echo "7️⃣ Verificando tarjetas generadas..."
mysql -u app_area -p'masjic-natjew-9wyvBe' area_privada << 'EOF'
SELECT 
    c.razonSocial as Cliente,
    cto.model_number as Modelo,
    cto.period as Periodo,
    cto.year as Año,
    tc.endDate as 'Fecha Limite',
    DATEDIFF(tc.endDate, CURDATE()) as 'Dias Restantes',
    cto.status as Estado
FROM client_tax_obligations cto
JOIN clients c ON c.id = cto.client_id
JOIN tax_calendar tc ON tc.id = cto.tax_calendar_id
WHERE CURDATE() BETWEEN tc.startDate AND tc.endDate
ORDER BY c.razonSocial, cto.model_number;
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✨ TODO COMPLETADO"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Acciones realizadas:"
echo "  ✅ Campo periodType agregado"
echo "  ✅ Obligaciones generadas"
echo "  ✅ Prisma Client actualizado"
echo "  ⏳ Build en progreso"
echo "  ✅ Servicio reiniciado"
echo ""
echo "Próximos pasos:"
echo "  1. Espera a que el build termine: wait $BUILD_PID"
echo "  2. Reinicia servicio de nuevo: sudo systemctl restart asesoria-llave.service"
echo "  3. Accede a Control de Impuestos y verifica las tarjetas"
echo ""
echo "Para ver logs del build: tail -f build.log"
echo "Para ver logs del servicio: sudo journalctl -u asesoria-llave.service -f"
echo ""
