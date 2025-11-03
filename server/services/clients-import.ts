import ExcelJS from 'exceljs';
import { randomUUID } from 'crypto';
import prisma from '../prisma-client';
import { logger } from '../logger';

logger.info('✅ [DIAGNOSTICO] Módulo server/services/clients-import.ts cargado.');

interface ClientRow {
  nifCif: string;
  razonSocial: string;
  tipo: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  codigoPostal?: string;
  ciudad?: string;
  pais?: string;
  gestor?: string;
  fechaAlta?: Date;
  activo?: boolean;
  notas?: string;
}

interface ValidationError {
  row: number;
  sheet: string;
  field: string;
  message: string;
}

interface ImportResult {
  imported: number;
  updated: number;
  errors: string[];
  success: boolean;
}

/**
 * Valida un NIF/CIF/NIE español
 */
export function validateNIF(nif: string): boolean {
  if (!nif) return false;
  
  const normalized = nif.toUpperCase().replace(/[\s-]/g, '');
  
  // Validar NIE (X, Y, Z seguido de 7 dígitos y letra)
  const nieRegex = /^[XYZ]\d{7}[A-Z]$/;
  if (nieRegex.test(normalized)) {
    const nieMap: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    const replaced = normalized.replace(/^[XYZ]/, (m) => nieMap[m]);
    return validateDNI(replaced);
  }
  
  // Validar DNI (8 dígitos y letra)
  const dniRegex = /^\d{8}[A-Z]$/;
  if (dniRegex.test(normalized)) {
    return validateDNI(normalized);
  }
  
  // Validar CIF
  const cifRegex = /^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/;
  if (cifRegex.test(normalized)) {
    return validateCIF(normalized);
  }
  
  return false;
}

function validateDNI(dni: string): boolean {
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const number = parseInt(dni.substring(0, 8), 10);
  const letter = dni.charAt(8);
  return letters.charAt(number % 23) === letter;
}

function validateCIF(cif: string): boolean {
  const letter = cif.charAt(0);
  const numbers = cif.substring(1, 8);
  const control = cif.charAt(8);
  
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    const digit = parseInt(numbers.charAt(i), 10);
    if (i % 2 === 0) {
      let doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    } else {
      sum += digit;
    }
  }
  
  const unitDigit = sum % 10;
  const controlDigit = unitDigit === 0 ? 0 : 10 - unitDigit;
  const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);
  
  // Algunas organizaciones usan letra, otras número
  if (['N', 'P', 'Q', 'R', 'S', 'W'].includes(letter)) {
    return control === controlLetter;
  }
  return control === controlDigit.toString() || control === controlLetter;
}

/**
 * Genera la plantilla Excel para importación
 */
