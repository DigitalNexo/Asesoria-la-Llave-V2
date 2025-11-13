# 📋 INSTRUCCIONES: Registrar Rutas del Sistema de Impuestos

## ⚠️ ACCIÓN REQUERIDA

Debes registrar manualmente las nuevas rutas en el archivo `server/routes.ts` (o donde esté la función `registerRoutes`).

---

## 📝 PASO 1: Importar las Rutas

Agregar al inicio del archivo `server/routes.ts`:

```typescript
import taxCalendarRoutes from './routes/tax-calendar.routes';
import clientTaxRoutes from './routes/client-tax.routes';
import taxObligationsRoutes from './routes/tax-obligations.routes';
```

---

## 📝 PASO 2: Registrar las Rutas

Dentro de la función `registerRoutes()`, agregar:

```typescript
// Sistema de Control de Impuestos
app.use('/api/tax-calendar', taxCalendarRoutes);
app.use('/api/clients', clientTaxRoutes);  // Ya existe, solo añadir las rutas de tax-models
app.use('/api/tax-obligations', taxObligationsRoutes);
```

---

## 📝 PASO 3: Generar Prisma Client

Ejecutar en terminal:

```bash
cd /root/www/Asesoria-la-Llave-V2
npx prisma generate
```

---

## 📝 PASO 4: Build y Restart

```bash
npm run build
sudo systemctl restart asesoria-llave.service
```

---

## ✅ ENDPOINTS DISPONIBLES DESPUÉS DEL REGISTRO

### 📅 Calendario Fiscal AEAT (`/api/tax-calendar`)
- `GET /api/tax-calendar` - Listar periodos (con filtros)
- `GET /api/tax-calendar/open` - Periodos ABIERTOS
- `GET /api/tax-calendar/year/:year` - Periodos por año
- `GET /api/tax-calendar/model/:modelCode` - Periodos por modelo
- `GET /api/tax-calendar/:id` - Periodo específico
- `POST /api/tax-calendar` - Crear periodo
- `PUT /api/tax-calendar/:id` - Actualizar periodo
- `PUT /api/tax-calendar/:id/status` - Cambiar estado (PENDIENTE/ABIERTO/CERRADO)
- `DELETE /api/tax-calendar/:id` - Eliminar periodo

### 👥 Modelos Fiscales de Clientes (`/api/clients`)
- `GET /api/clients/:clientId/tax-models` - Modelos del cliente
- `GET /api/clients/:clientId/tax-models/stats` - Estadísticas
- `GET /api/clients/tax-models/:id` - Modelo específico
- `POST /api/clients/:clientId/tax-models` - Dar de alta modelo
- `PUT /api/clients/tax-models/:id` - Actualizar modelo
- `PUT /api/clients/tax-models/:id/toggle` - Activar/Desactivar
- `DELETE /api/clients/tax-models/:id` - Eliminar modelo
- `GET /api/clients/tax-models/by-model/:modelNumber` - Clientes con modelo activo

### 📊 Obligaciones Fiscales (`/api/tax-obligations`)
- `GET /api/tax-obligations` - Listar obligaciones (con filtros)
- `GET /api/tax-obligations/open-periods` - **Obligaciones de periodos ABIERTOS** ⭐
- `GET /api/tax-obligations/stats` - Estadísticas
- `GET /api/tax-obligations/:id` - Obligación específica
- `POST /api/tax-obligations/generate-auto` - **Generar automáticamente** ⭐
- `POST /api/tax-obligations/generate-period/:taxCalendarId` - Generar para un periodo
- `PUT /api/tax-obligations/:id` - Actualizar obligación
- `PUT /api/tax-obligations/:id/complete` - Marcar como completada
- `POST /api/tax-obligations/mark-overdue` - Marcar vencidas (cron job)
- `DELETE /api/tax-obligations/:id` - Eliminar obligación

---

## 🔑 ENDPOINTS CLAVE PARA EL FLUJO AUTOMÁTICO

### 1. **Obtener Obligaciones de Periodos Abiertos**
```javascript
GET /api/tax-obligations/open-periods?clientId=xxx

// Esto devuelve SOLO las obligaciones de periodos que estén en estado ABIERTO
// Es el endpoint que debe usar el frontend para mostrar las tarjetas automáticamente
```

### 2. **Generar Obligaciones Automáticamente**
```javascript
POST /api/tax-obligations/generate-auto

// Ejecuta el proceso automático:
// 1. Busca periodos ABIERTOS en tax_calendar
// 2. Para cada periodo, busca clientes con ese modelo activo
// 3. Crea obligaciones automáticamente si no existen
```

### 3. **Cambiar Estado de un Periodo**
```javascript
PUT /api/tax-calendar/:id/status
Body: { "status": "ABIERTO" }

// Cuando cambias un periodo a ABIERTO, debes llamar a generate-auto
// para crear las obligaciones de todos los clientes con ese modelo
```

---

## 🔄 FLUJO COMPLETO

1. **Admin abre un periodo en el calendario AEAT:**
   ```
   PUT /api/tax-calendar/:id/status
   Body: { "status": "ABIERTO" }
   ```

2. **Sistema genera obligaciones automáticamente:**
   ```
   POST /api/tax-obligations/generate-auto
   ```

3. **Frontend consulta obligaciones de periodos abiertos:**
   ```
   GET /api/tax-obligations/open-periods
   ```

4. **Las tarjetas aparecen automáticamente en el Control de Impuestos** ✅

---

## 📌 NOTAS IMPORTANTES

- ✅ Los modelos ya están en `prisma/schema.prisma`
- ✅ Los servicios están creados en `server/services/`
- ✅ Las rutas están creadas en `server/routes/`
- ⚠️ **FALTA:** Registrar las rutas en `server/routes.ts`
- ⚠️ **FALTA:** Ejecutar `npx prisma generate`
- ⚠️ **FALTA:** Ejecutar `npm run build`

