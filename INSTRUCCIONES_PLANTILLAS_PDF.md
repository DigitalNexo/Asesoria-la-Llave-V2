# 📄 Sistema de Plantillas de Presupuestos en PDF

## ✅ Estado Actual

El sistema de generación de PDFs ha sido configurado para usar **EXCLUSIVAMENTE** plantillas personalizadas de la base de datos.

### ❌ Se han eliminado:
- Todas las plantillas predefinidas (6 plantillas borradas)
- El HTML hardcoded del sistema antiguo

### ✅ Ahora el sistema:
1. **Busca plantillas en la base de datos** según tipo de presupuesto y empresa
2. **Muestra un error claro** si no existe ninguna plantilla activa
3. **Permite crear plantillas personalizadas** con HTML, CSS y variables

---

## 🎨 Cómo Crear tu Primera Plantilla

### Paso 1: Acceder al Gestor de Plantillas

1. Ve a **Documentación** en el menú lateral
2. Selecciona **Presupuestos**
3. Haz clic en la pestaña **"Plantillas"**
4. Pulsa el botón **"Nueva Plantilla"**

### Paso 2: Configurar la Plantilla

Completa los siguientes campos:

- **Nombre**: Ej: "Presupuesto Autónomos Estándar"
- **Tipo de presupuesto**: Selecciona el tipo (PYME, AUTONOMO, RENTA, HERENCIAS)
- **Empresa**: Selecciona la marca (Asesoría La Llave o Gestoría Online)
- **Descripción**: (Opcional) Breve descripción de la plantilla

### Paso 3: Diseñar el Contenido HTML

El editor incluye:

#### 🛠️ Barra de herramientas visual
- Negrita, cursiva, subrayado
- Encabezados (H1, H2, H3)
- Listas, tablas
- Alineación de texto
- Enlaces e imágenes
- Colores y estilos

#### 🔢 Variables Disponibles

Las variables se insertan automáticamente con el formato `{{variable}}`:

**Variables Comunes (todos los presupuestos):**
- `{{codigo}}` - Código del presupuesto (Ej: PRE-2025-001)
- `{{fecha}}` - Fecha de emisión
- `{{nombre_contacto}}` - Nombre del cliente
- `{{email}}` - Email del cliente
- `{{telefono}}` - Teléfono del cliente
- `{{subtotal}}` - Subtotal sin IVA
- `{{iva}}` - Total de IVA
- `{{total}}` - Total con IVA
- `{{observaciones}}` - Observaciones del presupuesto

**Variables para Autónomos:**
- `{{actividad}}` - Actividad del autónomo
- `{{sistema_tributacion}}` - Estimación Directa/Módulos
- `{{facturacion_anual}}` - Facturación anual estimada
- `{{num_facturas}}` - Rango de facturas al año
- `{{nominas_mes}}` - Número de nóminas mensuales

**Variables para Empresas (PYME):**
- `{{nombre_sociedad}}` - Razón social
- `{{actividad}}` - Actividad empresarial
- `{{periodo_declaraciones}}` - Trimestral/Mensual
- `{{facturacion_anual}}` - Facturación anual
- `{{num_asientos}}` - Rango de asientos contables
- `{{nominas_mes}}` - Número de nóminas

**Variables para Renta:**
- `{{tipo_declaracion}}` - Tipo de declaración
- `{{ingresos}}` - Ingresos anuales
- `{{retenciones}}` - Retenciones IRPF

**Variables para Herencias:**
- `{{titulo_sucesorio}}` - Con/sin testamento
- `{{num_herederos}}` - Número de herederos
- `{{herederos_menores}}` - Sí/No
- `{{fincas_madrid}}` - Número de fincas en Madrid
- `{{fincas_otras}}` - Fincas fuera de Madrid
- `{{caudal}}` - Valor del caudal hereditario
- `{{tipo_proceso}}` - Amistoso/Judicial

### Paso 4: Vista Previa en Tiempo Real

El panel derecho muestra una **vista previa automática** con datos de ejemplo. Las variables se reemplazan automáticamente para que veas el resultado final.

### Paso 5: Guardar la Plantilla

1. Haz clic en **"Crear Plantilla"** o **"Actualizar Plantilla"**
2. La plantilla se guardará en la base de datos
3. Automáticamente se marcará como **predeterminada** si es la primera del tipo

---

## ⭐ Gestión de Plantillas

### Establecer como Predeterminada

- Solo puede haber **una plantilla predeterminada** por cada combinación de:
  - Tipo de presupuesto (AUTONOMO, PYME, etc.)
  - Empresa (LA_LLAVE o GESTORIA_ONLINE)
  
- Haz clic en el icono de **estrella** (⭐) para marcar una plantilla como predeterminada

### Activar/Desactivar

- Las plantillas pueden estar **activas** o **inactivas**
- Solo las plantillas **activas y predeterminadas** se usan para generar PDFs

### Duplicar Plantilla

- Haz clic en el icono de **copiar** para crear una copia de una plantilla existente
- Útil para crear variaciones sin partir de cero

### Editar Plantilla

- Haz clic en el icono de **editar** (✏️) para modificar una plantilla
- Los cambios se reflejan inmediatamente en nuevos PDFs generados

### Vista Previa

- Haz clic en el icono de **ojo** (👁️) para ver la plantilla completa
- Se muestra con datos de ejemplo

### Eliminar

