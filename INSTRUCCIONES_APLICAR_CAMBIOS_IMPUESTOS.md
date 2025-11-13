# Instrucciones para Aplicar los Cambios del Sistema de Impuestos

## ✅ Cambios Realizados

### 1. **Lógica basada en fechas (en lugar de status manual)**
Se modificaron los siguientes servicios:

- ✅ `server/services/tax-calendar.service.ts`
  - Función `getOpenPeriods()` ahora usa `startDate <= HOY <= endDate`

- ✅ `server/services/tax-obligations.service.ts`
  - Función `generateAutomaticObligations()` - Usa lógica de fechas
  - Función `generateObligationsForPeriod()` - Validación por fechas + validaciones de tipo
  - Función `generateObligationsForClient()` - Usa filtro de fechas
  - Función `getObligationsFromOpenPeriods()` - Filtro por fechas + cálculo de días restantes

### 2. **Validaciones agregadas**
En `generateObligationsForPeriod()`:
- ✅ Validación de tipo de cliente (`client.tipo` debe estar en `tax_models_config.allowedTypes`)
- ✅ Validación de tipo de período (`client_tax_model.period_type` debe coincidir con `tax_calendar.periodType`)

### 3. **Esquema de base de datos actualizado**
En `prisma/schema.prisma`:
- ✅ Agregado campo `periodType` al modelo `tax_calendar`

### 4. **Cálculo de días restantes**
La función `getObligationsFromOpenPeriods()` ahora retorna:
- `daysUntilStart`: Días hasta que empiece el período
- `daysUntilEnd`: Días hasta que finalice el período
- `statusMessage`: Mensaje automático ("Empieza en X días" / "Finaliza en X días")

---

## 📋 Pasos para Aplicar

### Paso 1: Registrar las rutas del sistema de impuestos

Ejecuta el siguiente script:
```bash
cd /root/www/Asesoria-la-Llave-V2
chmod +x register-tax-routes.sh
./register-tax-routes.sh
```

Esto agregará automáticamente:
- Las importaciones de los routers
- El registro de rutas en `app.use()`

### Paso 2: Agregar el campo `period_type` a la tabla `tax_calendar`

Ejecuta esta migración SQL:
```sql
ALTER TABLE tax_calendar 
ADD COLUMN period_type VARCHAR(20) NULL 
COMMENT 'MONTHLY, QUARTERLY, ANNUAL';
```

O ejecuta:
```bash
cd /root/www/Asesoria-la-Llave-V2
mysql -u app_area -pmasjic-natjew-9wyvBe area_privada -e "ALTER TABLE tax_calendar ADD COLUMN period_type VARCHAR(20) NULL COMMENT 'MONTHLY, QUARTERLY, ANNUAL';"
```

### Paso 3: Generar el cliente de Prisma

```bash
cd /root/www/Asesoria-la-Llave-V2
npx prisma generate
```

### Paso 4: Compilar el proyecto

```bash
cd /root/www/Asesoria-la-Llave-V2
npm run build
```

### Paso 5: Reiniciar el servicio

```bash
sudo systemctl restart asesoria-llave.service
```

### Paso 6: Verificar que el servicio está corriendo

```bash
sudo systemctl status asesoria-llave.service
```

---

## 🧪 Pasos para Probar

### 1. Verificar períodos abiertos automáticamente

```bash
# Ver qué períodos están abiertos HOY por fechas
mysql -u app_area -pmasjic-natjew-9wyvBe area_privada -e "
SELECT 
    id, 
    modelCode, 
    period, 
    year,
    startDate,
    endDate,
    CASE 
        WHEN CURDATE() BETWEEN startDate AND endDate THEN 'ABIERTO (por fecha)'
        WHEN CURDATE() < startDate THEN 'FUTURO'
        ELSE 'CERRADO'
    END as estado_real,
    status as estado_manual
FROM tax_calendar
WHERE active = 1
ORDER BY startDate;
"
```

### 2. Probar generación automática de obligaciones

Desde la aplicación o API:
```bash
curl -X POST http://localhost:5000/api/tax-obligations/generate-auto \
  -H "Authorization: Bearer TU_TOKEN"
```

### 3. Verificar tarjetas en Control de Impuestos

