export interface ManualTemplate {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  contenidoHtml: string;
  etiquetas: string[];
}

export const manualTemplates: ManualTemplate[] = [
  {
    id: "procedimiento-basico",
    nombre: "Procedimiento Básico",
    descripcion: "Plantilla para documentar un procedimiento paso a paso",
    categoria: "General",
    etiquetas: ["procedimiento"],
    contenidoHtml: `
      <h1>Título del Procedimiento</h1>
      <p><strong>Objetivo:</strong> Describir el objetivo del procedimiento</p>
      <p><strong>Alcance:</strong> Definir el alcance y limitaciones</p>
      
      <h2>Requisitos Previos</h2>
      <ul>
        <li>Requisito 1</li>
        <li>Requisito 2</li>
        <li>Requisito 3</li>
      </ul>

      <h2>Procedimiento</h2>
      <ol>
        <li><strong>Paso 1:</strong> Descripción detallada del primer paso</li>
        <li><strong>Paso 2:</strong> Descripción detallada del segundo paso</li>
        <li><strong>Paso 3:</strong> Descripción detallada del tercer paso</li>
      </ol>

      <h2>Resultados Esperados</h2>
      <p>Describir los resultados que se deben obtener al completar el procedimiento</p>

      <h2>Solución de Problemas</h2>
      <table>
        <thead>
          <tr>
            <th>Problema</th>
            <th>Causa</th>
            <th>Solución</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Problema 1</td>
            <td>Causa probable</td>
            <td>Solución recomendada</td>
          </tr>
        </tbody>
      </table>
    `
  },
  {
    id: "modelo-fiscal",
    nombre: "Guía Modelo Fiscal",
    descripcion: "Plantilla para documentar la presentación de modelos fiscales",
    categoria: "Fiscal",
    etiquetas: ["fiscal", "impuestos"],
    contenidoHtml: `
      <h1>Modelo [Número] - [Nombre del Modelo]</h1>
      
      <h2>Información General</h2>
      <p><strong>Descripción:</strong> Breve descripción del modelo fiscal</p>
      <p><strong>Periodicidad:</strong> Trimestral / Mensual / Anual</p>
      <p><strong>Plazo de presentación:</strong> Especificar fechas límite</p>

      <h2>¿Quién debe presentarlo?</h2>
      <ul>
        <li>Tipo de contribuyente 1</li>
        <li>Tipo de contribuyente 2</li>
      </ul>

      <h2>Documentación Necesaria</h2>
      <ol>
        <li>Documento 1</li>
        <li>Documento 2</li>
        <li>Documento 3</li>
      </ol>

      <h2>Procedimiento de Cálculo</h2>
      <h3>Paso 1: Cálculo de Base Imponible</h3>
      <p>Explicación detallada</p>

      <h3>Paso 2: Aplicación de Tipos</h3>
      <p>Explicación detallada</p>

      <h3>Paso 3: Deducciones</h3>
      <p>Explicación detallada</p>

      <h2>Presentación Telemática</h2>
      <ol>
        <li>Acceder a la sede electrónica</li>
        <li>Seleccionar el modelo correspondiente</li>
        <li>Completar los datos requeridos</li>
        <li>Revisar y confirmar</li>
      </ol>

      <h2>Notas Importantes</h2>
      <blockquote>
        <p>⚠️ Consideraciones especiales y advertencias</p>
      </blockquote>
    `
  },
  {
    id: "normativa-laboral",
    nombre: "Normativa Laboral",
    descripcion: "Plantilla para documentar normativa y procedimientos laborales",
    categoria: "Laboral",
    etiquetas: ["laboral", "normativa"],
    contenidoHtml: `
      <h1>Normativa Laboral - [Título]</h1>
      
      <h2>Marco Legal</h2>
      <p><strong>Normativa aplicable:</strong></p>
      <ul>
        <li>Ley / Real Decreto 1</li>
        <li>Ley / Real Decreto 2</li>
      </ul>

      <h2>Ámbito de Aplicación</h2>
      <p>Definir a quién aplica esta normativa</p>

      <h2>Obligaciones del Empresario</h2>
      <ol>
        <li>Obligación 1: Descripción</li>
        <li>Obligación 2: Descripción</li>
        <li>Obligación 3: Descripción</li>
      </ol>

      <h2>Derechos del Trabajador</h2>
      <ol>
        <li>Derecho 1: Descripción</li>
        <li>Derecho 2: Descripción</li>
        <li>Derecho 3: Descripción</li>
      </ol>

      <h2>Procedimiento</h2>
      <h3>Paso 1: [Nombre del paso]</h3>
      <p>Descripción detallada</p>

      <h3>Paso 2: [Nombre del paso]</h3>
      <p>Descripción detallada</p>

      <h2>Sanciones</h2>
      <table>
        <thead>
          <tr>
            <th>Infracción</th>
            <th>Tipo</th>
            <th>Sanción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Infracción leve</td>
            <td>Leve</td>
            <td>Multa de X a Y €</td>
          </tr>
          <tr>
            <td>Infracción grave</td>
            <td>Grave</td>
            <td>Multa de X a Y €</td>
          </tr>
        </tbody>
      </table>
    `
  },
  {
    id: "guia-rapida",
    nombre: "Guía Rápida",
    descripcion: "Plantilla para crear guías rápidas de referencia",
    categoria: "General",
    etiquetas: ["guía", "referencia"],
    contenidoHtml: `
      <h1>Guía Rápida - [Título]</h1>
      
      <h2>Resumen</h2>
      <p>Breve descripción de lo que cubre esta guía</p>

      <h2>Acciones Frecuentes</h2>
      <h3>Acción 1: [Nombre]</h3>
      <ol>
        <li>Paso 1</li>
        <li>Paso 2</li>
        <li>Paso 3</li>
      </ol>

      <h3>Acción 2: [Nombre]</h3>
      <ol>
        <li>Paso 1</li>
        <li>Paso 2</li>
        <li>Paso 3</li>
      </ol>

      <h2>Shortcuts / Atajos</h2>
      <table>
        <thead>
          <tr>
            <th>Acción</th>
            <th>Método Rápido</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Acción 1</td>
            <td>Descripción del atajo</td>
          </tr>
          <tr>
            <td>Acción 2</td>
            <td>Descripción del atajo</td>
          </tr>
        </tbody>
      </table>

      <h2>Preguntas Frecuentes</h2>
      <h3>¿Pregunta 1?</h3>
      <p>Respuesta 1</p>

      <h3>¿Pregunta 2?</h3>
      <p>Respuesta 2</p>

      <h2>Enlaces Útiles</h2>
      <ul>
        <li><a href="#">Recurso 1</a></li>
        <li><a href="#">Recurso 2</a></li>
      </ul>
    `
  },
  {
    id: "politica-empresa",
    nombre: "Política de Empresa",
    descripcion: "Plantilla para documentar políticas internas",
    categoria: "Organización",
    etiquetas: ["política", "normativa"],
    contenidoHtml: `
      <h1>Política de [Título]</h1>
      
      <h2>Propósito</h2>
      <p>Descripción del propósito de esta política</p>

      <h2>Alcance</h2>
      <p>Define a quién aplica esta política</p>

      <h2>Definiciones</h2>
      <ul>
        <li><strong>Término 1:</strong> Definición</li>
        <li><strong>Término 2:</strong> Definición</li>
      </ul>

      <h2>Política</h2>
      <h3>Principios Generales</h3>
      <ol>
        <li>Principio 1</li>
        <li>Principio 2</li>
        <li>Principio 3</li>
      </ol>

      <h3>Normas Específicas</h3>
      <ol>
        <li>Norma 1: Descripción detallada</li>
        <li>Norma 2: Descripción detallada</li>
      </ol>

      <h2>Responsabilidades</h2>
      <table>
        <thead>
          <tr>
            <th>Rol</th>
            <th>Responsabilidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Dirección</td>
            <td>Descripción de responsabilidades</td>
          </tr>
          <tr>
            <td>Empleados</td>
            <td>Descripción de responsabilidades</td>
          </tr>
        </tbody>
      </table>

      <h2>Incumplimiento</h2>
      <p>Consecuencias del incumplimiento de esta política</p>

      <h2>Revisión</h2>
      <p>Esta política será revisada [periodicidad]</p>
    `
  }
];
