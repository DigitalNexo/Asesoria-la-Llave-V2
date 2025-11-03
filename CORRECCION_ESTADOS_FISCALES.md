# Corrección: Actualización Automática de Estados de Períodos Fiscales

## Problema Identificado

Los períodos fiscales en la tabla `fiscal_periods` no estaban actualizando automáticamente su estado de `OPEN` (abierto) cuando llegaba su fecha de inicio (`starts_at`). Esto causaba:

1. **Calendario Fiscal**: Mostraba estados incorrectos (períodos que deberían estar abiertos aparecían como cerrados)
2. **Control de Impuestos**: No mostraba las tarjetas de obligaciones fiscales que deberían estar abiertas, ya que el sistema filtra por `status = 'OPEN'` en la consulta de `getTaxFilings()`

## Solución Implementada

### 1. Nuevo Job Automático

Se creó un **cron job** que se ejecuta **cada 6 horas** para actualizar automáticamente los estados de los períodos fiscales:

```typescript
export const fiscalPeriodsStatusJob = cron.createTask("0 */6 * * *", async () => {
  // Actualiza estados basándose en:
  // - Si now >= starts_at && now <= ends_at → OPEN
  // - Si now > ends_at → CLOSED
});
```

**Horarios de ejecución**: 00:00, 06:00, 12:00, 18:00 (cada 6 horas)

### 2. Script Manual de Corrección

Se ejecutó un script manual (`update-fiscal-periods-status.ts`) que actualizó inmediatamente todos los períodos con fechas incorrectas:

**Resultado de la ejecución inicial**:
- ✅ **10 períodos cambiados** de CLOSED → OPEN
- Períodos actualizados:
  - 2025 ANUAL-180
  - 2025 ANUAL
  - 2025 Diciembre
  - 2025 ANUAL-200
  - 2025 ANUAL-390
  - 2025 ANUAL-190
  - 2025 ANUAL-720
  - 2025 ANUAL-347
  - 2025 4T (4º Trimestre)
  - 2025 MES-Noviembre

### 3. Habilitación de Cron Jobs

Se activó la variable de entorno:
```bash
ENABLE_CRON_JOBS=true
```

Esto permite que los jobs programados se ejecuten en el servidor VPS (Reserved VM).

## Archivos Modificados

1. **`server/jobs.ts`**
   - Agregado: `fiscalPeriodsStatusJob` (actualización cada 6 horas)
   - Modificado: `startAllJobs()` para iniciar el nuevo job
   - Modificado: `stopAllJobs()` para detener el nuevo job

2. **`.env`**
   - Cambiado: `ENABLE_CRON_JOBS=false` → `ENABLE_CRON_JOBS=true`

3. **`update-fiscal-periods-status.ts`** (nuevo)
   - Script manual para ejecutar la actualización bajo demanda
   - Uso: `npx tsx update-fiscal-periods-status.ts`

## Verificación

Para confirmar que el job está activo:

```bash
sudo journalctl -u asesoria-llave.service -n 50 --no-pager | grep "Actualización de estados"
```

Deberías ver:
```
✓ Actualización de estados de períodos (cada 6 horas)
```

## Próximas Ejecuciones Automáticas

El sistema ahora actualizará automáticamente los estados en los siguientes horarios (UTC):
- 00:00 (medianoche)
- 06:00 (6am)
- 12:00 (mediodía)
- 18:00 (6pm)

## Ejecución Manual

Si necesitas forzar una actualización inmediata:

```bash
cd /root/www/Asesoria-la-Llave-V2
npx tsx update-fiscal-periods-status.ts
```

## Estado Actual

✅ **Sistema operativo y corregido**
- Los 10 períodos de 2025 que ya habían iniciado fueron actualizados a OPEN
- El job automático está activo y actualizará estados cada 6 horas
- Las tarjetas del Control de Impuestos ahora mostrarán correctamente las obligaciones fiscales abiertas
- El Calendario Fiscal mostrará los estados correctos

## Monitoreo

Para verificar que el job se ejecuta correctamente cada 6 horas:

```bash
sudo journalctl -u asesoria-llave.service --since "1 hour ago" | grep "Estados de períodos actualizados"
```

---

**Fecha de corrección**: 2 de noviembre de 2025, 00:22 UTC  
**Períodos corregidos**: 10  
**Próxima ejecución automática**: A las 06:00 UTC
