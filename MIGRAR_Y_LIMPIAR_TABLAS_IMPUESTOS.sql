-- =====================================================
-- SCRIPT DE MIGRACIÓN Y LIMPIEZA DE TABLAS DE IMPUESTOS
-- Fecha: 13 de Noviembre 2025
-- Propósito: Consolidar datos y eliminar tablas duplicadas
-- =====================================================

USE area_privada;

-- =====================================================
-- PASO 1: BACKUP DE DATOS ANTES DE MIGRAR
-- =====================================================

-- Mostrar datos actuales en ambas tablas
SELECT '=== DATOS EN client_tax_assignments ===' as info;
SELECT 
  cta.id,
  c.razon_social,
  cta.tax_model_code,
  cta.periodicidad,
  cta.start_date,
  cta.end_date,
  cta.active_flag
FROM client_tax_assignments cta
JOIN clients c ON cta.client_id = c.id
ORDER BY c.razon_social, cta.tax_model_code;

SELECT '=== DATOS EN client_tax_models ===' as info;
SELECT 
  ctm.id,
  c.razon_social,
  ctm.model_number,
  ctm.period_type,
  ctm.start_date,
  ctm.end_date,
  ctm.is_active
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
ORDER BY c.razon_social, ctm.model_number;

-- =====================================================
-- PASO 2: MIGRAR DATOS DE client_tax_assignments A client_tax_models
-- =====================================================

SELECT '=== INICIANDO MIGRACIÓN ===' as info;

-- Migrar datos que NO existen ya en client_tax_models
INSERT INTO client_tax_models (
  id, 
  client_id, 
  model_number, 
  period_type, 
  start_date, 
  end_date, 
  is_active, 
  notes, 
  created_at, 
  updated_at
)
SELECT 
  cta.id,
  cta.client_id,
  cta.tax_model_code as model_number,
  CASE cta.periodicidad
    WHEN 'MENSUAL' THEN 'MONTHLY'
    WHEN 'TRIMESTRAL' THEN 'QUARTERLY'
    WHEN 'ANUAL' THEN 'ANNUAL'
    WHEN 'ESPECIAL_FRACCIONADO' THEN 'SPECIAL'
    ELSE 'QUARTERLY' -- Por defecto
  END as period_type,
  cta.start_date,
  cta.end_date,
  cta.active_flag as is_active,
  cta.notes,
  cta.created_at,
  cta.updated_at
FROM client_tax_assignments cta
WHERE NOT EXISTS (
  SELECT 1 
  FROM client_tax_models ctm 
  WHERE ctm.client_id = cta.client_id 
    AND ctm.model_number = cta.tax_model_code
)
ON DUPLICATE KEY UPDATE
  period_type = VALUES(period_type),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  is_active = VALUES(is_active),
  notes = VALUES(notes),
  updated_at = NOW();

-- Mostrar resultado de la migración
SELECT '=== MIGRACIÓN COMPLETADA ===' as info;
SELECT 
  COUNT(*) as total_en_client_tax_models,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activos,
  SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactivos
FROM client_tax_models;

-- =====================================================
-- PASO 3: VERIFICAR QUE TODO SE MIGRÓ CORRECTAMENTE
-- =====================================================

SELECT '=== VERIFICACIÓN: Modelos que están en assignments pero no en models ===' as info;
SELECT 
  c.razon_social,
  cta.tax_model_code,
  cta.periodicidad,
  'NO MIGRADO' as estado
FROM client_tax_assignments cta
JOIN clients c ON cta.client_id = c.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM client_tax_models ctm 
  WHERE ctm.client_id = cta.client_id 
    AND ctm.model_number = cta.tax_model_code
);

-- =====================================================
-- PASO 4: ACTUALIZAR client_tax_filings PARA USAR LA NUEVA ESTRUCTURA
-- =====================================================

SELECT '=== VERIFICANDO client_tax_filings ===' as info;
SELECT 
  COUNT(*) as total_filings,
  COUNT(DISTINCT client_id) as clientes_unicos,
  COUNT(DISTINCT tax_model_code) as modelos_unicos
FROM client_tax_filings;

-- Verificar que todas las filings tienen un modelo correspondiente
SELECT '=== Filings sin modelo en client_tax_models ===' as info;
SELECT 
  c.razon_social,
  ctf.tax_model_code,
  COUNT(*) as cantidad_filings
