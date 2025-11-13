#!/bin/bash

# ============================================
# SCRIPT DE SOLUCIÓN RÁPIDA
# Genera obligaciones faltantes para tarjetas
# ============================================

echo "🔍 DIAGNOSTICANDO PROBLEMA DE TARJETAS..."
echo ""

DB_USER="app_area"
DB_PASS="masjic-natjew-9wyvBe"
DB_NAME="area_privada"

# ============================================
# 1. VERIFICAR CLIENTES CON MODELO 349
# ============================================

echo "📋 PASO 1: Clientes con modelo 349"
echo "======================================"

mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT 
    c.razonSocial AS cliente,
    ctm.model_number AS modelo,
    ctm.is_active AS activo,
    DATE_FORMAT(ctm.start_date, '%Y-%m-%d') AS fecha_alta
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.model_number = '349'
ORDER BY c.razonSocial;
"

echo ""

# ============================================
# 2. VERIFICAR PERIODOS ABIERTOS
# ============================================

echo "📅 PASO 2: Periodos ABIERTOS del modelo 349"
echo "======================================"

mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT 
    modelCode AS modelo,
    period AS periodo,
    year AS año,
    status AS estado,
    DATE_FORMAT(endDate, '%Y-%m-%d') AS vencimiento
FROM tax_calendar
WHERE modelCode = '349'
  AND status = 'ABIERTO'
  AND active = true;
"

echo ""

# ============================================
# 3. VERIFICAR OBLIGACIONES ACTUALES
# ============================================

echo "📊 PASO 3: Obligaciones existentes"
echo "======================================"

mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT 
    c.razonSocial AS cliente,
    o.period AS periodo,
    o.year AS año,
    o.status AS estado
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
WHERE o.model_number = '349';
"

echo ""

# ============================================
# 4. IDENTIFICAR PROBLEMA
# ============================================

echo "⚠️  PASO 4: Clientes SIN obligaciones (problema)"
echo "======================================"

CLIENTES_SIN_OBLIGACIONES=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -sN -e "
SELECT COUNT(DISTINCT c.id)
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
LEFT JOIN client_tax_obligations o ON o.client_id = c.id AND o.model_number = '349'
WHERE ctm.model_number = '349'
  AND ctm.is_active = true
  AND o.id IS NULL;
")

if [ "$CLIENTES_SIN_OBLIGACIONES" -gt 0 ]; then
    echo "❌ Encontrados $CLIENTES_SIN_OBLIGACIONES clientes sin obligaciones"
    echo ""
    mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
    SELECT 
        c.razonSocial AS cliente_sin_obligacion,
        ctm.model_number AS modelo,
        'FALTA GENERAR' AS problema
    FROM client_tax_models ctm
    JOIN clients c ON ctm.client_id = c.id
    LEFT JOIN client_tax_obligations o ON o.client_id = c.id AND o.model_number = '349'
    WHERE ctm.model_number = '349'
      AND ctm.is_active = true
      AND o.id IS NULL;
    "
    echo ""
else
    echo "✅ Todos los clientes tienen obligaciones"
    echo ""
fi

# ============================================
# 5. SOLUCIÓN - GENERAR OBLIGACIONES
# ============================================

if [ "$CLIENTES_SIN_OBLIGACIONES" -gt 0 ]; then
    echo "🔧 PASO 5: Generando obligaciones faltantes..."
    echo "======================================"
    
    mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
    INSERT INTO client_tax_obligations (id, client_id, tax_calendar_id, model_number, period, year, due_date, status, created_at, updated_at)
    SELECT 
        CONCAT('obl-', SUBSTRING(MD5(CONCAT(ctm.client_id, tc.id)), 1, 8), '-', UNIX_TIMESTAMP()),
        ctm.client_id,
        tc.id,
        tc.modelCode,
        tc.period,
        tc.year,
        tc.endDate,
        'PENDING',
        NOW(),
        NOW()
    FROM client_tax_models ctm
    CROSS JOIN tax_calendar tc
    WHERE ctm.model_number = '349'
      AND ctm.is_active = true
      AND tc.modelCode = '349'
      AND tc.status = 'ABIERTO'
      AND tc.active = true
      AND NOT EXISTS (
        SELECT 1 
        FROM client_tax_obligations o
        WHERE o.client_id = ctm.client_id
          AND o.tax_calendar_id = tc.id
      );
    "
    
    OBLIGACIONES_GENERADAS=$(mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -sN -e "
    SELECT ROW_COUNT();
    ")
    
    echo "✅ Generadas $OBLIGACIONES_GENERADAS obligaciones"
    echo ""
fi

# ============================================
# 6. VERIFICACIÓN FINAL
# ============================================

echo "✅ PASO 6: Verificación final"
echo "======================================"

mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT 
    c.razonSocial AS cliente,
    o.model_number AS modelo,
    o.period AS periodo,
    o.year AS año,
    o.status AS estado,
    tc.status AS estado_periodo
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
  AND tc.status = 'ABIERTO'
ORDER BY c.razonSocial;
"

echo ""

# ============================================
# 7. RESUMEN
# ============================================

echo "📈 RESUMEN FINAL"
echo "======================================"

mysql -u $DB_USER -p$DB_PASS -D $DB_NAME -e "
SELECT 
    'Clientes con modelo 349' AS concepto,
    COUNT(DISTINCT c.id) AS cantidad
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.model_number = '349'
  AND ctm.is_active = true

UNION ALL

SELECT 
    'Clientes con obligaciones' AS concepto,
    COUNT(DISTINCT o.client_id) AS cantidad
FROM client_tax_obligations o
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
  AND tc.status = 'ABIERTO'

UNION ALL

SELECT 
    'Total obligaciones periodo abierto' AS concepto,
    COUNT(o.id) AS cantidad
FROM client_tax_obligations o
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
  AND tc.status = 'ABIERTO';
"

echo ""
echo "✅ PROCESO COMPLETADO"
echo ""
echo "🔄 SIGUIENTE PASO:"
echo "   Recarga la página de Control de Impuestos"
echo "   Las tarjetas deberían aparecer ahora"
echo ""