- Haz clic en el icono de **papelera** (🗑️) para borrar una plantilla
- **No se pueden eliminar** plantillas marcadas como predeterminadas

---

## 📋 Ejemplo de Plantilla HTML Simple

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .info-box {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 10px 0;
    }
    .label {
      font-weight: bold;
      color: #666;
    }
    .total {
      text-align: right;
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PRESUPUESTO</h1>
    <p>Nº {{codigo}}</p>
  </div>
  
  <div class="info-box">
    <h2>Datos del Cliente</h2>
    <div class="info-row">
      <span class="label">Nombre:</span>
      <span>{{nombre_contacto}}</span>
    </div>
    <div class="info-row">
      <span class="label">Email:</span>
      <span>{{email}}</span>
    </div>
    <div class="info-row">
      <span class="label">Teléfono:</span>
      <span>{{telefono}}</span>
    </div>
    <div class="info-row">
      <span class="label">Fecha:</span>
      <span>{{fecha}}</span>
    </div>
  </div>
  
  <div class="info-box">
    <h2>Información del Negocio</h2>
    <div class="info-row">
      <span class="label">Actividad:</span>
      <span>{{actividad}}</span>
    </div>
    <div class="info-row">
      <span class="label">Sistema Tributación:</span>
      <span>{{sistema_tributacion}}</span>
    </div>
    <div class="info-row">
      <span class="label">Facturación Anual:</span>
      <span>{{facturacion_anual}}</span>
    </div>
  </div>
  
  <div class="total">
    TOTAL: {{total}}
  </div>
  
  <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px;">
    <p>Gracias por su confianza</p>
  </div>
</body>
</html>
```

---

## 🚀 Generar PDFs

Una vez creada la plantilla:

1. Ve a **Documentación > Presupuestos**
2. Selecciona un presupuesto existente
3. Haz clic en **"Descargar PDF"**
4. El sistema:
   - Buscará la plantilla predeterminada activa
   - Reemplazará las variables con datos reales del presupuesto
   - Generará el PDF con Puppeteer
   - Descargará el archivo

### ⚠️ Si no hay plantilla

Si intentas descargar un PDF sin haber creado una plantilla, verás este error:

```
❌ No existe una plantilla activa para generar el PDF.
Por favor, crea una plantilla en la sección de "Plantillas de Presupuestos".
Tipo: AUTONOMO | Empresa: LA_LLAVE
```

**Solución**: Crea una plantilla del tipo y empresa indicados en el error.

---

## 💡 Consejos y Buenas Prácticas

### Diseño Responsive
```css
/* Asegúrate de que el diseño funcione en PDF (A4) */
body {
  width: 210mm;
  height: 297mm;
  margin: 0;
  padding: 15mm;
}
```

### Colores y Branding
```css
/* Usa colores coherentes con tu marca */
.primary {
  color: #2563eb; /* Azul corporativo */
}
.secondary {
  color: #1e40af; /* Azul oscuro */
}
```

### Tipografía Legible
```css
/* Usa tamaños de fuente legibles en PDF */
body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 10pt; /* Tamaño base */
  line-height: 1.5;
}
h1 { font-size: 20pt; }
h2 { font-size: 16pt; }
h3 { font-size: 12pt; }
```

### Saltos de Página
```css
/* Controla saltos de página si tu plantilla es multi-página */
.page-break {
  page-break-after: always;
}
.avoid-break {
  page-break-inside: avoid;
}
```

### Variables no Encontradas
- Si una variable no se reemplaza, aparecerá marcada en amarillo en la vista previa
- Ejemplo: `[variable_desconocida]`
- Revisa que el nombre de la variable sea correcto

---

## 🔧 Solución de Problemas

### El PDF no se genera
1. Verifica que existe una plantilla **activa y predeterminada**
2. Revisa que el tipo de presupuesto coincida con el tipo de plantilla
3. Verifica que la empresa coincida (LA_LLAVE vs GESTORIA_ONLINE)

### Las variables no se reemplazan
1. Asegúrate de usar el formato `{{variable}}` (con llaves dobles)
2. No uses espacios: `{{ variable }}` ❌  `{{variable}}` ✅
3. Verifica que la variable exista para ese tipo de presupuesto

### El diseño se ve mal en PDF
1. Usa medidas absolutas (mm, px) en lugar de relativas (%, em)
2. Prueba con `print-color-adjust: exact;` para mantener colores
3. Evita flexbox/grid complejos, usa tablas para layouts

### No veo la opción "Nueva Plantilla"
1. Verifica que tienes permisos de administrador
2. Asegúrate de estar en Documentación > Presupuestos > Plantillas

---

## 📚 Recursos Adicionales

- **Editor Visual**: Usa la barra de herramientas para dar formato sin escribir HTML
- **Botón de Variables**: Haz clic en "Variable" para ver todas las disponibles
- **Vista Previa Live**: Observa los cambios en tiempo real mientras editas
- **Duplicar**: Crea variaciones de plantillas existentes rápidamente

---

## ✨ ¡Comienza Ahora!

1. Ve a **Documentación > Presupuestos > Plantillas**
2. Haz clic en **"Nueva Plantilla"**
3. Selecciona el tipo **AUTONOMO** y empresa **LA_LLAVE**
4. Usa el ejemplo de HTML de arriba como base
5. Guarda y prueba descargando un PDF

**¡Tu primera plantilla estará lista en 5 minutos!** 🎉