Accede a la página de **Control de Impuestos** y verifica:
- ✅ Solo aparecen tarjetas de períodos que están entre `startDate` y `endDate` HOY
- ✅ Se muestran mensajes como "Empieza en X días" o "Finaliza en X días"
- ✅ Aparecen todos los clientes que tienen modelos activos (no solo Innoquest)

### 4. Verificar validaciones

Crea un cliente con tipo "PARTICULAR" y asígnale el modelo 303 (IVA):
- ❌ NO debería generar obligaciones (303 solo permite AUTONOMO y EMPRESA)

Crea un cliente con tipo "AUTONOMO", período MENSUAL y asígnale el modelo 303:
- ✅ SÍ debería generar obligaciones para períodos mensuales del 303

---

## 🐛 Solución de Problemas

### Problema: "Error: Modelo XXX no encontrado en tax_models_config"

**Causa**: La tabla `tax_models_config` no tiene datos.

**Solución**: Ejecuta el script de datos de prueba:
```bash
mysql -u app_area -pmasjic-natjew-9wyvBe area_privada < DATOS_PRUEBA_IMPUESTOS.sql
```

### Problema: "No aparecen tarjetas para ningún cliente"

**Diagnóstico**:
```sql
-- 1. ¿Hay períodos abiertos por fechas?
SELECT * FROM tax_calendar 
WHERE CURDATE() BETWEEN startDate AND endDate 
AND active = 1;

-- 2. ¿Hay clientes con modelos activos?
SELECT * FROM client_tax_models 
WHERE is_active = 1 
AND (end_date IS NULL OR end_date >= CURDATE());

-- 3. ¿Se generaron obligaciones?
SELECT COUNT(*) FROM client_tax_obligations;
```

**Solución**: Ejecuta el script de reparación:
```bash
cd /root/www/Asesoria-la-Llave-V2
chmod +x fix-tarjetas-faltantes.sh
./fix-tarjetas-faltantes.sh
```

### Problema: "Las rutas no están registradas"

**Verificación**:
```bash
grep "taxCalendarRouter" /root/www/Asesoria-la-Llave-V2/server/routes.ts
```

Si no aparece nada, ejecuta:
```bash
./register-tax-routes.sh
```

---

## 📊 Comparación: Antes vs Después

### ❌ ANTES (Lógica incorrecta)
- Un período estaba "abierto" solo si `status = 'ABIERTO'` (manual)
- El admin debía cambiar el status manualmente
- No había validaciones de tipo de cliente ni período
- No se calculaban días restantes

### ✅ DESPUÉS (Lógica correcta)
- Un período está "abierto" automáticamente si `CURDATE() BETWEEN startDate AND endDate`
- No requiere intervención manual
- Valida tipo de cliente (`allowedTypes`) y tipo de período (`period_type`)
- Calcula y muestra días restantes automáticamente

---

## 📝 Notas Importantes

1. **Campo `status` en `tax_calendar`**: Ahora es solo informativo. El sistema NO lo usa para determinar si un período está abierto.

2. **Validación de tipos**: Si un cliente tiene tipo "PARTICULAR" y le asignas un modelo que solo permite "AUTONOMO", NO se generarán obligaciones automáticamente.

3. **Períodos futuros**: Si un período tiene `startDate` en el futuro, NO aparecerá como abierto hasta que llegue esa fecha.

4. **Migración de datos existentes**: Los datos existentes seguirán funcionando, pero deberás poblar:
   - `tax_calendar.periodType` (MONTHLY, QUARTERLY, ANNUAL)
   - `tax_models_config` con la configuración de cada modelo
   - `client_tax_models.period_type` para cada asignación

---

## ✅ Checklist Final

- [ ] Ejecutar `register-tax-routes.sh`
- [ ] Agregar campo `period_type` a tabla `tax_calendar`
- [ ] Ejecutar `npx prisma generate`
- [ ] Ejecutar `npm run build`
- [ ] Reiniciar servicio con `systemctl restart`
- [ ] Verificar que el servicio está corriendo
- [ ] Probar generación automática de obligaciones
- [ ] Verificar que aparecen todas las tarjetas en Control de Impuestos
- [ ] Verificar mensajes de días restantes
- [ ] Probar validaciones de tipo de cliente y período

---

**🎯 Resultado esperado**: El sistema ahora abre y cierra períodos automáticamente por fechas, genera obligaciones solo para clientes que cumplen las validaciones, y muestra información en tiempo real sobre días restantes.
