-- ============================================
-- DIAGNÓSTICO Y SOLUCIÓN: Tarjetas No Aparecen
-- ============================================

USE area_privada;

-- ============================================
-- PASO 1: VERIFICAR CLIENTES CON MODELO 349
-- ============================================

SELECT 
    '=== CLIENTES CON MODELO 349 ===' AS info;

SELECT 
    c.id AS client_id,
    c.razonSocial AS cliente,
    c.nifCif,
    ctm.id AS model_id,
    ctm.model_number,
    ctm.period_type,
    ctm.is_active,
    DATE_FORMAT(ctm.start_date, '%Y-%m-%d') AS fecha_alta,
    DATE_FORMAT(ctm.end_date, '%Y-%m-%d') AS fecha_fin
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.model_number = '349'
ORDER BY c.razonSocial;

-- ============================================
-- PASO 2: VERIFICAR PERIODOS ABIERTOS DEL 349
-- ============================================

SELECT 
    '=== PERIODOS ABIERTOS DEL MODELO 349 ===' AS info;

SELECT 
    id AS period_id,
    modelCode,
    period,
    year,
    DATE_FORMAT(startDate, '%Y-%m-%d') AS fecha_inicio,
    DATE_FORMAT(endDate, '%Y-%m-%d') AS fecha_vencimiento,
    status,
    active
FROM tax_calendar
WHERE modelCode = '349'
  AND status = 'ABIERTO'
  AND active = true
ORDER BY year, period;

-- ============================================
-- PASO 3: VERIFICAR OBLIGACIONES EXISTENTES
-- ============================================

SELECT 
    '=== OBLIGACIONES DEL MODELO 349 ===' AS info;

SELECT 
    o.id AS obligation_id,
    c.razonSocial AS cliente,
    o.model_number,
    o.period,
    o.year,
    DATE_FORMAT(o.due_date, '%Y-%m-%d') AS fecha_vencimiento,
    o.status,
    tc.status AS estado_periodo
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
ORDER BY c.razonSocial, o.year, o.period;

-- ============================================
-- PASO 4: IDENTIFICAR CLIENTES SIN OBLIGACIONES
-- ============================================

SELECT 
    '=== CLIENTES CON MODELO 349 QUE NO TIENEN OBLIGACIONES ===' AS info;

SELECT 
    c.id AS client_id,
    c.razonSocial AS cliente,
    c.nifCif,
    ctm.model_number,
    'FALTA GENERAR OBLIGACIÓN' AS problema
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
LEFT JOIN client_tax_obligations o ON o.client_id = c.id AND o.model_number = '349'
WHERE ctm.model_number = '349'
  AND ctm.is_active = true
  AND o.id IS NULL
ORDER BY c.razonSocial;

-- ============================================
-- PASO 5: SOLUCIÓN - GENERAR OBLIGACIONES FALTANTES
-- ============================================

SELECT 
    '=== GENERANDO OBLIGACIONES FALTANTES ===' AS info;

-- Esta query genera obligaciones para clientes con modelo 349 activo
-- que NO tienen obligaciones en periodos ABIERTOS

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

-- ============================================
-- PASO 6: VERIFICAR RESULTADO
-- ============================================

SELECT 
    '=== VERIFICACIÓN FINAL: OBLIGACIONES CREADAS ===' AS info;

SELECT 
    c.razonSocial AS cliente,
    c.nifCif,
    o.model_number,
    o.period,
    o.year,
    DATE_FORMAT(o.due_date, '%Y-%m-%d') AS vencimiento,
    o.status,
    tc.status AS estado_periodo,
    DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i:%s') AS fecha_creacion
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
  AND tc.status = 'ABIERTO'
ORDER BY c.razonSocial;

-- ============================================
-- PASO 7: CONTAR RESULTADOS
-- ============================================

SELECT 
    '=== RESUMEN ===' AS info;

SELECT 
    COUNT(DISTINCT c.id) AS total_clientes_con_modelo_349,
    COUNT(DISTINCT o.client_id) AS total_clientes_con_obligaciones,
    COUNT(o.id) AS total_obligaciones_periodo_abierto
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
LEFT JOIN client_tax_obligations o ON o.client_id = c.id AND o.model_number = '349'
LEFT JOIN tax_calendar tc ON o.tax_calendar_id = tc.id AND tc.status = 'ABIERTO'
WHERE ctm.model_number = '349'
  AND ctm.is_active = true;

-- ============================================
-- COMANDOS ÚTILES PARA DEBUGGING
-- ============================================

-- Ver todos los periodos del 349
-- SELECT * FROM tax_calendar WHERE modelCode = '349' ORDER BY year, period;

-- Ver todos los modelos fiscales
-- SELECT c.razonSocial, ctm.* FROM client_tax_models ctm JOIN clients c ON ctm.client_id = c.id;

-- Ver todas las obligaciones
-- SELECT c.razonSocial, o.* FROM client_tax_obligations o JOIN clients c ON o.client_id = c.id;

-- Eliminar todas las obligaciones del 349 (para volver a generarlas)
-- DELETE FROM client_tax_obligations WHERE model_number = '349';

-- ============================================
-- EJECUCIÓN RÁPIDA
-- ============================================

/*
COPIA Y PEGA ESTOS COMANDOS EN ORDEN:

1. Ver diagnóstico:
   mysql -u app_area -p'masjic-natjew-9wyvBe' -D area_privada < DIAGNOSTICO_Y_SOLUCION_TARJETAS.sql

2. Si ves clientes sin obligaciones, el script ya las habrá generado automáticamente

3. Verifica en el frontend:
   - Recarga la página de Control de Impuestos
   - Deberías ver todas las tarjetas
*/
