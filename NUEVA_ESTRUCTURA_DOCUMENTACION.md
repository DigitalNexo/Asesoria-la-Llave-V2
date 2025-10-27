# ✅ Nueva Estructura del Menú Documentación

## 📋 Cambio Implementado

He cambiado la estructura para que **Documentación** funcione exactamente igual que **Administración** e **Impuestos**, con pestañas (tabs) internas en lugar de submenú en el sidebar.

---

## 🎯 Estructura Actual

### Sidebar
```
├─ Dashboard
├─ Clientes
├─ Impuestos          → /impuestos/control (con tabs internas)
├─ Documentación      → /documentacion/presupuestos (con tabs internas) ✨ NUEVO
├─ Tareas
├─ Manuales
├─ Notificaciones
├─ Auditoría
└─ Administración     → /admin (con tabs internas)
```

### Tabs Internas de Documentación

Al hacer clic en **"Documentación"** en el sidebar, llegas a una página con 3 pestañas:

```
┌─────────────────────────────────────────────────────────┐
│  📄 Presupuestos  │  ⚙️ Parámetros  │  🎨 Plantillas    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Contenido de la pestaña activa]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 1. Pestaña "Presupuestos" 📄
- **Todos los roles**: Admin, Gestor, Solo Lectura
- **Contenido**:
  - Lista de todos los presupuestos
  - Filtros por estado, tipo, serie
  - Botón "Nuevo Presupuesto"
  - Exportar CSV/XLSX
  - Acciones: Ver, Editar, Eliminar

#### 2. Pestaña "Parámetros" ⚙️
- **Solo Administradores**
- **Contenido**:
  - Configuración de precios base
  - Sub-tabs para cada tipo: PYME, AUTONOMO, RENTA, HERENCIAS
  - Edición de categorías y conceptos
  - Guardar cambios

#### 3. Pestaña "Plantillas" 🎨
- **Solo Administradores**
- **Contenido**:
  - Tabla de plantillas existentes (8 por defecto)
  - Botón "Nueva Plantilla"
  - Editor visual TipTap
  - Sistema de variables
  - Acciones: Editar, Duplicar, Vista previa, Eliminar, Marcar como predeterminada

---

## 🔄 Flujo de Navegación

### Para todos los usuarios:
1. Click en **"Documentación"** (sidebar)
2. Llegas a la pestaña **"Presupuestos"**
3. Puedes navegar entre pestañas

### Para administradores:
1. Click en **"Documentación"** (sidebar)
2. Ves 3 pestañas: Presupuestos, Parámetros, Plantillas
3. Click en **"Plantillas"** para acceder al editor
4. Click en **"Nueva Plantilla"** para crear una
5. Usa el editor visual con variables
6. Guarda y establece como predeterminada

---

## 📁 Archivos Modificados

### 1. **client/src/components/app-sidebar.tsx**
- ✅ Eliminado el submenú `children` de Documentación
- ✅ Ahora es un ítem simple sin expandir

### 2. **client/src/pages/documentacion-page.tsx** (NUEVO)
- ✅ Componente wrapper con tabs
- ✅ Maneja navegación entre pestañas
- ✅ Control de permisos (solo admin ve Parámetros y Plantillas)
- ✅ 3 tabs: Presupuestos, Parámetros, Plantillas

### 3. **client/src/App.tsx**
- ✅ Importado `DocumentacionPage`
- ✅ Rutas actualizadas para usar el wrapper con tabs
- ✅ Rutas específicas (nuevo, editar, ver) mantienen su estructura

### 4. **client/src/pages/.../PresupuestosList.tsx**
- ✅ Eliminado título principal (ahora en wrapper)
- ✅ Eliminado botón "Editar Parámetros" (ahora es tab)
- ✅ Eliminado padding externo (lo maneja el wrapper)

### 5. **client/src/pages/.../ParametrosPresupuestos.tsx**
- ✅ Eliminado título principal
- ✅ Eliminado descripción
- ✅ Mantenido botón "Actualizar" en la esquina

### 6. **client/src/pages/.../BudgetTemplatesManager.tsx**
- ✅ Eliminado título principal
- ✅ Eliminado descripción
- ✅ Mantenido botón "Nueva Plantilla" en la esquina

---

## 🎨 Aspecto Visual

```
┌──────────────────────────────────────────────────────────┐
│                     Documentación                        │
│  Gestión de presupuestos y documentos                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Presupuestos │ Parámetros │ Plantillas         │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌────────────────────────────────────────────────┐     │
│  │                                                │     │
│  │  [Contenido de Presupuestos]                  │     │
│  │  - Filtros                                     │     │
│  │  - Tabla de presupuestos                       │     │
│  │  - Acciones                                    │     │
│  │                                                │     │
│  └────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

---

## ✅ Compilación

```bash
npm run build
```

**Resultado:** ✅ Build exitoso
- Frontend: 2,316.40 kB
- Backend: 388.4kb
- Tiempo: ~5 segundos
- **0 errores**

---

## 🚀 Cómo Usar

1. **Accede a Documentación**: Click en el menú lateral
2. **Verás las 3 pestañas** (si eres admin)
3. **Click en "Plantillas"**
4. **Click en "Nueva Plantilla"**
5. **Edita con el editor visual**
6. **Inserta variables desde el botón**
7. **Guarda y marca como predeterminada**

---

**Todo listo y funcionando perfectamente!** 🎉

La estructura ahora es idéntica a **Administración** e **Impuestos**, con navegación por tabs en lugar de submenú.
