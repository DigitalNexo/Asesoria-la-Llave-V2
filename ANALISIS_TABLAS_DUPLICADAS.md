# Análisis de Tablas Duplicadas en el Sistema de Impuestos

## Fecha: 13 de Noviembre 2025

## Problema Principal
El sistema tiene **MÚLTIPLES TABLAS** guardando la misma información de modelos fiscales de clientes, causando inconsistencias y confusión.

---

## Tablas Duplicadas y Estado

### 1. **client_tax_assignments** ✅ SE USA (Tabla Legacy/Antigua)
- **Registros**: 8
- **Campos**: `tax_model_code`, `periodicidad` (MENSUAL, TRIMESTRAL, ANUAL, ESPECIAL_FRACCIONADO)
- **Uso en Código**:
  - `server/routes.ts` - algunas rutas
  - `server/prisma-storage.ts` - métodos legacy
  - `server/services/gestoria-budget-conversion-service.ts`
- **Estado**: DEBE MIGRARSE A `client_tax_models` Y ELIMINARSE

### 2. **client_tax_models** ✅ SE USA (Tabla Nueva/Correcta)
- **Registros**: 5
- **Campos**: `model_number`, `period_type` (MONTHLY, QUARTERLY, ANNUAL)
- **Uso en Código**:
  - `server/services/client-tax.service.ts` - TODO el servicio
- **Estado**: **ESTA ES LA TABLA PRINCIPAL QUE DEBE USARSE**

### 3. **client_tax** ❌ NO SE USA (VACÍA)
- **Registros**: 0
- **Descripción**: Parece ser una tabla legacy para guardar tarjetas/filings
- **Estado**: DEBE ELIMINARSE (reemplazada por `client_tax_filings`)

### 4. **client_tax_requirements** ❌ NO SE USA (VACÍA)
- **Registros**: 0
- **Descripción**: Requisitos fiscales de clientes (nunca implementada)
- **Estado**: DEBE ELIMINARSE

### 5. **client_tax_obligations** ✅ SE USA
- **Registros**: 5
- **Descripción**: Obligaciones fiscales generadas del calendario
- **Estado**: MANTENER

### 6. **client_tax_filings** ✅ SE USA (Tarjetas)
- **Registros**: 97
- **Descripción**: Las "tarjetas" de control de impuestos
- **Estado**: MANTENER

### 7. **tax_periods** ✅ SE USA (Legacy)
- **Registros**: 12
- **Descripción**: Periodos fiscales antiguos
- **Estado**: REVISAR SI MIGRAR A `fiscal_periods` o mantener

### 8. **tax_models_config** ✅ SE USA
- **Registros**: 14
- **Descripción**: Configuración de modelos (111, 303, etc.)
- **Estado**: MANTENER

---

## Diferencias Críticas Entre Tablas

### client_tax_assignments vs client_tax_models

| Aspecto | client_tax_assignments | client_tax_models |
|---------|----------------------|------------------|
| Campo modelo | `tax_model_code` | `model_number` |
| Campo periodicidad | `periodicidad` (ENUM español) | `period_type` (string inglés) |
| Valores periodicidad | MENSUAL, TRIMESTRAL, ANUAL, ESPECIAL_FRACCIONADO | MONTHLY, QUARTERLY, ANNUAL |
| Estado activo | `active_flag` (Boolean) | `is_active` (Boolean) |
| Fecha inicio | `startDate` | `start_date` |
| Fecha fin | `endDate` | `end_date` |
| Relación con config | SÍ (FK a tax_models_config) | NO |
| Constraint único | clientId + taxModelCode | client_id + model_number |

---

## Plan de Acción

### Paso 1: Migrar datos de `client_tax_assignments` a `client_tax_models`
```sql
-- Convertir periodicidad española a inglés
INSERT INTO client_tax_models (id, client_id, model_number, period_type, start_date, end_date, is_active, notes, created_at, updated_at)
SELECT 
  id,
  client_id,
  tax_model_code as model_number,
  CASE periodicidad
    WHEN 'MENSUAL' THEN 'MONTHLY'
    WHEN 'TRIMESTRAL' THEN 'QUARTERLY'
    WHEN 'ANUAL' THEN 'ANNUAL'
    WHEN 'ESPECIAL_FRACCIONADO' THEN 'SPECIAL'
  END as period_type,
  start_date,
  end_date,
  active_flag as is_active,
  notes,
  created_at,
  updated_at
FROM client_tax_assignments
WHERE NOT EXISTS (
  SELECT 1 FROM client_tax_models ctm 
  WHERE ctm.client_id = client_tax_assignments.client_id 
  AND ctm.model_number = client_tax_assignments.tax_model_code
);
```

### Paso 2: Actualizar todo el código para usar `client_tax_models`
- Reemplazar referencias en `server/routes.ts`
- Reemplazar referencias en `server/prisma-storage.ts`
- Reemplazar referencias en servicios

### Paso 3: Eliminar tablas no usadas
```sql
DROP TABLE IF EXISTS client_tax;
DROP TABLE IF EXISTS client_tax_requirements;
-- Después de migrar:
DROP TABLE IF EXISTS client_tax_assignments;
```

### Paso 4: Actualizar schema.prisma
- Eliminar modelos de tablas borradas
- Actualizar relaciones

### Paso 5: Corregir lógica de filtrado
El problema actual de las tarjetas faltantes es porque:
1. Se están usando DOS tablas diferentes
2. El filtrado mezcla datos de ambas tablas
3. La conversión de periodicidad (español/inglés) causa problemas

---

## Recomendación Final

**USAR SOLO `client_tax_models`** como fuente única de verdad para:
- Modelos fiscales asignados a clientes
- Periodicidad de cada modelo
- Fechas de alta/baja
- Estado activo/inactivo

Y eliminar completamente:
- ❌ `client_tax_assignments`
- ❌ `client_tax`
- ❌ `client_tax_requirements`
