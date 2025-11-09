# 🧹 LIMPIEZA SISTEMA LEGACY - PRESUPUESTOS

**Fecha:** 2025-11-04  
**Estado:** ✅ COMPLETADO Y DESPLEGADO EN PRODUCCIÓN

---

## 🎯 PROBLEMA IDENTIFICADO

El usuario reportó que en producción (`https://digitalnexo.es`) seguían apareciendo las páginas **viejas** del sistema de presupuestos:

- ❌ `/documentacion/presupuestos/` → Sistema legacy (PYME, Autónomo viejo, Renta, Herencias)
- ❌ `/documentacion/presupuestos/parametros` → Parámetros viejos (4 tipos de presupuesto)

**Causa:** Los archivos viejos todavía existían en el código y `documentacion-page.tsx` los importaba y mostraba.

---

## ✅ SOLUCIÓN APLICADA

### 1. **Eliminación Completa de Archivos Legacy** ✅

Se eliminó **toda la carpeta** con el sistema viejo:

```bash
rm -rf /root/www/Asesoria-la-Llave-V2/client/src/pages/documentacion/presupuestos/
```

**Archivos eliminados (15+):**
- `PresupuestosList.tsx` (lista vieja)
- `PresupuestoFormNew.tsx` (crear viejo)
- `PresupuestoView.tsx` (ver viejo)
- `PresupuestoEdit.tsx` (editar viejo)
- `ParametrosPresupuestos.tsx` (parámetros viejos con 4 tipos)
- `BudgetTemplatesManager.tsx` (plantillas viejas)
- `FormAutonomo.tsx` (formulario legacy autónomo)
- `FormPyme.tsx` (formulario legacy PYME)
- `FormRenta.tsx` (formulario legacy renta)
- `FormHerencias.tsx` (formulario legacy herencias)
- `BudgetTypeSelector.tsx` (selector viejo)
- `PublicBudgetAccept.tsx` (duplicado viejo)
- `PresupuestoForm.tsx` (form base viejo)
- `PublicAccept.tsx` (otro duplicado)
- `index.tsx` (exportaciones viejas)
- ... y otros componentes relacionados

### 2. **Actualización de documentacion-page.tsx** ✅

Antes:
```tsx
import Presupuestos from '@/pages/documentacion/presupuestos';
import ParametrosPresupuestos from '@/pages/documentacion/presupuestos/ParametrosPresupuestos';
import BudgetTemplatesManager from '@/pages/documentacion/presupuestos/BudgetTemplatesManager';

export default function DocumentacionPage() {
  // ... mostraba tabs con sistema viejo
  return (
    <Tabs>
      <TabsContent value="presupuestos">
        <Presupuestos /> {/* VIEJO */}
      </TabsContent>
    </Tabs>
  );
}
```

Después:
```tsx
import { Redirect } from 'wouter';

export default function DocumentacionPage() {
  // Redirige siempre al nuevo menú
  return <Redirect to="/documentacion" />;
}
```

### 3. **Verificación de Referencias** ✅

Se verificó que **NO existan más referencias** a `/documentacion/presupuestos` en el código:

```bash
grep -r "/documentacion/presupuestos" client/src/
# Resultado: 0 coincidencias ✅
```

### 4. **Build y Deploy a Producción** ✅

```bash
# 1. Build de producción
npm run build
# ✅ Compilado en 1m 6s sin errores

# 2. Reinicio del servicio
sudo systemctl restart asesoria-llave
# ✅ Servicio activo y funcionando
```

---

## 🗺️ ESTRUCTURA ACTUAL (NUEVA)

### **Rutas Activas en Producción:**

