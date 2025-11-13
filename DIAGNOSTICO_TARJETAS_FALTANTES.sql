-- SCRIPT DE DIAGNÓSTICO: Por qué no aparecen todas las tarjetas
-- Ejecutar paso a paso para identificar el problema

USE area_privada;

-- ============================================
-- 1. VERIFICAR CLIENTES CON MODELO 349
-- ============================================

-- Mostrar todos los clientes que tienen modelo 349
SELECT 
    c.id as client_id,
    c.razonSocial AS cliente,
    c.nifCif,
    ctm.id as model_id,
    ctm.model_number,
    ctm.period_type,
    ctm.is_active,
    ctm.start_date,
    ctm.end_date,
    CASE 
        WHEN ctm.end_date IS NULL THEN 'SIN FECHA FIN'
        WHEN ctm.end_date >= NOW() THEN 'VIGENTE'
        ELSE 'VENCIDO'
    END as vigencia
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.model_number = '349'
ORDER BY c.razonSocial;

-- ============================================
-- 2. VERIFICAR PERIODOS ABIERTOS DEL 349
-- ============================================

-- Mostrar periodos ABIERTOS del modelo 349
SELECT 
    id,
    modelCode,
    period,
    year,
    startDate,
    endDate,
    status,
    active,
    locked
FROM tax_calendar 
WHERE modelCode = '349' 
  AND status = 'ABIERTO'
  AND active = 1
ORDER BY year, period;

-- ============================================
-- 3. VERIFICAR OBLIGACIONES EXISTENTES
-- ============================================

-- Mostrar obligaciones del modelo 349
SELECT 
    o.id,
    c.razonSocial as cliente,
    c.nifCif,
    o.model_number,
    o.period,
    o.year,
    o.due_date,
    o.status,
    tc.status as periodo_status
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE o.model_number = '349'
ORDER BY c.razonSocial, o.year, o.period;

-- ============================================
-- 4. OBLIGACIONES DE PERIODOS ABIERTOS
-- ============================================

-- Esta es la query que usa el frontend
-- Debe mostrar TODAS las tarjetas que aparecen en Control de Impuestos
SELECT 
    o.id as obligation_id,
    c.id as client_id,
    c.razonSocial as cliente,
    c.nifCif,
    c.tipo as client_type,
    o.model_number,
    o.period,
    o.year,
    o.due_date,
    o.status as obligation_status,
    tc.status as period_status,
    tc.startDate,
    tc.endDate
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE tc.status = 'ABIERTO'
  AND tc.active = 1
  AND o.model_number = '349'
ORDER BY o.due_date ASC, c.razonSocial;

-- ============================================
-- 5. DETECTAR CLIENTES SIN OBLIGACIONES
-- ============================================

-- Clientes con modelo 349 ACTIVO que NO tienen obligaciones para periodos ABIERTOS
SELECT DISTINCT
    c.id as client_id,
    c.razonSocial as cliente_sin_obligacion,
    c.nifCif,
    ctm.model_number,
    ctm.is_active,
    ctm.start_date,
    'FALTA OBLIGACION' as problema
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
CROSS JOIN tax_calendar tc
WHERE ctm.model_number = '349'
  AND ctm.is_active = 1
  AND tc.modelCode = '349'
  AND tc.status = 'ABIERTO'
  AND tc.active = 1
  AND ctm.start_date <= NOW()
  AND (ctm.end_date IS NULL OR ctm.end_date >= NOW())
  AND NOT EXISTS (
    SELECT 1 
    FROM client_tax_obligations o 
    WHERE o.client_id = c.id 
      AND o.tax_calendar_id = tc.id
  );

-- ============================================
-- 6. RESUMEN POR CLIENTE
-- ============================================

-- Resumen: cuántas obligaciones tiene cada cliente del 349
SELECT 
    c.id,
    c.razonSocial,
    c.nifCif,
    COUNT(ctm.id) as modelos_349_totales,
    SUM(CASE WHEN ctm.is_active = 1 THEN 1 ELSE 0 END) as modelos_349_activos,
    COUNT(o.id) as obligaciones_totales,
    COUNT(CASE WHEN tc.status = 'ABIERTO' THEN o.id END) as obligaciones_periodos_abiertos
FROM clients c
LEFT JOIN client_tax_models ctm ON c.id = ctm.client_id AND ctm.model_number = '349'
LEFT JOIN client_tax_obligations o ON c.id = o.client_id AND o.model_number = '349'
LEFT JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE ctm.id IS NOT NULL  -- Solo clientes que tienen modelo 349
GROUP BY c.id, c.razonSocial, c.nifCif
ORDER BY c.razonSocial;

-- ============================================
-- 7. COMANDOS PARA REPARAR (SI ES NECESARIO)
-- ============================================

-- Si encuentras clientes sin obligaciones, puedes repararlos manualmente:

-- Generar obligaciones para un cliente específico (reemplaza 'CLIENT_ID_AQUI'):
/*
INSERT INTO client_tax_obligations (id, client_id, tax_calendar_id, model_number, period, year, due_date, status, created_at, updated_at)
SELECT 
    CONCAT('obl-', ctm.client_id, '-', tc.id),
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
WHERE ctm.client_id = 'CLIENT_ID_AQUI'
  AND ctm.model_number = '349'
  AND ctm.is_active = 1
  AND tc.modelCode = '349'
  AND tc.status = 'ABIERTO'
  AND tc.active = 1
  AND ctm.start_date <= NOW()
  AND (ctm.end_date IS NULL OR ctm.end_date >= NOW())
  AND NOT EXISTS (
    SELECT 1 
    FROM client_tax_obligations o 
    WHERE o.client_id = ctm.client_id 
      AND o.tax_calendar_id = tc.id
  );
*/

-- ============================================
-- 8. VERIFICAR ESTADO DEL SISTEMA
-- ============================================

-- Verificar si las tablas existen y tienen datos
SELECT 'tax_calendar' as tabla, COUNT(*) as registros FROM tax_calendar
UNION ALL
SELECT 'client_tax_models' as tabla, COUNT(*) as registros FROM client_tax_models
UNION ALL  
SELECT 'client_tax_obligations' as tabla, COUNT(*) as registros FROM client_tax_obligations;

-- Verificar modelos únicos en el sistema
SELECT DISTINCT model_number, COUNT(*) as clientes_con_modelo
FROM client_tax_models 
WHERE is_active = 1
GROUP BY model_number
ORDER BY model_number;

-- Verificar estados de periodos
SELECT modelCode, status, COUNT(*) as periodos
FROM tax_calendar
GROUP BY modelCode, status
ORDER BY modelCode, status;
