import ExcelJS from 'exceljs';
import type { TaxControlMatrixResult } from '../prisma-storage';

function buildExportMatrix(matrix: TaxControlMatrixResult) {
  const header = [
    'Cliente',
    'NIF/CIF',
    'Tipo',
    'Gestor',
    'Correo Gestor',
    ...matrix.models,
  ];

  const rows = matrix.rows.map((row) => {
    const base = [
      row.clientName,
      row.nifCif,
      row.clientType,
      row.gestorName ?? '',
      row.gestorEmail ?? '',
    ];

    const cells = matrix.models.map((code) => {
      const cell = row.cells[code];
      if (!cell) {
        return '';
      }
      const pieces: string[] = [];
      if (cell.active) {
        pieces.push('X');
      }
      if (cell.status) {
        pieces.push(cell.status);
      }
      return pieces.join(' - ');
    });

    return [...base, ...cells];
  });

  return { header, rows };
}

function escapeCsv(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTaxControlCsv(matrix: TaxControlMatrixResult): string {
  const { header, rows } = buildExportMatrix(matrix);
  const lines = [header, ...rows].map((cols) => cols.map(escapeCsv).join(','));
  return lines.join('\n');
}

export async function buildTaxControlXlsx(matrix: TaxControlMatrixResult): Promise<Buffer> {
  const { header, rows } = buildExportMatrix(matrix);
  const worksheetData = [header, ...rows];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Control', {
    properties: { tabColor: { argb: '1E3A8A' } },
  });

  worksheet.addRows(worksheetData);

  worksheet.columns?.forEach((column) => {
    const lengths = column.values
      ?.map((value) => {
        if (typeof value === 'string') return value.length;
        if (value === null || value === undefined) return 0;
        return String(value).length;
      })
      .filter((length): length is number => typeof length === 'number');

    if (!lengths || lengths.length === 0) return;
    const max = Math.max(...lengths, 10);
    column.width = Math.min(max + 2, 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function buildTaxControlExportPreview(matrix: TaxControlMatrixResult) {
  const { header, rows } = buildExportMatrix(matrix);
  return { header, rows };
}
