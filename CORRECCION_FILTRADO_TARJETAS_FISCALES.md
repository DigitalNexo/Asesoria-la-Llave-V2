# Corrección Final: Filtrado de Tarjetas en Control de Impuestos

## Problema Identificado

El **Control de Impuestos** mostraba 21 tarjetas fiscales cuando solo debería mostrar las tarjetas de modelos que:
1. Tienen un **período abierto** en el **Calendario Fiscal** (`tax_calendar`)
2. La **periodicidad** del período abierto coincide con la periodicidad asignada al cliente

### Ejemplo del Problema

**Antes de la corrección**:
- Cliente "Juan Carlos" tenía modelo **303** asignado como **TRIMESTRAL**
- El período "4T" (cuarto trimestre) estaba **OPEN** en `fiscal_periods`
- **PERO** en el **Calendario Fiscal** (`tax_calendar`), el modelo 303 NO tenía períodos trimestrales abiertos, solo mensuales (M10)
- **Resultado incorrecto**: La tarjeta aparecía igual ❌

## Causa Raíz

El sistema filtraba por `fiscal_periods.status = 'OPEN'` (períodos genéricos), pero **NO verificaba**:
1. Si el modelo específico tenía períodos abiertos en `tax_calendar`
2. Si la periodicidad del período abierto coincidía con la asignación del cliente

### Diferencia entre las tablas

#### `fiscal_periods` (Períodos Genéricos)
- Períodos universales: "4T", "ANUAL", "MES-Noviembre"
- **NO específicos por modelo**
- Estado: OPEN / CLOSED

#### `tax_calendar` (Calendario Fiscal por Modelo)
- Períodos específicos: "303-M10", "349-4T", "100-ANUAL"
- **Específicos para cada modelo fiscal**
- Estado: PENDIENTE / ABIERTO / CERRADO
- **Incluye fechas de presentación**

## Solución Implementada

### Nueva Lógica de Filtrado

Modificado el archivo `server/prisma-storage.ts` en la función `getTaxFilings()`:

```typescript
// 1. Obtener períodos ABIERTOS en tax_calendar
const openCalendarEntries = await prisma.tax_calendar.findMany({
  where: { status: 'ABIERTO', year: filters.year || new Date().getFullYear() },
  select: { modelCode: true, period: true },
});

// 2. Obtener la periodicidad de la asignación del cliente
const clientModelPeriodicity = await prisma.client_tax_assignments.findMany({
  where: { activeFlag: true },
  select: { clientId, taxModelCode, periodicidad },
});

// 3. Filtrar tarjetas que cumplen TODOS estos criterios:
const visible = filings.filter((f) => {
  // a) Asignación activa del cliente
  // b) Modelo tiene períodos abiertos en tax_calendar
  // c) El TIPO de período abierto coincide con la periodicidad asignada
  
  // Ejemplo:
  // - Cliente tiene 303 asignado como MENSUAL
  // - tax_calendar tiene "303:M10" ABIERTO
  // - M10 es mensual → ✓ MUESTRA LA TARJETA
  
  // Pero si:
  // - Cliente tiene 303 asignado como TRIMESTRAL
  // - tax_calendar solo tiene "303:M10" ABIERTO
  // - M10 es mensual, NO trimestral → ✗ NO MUESTRA
});
```

### Mapeo de Tipos de Período

| Periodicidad Asignada | Períodos que debe buscar en `tax_calendar` |
|----------------------|---------------------------------------------|
| MENSUAL              | M01, M02, M03, ..., M12                     |
| TRIMESTRAL           | 1T, 2T, 3T, 4T                              |
| ANUAL                | ANUAL                                       |

## Resultado de la Corrección

### Estado Actual del Calendario Fiscal (tax_calendar)

**Períodos ABIERTOS** (fecha: 2 noviembre 2025):
```
- 349:M10 (1 nov - 20 nov) → Presentación de 349 de octubre
- 303:M10 (1 nov - 20 nov) → Presentación de 303 de octubre  
- 115:M10 (1 nov - 20 nov) → Presentación de 115 de octubre
- 123:M10 (1 nov - 20 nov) → Presentación de 123 de octubre
- 216:M10 (1 nov - 20 nov) → Presentación de 216 de octubre
```

**Total**: 5 períodos mensuales abiertos (M10 = octubre)