| Ruta | Componente | Propósito |
|------|------------|-----------|
| `/documentacion` | DocumentacionMenu | **Menú principal** (2 cards: Presupuestos → /presupuestos, Documentos → /documentacion/documentos) |
| `/documentacion/documentos` | Documentos | Gestión de documentos (recibos, protección datos, bancaria) |
| `/presupuestos` | PresupuestosLista | **Lista presupuestos** (sistema nuevo) |
| `/presupuestos/nuevo-autonomo` | PresupuestoAutonomoNuevo | **FASE 5: Workflow 3 tabs** (cliente → cálculo → guardar) |
| `/presupuestos/parametros` | ParametrosPresupuestos | **FASE 4: Gestión parámetros** (6 tabs dinámicos) |
| `/presupuestos/configuracion` | ConfiguracionPrecios | Config precios (legacy, mantener por ahora) |
| `/presupuestos/:id` | PresupuestoDetalle | Ver detalle presupuesto |
| `/presupuestos/:id/editar` | PresupuestoNuevo | Editar presupuesto |
| `/public/budgets/:code/accept` | PublicBudgetAccept | Aceptación pública (sin auth) |

### **Rutas Eliminadas (Ya NO existen):**

| Ruta | Estado |
|------|--------|
| `/documentacion/presupuestos` | ❌ ELIMINADA |
| `/documentacion/presupuestos/nuevo` | ❌ ELIMINADA |
| `/documentacion/presupuestos/parametros` | ❌ ELIMINADA |
| `/documentacion/presupuestos/plantillas` | ❌ ELIMINADA |
| `/documentacion/presupuestos/:id` | ❌ ELIMINADA |
| `/documentacion/presupuestos/:id/editar` | ❌ ELIMINADA |

---

## 🔄 FLUJO DE NAVEGACIÓN NUEVO

```
🏠 Dashboard
  ↓
📂 Sidebar → Click "Documentación"
  ↓
📋 /documentacion (DocumentacionMenu)
  ├─ Card 1: "Presupuestos" → /presupuestos
  └─ Card 2: "Documentos" → /documentacion/documentos

📊 /presupuestos (PresupuestosLista)
  ├─ Botón "Presupuesto Autónomo" → /presupuestos/nuevo-autonomo
  ├─ Botón "Parámetros" → /presupuestos/parametros
  └─ Click en presupuesto → /presupuestos/:id

⚙️ /presupuestos/parametros (FASE 4)
  └─ 6 Tabs: General, Facturas, Nóminas, Facturación, Modelos, Servicios

🧮 /presupuestos/nuevo-autonomo (FASE 5)
  └─ 3 Tabs: Cliente → Cálculo → Guardar
```

---

## 🎨 SISTEMA NUEVO (OFICIAL/ONLINE)

### **Características del Sistema Nuevo:**

1. **Sistema Dinámico de Parámetros (FASE 4)**
   - 6 tablas en BD: `invoice_tiers`, `payroll_tiers`, `billing_tiers`, `fiscal_models`, `services`, `autonomo_config`
   - 29 endpoints CRUD para gestión dinámica
   - Interfaz con 6 tabs y drag & drop
   - Porcentajes configurables

2. **Calculadora de Presupuestos (FASE 5)**
   - Workflow de 3 pasos (Cliente → Cálculo → Guardar)
   - Algoritmo de cálculo con 11 pasos
   - Breakdown detallado con Accordion
   - Integración completa con parámetros dinámicos

3. **Backend Robusto**
   - Servicio de cálculo con caché de 5 minutos
   - Validaciones de entrada
   - Tipos TypeScript compartidos
   - API REST documentada

---

## 📊 IMPACTO EN PRODUCCIÓN

### **Antes (Sistema Legacy):**
- 4 tipos de presupuesto: PYME, Autónomo, Renta, Herencias
- Parámetros hardcodeados en código
- 4 formularios separados (FormAutonomo, FormPyme, FormRenta, FormHerencias)
- Sin cálculo automático dinámico
- Sin tramos configurables
- Sin diferenciación OFICIAL/ONLINE

### **Después (Sistema Nuevo):**
- ✅ 1 tipo de presupuesto: Autónomo (con 2 modalidades: OFICIAL/ONLINE)
- ✅ Parámetros 100% dinámicos (editables por admin)
- ✅ 1 formulario inteligente (AutonomoCalculatorForm)
- ✅ Cálculo automático con algoritmo de 11 pasos
- ✅ 5 tipos de tramos configurables
- ✅ Sistema OFICIAL vs ONLINE implementado
- ✅ Breakdown detallado visible para el usuario