export async function generateClientsTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  // Hoja 1: Clientes
  const clientsSheet = workbook.addWorksheet('Clientes');
  clientsSheet.columns = [
    { header: 'A) NIF/CIF*', key: 'nifCif', width: 15 },
    { header: 'B) Razón Social*', key: 'razonSocial', width: 30 },
    { header: 'C) Tipo*', key: 'tipo', width: 15 },
    { header: 'D) Email', key: 'email', width: 25 },
    { header: 'E) Teléfono', key: 'telefono', width: 15 },
    { header: 'F) Dirección completa', key: 'direccion', width: 50 },
    { header: 'G) CP', key: 'cp', width: 10 },
    { header: 'H) Ciudad', key: 'ciudad', width: 20 },
    { header: 'I) País', key: 'pais', width: 15 },
    { header: 'J) Gestor', key: 'gestor', width: 20 },
    { header: 'K) Fecha Alta', key: 'fechaAlta', width: 15 },
    { header: 'L) Activo', key: 'activo', width: 10 },
    { header: 'M) Notas', key: 'notas', width: 30 },
  ];
  
  // Estilo del encabezado
  clientsSheet.getRow(1).font = { bold: true };
  clientsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  clientsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Hoja 2: Instrucciones
  const instructionsSheet = workbook.addWorksheet('Instrucciones');
  instructionsSheet.columns = [
    { header: 'GUÍA DE IMPORTACIÓN DE CLIENTES', key: 'guide', width: 80 },
  ];
  
  instructionsSheet.getRow(1).font = { bold: true, size: 14 };
  instructionsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' },
  };
  
  const instructions = [
    '',
    '📋 INSTRUCCIONES DE IMPORTACIÓN DE CLIENTES:',
    '',
    '🎯 OBJETIVO:',
    '• Esta plantilla permite importar los datos básicos de múltiples clientes de forma masiva',
    '• Los modelos fiscales se asignan manualmente después, desde la ficha de cada cliente',
    '',
    '📝 PASOS:',
    '1. Complete la hoja "Clientes" con los datos de sus clientes (empiece en la fila 2)',
    '2. Guarde el archivo',
    '3. Súbalo a través del botón "Importar Clientes"',
    '4. Los campos marcados con * son OBLIGATORIOS',
    '',
    '👤 CAMPOS DE LA HOJA CLIENTES:',
    '',
    '• NIF/CIF* (Columna A):',
    '  - Campo obligatorio (cualquier formato)',
    '  - Ejemplos: 12345678Z (DNI), X1234567L (NIE), A12345678 (CIF)',
    '  - Puede corregir el formato después en la ficha del cliente',
    '',
    '• Razón Social* (Columna B):',
    '  - Nombre completo del cliente o empresa',
    '  - Ejemplo: "Juan Pérez García" o "Empresa Demo SL"',
    '',
    '• Tipo* (Columna C):',
    '  - Debe ser exactamente uno de estos valores:',
    '    → EMPRESA (para sociedades)',
    '    → AUTONOMO (para autónomos)',
    '    → PARTICULAR (para personas físicas)',
    '',
    '• Email (Columna D) - Opcional:',
    '  - Cualquier formato (se puede corregir después)',
    '  - Ejemplo: ejemplo@dominio.com',
    '',
    '• Teléfono (Columna E) - Opcional:',
    '  - Número de contacto del cliente',
    '',
    '• Dirección (Columnas F, G, H, I) - Opcional:',
    '  - F: Dirección completa (calle, número, piso...)',
    '  - G: Código Postal',
    '  - H: Ciudad',
    '  - I: País',
    '  - NOTA: Estos campos se combinarán en un solo campo "Dirección"',
    '',
    '• Gestor (Columna J) - Opcional:',
    '  - Username del usuario responsable en el sistema',
    '  - Si no existe o está vacío, quedará sin asignar',
    '',
    '• Fecha Alta (Columna K) - Opcional:',
    '  - Formato: YYYY-MM-DD (ejemplo: 2025-01-15)',
    '  - Si está vacío, se usa la fecha actual',
    '',
    '• Activo (Columna L) - Opcional:',
    '  - Valores: SI o NO',
    '  - Si está vacío, se considera SI',
    '',
    '• Notas (Columna M) - Opcional:',
    '  - Observaciones sobre el cliente',
    '',
    '✅ EJEMPLOS DE FILAS VÁLIDAS:',
    '',
    '  Fila 2: A12345678 | Empresa Demo SL | EMPRESA | info@demo.com | 912345678 | ...',
    '  Fila 3: 12345678Z | Juan Pérez | AUTONOMO | juan@email.com | 600111222 | ...',
    '  Fila 4: X1234567L | María García | PARTICULAR | maria@gmail.com | | ...',
    '',
    '⚠️ IMPORTANTE:',
    '• Si un cliente con el mismo NIF/CIF ya existe, SE ACTUALIZARÁ con los nuevos datos',
    '• Si el gestor no existe en el sistema, se dejará sin asignar',
    '• Todos los datos se validan ANTES de importar',
    '• Si hay errores, se mostrarán indicando fila y campo problemático',
    '• NO suba este archivo sin agregar sus datos reales',
  ];
  
  instructions.forEach((text, index) => {
    const row = instructionsSheet.addRow({ guide: text });
    if (text.startsWith('📋') || text.startsWith('👤') || text.startsWith('📊') || text.startsWith('🔢') || text.startsWith('⚠️')) {
      row.font = { bold: true, size: 12 };
    }
  });
  
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/**
 * Procesa la importación de clientes desde Excel
 */
