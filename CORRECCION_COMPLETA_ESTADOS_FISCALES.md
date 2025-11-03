# Corrección Completa: Actualización Automática de Estados Fiscales

## Problema Reportado

El usuario reportó que:
1. **Calendario Fiscal**: Mostraba "En curso" pero el estado seguía siendo "PENDIENTE" en lugar de "ABIERTO"
2. **Control de Impuestos**: No aparecían las tarjetas de modelos fiscales que deberían estar abiertas

## Causa Raíz

El sistema tenía **DOS tablas diferentes** con estados que necesitaban actualizarse automáticamente:

### 1. `fiscal_periods` (Períodos Fiscales)
- **Estados**: `OPEN` | `CLOSED`
- **Problema**: No tenía job de actualización automática
- **Impacto**: Las tarjetas del Control de Impuestos no aparecían (filtra por `status = 'OPEN'`)

### 2. `tax_calendar` (Calendario Fiscal)
- **Estados**: `PENDIENTE` | `ABIERTO` | `CERRADO`
- **Problema**: El job solo se ejecutaba a medianoche (muy poco frecuente)
- **Impacto**: El calendario mostraba estados desactualizados

## Soluciones Implementadas

### ✅ 1. Job para `fiscal_periods` (NUEVO)

**Archivo**: `server/jobs.ts`

```typescript
export const fiscalPeriodsStatusJob = cron.createTask("0 */6 * * *", async () => {
  // Actualiza estados cada 6 horas:
  // - Si now >= starts_at && now <= ends_at → OPEN
  // - Si now > ends_at → CLOSED
});
```

**Frecuencia**: Cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)

**Resultado primera ejecución**:
- ✅ **10 períodos** cambiados de CLOSED → OPEN
- Períodos: 2025 ANUAL-180, ANUAL, Diciembre, ANUAL-200, ANUAL-390, ANUAL-190, ANUAL-720, ANUAL-347, 4T, MES-Noviembre
- **21 tarjetas fiscales** ahora visibles en Control de Impuestos

### ✅ 2. Job para `tax_calendar` (ACTUALIZADO)

**Archivo**: `server/jobs.ts`

```typescript
export const taxCalendarRefreshJob = cron.createTask("0 */6 * * *", async () => {
  // Actualiza estados cada 6 horas:
  // - Si now < start → PENDIENTE
  // - Si now >= start && now <= end → ABIERTO
  // - Si now > end → CERRADO
});
```

**Cambio**: De `"0 0 * * *"` (solo medianoche) a `"0 */6 * * *"` (cada 6 horas)

**Resultado primera ejecución**:
- ✅ **5 entradas** cambiadas de PENDIENTE → ABIERTO
- Modelos: 216, 349, 303, 123, 115 (todos del período Octubre/M10)

### ✅ 3. Habilitación de Cron Jobs

**Archivo**: `.env`

```bash
# Antes
ENABLE_CRON_JOBS=false

# Después
ENABLE_CRON_JOBS=true
```

Esto permite que los jobs se ejecuten en el servidor VPS (Reserved VM).

## Scripts Manuales Creados

### 1. `update-fiscal-periods-status.ts`
Actualiza estados de la tabla `fiscal_periods` (períodos para tarjetas fiscales).

**Uso**:
```bash
npx tsx update-fiscal-periods-status.ts
```

### 2. `update-tax-calendar-status.ts`
Actualiza estados de la tabla `tax_calendar` (calendario visual).

**Uso**:
```bash
npx tsx update-tax-calendar-status.ts
```

## Estado Actual del Sistema

### `fiscal_periods`
```
OPEN: 10 períodos
CLOSED: 42 períodos
```

### `tax_calendar`
```
ABIERTO: 5 entradas
PENDIENTE: 28 entradas
CERRADO: 71 entradas
```

### `client_tax_filings` (Tarjetas del Control de Impuestos)
```
Con períodos OPEN: 21 tarjetas
```

## Cómo Funciona el Filtrado del Control de Impuestos

El sistema ahora filtra correctamente las tarjetas fiscales por:

1. **Estado del período**: Solo muestra tarjetas con `fiscal_periods.status = 'OPEN'`
2. **Asignación activa**: Verifica que el cliente tenga el modelo asignado (`client_tax_assignments`)
3. **Rango de fechas**: La asignación debe solapar con las fechas del período:
   - `assignment.startDate <= period.ends_at`
   - `assignment.endDate >= period.starts_at` (o NULL)
