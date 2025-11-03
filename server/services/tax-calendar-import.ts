import ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import { calculateDerivedFields } from './tax-calendar-service';
import prisma from '../prisma-client';

interface ImportRow {
  modelCode: string;
  period: string;
  year: number;
  startDate: Date;
  endDate: Date;
  active: boolean;
  locked: boolean;
}

interface ImportResult {
  imported: number;
  errors: string[];
  duplicates: string[];
  success: boolean;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

/**
 * Procesa un archivo Excel y importa los periodos fiscales
 */
export async function processExcelImport(buffer: Buffer, userId: string): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    errors: [],
    duplicates: [],
    success: false,
  };

  try {
    // Asegurar que el buffer es del tipo correcto
    if (!Buffer.isBuffer(buffer)) {
      result.errors.push('El archivo proporcionado no es válido');
      return result;
    }

    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - ExcelJS acepta Buffer pero los tipos genéricos de TS causan conflictos
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Periodos');
    if (!worksheet) {
      result.errors.push('No se encontró la hoja "Periodos" en el archivo Excel');
      return result;
    }

    const rows: ImportRow[] = [];
    const validationErrors: ValidationError[] = [];
    const seenKeys = new Set<string>();

    // Procesar filas (saltando el encabezado y la fila de ejemplos)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1 || rowNumber === 2) return; // Saltar encabezado y fila de ejemplos

      try {
        const rowData = parseRow(row, rowNumber);

        // Validar la fila
        const errors = validateRow(rowData, rowNumber);
        if (errors.length > 0) {
          validationErrors.push(...errors);
          return;
        }

        // Verificar duplicados en el Excel
        const key = `${rowData.modelCode}-${rowData.period}-${rowData.year}`;
        if (seenKeys.has(key)) {
          result.duplicates.push(
            `Fila ${rowNumber}: Duplicado en Excel (${rowData.modelCode} - ${rowData.period} - ${rowData.year})`
          );
          return;
        }
        seenKeys.add(key);

        rows.push(rowData);
      } catch (error: any) {
        validationErrors.push({
          row: rowNumber,
          field: 'general',
          message: error.message,
        });
      }
    });

    // Reportar errores de validación
    if (validationErrors.length > 0) {
      result.errors.push(
        ...validationErrors.map(
          (e) => `Fila ${e.row} [${e.field}]: ${e.message}`
        )
      );
    }

    // Importar filas válidas
    for (const rowData of rows) {
      try {
        // Verificar si ya existe en BD
        const existing = await prisma.tax_calendar.findFirst({
          where: {
            modelCode: rowData.modelCode,
            period: rowData.period,
            year: rowData.year,
          },
        });

        if (existing) {
          result.duplicates.push(
            `${rowData.modelCode} - ${rowData.period} - ${rowData.year} (ya existe en base de datos)`
          );
          continue;
        }

        // Calcular campos derivados
        const derived = calculateDerivedFields(rowData.startDate, rowData.endDate);

        // Crear el registro
        await prisma.tax_calendar.create({
          data: {
            id: randomUUID(),
            modelCode: rowData.modelCode,
            period: rowData.period,
            year: rowData.year,
            startDate: rowData.startDate,
            endDate: rowData.endDate,
            status: derived.status || 'PENDIENTE',
            days_to_start: derived.daysToStart ?? null,
            days_to_end: derived.daysToEnd ?? null,
            active: rowData.active,
            locked: rowData.locked,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        result.imported++;
      } catch (error: any) {
        result.errors.push(
          `Error al importar ${rowData.modelCode} - ${rowData.period} - ${rowData.year}: ${error.message}`
        );
      }
    }

    result.success = result.imported > 0 || (result.errors.length === 0 && result.duplicates.length > 0);
    return result;
  } catch (error: any) {
    result.errors.push(`Error procesando el archivo: ${error.message}`);
    return result;
  }
}

/**
 * Parsea una fila del Excel a un objeto ImportRow
 */
function parseRow(row: ExcelJS.Row, rowNumber: number): ImportRow {
  return {
    modelCode: String(row.getCell(1).value || '').trim().toUpperCase(),
    period: String(row.getCell(2).value || '').trim().toUpperCase(),
    year: parseYear(row.getCell(3).value),
    startDate: parseDateValue(row.getCell(4).value, rowNumber, 'startDate'),
    endDate: parseDateValue(row.getCell(5).value, rowNumber, 'endDate'),
    active: parseBoolean(row.getCell(6).value ?? 'SI'),
    locked: parseBoolean(row.getCell(7).value ?? 'NO'),
  };
}

/**
 * Valida una fila y retorna array de errores
 */
function validateRow(row: ImportRow, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validar campos obligatorios
  if (!row.modelCode) {
    errors.push({ row: rowNumber, field: 'modelCode', message: 'El código del modelo es obligatorio' });
  }

  if (!row.period) {
    errors.push({ row: rowNumber, field: 'period', message: 'El periodo es obligatorio' });
  }

  if (!row.year || row.year < 2000 || row.year > 2100) {
    errors.push({ row: rowNumber, field: 'year', message: 'El año debe estar entre 2000 y 2100' });
  }

  if (!row.startDate || isNaN(row.startDate.getTime())) {
    errors.push({ row: rowNumber, field: 'startDate', message: 'Fecha de inicio inválida' });
  }

  if (!row.endDate || isNaN(row.endDate.getTime())) {
    errors.push({ row: rowNumber, field: 'endDate', message: 'Fecha de fin inválida' });
  }

  // Validar lógica de fechas
  if (row.startDate && row.endDate && row.endDate <= row.startDate) {
    errors.push({
      row: rowNumber,
      field: 'endDate',
      message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    });
  }

  return errors;
}

/**
 * Parsea un valor de fecha de Excel
 */
function parseDateValue(value: any, rowNumber: number, fieldName: string): Date {
  if (!value) {
    throw new Error(`${fieldName} es obligatorio`);
  }

  // Si ya es una fecha (Excel devuelve Date object)
  if (value instanceof Date) {
    return value;
  }

  // Si es un número (fecha de Excel en formato numérico)
  if (typeof value === 'number') {
    // Excel date serial number (días desde 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 24 * 60 * 60 * 1000);
    return date;
  }

  // Si es string, intentar parsear
  if (typeof value === 'string') {
    // Intentar formatos comunes: DD/MM/YYYY, YYYY-MM-DD, etc.
    const formats = [
      // DD/MM/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    ];

    for (const format of formats) {
      const match = value.match(format);
      if (match) {
        if (format.source.startsWith('^(\\d{1,2})')) {
          // DD/MM/YYYY
          const [, day, month, year] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        } else {
          // YYYY-MM-DD
          const [, year, month, day] = match;
          const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) return date;
        }
      }
    }

    // Intentar Date.parse como último recurso
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  throw new Error(`${fieldName}: Formato de fecha inválido. Use DD/MM/YYYY o YYYY-MM-DD`);
}

/**
 * Parsea un valor a número (año)
 */
function parseYear(value: any): number {
  if (typeof value === 'number') {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    if (!isNaN(num)) return num;
  }

  return NaN;
}

/**
 * Parsea un valor booleano (SI/NO, true/false, 1/0)
 */
function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const str = value.toLowerCase().trim();
    return str === 'si' || str === 'yes' || str === 'true' || str === '1' || str === 'sí';
  }

  return false;
}