export async function processClientsImport(buffer: Buffer, userId: string): Promise<ImportResult> {
  const result: ImportResult = {
    imported: 0,
    updated: 0,
    errors: [],
    success: false,
  };
  
  try {
    if (!Buffer.isBuffer(buffer)) {
      result.errors.push('El archivo proporcionado no es válido');
      return result;
    }
    
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - ExcelJS acepta Buffer pero los tipos genéricos de TS causan conflictos
    await workbook.xlsx.load(buffer);
    
    const clientsSheet = workbook.getWorksheet('Clientes');
    
    if (!clientsSheet) {
      result.errors.push('No se encontró la hoja "Clientes" en el archivo');
      return result;
    }
    
    // Parsear clientes
    const clients: ClientRow[] = [];
    const validationErrors: ValidationError[] = [];
    
    clientsSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezado
      
      const nifCif = String(row.getCell(1).value || '').trim();
      const razonSocial = String(row.getCell(2).value || '').trim();
      const tipo = String(row.getCell(3).value || '').trim().toUpperCase();
      
      if (!nifCif && !razonSocial) return; // Fila vacía
      
      // Extraer email de forma segura (puede ser texto o objeto de Excel)
      const emailCell = row.getCell(4).value;
      let email: string | undefined = undefined;
      if (emailCell) {
        if (typeof emailCell === 'string') {
          email = emailCell.trim();
        } else if (typeof emailCell === 'object' && emailCell !== null && 'text' in emailCell) {
          email = String((emailCell as any).text || '').trim();
        } else {
          email = String(emailCell).trim();
        }
        if (email === '' || email === '[object Object]') email = undefined;
      }
      
      clients.push({
        nifCif,
        razonSocial,
        tipo,
        email,
        telefono: String(row.getCell(5).value || '').trim() || undefined,
        direccion: String(row.getCell(6).value || '').trim() || undefined,
        codigoPostal: String(row.getCell(7).value || '').trim() || undefined,
        ciudad: String(row.getCell(8).value || '').trim() || undefined,
        pais: String(row.getCell(9).value || '').trim() || undefined,
        gestor: String(row.getCell(10).value || '').trim() || undefined,
        fechaAlta: parseDateCell(row.getCell(11).value),
        activo: parseActiveCell(row.getCell(12).value),
        notas: String(row.getCell(13).value || '').trim() || undefined,
      });
    });
    
    // Validar clientes
    const clientsMap = new Map<string, ClientRow>();
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const rowNumber = i + 2; // +2 porque empezamos en fila 2 (después del header)
      
      const errors = await validateClientRow(client, rowNumber);
      validationErrors.push(...errors);
      
      if (errors.length === 0) {
        clientsMap.set(client.nifCif, client);
      }
    }
    
    // Si hay errores, no importar
    if (validationErrors.length > 0) {
      result.errors = validationErrors.map(e => `[${e.sheet}] Fila ${e.row}, ${e.field}: ${e.message}`);
      return result;
    }
    
    // Obtener usuarios para validar gestores
    const users = await prisma.users.findMany({
      select: { id: true, username: true },
    });
    const usersMap = new Map(users.map(u => [u.username.toLowerCase(), u.id]));
    
    // Importar clientes y modelos
    for (const clientData of clientsMap.values()) {
      try {
        const gestorId = clientData.gestor ? usersMap.get(clientData.gestor.toLowerCase()) || null : null;
        
        // Buscar cliente existente
        const existing = await prisma.clients.findFirst({
          where: { nifCif: clientData.nifCif },
        });
        
        // Construir dirección completa si hay datos de ciudad/país
        let direccionCompleta = clientData.direccion || '';
        if (clientData.codigoPostal || clientData.ciudad || clientData.pais) {
          const partes = [
            direccionCompleta,
            clientData.codigoPostal,
            clientData.ciudad,
            clientData.pais
          ].filter(p => p && p.trim());
          direccionCompleta = partes.join(', ');
        }
        
        const clientPayload: any = {
          razonSocial: clientData.razonSocial,
          nifCif: clientData.nifCif,
          tipo: clientData.tipo,
          email: clientData.email || null,
          telefono: clientData.telefono || null,
          direccion: direccionCompleta || null,
          responsableAsignado: gestorId,
          fechaAlta: clientData.fechaAlta || new Date(),
          isActive: clientData.activo !== false,
          notes: clientData.notas || null,
        };
        
        let clientId: string;
        
        if (existing) {
          // Actualizar cliente existente
          await prisma.clients.update({
            where: { id: existing.id },
            data: clientPayload,
          });
          clientId = existing.id;
          result.updated++;
        } else {
          // Crear nuevo cliente
          const newClient = await prisma.clients.create({
            data: {
              id: randomUUID(),
              ...clientPayload,
            },
          });
          clientId = newClient.id;
          result.imported++;
        }
      } catch (error: any) {
        result.errors.push(`Error al importar cliente ${clientData.nifCif}: ${error.message}`);
      }
    }
    
    result.success = result.imported > 0 || result.updated > 0;
    return result;
  } catch (error: any) {
    result.errors.push(`Error procesando el archivo: ${error.message}`);
    return result;
  }
}