4. **Flag activo**: `assignment.activeFlag = true`

### Ejemplo Práctico

**Cliente**: Empresa ABC  
**Modelo asignado**: 303 (IVA Trimestral)  
**Período actual**: 4T 2025 (Oct-Dic)  
**Estado del período**: OPEN

✅ **Resultado**: La tarjeta del modelo 303 para el 4T 2025 aparece en el Control de Impuestos

Si el cliente tuviera el modelo 349 (mensual) pero el período mensual de octubre ya está cerrado:  
❌ **Resultado**: La tarjeta NO aparece (período cerrado)

## Jobs Activos en el Servidor

Verificar con:
```bash
sudo journalctl -u asesoria-llave.service --since "5 minutes ago" | grep "✓"
```

Deberías ver:
```
✓ Recordatorios de tareas (09:00 diario)
✓ Recordatorios fiscales (08:00 diario)
✓ Actualización de calendario fiscal (cada 6 horas)
✓ Actualización de estados de períodos (cada 6 horas)
✓ Sincronización de tarjetas fiscales (cada hora)
✓ Limpieza de sesiones (cada hora)
✓ Backup automático (03:00 diario)
```

## Próximas Ejecuciones Automáticas

### Calendario Fiscal y Períodos (cada 6 horas)
- **00:00 UTC** (01:00 España)
- **06:00 UTC** (07:00 España)
- **12:00 UTC** (13:00 España)
- **18:00 UTC** (19:00 España)

### Sincronización de Tarjetas (cada hora)
- Se ejecuta en el minuto 10 de cada hora (:10)

## Verificación para el Usuario

### 1. Calendario Fiscal
1. Ir a **Impuestos → Calendario Fiscal**
2. Buscar períodos con fecha de inicio ya pasada
3. Verificar que el estado muestra **"ABIERTO"** (no "PENDIENTE")

### 2. Control de Impuestos
1. Ir a **Impuestos → Control de Impuestos**
2. Filtrar por año actual (2025)
3. Deberías ver **21 tarjetas** de obligaciones fiscales abiertas
4. Las tarjetas corresponden solo a períodos OPEN y modelos asignados activos

### 3. Verificar que el filtro funciona
- Si filtras por "ABIERTO" → Muestra las 21 tarjetas
- Si filtras por modelo específico (ej. 303) → Muestra solo las tarjetas del 303 que estén en período abierto
- Si un período cierra (fecha de fin pasa) → Las tarjetas desaparecen automáticamente en la próxima actualización (máximo 6 horas)

## Monitoreo

### Ver última ejecución de jobs
```bash
sudo journalctl -u asesoria-llave.service --since "1 hour ago" | grep "actualizado"
```

### Ver estados actuales
```bash
# Períodos
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.fiscal_periods.groupBy({ by: ['status'], _count: { status: true } }).then(r => { console.log(r); process.exit(0); });"

# Calendario
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.tax_calendar.groupBy({ by: ['status'], _count: { status: true } }).then(r => { console.log(r); process.exit(0); });"
```

## Archivos Modificados

1. **`server/jobs.ts`**
   - Agregado: `fiscalPeriodsStatusJob` (cada 6 horas)
   - Modificado: `taxCalendarRefreshJob` (de diario a cada 6 horas)
   - Actualizado: `startAllJobs()` y `stopAllJobs()`

2. **`.env`**
   - `ENABLE_CRON_JOBS=false` → `ENABLE_CRON_JOBS=true`

3. **Scripts creados**:
   - `update-fiscal-periods-status.ts`
   - `update-tax-calendar-status.ts`

4. **Documentación**:
   - `CORRECCION_ESTADOS_FISCALES.md`
   - `CORRECCION_COMPLETA_ESTADOS_FISCALES.md` (este archivo)

---

**Fecha de corrección**: 2 de noviembre de 2025, 00:34 UTC  
**Períodos fiscales corregidos**: 10  
**Entradas de calendario corregidas**: 5  
**Tarjetas fiscales ahora visibles**: 21  
**Sistema**: ✅ Completamente operativo con actualización automática cada 6 horas
