# Menú de Documentación - Configuración Actualizada

## ✅ Submenú Agregado

He añadido el submenú completo en el sidebar para **Documentación**:

### 📁 Estructura del Menú

```
📂 Documentación
  ├─ 📄 Presupuestos               → /documentacion/presupuestos
  │   (Todos los roles: Admin, Gestor, Solo Lectura)
  │
  ├─ 💰 Parámetros                 → /documentacion/presupuestos/parametros
  │   (Solo Administradores)
  │   - Configuración de precios
  │   - Tarifas base
  │
  └─ 🎨 Plantillas PDF             → /documentacion/presupuestos/plantillas
      (Solo Administradores)
      - Editor visual TipTap
      - Gestión de plantillas
      - Variables dinámicas
```

## 🎯 Iconos Utilizados

- **FileStack** (📄) - Presupuestos
- **DollarSign** (💰) - Parámetros de precios
- **Palette** (🎨) - Plantillas PDF

## 🔐 Permisos

| Opción          | Admin | Gestor | Solo Lectura |
|-----------------|-------|--------|--------------|
| Presupuestos    | ✅    | ✅     | ✅           |
| Parámetros      | ✅    | ❌     | ❌           |
| Plantillas PDF  | ✅    | ❌     | ❌           |

## 📝 Rutas Configuradas

1. ✅ **Lista de Presupuestos**
   - URL: `/documentacion/presupuestos`
   - Componente: `Presupuestos`

2. ✅ **Parámetros de Precios**
   - URL: `/documentacion/presupuestos/parametros`
   - Componente: `ParametrosPresupuestos`

3. ✅ **Gestor de Plantillas PDF**
   - URL: `/documentacion/presupuestos/plantillas`
   - Componente: `BudgetTemplatesManager`

## 🔍 Cómo Acceder

1. Inicia sesión como **Administrador**
2. En el sidebar, haz clic en **"Documentación"**
3. Se desplegará el submenú con las 3 opciones
4. Haz clic en **"Plantillas PDF"** para acceder al editor

## ✨ Características del Editor

Al hacer clic en "Plantillas PDF" accederás a:

- 📋 **Tabla de plantillas** - Ver todas las plantillas existentes
- ➕ **Crear nueva** - Editor visual TipTap completo
- ✏️ **Editar existente** - Modificar plantillas actuales
- 👁️ **Vista previa** - Ver el HTML renderizado
- 📋 **Duplicar** - Copiar plantillas como base
- 🗑️ **Eliminar** - Borrar plantillas (excepto predeterminadas)
- ⭐ **Marcar como predeterminada** - Establecer plantilla por defecto

---

**Compilación:** ✅ Build exitoso en 5.93s