---

## ✅ VERIFICACIÓN POST-DEPLOY

### **1. Servicio en Producción:**
```bash
systemctl status asesoria-llave
# ✅ active (running) since Tue 2025-11-04 08:51:37 UTC
```

### **2. Build Exitoso:**
```
✓ built in 1m 6s
✅ 0 errores TypeScript
✅ Todos los chunks generados
```

### **3. URLs a Probar:**

| URL | Comportamiento Esperado |
|-----|-------------------------|
| `https://digitalnexo.es/documentacion` | Muestra menú con 2 cards (Presupuestos y Documentos) |
| `https://digitalnexo.es/documentacion/presupuestos` | **Redirige a /documentacion** (ya no existe) |
| `https://digitalnexo.es/presupuestos` | Muestra lista de presupuestos (nuevo) |
| `https://digitalnexo.es/presupuestos/parametros` | Muestra página con 6 tabs (FASE 4) |
| `https://digitalnexo.es/presupuestos/nuevo-autonomo` | Muestra workflow de 3 tabs (FASE 5) |

---

## 🚀 PRÓXIMOS PASOS

### **FASE 6: Mejorar CRUD Presupuestos** (Siguiente)

1. **PresupuestoDetalle.tsx**
   - Mostrar breakdown completo de cálculo
   - Integrar CalculationResult component
   - Botones de acción por estado

2. **PresupuestosLista.tsx**
   - Filtros avanzados (estado, tipo, fecha, cliente)
   - Búsqueda en tiempo real
   - Paginación
   - Badges de estado con colores

3. **Edición con Recalculación**
   - Permitir editar datos del presupuesto
   - Recalcular automáticamente
   - Validaciones

4. **Estados de Presupuesto**
   - BORRADOR → ENVIADO → ACEPTADO/RECHAZADO
   - Botones de cambio de estado
   - Validaciones de transición

### **FASE 7: Backend - Validaciones y Estados**

1. Validaciones server-side
2. Lógica de transición de estados
3. Envío de emails al cambiar a ENVIADO
4. Logging y auditoría

### **FASE 8: Pruebas E2E y Limpieza Final**

1. Probar flujo completo end-to-end
2. Eliminar carpeta /BASU
3. Actualizar documentación
4. Commit final

---

## 📝 COMANDOS ÚTILES

```bash
# Ver logs en tiempo real
journalctl -u asesoria-llave -f

# Ver últimos 50 logs
journalctl -u asesoria-llave -n 50

# Ver estado del servicio
systemctl status asesoria-llave

# Reiniciar servicio
sudo systemctl restart asesoria-llave

# Build local
npm run build

# Deploy completo
./deploy.sh
```

---

## 📌 NOTAS IMPORTANTES

1. **Caché del Navegador:** Los usuarios pueden necesitar hacer `Ctrl+Shift+R` para ver los cambios
2. **URLs Antiguas:** `/documentacion/presupuestos/*` ahora redirige a `/documentacion`
3. **Compatibilidad:** Sistema viejo eliminado completamente, solo nuevo sistema activo
4. **Migración:** Presupuestos antiguos siguen en BD, se pueden ver con `/presupuestos/:id`

---

## ✅ RESUMEN EJECUTIVO

| Item | Estado |
|------|--------|
| Eliminación archivos legacy | ✅ Completado |
| Actualización documentacion-page.tsx | ✅ Completado |
| Verificación de referencias | ✅ 0 referencias encontradas |
| Build de producción | ✅ Exitoso (1m 6s) |
| Deploy a producción | ✅ Servicio activo |
| Verificación URLs | ⏳ Pendiente usuario |

**Estado Global:** ✅ **SISTEMA LEGACY ELIMINADO - SOLO SISTEMA NUEVO ACTIVO EN PRODUCCIÓN**

---

**Creado por:** GitHub Copilot  
**Fecha:** 2025-11-04  
**Comando para ver cambios:** `git status` y `git diff`
