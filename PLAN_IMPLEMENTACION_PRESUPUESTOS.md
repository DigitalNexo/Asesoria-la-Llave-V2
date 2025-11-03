# 📋 PLAN DE IMPLEMENTACIÓN - MÓDULO DE PRESUPUESTOS

**Fecha**: 3 de noviembre de 2025  
**Origen**: `/BASU` (C# .NET Razor Pages + EF Core)  
**Destino**: App actual (TypeScript + Node.js + Express + Prisma + React + shadcn/ui)  
**Estrategia**: Port completo de lógica de negocio y UI

---

## 🎯 OBJETIVO

Implementar el módulo de presupuestos completo basándose en la lógica y funcionalidades de BASU, adaptándolo al stack tecnológico actual.

---

## 📊 ANÁLISIS DE BASU - PRESUPUESTOS

### Modelos de Datos (C# → Prisma)

**Origen: `Presupuesto.cs`**
```csharp
- IdPresupuesto (int, PK)
- IdCliente (int?, FK nullable) // Se rellena al aceptar
- IdDatosEmpresa (int?, FK nullable)
- Numero (string, 30) // Formato: yyMMddHHmmss
- Tipo (enum): Autonomo, Empresa, Laboral, Herencia, Rentas, Otros
- Fecha (DateTime)
- TotalConta (decimal)
- TotalLaboral (decimal)
- Total (decimal)
- Estado (string): Borrador, Enviado, Aceptado, Rechazado, Facturado
- FechaEnvio, FechaAceptacion, FechaRechazo (DateTime?)
- Observaciones (string, 1000)

// DATOS DEL CLIENTE (copiados en el momento)
- NombreCliente, NifCif, PersonaContacto, EmailCliente, TelefonoCliente
- ActividadEconomica, TipoCliente

// DATOS CONTABLES/FISCAL
- FacturasMes, NominasMes, Facturacion (decimal?)

// CHECKBOXES DE SERVICIOS (bool)
- Modelo303, Modelo111, Modelo115, Modelo130, Modelo100
- Modelo349, Modelo347
- SolicitudCertificados, CensosAEAT, RecepcionNotificaciones
- EstadisticasINE, SolicitudAyudas

// DESCUENTOS
- AplicaDescuento (bool)
- MotivoDescuento (string)
- TipoDescuento ("Porcentaje" | "Fijo")
- ValorDescuento (decimal?)
- DescuentoCalculado (decimal, [NotMapped])

// CONFIGURACIÓN
- ConLaboralSocial (bool)
- SistemaTributacion (string)
- PeriodoDeclaraciones (string)

// CONTROL DE EDICIÓN MANUAL
- UsarTotalContaManual, UsarTotalLaboralManual, UsarImporteNominaManual (bool)
- ImporteNominaManual (decimal?)

// AUDITORÍA
- UsuarioCreacion, UsuarioModificacion (string)
- FechaCreacion, FechaModificacion (DateTime)

// RELACIONES
- ServiciosAdicionales (List<ServicioAdicional>)
```

**Origen: `ServicioAdicional.cs`**
```csharp
- IdServicioAdicional (int, PK)
- IdPresupuesto (int, FK)
- Nombre (string, 100)
- Descripcion (string, 500)
- Precio (decimal)
- TipoServicio ("Puntual" | "Mensual")
- Incluido (bool)
- FechaCreacion (DateTime)
```

**Origen: `ConfiguracionPresupuestoAutonomo.cs`**
```csharp
- Id (int, PK)
- Nombre (string, 100)

// TRAMOS DE FACTURAS MENSUALES (5 tramos)
- FacturasTramo0 (€/mes, hasta 25): 45€
- FacturasTramo1 (€/mes, 26-50): 55€
- FacturasTramo2 (€/mes, 51-100): 80€
- FacturasTramo3 (€/mes, 101-150): 100€
- FacturasTramo4 (€/mes, +150): 125€

// TRAMOS DE NÓMINAS (6 tramos)
- NominasTramo0 (€/nómina, 1-2): 20€
- NominasTramo1 (€/nómina, 3-9): 18€
- NominasTramo2 (€/nómina, 10-14): 16€
- NominasTramo3 (€/nómina, 15-30): 14€
- NominasTramo4 (€/nómina, 31-60): 12€
- NominasTramo5 (€/nómina, +60): 10€

// SERVICIOS ADICIONALES (11 items)
- IrpfAlquileres: 10€
- IvaIntracomunitario: 10€
- GestionNotificaciones: 5€
- EstadisticasINE: 5€
- SolicitudCertificados: 3€
- Modelo303Precio: 0€
- Modelo111Precio: 0€
- ... (resto en 0€ por defecto)

// PORCENTAJES Y MULTIPLICADORES
- PeriodoMensualPorcentaje: 20%
- PeriodoMensualMinimo: 10€
- EDNPorcentaje: 10%
- ModulosPorcentaje: -10%

// TRAMOS DE FACTURACIÓN ANUAL (7 tramos con multiplicadores)
- FacturacionTramo0 (hasta 50k): multiplicador 1.0
- FacturacionTramo1 (50k-100k): multiplicador 1.10
- FacturacionTramo2 (100k-150k): multiplicador 1.15
- FacturacionTramo3 (150k-200k): multiplicador 1.20
- FacturacionTramo4 (200k-250k): multiplicador 1.25
- FacturacionTramo5 (250k-300k): multiplicador 1.30
- FacturacionTramo6 (+300k): multiplicador 1.40

- Activo (bool)
- FechaCreacion, FechaModificacion (DateTime)
- ModificadoPor (string)
```

### Lógica de Cálculo (PresupuestoCalculoAutonomoService)

**Algoritmo de cálculo de totales:**

1. **Inicializar**: TotalConta = 0, TotalLaboral = 0
2. **Contabilidad - Facturas mensuales**: Según tramo (0-25, 26-50, 51-100, 101-150, +150)
3. **Declaraciones IVA**: +precio si Modelo303/349/347 activados
4. **Declaraciones IRPF**: +precio si Modelo111/115/130/100 activados
5. **Servicios adicionales**: Acumular si flags activados
6. **Multiplicador facturación anual**: TotalConta *= multiplicador según facturación
7. **Laboral/Seg. Social**: Si ConLaboralSocial, calcular por nóminas según tramo
8. **Porcentajes adicionales**:
   - Periodicidad mensual: +20% (mínimo 10€)
   - Sistema tributación EDN: +10%
   - Sistema tributación Módulos: -10%
9. **Servicios adicionales mensuales**: +suma de servicios tipo "Mensual"
10. **Total antes descuento**: Total = TotalConta + TotalLaboral + ServiciosMensuales
11. **Aplicar descuento** (si aplica): Porcentual o Fijo
12. **Total final**: Asegurar >= 0

### Estados y Flujo

**Estados del presupuesto:**
- `Borrador` → Recién creado, editable
- `Enviado` → Enviado al cliente por email con link de aceptación
- `Aceptado` → Cliente aceptó, se puede crear cliente si no existe
- `Rechazado` → Cliente rechazó
- `Facturado` → Ya facturado (opcional)

**Transiciones:**
- Crear → `Borrador`
- Enviar → `Enviado` (genera hash de aceptación, crea PDF, envía email)
- Cliente acepta → `Aceptado`
- Cliente rechaza → `Rechazado`
- Marcar facturado → `Facturado`

### Páginas y Funcionalidades (Razor Pages)

**`Create.cshtml.cs`:**
- Formulario con ~50 campos
- Cálculo dinámico en tiempo real (JavaScript)
- Validaciones backend
- Generación automática de número presupuesto (yyMMddHHmmss)
- Gestión de servicios adicionales (tabla dinámica)

**`Edit.cshtml.cs`:**
- Similar a Create, pero carga presupuesto existente
- Permite edición manual de totales
- Actualiza FechaModificacion

**`Details.cshtml.cs`:**
- Vista de solo lectura
- Botón "Enviar por email"
- Generar y descargar PDF
- Cambio de estado

**`Index.cshtml.cs`:**
- Listado paginado
- Filtros: estado, tipo, cliente, fechas
- Búsqueda por número/nombre
- Acciones: Ver, Editar, Eliminar, Enviar, PDF

---

## 🗂️ MAPEO A ARQUITECTURA DESTINO

### Base de Datos (Prisma Schema)

**YA EXISTEN** estas tablas en el schema actual:
- ✅ `gestoria_budgets` (equivale a `Presupuesto`)
- ✅ `gestoria_budget_items` (equivale a ítems del presupuesto, similar a `ServicioAdicional`)
- ✅ `gestoria_budget_additional_services` (servicios adicionales)
- ✅ `gestoria_budget_statistics_events` (eventos/estadísticas)

**NECESITAMOS AGREGAR/MODIFICAR:**
- Tabla de configuración: `gestoria_budget_autonomo_config` (equivale a `ConfiguracionPresupuestoAutonomo`)
- Posibles campos faltantes en `gestoria_budgets` (verificar con schema)

### Backend (Node.js + Express + Prisma)

**Estructura de carpetas propuesta:**
```
server/
├── services/
│   └── budgets/
│       ├── autonomo-calculator.ts       # Puerto del PresupuestoCalculoAutonomoService
│       ├── pyme-calculator.ts           # Para PYME
│       ├── renta-calculator.ts          # Para Renta
│       └── herencias-calculator.ts      # Para Herencias
├── routes/
│   └── budgets.ts                       # Ya existe, extender endpoints
└── prisma-storage.ts                    # Métodos CRUD para presupuestos
```

**Endpoints a implementar/mejorar:**
- `GET /api/budgets` - Listar (✅ ya existe)
- `POST /api/budgets` - Crear (✅ ya existe, verificar)
- `GET /api/budgets/:id` - Detalle (✅ ya existe)
- `PUT /api/budgets/:id` - Actualizar (✅ ya existe)
- `DELETE /api/budgets/:id` - Eliminar (❓ verificar)
- `POST /api/budgets/:id/send` - Enviar por email (✅ ya existe)
- `GET /api/budgets/:id/pdf` - Generar PDF (✅ ya existe)
- `PATCH /api/budgets/:id/status` - Cambiar estado (❓ agregar)
- `POST /api/budgets/:id/calculate` - Recalcular totales (❓ agregar)
- `GET /api/budgets/config/autonomo` - Obtener configuración (❌ agregar)
- `PUT /api/budgets/config/autonomo` - Actualizar configuración (❌ agregar)

### Frontend (React + shadcn/ui + TanStack Query)

**Estructura de carpetas propuesta:**
```
client/src/
├── pages/
│   └── presupuestos/
│       ├── index.tsx                    # Listado
│       ├── crear.tsx                    # Formulario crear
│       ├── [id]/
│       │   ├── editar.tsx               # Formulario editar
│       │   └── detalles.tsx             # Vista detalle
│       └── configuracion/
│           └── autonomo.tsx             # Config parámetros
├── components/
│   └── presupuestos/
│       ├── PresupuestoForm.tsx          # Formulario reutilizable
│       ├── PresupuestoAutonomoFields.tsx # Campos específicos autónomo
│       ├── ServiciosAdicionalesTable.tsx # Tabla servicios adicionales
│       ├── PresupuestoCalculator.tsx    # Hook para cálculo en tiempo real
│       ├── PresupuestoCard.tsx          # Card para listado
│       └── PresupuestoEstadoBadge.tsx   # Badge de estado
└── hooks/
    └── use-presupuesto-calculator.ts    # Lógica de cálculo frontend
```

**Páginas a crear:**

1. **`/presupuestos`** - Listado
   - Tabla con columnas: Número, Cliente, Tipo, Estado, Fecha, Total
   - Filtros: Estado, Tipo, Fecha desde/hasta
   - Búsqueda por número/cliente
   - Acciones: Ver, Editar, Eliminar, PDF, Enviar

2. **`/presupuestos/crear`** - Crear nuevo
   - Wizard multi-paso:
     - Paso 1: Datos cliente
     - Paso 2: Servicios y configuración
     - Paso 3: Servicios adicionales
     - Paso 4: Resumen y confirmación
   - Cálculo en tiempo real
   - Validaciones inline

3. **`/presupuestos/:id/editar`** - Editar
   - Igual que crear, pero precarga datos
   - Permite edición manual de totales (checkbox)

4. **`/presupuestos/:id/detalles`** - Ver detalle
   - Info completa del presupuesto
   - Desglose de cálculos
   - Historial de cambios de estado
   - Botones: Editar, PDF, Enviar, Cambiar estado

5. **`/presupuestos/configuracion/autonomo`** - Configuración
   - Formulario con todos los parámetros
   - Tabs: Facturas, Nóminas, Servicios, Multiplicadores
   - Vista previa del impacto (gráfico)

---

## 🚀 FASES DE IMPLEMENTACIÓN

### **FASE 1: Base de Datos y Migraciones** (15 min)

**Tareas:**
1. Revisar schema actual de `gestoria_budgets*`
2. Crear migración para tabla `gestoria_budget_autonomo_config`
3. Seed de configuración por defecto
4. Verificar campos faltantes en `gestoria_budgets`

**Entregables:**
- Migración Prisma aplicada
- Datos de configuración por defecto insertados

---

### **FASE 2: Backend - Servicios de Cálculo** (30 min)

**Tareas:**
1. Crear `/server/services/budgets/autonomo-calculator.ts`
   - Port completo de `PresupuestoCalculoAutonomoService.cs`
   - Función `calculateAutonomoBudget(data, config)`
   - Incluir todos los tramos y multiplicadores
2. Crear endpoints de configuración:
   - `GET /api/budgets/config/autonomo`
   - `PUT /api/budgets/config/autonomo`
3. Extender endpoint `POST /api/budgets` para soporte de tipo Autonomo
4. Agregar endpoint `PATCH /api/budgets/:id/status`

**Entregables:**
- Servicio de cálculo funcional
- Endpoints configuración operativos
- Tests básicos de cálculo

---

### **FASE 3: Backend - CRUD Completo** (20 min)

**Tareas:**
1. Revisar/mejorar endpoints existentes
2. Agregar soporte para servicios adicionales
3. Implementar cambio de estado con validaciones
4. Mejorar generación de PDFs (plantilla mejorada)

**Entregables:**
- CRUD completo operativo
- Validaciones backend implementadas

---

### **FASE 4: Frontend - Componentes Base** (45 min)

**Tareas:**
1. Crear hook `use-presupuesto-calculator.ts`
   - Réplica del cálculo backend en frontend
   - Actualizaciones en tiempo real
2. Crear `PresupuestoForm.tsx` (formulario base)
3. Crear `PresupuestoAutonomoFields.tsx`
4. Crear `ServiciosAdicionalesTable.tsx`
5. Crear `PresupuestoEstadoBadge.tsx`

**Entregables:**
- Componentes reutilizables
- Hook de cálculo funcional

---

### **FASE 5: Frontend - Páginas** (60 min)

**Tareas:**
1. Página listado (`/presupuestos`)
2. Página crear (`/presupuestos/crear`)
3. Página editar (`/presupuestos/:id/editar`)
4. Página detalles (`/presupuestos/:id/detalles`)
5. Integrar con navegación principal

**Entregables:**
- Todas las páginas operativas
- Navegación integrada

---

### **FASE 6: Frontend - Configuración** (30 min)

**Tareas:**
1. Página configuración (`/presupuestos/configuracion/autonomo`)
2. Formulario con tabs
3. Validaciones
4. Guardar cambios

**Entregables:**
- Configuración editable desde UI

---

### **FASE 7: Integración y Pruebas** (30 min)

**Tareas:**
1. Pruebas end-to-end:
   - Crear presupuesto autónomo
   - Editar y recalcular
   - Enviar por email
   - Generar PDF
   - Cambiar estado
2. Ajustes de UI/UX
3. Corrección de bugs

**Entregables:**
- Sistema completo funcional
- Casos de prueba documentados

---

### **FASE 8: Limpieza** (5 min)

**Tareas:**
1. Eliminar carpeta `/BASU`
2. Actualizar documentación
3. Commit final

**Entregables:**
- Repositorio limpio
- Documentación actualizada

---

## ⏱️ ESTIMACIÓN TOTAL: **~4 horas**

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad con sistema actual:**
   - Respetar tablas existentes `gestoria_budgets*`
   - Integrar con sistema de clientes actual
   - Usar auth y permisos existentes

2. **Prioridades:**
   - ✅ Tipo "Autonomo" completo (el más usado según BASU)
   - 🔄 Tipos "PYME", "Renta", "Herencias" (implementar después)
   - 📋 Configuración editable desde UI
   - 📧 Envío por email funcional
   - 📄 Generación PDF mejorada

3. **Diferencias respecto a BASU:**
   - No usaremos Razor Pages (usamos React)
   - No usaremos EF Core (usamos Prisma)
   - Mejoraremos la UI con shadcn/ui
   - Añadiremos validaciones en tiempo real
   - Mejor experiencia de usuario (wizard, tooltips, etc.)

4. **Pendiente para futuro:**
   - Tipos de presupuesto adicionales (PYME, Renta, Herencias)
   - Estadísticas y gráficos
   - Notificaciones automáticas
   - Integración con sistema de facturación
   - Exportación a Excel

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Base de Datos
- [ ] Migración tabla configuración
- [ ] Seed configuración por defecto
- [ ] Verificar campos en gestoria_budgets

### Backend
- [ ] Servicio cálculo autónomo
- [ ] Endpoints configuración
- [ ] CRUD completo
- [ ] Validaciones
- [ ] Tests unitarios

### Frontend
- [ ] Hook calculadora
- [ ] Componentes base
- [ ] Página listado
- [ ] Página crear
- [ ] Página editar
- [ ] Página detalles
- [ ] Página configuración
- [ ] Integración navegación

### Pruebas
- [ ] Crear presupuesto
- [ ] Editar presupuesto
- [ ] Recalcular
- [ ] Cambiar estado
- [ ] Generar PDF
- [ ] Enviar email
- [ ] Configurar parámetros

### Limpieza
- [ ] Eliminar /BASU
- [ ] Actualizar docs
- [ ] Commit final

---

**Estado**: 🚀 LISTO PARA EMPEZAR - FASE 1
