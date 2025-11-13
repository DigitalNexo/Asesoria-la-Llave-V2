-- ============================================
-- SCRIPT DE DATOS DE PRUEBA
-- Sistema de Control de Impuestos
-- ============================================

USE area_privada;

-- ============================================
-- 1. CALENDARIO FISCAL AEAT (tax_calendar)
-- ============================================

-- Limpiar datos de prueba anteriores (opcional)
-- DELETE FROM client_tax_obligations;
-- DELETE FROM client_tax_models;
-- DELETE FROM tax_calendar WHERE modelCode IN ('111', '303', '130');

-- Modelo 111 (Retenciones IRPF) - TRIMESTRAL
INSERT INTO tax_calendar (id, modelCode, period, year, startDate, endDate, status, days_to_start, days_to_end, active, locked, createdAt, updatedAt) VALUES
('tax-111-1t-2025', '111', '1T', 2025, '2025-01-01', '2025-04-20', 'ABIERTO', 0, 50, true, false, NOW(), NOW()),
('tax-111-2t-2025', '111', '2T', 2025, '2025-04-01', '2025-07-20', 'PENDIENTE', 90, 140, true, false, NOW(), NOW()),
('tax-111-3t-2025', '111', '3T', 2025, '2025-07-01', '2025-10-20', 'PENDIENTE', 180, 230, true, false, NOW(), NOW()),
('tax-111-4t-2025', '111', '4T', 2025, '2025-10-01', '2026-01-20', 'PENDIENTE', 270, 320, true, false, NOW(), NOW());

-- Modelo 303 (IVA) - TRIMESTRAL
INSERT INTO tax_calendar (id, modelCode, period, year, startDate, endDate, status, days_to_start, days_to_end, active, locked, createdAt, updatedAt) VALUES
('tax-303-1t-2025', '303', '1T', 2025, '2025-01-01', '2025-04-20', 'ABIERTO', 0, 50, true, false, NOW(), NOW()),
('tax-303-2t-2025', '303', '2T', 2025, '2025-04-01', '2025-07-20', 'PENDIENTE', 90, 140, true, false, NOW(), NOW()),
('tax-303-3t-2025', '303', '3T', 2025, '2025-07-01', '2025-10-20', 'PENDIENTE', 180, 230, true, false, NOW(), NOW()),
('tax-303-4t-2025', '303', '4T', 2025, '2025-10-01', '2026-01-20', 'PENDIENTE', 270, 320, true, false, NOW(), NOW());

-- Modelo 130 (IRPF Autónomos) - TRIMESTRAL
INSERT INTO tax_calendar (id, modelCode, period, year, startDate, endDate, status, days_to_start, days_to_end, active, locked, createdAt, updatedAt) VALUES
('tax-130-1t-2025', '130', '1T', 2025, '2025-01-01', '2025-04-20', 'ABIERTO', 0, 50, true, false, NOW(), NOW()),
('tax-130-2t-2025', '130', '2T', 2025, '2025-04-01', '2025-07-20', 'PENDIENTE', 90, 140, true, false, NOW(), NOW()),
('tax-130-3t-2025', '130', '3T', 2025, '2025-07-01', '2025-10-20', 'PENDIENTE', 180, 230, true, false, NOW(), NOW()),
('tax-130-4t-2025', '130', '4T', 2025, '2025-10-01', '2026-01-20', 'PENDIENTE', 270, 320, true, false, NOW(), NOW());

-- ============================================
-- 2. MODELOS FISCALES POR CLIENTE
-- ============================================

-- NOTA: Reemplaza 'CLIENT_ID_1', 'CLIENT_ID_2', 'CLIENT_ID_3' con IDs reales de tu tabla clients

-- Cliente 1 - Tiene modelo 111 y 303
INSERT INTO client_tax_models (id, client_id, model_number, period_type, start_date, end_date, is_active, notes, created_at, updated_at) VALUES
('ctm-1-111', 'CLIENT_ID_1', '111', 'QUARTERLY', '2024-01-01', NULL, true, 'Retenciones IRPF', NOW(), NOW()),
('ctm-1-303', 'CLIENT_ID_1', '303', 'QUARTERLY', '2024-01-01', NULL, true, 'IVA', NOW(), NOW());

-- Cliente 2 - Tiene modelo 130 (autónomo)
INSERT INTO client_tax_models (id, client_id, model_number, period_type, start_date, end_date, is_active, notes, created_at, updated_at) VALUES
('ctm-2-130', 'CLIENT_ID_2', '130', 'QUARTERLY', '2024-01-01', NULL, true, 'IRPF Autónomos', NOW(), NOW()),
('ctm-2-303', 'CLIENT_ID_2', '303', 'QUARTERLY', '2024-01-01', NULL, true, 'IVA', NOW(), NOW());

-- Cliente 3 - Tiene solo modelo 303
INSERT INTO client_tax_models (id, client_id, model_number, period_type, start_date, end_date, is_active, notes, created_at, updated_at) VALUES
('ctm-3-303', 'CLIENT_ID_3', '303', 'QUARTERLY', '2024-01-01', NULL, true, 'IVA', NOW(), NOW());

-- ============================================
-- 3. VERIFICAR DATOS INSERTADOS
-- ============================================

-- Ver periodos abiertos
SELECT * FROM tax_calendar WHERE status = 'ABIERTO';

