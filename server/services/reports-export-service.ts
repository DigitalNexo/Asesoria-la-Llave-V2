import ExcelJS from 'exceljs';
import { getReportsKpis, getSummaryByModel, getSummaryByAssignee, getFilings, type ReportsFilters } from './reports-service';

export async function generateExcelReport(filters: ReportsFilters) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Asesoría La Llave';
  workbook.created = new Date();

  // Obtener todos los datos
  const [kpis, summaryModel, summaryAssignee, filings] = await Promise.all([
    getReportsKpis(filters),
    getSummaryByModel(filters),
    getSummaryByAssignee(filters),
    getFilings({ ...filters, page: 1, size: 1000 }),
  ]);

  // Hoja 1: Resumen Ejecutivo
  const summarySheet = workbook.addWorksheet('Resumen Ejecutivo', {
    properties: { tabColor: { argb: 'FF4472C4' } }
  });

  // Título
  summarySheet.mergeCells('A1:F1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `Reporte de Impuestos - Año ${filters.year ?? 'Todos'}`;
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF4472C4' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 30;

  // Fecha
  summarySheet.mergeCells('A2:F2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = `Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`;
  dateCell.font = { italic: true, color: { argb: 'FF7F7F7F' } };
  dateCell.alignment = { horizontal: 'center' };

  summarySheet.addRow([]);

  // KPIs principales
  summarySheet.addRow(['MÉTRICAS PRINCIPALES']).font = { bold: true, size: 14 };
  summarySheet.addRow([]);

  const kpiData = [
    ['Métrica', 'Valor', 'Descripción'],
    ['Total Declaraciones', kpis.total, 'Total de declaraciones en el periodo'],
    ['Presentadas', kpis.presented, 'Declaraciones completadas'],
    ['En Progreso', kpis.inProgress, 'Declaraciones calculadas'],
    ['Pendientes', kpis.pending, 'Declaraciones sin iniciar'],
    ['% Completado', `${kpis.completionRate}%`, 'Porcentaje de avance'],
    ['Score Eficiencia', `${kpis.efficiencyScore}%`, 'Calidad y velocidad global'],
    ['% Cumplimiento', `${kpis.onTimePct}%`, 'Declaraciones a tiempo'],
    ['Lead Time Promedio', `${kpis.leadTimeAvg} días`, 'Tiempo desde inicio hasta presentación'],
    ['Tiempo Procesamiento', `${kpis.processingTimeAvg} días`, 'Tiempo desde creación hasta presentación'],
    ['Atrasadas', kpis.overdue, 'Declaraciones vencidas'],
    ['Vencen en ≤3 días', kpis.dueIn3, 'Urgentes'],
    ['Vencen en ≤7 días', kpis.dueIn7, 'Requieren atención'],
  ];

  const kpiStartRow = summarySheet.rowCount + 1;
  kpiData.forEach((row, idx) => {
    const addedRow = summarySheet.addRow(row);
    if (idx === 0) {
      addedRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
    } else {
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFF2F2F2' : 'FFFFFFFF' }
      };
    }
  });

  summarySheet.getColumn(1).width = 25;
  summarySheet.getColumn(2).width = 15;
  summarySheet.getColumn(3).width = 40;

  // Bordes
  for (let i = kpiStartRow; i <= summarySheet.rowCount; i++) {
    ['A', 'B', 'C'].forEach(col => {
      const cell = summarySheet.getCell(`${col}${i}`);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }

  // Hoja 2: Resumen por Modelo
  const modelSheet = workbook.addWorksheet('Por Modelo', {
    properties: { tabColor: { argb: 'FF70AD47' } }
  });

  modelSheet.addRow(['RESUMEN POR MODELO AEAT']).font = { bold: true, size: 14 };
  modelSheet.addRow([]);

  const modelHeaders = ['Modelo', 'Total', 'Pendientes', 'Calculados', 'Presentados', '% Avance', 'Atrasados', 'Lead Time'];
  const headerRow = modelSheet.addRow(modelHeaders);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' }
  };

  summaryModel.forEach((model: any) => {
    const row = modelSheet.addRow([
      model.modelCode,
      model.total,
      model.pending,
      model.inProgress,
      model.presented,
      `${model.advancePct}%`,
      model.overdue,
      `${model.leadTimeAvg}d`
    ]);

    // Color condicional para avance
    const advanceCell = row.getCell(6);
    if (model.advancePct >= 80) {
      advanceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    } else if (model.advancePct >= 50) {
      advanceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    } else {
      advanceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    }
  });

  modelSheet.columns.forEach(col => col.width = 15);
  modelSheet.getColumn(1).width = 12;

  // Hoja 3: Productividad por Gestor
  const gestorSheet = workbook.addWorksheet('Por Gestor', {
    properties: { tabColor: { argb: 'FFFFC000' } }
  });

  gestorSheet.addRow(['ANÁLISIS DE PRODUCTIVIDAD POR GESTOR']).font = { bold: true, size: 14 };
  gestorSheet.addRow([]);

  const gestorHeaders = ['Gestor', 'Total', 'Completadas', 'Pendientes', 'En Progreso', '% Comp.', '% A Tiempo', 'Atrasadas', 'Score Efic.'];
  const gestorHeaderRow = gestorSheet.addRow(gestorHeaders);
  gestorHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  gestorHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' }
  };

  summaryAssignee.forEach((gestor: any) => {
    const row = gestorSheet.addRow([
      gestor.assigneeName,
      gestor.assigned,
      gestor.presented,
      gestor.pending,
      gestor.inProgress,
      `${gestor.advancePct}%`,
      `${gestor.onTrack}%`,
      gestor.overdue,
      `${Math.round((gestor.advancePct + gestor.onTrack) / 2)}%`
    ]);

    // Color condicional para score
    const scoreCell = row.getCell(9);
    const score = (gestor.advancePct + gestor.onTrack) / 2;
    if (score >= 80) {
      scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    } else if (score >= 60) {
      scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    } else {
      scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    }
  });

  gestorSheet.columns.forEach(col => col.width = 15);
  gestorSheet.getColumn(1).width = 25;

  // Hoja 4: Detalle de Declaraciones
  const detailSheet = workbook.addWorksheet('Detalle', {
    properties: { tabColor: { argb: 'FFED7D31' } }
  });

  detailSheet.addRow(['DETALLE DE DECLARACIONES']).font = { bold: true, size: 14 };
  detailSheet.addRow([]);

  const detailHeaders = ['Modelo', 'Periodo', 'Cliente', 'Gestor', 'Estado', 'Presentada', 'Vencimiento', 'Días Rest.', 'Ciclo'];
  const detailHeaderRow = detailSheet.addRow(detailHeaders);
  detailHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFED7D31' }
  };

  filings.items.forEach((filing: any) => {
    const row = detailSheet.addRow([
      filing.modelCode,
      filing.periodLabel,
      filing.cliente,
      filing.gestor,
      filing.status,
      filing.presentedAt ? new Date(filing.presentedAt).toLocaleDateString('es-ES') : '',
      filing.dueDate ? new Date(filing.dueDate).toLocaleDateString('es-ES') : '',
      filing.daysRemaining ?? '',
      filing.cycleDays ?? ''
    ]);

    // Color condicional para estado
    const statusCell = row.getCell(5);
    if (filing.status === 'PRESENTED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6EFCE' } };
    } else if (filing.status === 'IN_PROGRESS') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
    } else {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
    }

    // Color para días restantes
    if (filing.daysRemaining !== null && filing.status !== 'PRESENTED') {
      const daysCell = row.getCell(8);
      if (filing.daysRemaining < 0) {
        daysCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
        daysCell.font = { bold: true, color: { argb: 'FF9C0006' } };
      } else if (filing.daysRemaining <= 3) {
        daysCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEB9C' } };
      }
    }
  });

  detailSheet.columns.forEach(col => col.width = 15);
  detailSheet.getColumn(3).width = 30; // Cliente
  detailSheet.getColumn(4).width = 20; // Gestor

  // Auto-filtros en todas las hojas de datos
  modelSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: modelSheet.rowCount, column: 8 }
  };

  gestorSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: gestorSheet.rowCount, column: 9 }
  };

  detailSheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: detailSheet.rowCount, column: 9 }
  };

  return workbook;
}

export async function generateAdvancedExcelBuffer(filters: ReportsFilters): Promise<Buffer> {
  const workbook = await generateExcelReport(filters);
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