/**
 * Genera una plantilla Excel para importación
 */
export async function generateTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Asesoría La Llave';
  workbook.created = new Date();

  // Hoja 1: Instrucciones
  const instructionsSheet = workbook.addWorksheet('Instrucciones');
  instructionsSheet.columns = [{ width: 80 }];

  instructionsSheet.addRow(['PLANTILLA DE IMPORTACIÓN - CALENDARIO FISCAL AEAT']);
  instructionsSheet.getRow(1).font = { size: 16, bold: true };
  instructionsSheet.addRow([]);

  instructionsSheet.addRow(['INSTRUCCIONES:']);
  instructionsSheet.getRow(3).font = { bold: true, size: 12 };
  instructionsSheet.addRow(['1. Complete la hoja "Periodos" con los datos fiscales']);
  instructionsSheet.addRow(['2. Los campos marcados con * son OBLIGATORIOS']);
  instructionsSheet.addRow(['3. No elimine ni renombre las columnas']);
  instructionsSheet.addRow(['4. Las fechas deben estar en formato DD/MM/YYYY o YYYY-MM-DD']);
  instructionsSheet.addRow(['5. El campo "active" debe ser SI o NO (por defecto: SI)']);
  instructionsSheet.addRow(['6. El campo "locked" debe ser SI o NO (por defecto: NO)']);
  instructionsSheet.addRow([]);

  instructionsSheet.addRow(['EJEMPLOS DE VALORES VÁLIDOS:']);
  instructionsSheet.getRow(11).font = { bold: true, size: 12 };
  instructionsSheet.addRow(['• Modelo: 303, 111, 130, 190, 347, etc.']);
  instructionsSheet.addRow(['• Periodo: 1T, 2T, 3T, 4T (trimestral), M01-M12 (mensual), ANUAL']);
  instructionsSheet.addRow(['• Año: 2025, 2026, etc.']);
  instructionsSheet.addRow(['• Fecha Inicio: 01/01/2025 o 2025-01-01']);
  instructionsSheet.addRow(['• Fecha Fin: 20/04/2025 o 2025-04-20']);
  instructionsSheet.addRow(['• Activo: SI o NO']);
  instructionsSheet.addRow(['• Bloqueado: SI o NO']);
  instructionsSheet.addRow([]);

  instructionsSheet.addRow(['NOTA IMPORTANTE:']);
  instructionsSheet.getRow(20).font = { bold: true, color: { argb: 'FFFF0000' } };
  instructionsSheet.addRow(['Los campos "status", "days_to_start" y "days_to_end" se calculan automáticamente.']);
  instructionsSheet.addRow(['NO los incluya en la hoja "Periodos".']);

  // Hoja 2: Periodos (datos a importar)
  const periodosSheet = workbook.addWorksheet('Periodos');

  // Encabezados más descriptivos con letras de columna
  periodosSheet.columns = [
    { header: 'A) Código Modelo* (modelCode)', key: 'modelCode', width: 30 },
    { header: 'B) Periodo* (period)', key: 'period', width: 20 },
    { header: 'C) Año* (year)', key: 'year', width: 12 },
    { header: 'D) Fecha Inicio* (startDate)', key: 'startDate', width: 22 },
    { header: 'E) Fecha Fin* (endDate)', key: 'endDate', width: 22 },
    { header: 'F) Activo (active)', key: 'active', width: 15 },
    { header: 'G) Bloqueado (locked)', key: 'locked', width: 18 },
  ];

  // Estilo del encabezado
  periodosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  periodosSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  periodosSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

  // Fila 2: Ejemplos de valores válidos
  periodosSheet.addRow({
    modelCode: 'Ej: 303, 111, 130, 190',
    period: 'Ej: 1T, 2T, M01, ANUAL',
    year: 'Ej: 2025',
    startDate: 'DD/MM/YYYY',
    endDate: 'DD/MM/YYYY',
    active: 'SI o NO',
    locked: 'SI o NO',
  });

  // Estilo de la fila de ejemplos
  periodosSheet.getRow(2).font = { italic: true, color: { argb: 'FF666666' } };
  periodosSheet.getRow(2).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFEF2CB' },
  };
  periodosSheet.getRow(2).alignment = { horizontal: 'left', vertical: 'middle' };

  // Ejemplos (a partir de fila 3)
  periodosSheet.addRow({
    modelCode: '303',
    period: '1T',
    year: 2025,
    startDate: '01/01/2025',
    endDate: '20/04/2025',
    active: 'SI',
    locked: 'NO',
  });

  periodosSheet.addRow({
    modelCode: '303',
    period: '2T',
    year: 2025,
    startDate: '01/04/2025',
    endDate: '20/07/2025',
    active: 'SI',
    locked: 'NO',
  });

  periodosSheet.addRow({
    modelCode: '111',
    period: 'M01',
    year: 2025,
    startDate: '01/01/2025',
    endDate: '20/02/2025',
    active: 'SI',
    locked: 'NO',
  });

  periodosSheet.addRow({
    modelCode: '130',
    period: '1T',
    year: 2025,
    startDate: '01/01/2025',
    endDate: '20/04/2025',
    active: 'SI',
    locked: 'NO',
  });

  // Hoja 3: Modelos de referencia
  const modelosSheet = workbook.addWorksheet('Modelos_Referencia');

  modelosSheet.columns = [
    { header: 'Código', key: 'code', width: 10 },
    { header: 'Nombre', key: 'name', width: 50 },
  ];

  modelosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  modelosSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };

  const modelos = [
    { code: '100', name: 'IRPF - Renta' },
    { code: '111', name: 'Retenciones - Rendimientos del trabajo' },
    { code: '130', name: 'IRPF - Pagos fraccionados' },
    { code: '131', name: 'IRPF - Pagos fraccionados (simplificado)' },
    { code: '180', name: 'IP - Impuesto sobre el Patrimonio' },
    { code: '190', name: 'Resumen anual retenciones' },
    { code: '200', name: 'Impuesto sobre Sociedades' },
    { code: '202', name: 'Pagos fraccionados IS' },
    { code: '303', name: 'IVA - Autoliquidación' },
    { code: '347', name: 'Declaración anual operaciones con terceros' },
    { code: '349', name: 'Declaración recapitulativa (intracomunitaria)' },
    { code: '390', name: 'IVA - Declaración recapitulativa' },
    { code: '720', name: 'Declaración informativa bienes en el exterior' },
  ];

  modelos.forEach((modelo) => {
    modelosSheet.addRow(modelo);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