### Tarjetas que DEBEN Aparecer

Según las asignaciones activas y períodos abiertos:

| Cliente | Modelo | Periodicidad Asignada | Período Abierto | ¿Aparece? |
|---------|--------|----------------------|-----------------|-----------|
| Innoquest | 349 | MENSUAL | 349:M10 ✓ | **✓ SÍ** |
| Juan Carlos | 303 | TRIMESTRAL | 303:M10 (mensual) | **✗ NO** |
| Juan Carlos | 100 | ANUAL | Ninguno | **✗ NO** |
| Bufalo | 111 | MENSUAL | Ninguno | **✗ NO** |
| Bufalo | 303 | TRIMESTRAL | 303:M10 (mensual) | **✗ NO** |

**Resultado esperado**: **1 tarjeta** en Control de Impuestos (antes eran 21)

### Explicación Detallada

#### ✓ Por qué SÍ aparece Innoquest - 349:
1. Cliente tiene modelo **349** asignado
2. Periodicidad asignada: **MENSUAL**
3. En `tax_calendar` hay: **349:M10 ABIERTO**
4. M10 es período **mensual** → ✓ Coincide
5. **Resultado**: La tarjeta aparece

#### ✗ Por qué NO aparece Juan Carlos - 303:
1. Cliente tiene modelo **303** asignado
2. Periodicidad asignada: **TRIMESTRAL**
3. En `tax_calendar` hay: **303:M10 ABIERTO**
4. M10 es período **mensual**, NO trimestral → ✗ NO coincide
5. **Resultado**: La tarjeta NO aparece

Para que apareciera, el calendario fiscal debería tener "303:4T" (cuarto trimestre) en estado ABIERTO.

## Comportamiento del Sistema Ahora

### Calendario Fiscal (`tax_calendar`)
- Se actualiza cada 6 horas (job automático)
- Estados: PENDIENTE → ABIERTO → CERRADO
- Basado en fechas de presentación

### Control de Impuestos (Tarjetas)
- **Solo muestra tarjetas cuando**:
  1. El modelo tiene período ABIERTO en calendario
  2. La periodicidad del período coincide con la asignación
  3. El cliente tiene asignación activa

### Ejemplo de Flujo Temporal

**1 de noviembre 2025**:
- Calendario abre períodos M10 (mensuales de octubre)
- Job actualiza estados: PENDIENTE → ABIERTO
- Clientes con modelos MENSUALES ven sus tarjetas

**20 de noviembre 2025**:
- Plazo de M10 termina
- Job actualiza estados: ABIERTO → CERRADO
- Tarjetas de M10 desaparecen del Control de Impuestos

**1 de diciembre 2025**:
- Calendario abre períodos M11 (mensuales de noviembre)
- Aparecen nuevas tarjetas para M11

## Archivos Modificados

1. **`server/prisma-storage.ts`** (función `getTaxFilings`)
   - Agregado: Consulta a `tax_calendar` para obtener períodos abiertos
   - Agregado: Consulta a `client_tax_assignments` para periodicidad
   - Modificado: Filtro `visible` con validación de tipo de período

## Verificación

### Ver períodos abiertos en calendario:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.tax_calendar.findMany({ where: { status: 'ABIERTO' }, select: { modelCode: true, period: true } }).then(r => { console.log(r); process.exit(0); });"
```

### Ver asignaciones activas:
```bash
npx tsx -e "import { PrismaClient } from '@prisma/client'; const prisma = new PrismaClient(); prisma.client_tax_assignments.findMany({ where: { activeFlag: true }, include: { clients: { select: { razonSocial: true } } } }).then(r => { r.forEach(a => console.log(a.clients.razonSocial, a.taxModelCode, a.periodicidad)); process.exit(0); });"
```

## Próximos Pasos

1. **Recarga la página** del Control de Impuestos (Ctrl+Shift+R)
2. Deberías ver **solo las tarjetas** de modelos con períodos abiertos que coincidan con la periodicidad asignada
3. Cuando el calendario fiscal abra nuevos períodos (ej: trimestrales), aparecerán las tarjetas correspondientes automáticamente

---

**Fecha de corrección**: 2 de noviembre de 2025, 00:50 UTC  
**Lógica implementada**: Filtrado por `tax_calendar` + validación de periodicidad  
**Estado**: ✅ Sistema corregido y operativo