-- Ver modelos activos por cliente
SELECT 
    ctm.client_id,
    c.razonSocial,
    c.nifCif,
    ctm.model_number,
    ctm.period_type,
    ctm.is_active
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.is_active = true;

-- ============================================
-- 4. COMANDO PARA OBTENER IDS REALES
-- ============================================

-- Ejecuta esto primero para obtener IDs de clientes reales:
SELECT id, razonSocial, nifCif FROM clients LIMIT 5;

-- Luego reemplaza CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3 en los INSERT de arriba

-- ============================================
-- 5. GENERAR OBLIGACIONES MANUALMENTE (SQL)
-- ============================================

-- Si quieres generar obligaciones manualmente sin usar la API:

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
JOIN tax_calendar tc ON ctm.model_number = tc.modelCode
WHERE tc.status = 'ABIERTO'
  AND ctm.is_active = true
  AND ctm.start_date <= NOW()
  AND (ctm.end_date IS NULL OR ctm.end_date >= NOW())
  AND NOT EXISTS (
    SELECT 1 
    FROM client_tax_obligations cto 
    WHERE cto.client_id = ctm.client_id 
      AND cto.tax_calendar_id = tc.id
  );

-- ============================================
-- 6. QUERIES ÚTILES PARA TESTING
-- ============================================

-- Ver obligaciones de periodos abiertos
SELECT 
    o.id,
    c.razonSocial AS cliente,
    c.nifCif,
    o.model_number,
    o.period,
    o.year,
    o.due_date,
    o.status,
    tc.status AS periodo_status
FROM client_tax_obligations o
JOIN clients c ON o.client_id = c.id
JOIN tax_calendar tc ON o.tax_calendar_id = tc.id
WHERE tc.status = 'ABIERTO'
ORDER BY o.due_date ASC;

-- Ver clientes con modelo 303 activo
SELECT 
    c.id,
    c.razonSocial,
    c.nifCif,
    ctm.model_number,
    ctm.period_type,
    ctm.start_date,
    ctm.is_active
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.model_number = '303'
  AND ctm.is_active = true;

-- Contar obligaciones por estado
SELECT 
    status,
    COUNT(*) as total
FROM client_tax_obligations
GROUP BY status;

-- Ver estadísticas por cliente
SELECT 
    c.razonSocial,
    COUNT(o.id) as total_obligaciones,
    SUM(CASE WHEN o.status = 'PENDING' THEN 1 ELSE 0 END) as pendientes,
    SUM(CASE WHEN o.status = 'COMPLETED' THEN 1 ELSE 0 END) as completadas,
    SUM(CASE WHEN o.status = 'OVERDUE' THEN 1 ELSE 0 END) as vencidas
FROM clients c
LEFT JOIN client_tax_obligations o ON c.id = o.client_id
GROUP BY c.id, c.razonSocial
HAVING total_obligaciones > 0;

-- ============================================
-- 7. COMANDOS DE LIMPIEZA (DESARROLLO)
-- ============================================

-- ⚠️ CUIDADO: Estos comandos ELIMINAN datos

-- Eliminar todas las obligaciones
-- DELETE FROM client_tax_obligations;

-- Eliminar modelos de clientes
-- DELETE FROM client_tax_models;

-- Eliminar periodos del calendario
-- DELETE FROM tax_calendar WHERE year = 2025;

-- Resetear todo el sistema de impuestos
-- DELETE FROM client_tax_obligations;
-- DELETE FROM client_tax_models;
-- DELETE FROM tax_calendar;

-- ============================================
-- 8. ABRIR/CERRAR PERIODOS
-- ============================================

-- Abrir el periodo 1T 2025 del modelo 111
UPDATE tax_calendar 
SET status = 'ABIERTO', updatedAt = NOW()
WHERE modelCode = '111' AND period = '1T' AND year = 2025;

-- Cerrar el periodo 1T 2025 del modelo 111
UPDATE tax_calendar 
SET status = 'CERRADO', updatedAt = NOW()
WHERE modelCode = '111' AND period = '1T' AND year = 2025;

-- Abrir todos los periodos del 1T 2025
UPDATE tax_calendar 
SET status = 'ABIERTO', updatedAt = NOW()
WHERE period = '1T' AND year = 2025;

-- ============================================
-- 9. COMPLETAR OBLIGACIONES
-- ============================================

-- Marcar una obligación como completada
UPDATE client_tax_obligations 
SET 
    status = 'COMPLETED',
    completed_at = NOW(),
    completed_by = 'USER_ID_AQUI',
    amount = 1500.00,
    updated_at = NOW()
WHERE id = 'obl-xxx';

-- Marcar obligaciones vencidas
UPDATE client_tax_obligations 
SET status = 'OVERDUE', updated_at = NOW()
WHERE status = 'PENDING' 
  AND due_date < NOW();

-- ============================================
-- 10. SCRIPT COMPLETO DE SETUP INICIAL
-- ============================================

/*
PASOS PARA CONFIGURAR EL SISTEMA:

1. Ejecutar los INSERT de tax_calendar (periodos fiscales)
2. Obtener IDs reales de clientes: SELECT id FROM clients LIMIT 5;
3. Reemplazar CLIENT_ID_X en los INSERT de client_tax_models
4. Ejecutar los INSERT de client_tax_models
5. Llamar a la API para generar obligaciones:
   POST /api/tax-obligations/generate-auto
6. Verificar con: SELECT * FROM client_tax_obligations;
7. Frontend ya mostrará las tarjetas automáticamente
*/

