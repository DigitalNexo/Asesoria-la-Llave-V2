-- Script para agregar el campo period_type a la tabla tax_calendar
-- Este campo indica si el período es MONTHLY, QUARTERLY o ANNUAL

USE area_privada;

-- Agregar columna period_type
ALTER TABLE tax_calendar 
ADD COLUMN period_type VARCHAR(20) NULL 
COMMENT 'Tipo de período: MONTHLY, QUARTERLY, ANNUAL'
AFTER period;

-- Actualizar períodos existentes basándose en el campo 'period'
-- Trimestres (T1, T2, T3, T4, 1T, 2T, 3T, 4T)
UPDATE tax_calendar 
SET period_type = 'QUARTERLY'
WHERE period REGEXP '^[1-4]T$' OR period REGEXP '^T[1-4]$';

-- Meses (01, 02, 03, ..., 12, ENE, FEB, MAR, etc.)
UPDATE tax_calendar 
SET period_type = 'MONTHLY'
WHERE period REGEXP '^(0[1-9]|1[0-2])$' 
   OR period IN ('ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC')
   OR period IN ('ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE');

-- Anuales (ANUAL, YEARLY, año completo)
UPDATE tax_calendar 
SET period_type = 'ANNUAL'
WHERE period IN ('ANUAL', 'YEARLY', 'YEAR') OR period = CAST(year AS CHAR);

-- Verificar resultados
SELECT 
    period_type,
    COUNT(*) as total,
    GROUP_CONCAT(DISTINCT period ORDER BY period SEPARATOR ', ') as ejemplos_periodos
FROM tax_calendar
GROUP BY period_type;

SELECT 'Actualización completada' as status;