async function validateClientRow(client: ClientRow, rowNumber: number): Promise<ValidationError[]> {
  const errors: ValidationError[] = [];
  
  // NIF obligatorio (pero no validamos formato - se puede corregir después)
  if (!client.nifCif) {
    errors.push({
      row: rowNumber,
      sheet: 'Clientes',
      field: 'NIF/CIF',
      message: 'Campo obligatorio',
    });
  }
  // NOTA: No validamos el formato del NIF/CIF para permitir importar y corregir después
  
  // Razón social obligatoria
  if (!client.razonSocial) {
    errors.push({
      row: rowNumber,
      sheet: 'Clientes',
      field: 'Razón Social',
      message: 'Campo obligatorio',
    });
  }
  
  // Tipo válido
  const validTypes = ['EMPRESA', 'AUTONOMO', 'PARTICULAR'];
  if (!client.tipo) {
    errors.push({
      row: rowNumber,
      sheet: 'Clientes',
      field: 'Tipo',
      message: 'Campo obligatorio',
    });
  } else if (!validTypes.includes(client.tipo)) {
    errors.push({
      row: rowNumber,
      sheet: 'Clientes',
      field: 'Tipo',
      message: `Debe ser uno de: ${validTypes.join(', ')}`,
    });
  }
  
  // NOTA: No validamos el email para permitir importar y corregir después
  
  return errors;
}

function parseDateCell(value: any): Date | undefined {
  if (!value) return undefined;
  
  if (value instanceof Date) return value;
  
  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  if (typeof value === 'number') {
    // Excel almacena fechas como números (días desde 1900-01-01)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (value - 2) * 86400000);
    return date;
  }
  
  return undefined;
}

function parseActiveCell(value: any): boolean {
  if (typeof value === 'boolean') return value;
  
  const str = String(value || '').trim().toUpperCase();
  if (str === 'SI' || str === 'SÍ' || str === 'YES' || str === 'TRUE' || str === '1') return true;
  if (str === 'NO' || str === 'FALSE' || str === '0') return false;
  
  return true; // Por defecto activo
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
