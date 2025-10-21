import test from "node:test";
import assert from "node:assert/strict";
import { validateTaxAssignmentInput, isEffectiveActive } from "../shared/tax-rules";
import type { TaxControlMatrixResult } from "../server/prisma-storage";
import ExcelJS from "exceljs";
import { buildTaxControlCsv, buildTaxControlExportPreview, buildTaxControlXlsx } from "../server/services/tax-control-utils";

test("validateTaxAssignmentInput rejects modelos 200/202 para tipos no empresa", () => {
  assert.throws(() =>
    validateTaxAssignmentInput({
      clientType: "AUTONOMO",
      taxModelCode: "200",
      periodicity: "ANUAL",
    })
  );

  assert.throws(() =>
    validateTaxAssignmentInput({
      clientType: "PARTICULAR",
      taxModelCode: "202",
      periodicity: "ESPECIAL_FRACCIONADO",
    })
  );
});

test("validateTaxAssignmentInput permite modelos 200/202 para empresas", () => {
  assert.doesNotThrow(() =>
    validateTaxAssignmentInput({
      clientType: "EMPRESA",
      taxModelCode: "200",
      periodicity: "ANUAL",
    })
  );

  assert.doesNotThrow(() =>
    validateTaxAssignmentInput({
      clientType: "EMPRESA",
      taxModelCode: "202",
      periodicity: "ESPECIAL_FRACCIONADO",
    })
  );
});

test("isEffectiveActive calcula estado efectivo correctamente", () => {
  assert.equal(
    isEffectiveActive({
      endDate: "2024-12-31",
      activeFlag: true,
    }),
    false
  );

  assert.equal(
    isEffectiveActive({
      endDate: null,
      activeFlag: true,
    }),
    true
  );

  assert.equal(
    isEffectiveActive({
      endDate: null,
      activeFlag: false,
    }),
    false
  );
});

const sampleMatrix: TaxControlMatrixResult = {
  rows: [
    {
      clientId: "1",
      clientName: "Empresa Uno",
      nifCif: "B12345678",
      clientType: "EMPRESA",
      gestorId: "g1",
      gestorName: "María Gestora",
      gestorEmail: "maria@gestora.com",
      cells: {
        "200": {
          assignmentId: "a1",
          active: true,
          periodicity: "ANUAL",
          status: "PRESENTADO",
        },
        "202": {
          assignmentId: "a2",
          active: false,
          periodicity: "ESPECIAL_FRACCIONADO",
          status: "NOT_STARTED",
        },
      },
    },
  ],
  models: ["200", "202"],
  metadata: {
    year: 2025,
    quarter: 1,
    totalClients: 1,
    filters: {
      gestorId: null,
      type: null,
      search: null,
    },
  },
};

test("buildTaxControlCsv genera cabeceras y valores esperados", () => {
  const csv = buildTaxControlCsv(sampleMatrix);
  const [headerLine, firstRow] = csv.split("\n");
  assert.equal(headerLine, "Cliente,NIF/CIF,Tipo,Gestor,Correo Gestor,200,202");
  assert.ok(firstRow.includes("Empresa Uno"));
  assert.ok(firstRow.includes("PRESENTADO"));
});

test("buildTaxControlExportPreview genera datos previsualizables", () => {
  const preview = buildTaxControlExportPreview(sampleMatrix);
  assert.equal(preview.header.length, 5 + sampleMatrix.models.length);
  assert.equal(preview.rows.length, 1);
  assert.equal(preview.rows[0][0], "Empresa Uno");
});

test("buildTaxControlCsv escapa celdas con comas y comillas", () => {
  const matrix = {
    ...sampleMatrix,
    rows: [
      {
        ...sampleMatrix.rows[0],
        clientName: 'Empresa, "Especial"',
      },
    ],
  };
  const csv = buildTaxControlCsv(matrix as any);
  const line = csv.split("\n")[1];
  assert.ok(line.startsWith('"Empresa, ""Especial"""'));
});

test("buildTaxControlXlsx crea hoja con cabecera correcta", async () => {
  const buffer = await buildTaxControlXlsx(sampleMatrix);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("Control");
  assert.ok(sheet, "Worksheet 'Control' debe existir");
  assert.equal(sheet.getCell("A1").value, "Cliente");
  assert.equal(sheet.getCell("F1").value, "200");
  assert.equal(sheet.getCell("A2").value, "Empresa Uno");
});