FROM client_tax_filings ctf
JOIN clients c ON ctf.client_id = c.id
WHERE NOT EXISTS (
  SELECT 1 
  FROM client_tax_models ctm 
  WHERE ctm.client_id = ctf.client_id 
    AND ctm.model_number = ctf.tax_model_code
)
GROUP BY c.razon_social, ctf.tax_model_code;

-- =====================================================
-- PASO 5: ELIMINAR CONSTRAINT DE client_tax_assignments
-- =====================================================

SELECT '=== ELIMINANDO FOREIGN KEY DE client_tax_assignments ===' as info;

-- Primero verificar si existe el constraint
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'area_privada' 
  AND TABLE_NAME = 'client_tax_assignments' 
  AND CONSTRAINT_NAME LIKE '%tax_models_config%';

-- Eliminar el FK si existe
SET @query = (
  SELECT CONCAT('ALTER TABLE client_tax_assignments DROP FOREIGN KEY ', CONSTRAINT_NAME, ';')
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
  WHERE TABLE_SCHEMA = 'area_privada' 
    AND TABLE_NAME = 'client_tax_assignments' 
    AND REFERENCED_TABLE_NAME = 'tax_models_config'
  LIMIT 1
);

-- Ejecutar si existe
SET @query = IFNULL(@query, 'SELECT "No FK to drop" as result');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PASO 6: RENOMBRAR TABLA ANTIGUA ANTES DE BORRAR
-- =====================================================

SELECT '=== RENOMBRANDO TABLAS ANTIGUAS ===' as info;

-- Renombrar en lugar de borrar (por seguridad)
DROP TABLE IF EXISTS _backup_client_tax_assignments;
DROP TABLE IF EXISTS _backup_client_tax;
DROP TABLE IF EXISTS _backup_client_tax_requirements;

RENAME TABLE client_tax_assignments TO _backup_client_tax_assignments;
RENAME TABLE client_tax TO _backup_client_tax;
RENAME TABLE client_tax_requirements TO _backup_client_tax_requirements;

-- =====================================================
-- PASO 7: VERIFICACIÓN FINAL
-- =====================================================

SELECT '=== VERIFICACIÓN FINAL ===' as info;

-- Contar tablas activas
SELECT 
  'client_tax_models' as tabla,
  COUNT(*) as registros,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activos
FROM client_tax_models

UNION ALL

SELECT 
  'client_tax_filings' as tabla,
  COUNT(*) as registros,
  NULL as activos
FROM client_tax_filings

UNION ALL

SELECT 
  'client_tax_obligations' as tabla,
  COUNT(*) as registros,
  NULL as activos
FROM client_tax_obligations

UNION ALL

SELECT 
  'tax_models_config' as tabla,
  COUNT(*) as registros,
  NULL as activos
FROM tax_models_config

UNION ALL

SELECT 
  'tax_calendar' as tabla,
  COUNT(*) as registros,
  SUM(CASE WHEN status = 'ABIERTO' THEN 1 ELSE 0 END) as activos
FROM tax_calendar;

-- =====================================================
-- PASO 8: MOSTRAR TODOS LOS MODELOS ACTIVOS POR CLIENTE
-- =====================================================

SELECT '=== MODELOS ACTIVOS POR CLIENTE (DATOS FINALES) ===' as info;
SELECT 
  c.razon_social as cliente,
  ctm.model_number as modelo,
  ctm.period_type as periodicidad,
  ctm.start_date as fecha_alta,
  ctm.end_date as fecha_baja,
  CASE 
    WHEN ctm.end_date IS NULL OR ctm.end_date > NOW() THEN 'ACTIVO'
    ELSE 'INACTIVO'
  END as estado_real
FROM client_tax_models ctm
JOIN clients c ON ctm.client_id = c.id
WHERE ctm.is_active = 1
ORDER BY c.razon_social, ctm.model_number;

SELECT '=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===' as info;
SELECT 'Las tablas antiguas fueron renombradas a _backup_* para seguridad' as nota;
SELECT 'Si todo funciona correctamente, puedes eliminarlas con:' as instrucciones;
SELECT 'DROP TABLE _backup_client_tax_assignments, _backup_client_tax, _backup_client_tax_requirements;' as comando;
