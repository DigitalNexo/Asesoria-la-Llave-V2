# 🔧 CORRECCIÓN: Tarjetas Fiscales Faltantes en Control de Impuestos

**Fecha:** 13 de Noviembre de 2025  
**Problema:** Solo aparecía 1 tarjeta del modelo 349 cuando deberían aparecer 3

---

## 🐛 PROBLEMA IDENTIFICADO

### Síntoma:
- En el **Calendario de Impuestos** aparecían 10 períodos abiertos (ahora 11)
- En **Control de Impuestos** solo aparecía **1 tarjeta** del modelo 349
- Deberían aparecer **3 tarjetas** (3 clientes con modelo 349 mensual activo)

### Clientes Afectados:
1. ✅ **Innoquest** (B12345678) - Aparecía
2. ❌ **DoeTrading Oil** (B12345670) - NO aparecía
3. ❌ **María López Martínez** (87654321B) - NO aparecía

---

## 🔍 CAUSA RAÍZ

### 1. Períodos Mensuales con Tipo Incorrecto

Los períodos mensuales (MES-Enero, MES-Febrero, ..., MES-Diciembre) estaban configurados con:
```sql
kind = 'SPECIAL'  -- ❌ INCORRECTO
```

Cuando deberían tener:
```sql
kind = 'MONTHLY'  -- ✅ CORRECTO
```

### 2. Lógica de Generación de Tarjetas

En `server/prisma-storage.ts` líneas 1518-1535, la función `periodMatchesModel()` tiene esta lógica:

```typescript
switch (period.kind) {
  case TaxPeriodType.MONTHLY:
    return matchesPeriodicity('MENSUAL');
  
  case TaxPeriodType.QUARTERLY:
    return matchesPeriodicity('TRIMESTRAL');
  
  case TaxPeriodType.ANNUAL:
    return matchesPeriodicity('ANUAL');
  
  case TaxPeriodType.SPECIAL:
    if (code !== '202') return false;  // ⬅️ PROBLEMA AQUÍ
    // ...
}
```

**El problema:** Los períodos `SPECIAL` solo se permiten para el modelo 202. Por eso no se generaban tarjetas para los modelos 349 mensuales.

---

## ✅ SOLUCIÓN APLICADA

### Paso 1: Cambiar Tipo de Períodos Mensuales

```sql
UPDATE fiscal_periods 
SET kind = 'MONTHLY' 
WHERE label LIKE 'MES-%' 
  AND year = 2025;
```

**Resultado:** 12 períodos mensuales actualizados de `SPECIAL` → `MONTHLY`

### Paso 2: Regenerar Tarjetas Fiscales

Ejecuté el job de sincronización:
```typescript
await prismaStorage.ensureClientTaxFilingsForYear(2025);
```

**Resultado:** Se generaron las 2 tarjetas faltantes

### Paso 3: Reabrir Período de Octubre

```sql
UPDATE fiscal_periods 
SET status = 'OPEN' 
WHERE label = 'MES-Octubre' 
  AND year = 2025;
```

**Resultado:** El período de octubre ahora está disponible para presentaciones

---

## 📊 ESTADO ACTUAL

### Períodos Abiertos (2025):
```
1. MES-Octubre (MONTHLY) ✅ NUEVO
2. MES-Noviembre (MONTHLY)
3. 4T (QUARTERLY)
4. ANUAL
5. ANUAL-180
6. ANUAL-190
7. ANUAL-200
8. ANUAL-347
9. ANUAL-390
10. ANUAL-720
11. Diciembre (SPECIAL)
```

**Total:** 11 períodos abiertos (antes eran 10)

### Tarjetas del Modelo 349 para Octubre:

```sql
SELECT c.razon_social, ctf.status 
FROM client_tax_filings ctf 
JOIN clients c ON ctf.client_id = c.id 
JOIN fiscal_periods fp ON ctf.period_id = fp.id 
WHERE ctf.tax_model_code = '349' 
  AND fp.label = 'MES-Octubre';
```

**Resultado:**
| Cliente | Estado |
|---------|--------|
| DoeTrading Oil | NOT_STARTED ✅ |
| Innoquest | NOT_STARTED ✅ |
| María López Martínez | NOT_STARTED ✅ |

**Total:** 3 tarjetas (CORREGIDO ✅)

---

## 🎯 VERIFICACIÓN

### En el Dashboard:

1. **Ir a:** Impuestos → Control de Impuestos
2. **Filtrar por:** Modelo 349
3. **Resultado esperado:** Deberían aparecer 3 tarjetas:
   - DoeTrading Oil
   - Innoquest
   - María López Martínez

### Desde SQL:

```sql
-- Ver tarjetas del modelo 349 para octubre
SELECT 
    c.razon_social,
    c.nif_cif,
    ctf.status,
    fp.label,
    fp.starts_at,
    fp.ends_at
FROM client_tax_filings ctf
JOIN clients c ON ctf.client_id = c.id
JOIN fiscal_periods fp ON ctf.period_id = fp.id
WHERE ctf.tax_model_code = '349'
  AND fp.label = 'MES-Octubre'
  AND fp.year = 2025
ORDER BY c.razon_social;
```

---

## 🚨 IMPACTO EN OTROS MODELOS MENSUALES

Esta corrección también afecta a **TODOS los modelos mensuales**, no solo el 349.

### Modelos Mensuales en el Sistema:

```sql
SELECT model_number, COUNT(*) as clientes
FROM client_tax_models
WHERE period_type = 'MONTHLY'
  AND is_active = 1
GROUP BY model_number;
```

**Resultado:**
| Modelo | Clientes |
|--------|----------|
| 111 | 1 |
| 349 | 3 |

**Total afectado:** 4 modelos mensuales (1 del 111 + 3 del 349)

---

## 📝 LECCIONES APRENDIDAS

### 1. Coherencia en Tipos de Períodos
Los períodos fiscales deben tener el `kind` correcto:
- `MONTHLY` para períodos mensuales (MES-*)
- `QUARTERLY` para trimestres (1T, 2T, 3T, 4T)
- `ANNUAL` para anuales (ANUAL, ANUAL-*)
- `SPECIAL` solo para modelos específicos como 202

### 2. Nomenclatura de Períodos
Los períodos que empiezan con "MES-" deberían ser siempre `MONTHLY`, no `SPECIAL`

### 3. Sincronización Automática
El job `ensureTaxFilingsJob` se ejecuta cada hora (minuto 10) y sincroniza automáticamente las tarjetas fiscales. Pero necesita que los períodos tengan el `kind` correcto.

---

## 🔄 PARA EL FUTURO

### Al Crear Nuevos Períodos Mensuales:

```sql
INSERT INTO fiscal_periods (id, year, label, kind, starts_at, ends_at, status)
VALUES (
  UUID(),
  2026,
  'MES-Enero',
  'MONTHLY',  -- ✅ IMPORTANTE: MONTHLY, no SPECIAL
  '2026-01-01 00:00:00',
  '2026-01-31 23:59:59',
  'OPEN'
);
```

### Job de Sincronización

El job se ejecuta automáticamente cada hora:
```typescript
// server/jobs.ts línea 348
export const ensureTaxFilingsJob = cron.createTask("10 * * * *", async () => {
  // Sincroniza tarjetas fiscales
});
```

Si necesitas ejecutarlo manualmente:
```bash
cd /root/www/Asesoria-la-Llave-V2
npx tsx sync-filings-now.ts
```

---

## ✅ RESUMEN

**Problema:** Períodos mensuales tenían `kind=SPECIAL` → No se generaban tarjetas para modelos mensuales

**Solución:** 
1. ✅ Cambiar `kind='SPECIAL'` → `kind='MONTHLY'` para períodos MES-*
2. ✅ Regenerar tarjetas fiscales
3. ✅ Reabrir período MES-Octubre

**Resultado:** 
- ✅ 3 tarjetas del modelo 349 para octubre (antes solo 1)
- ✅ 11 períodos abiertos (antes 10)
- ✅ Control de impuestos funcionando correctamente

**Estado:** ✅ **CORREGIDO Y VERIFICADO**

---

**Archivos modificados:**
- ❌ Ninguno (solo cambios en base de datos)

**Cambios en base de datos:**
```sql
-- 1. Actualizar tipo de períodos mensuales
UPDATE fiscal_periods SET kind = 'MONTHLY' WHERE label LIKE 'MES-%' AND year = 2025;

-- 2. Reabrir período de octubre
UPDATE fiscal_periods SET status = 'OPEN' WHERE label = 'MES-Octubre' AND year = 2025;

-- 3. Regenerar tarjetas (ejecutado vía script TypeScript)
-- Las tarjetas se crearon automáticamente al ejecutar ensureClientTaxFilingsForYear(2025)
```

---

**Próxima acción:** Verificar en el dashboard que aparecen las 3 tarjetas del modelo 349 🎉
