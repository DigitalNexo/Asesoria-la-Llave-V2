import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

type Report = {
  generatedAt: string;
  db: string | null;
  duplicatesTaxCalendar: Array<{ modelCode: string; period: string; year: number; count: number }>;
  orphanDeclaraciones: number;
  overlappingObligaciones: Array<{ clienteId: string; impuestoId: string; count: number }>;
  clientsWithoutAssignments: number;
};

const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || null;
  const report: Report = {
    generatedAt: new Date().toISOString(),
    db: dbUrl,
    duplicatesTaxCalendar: [],
    orphanDeclaraciones: 0,
    overlappingObligaciones: [],
    clientsWithoutAssignments: 0,
  };

  // Duplicados en tax_calendar (modelCode, period, year)
  const dups = await prisma.$queryRaw<Array<{ modelCode: string; period: string; year: number; count: number }>>`
    SELECT model_code AS modelCode, period, year, COUNT(*) AS count
    FROM tax_calendar
    GROUP BY model_code, period, year
    HAVING COUNT(*) > 1
    ORDER BY year DESC, model_code ASC, period ASC
  `;
  report.duplicatesTaxCalendar = dups;

  // Declaraciones huérfanas (sin calendario)
  const orphanDecls = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total
    FROM declaraciones d
    LEFT JOIN tax_calendar c ON c.id = d.calendario_id
    WHERE d.calendario_id IS NOT NULL AND c.id IS NULL
  `;
  report.orphanDeclaraciones = Number(orphanDecls?.[0]?.total || 0);

  const orphanDeclsDetail = await prisma.$queryRaw<Array<{ id: string; obligacionId: string | null; calendarioId: string | null }>>`
    SELECT d.id AS id, d.obligacion_id AS obligacionId, d.calendario_id AS calendarioId
    FROM declaraciones d
    LEFT JOIN tax_calendar c ON c.id = d.calendario_id
    WHERE d.calendario_id IS NOT NULL AND c.id IS NULL
  `;

  // Obligaciones solapadas por cliente+impuesto (múltiples activas)
  const overlaps = await prisma.$queryRaw<Array<{ clienteId: string; impuestoId: string; count: number }>>`
    SELECT cliente_id AS clienteId, impuesto_id AS impuestoId, COUNT(*) AS count
    FROM obligaciones_fiscales
    WHERE activo = 1 AND (fecha_fin IS NULL OR fecha_fin >= NOW())
    GROUP BY cliente_id, impuesto_id
    HAVING COUNT(*) > 1
  `;
  report.overlappingObligaciones = overlaps.map((r) => ({ ...r, count: Number(r.count) }));

  const overlapsDetail = await prisma.$queryRaw<Array<{ id: string; clienteId: string; impuestoId: string; fechaInicio: Date | null; fechaFin: Date | null }>>`
    SELECT id, cliente_id AS clienteId, impuesto_id AS impuestoId, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin
    FROM obligaciones_fiscales
    WHERE activo = 1 AND (fecha_fin IS NULL OR fecha_fin >= NOW())
    ORDER BY cliente_id, impuesto_id, fecha_inicio
  `;

  // Clientes sin asignaciones
  const clientsNoAssign = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(*) AS total
    FROM clients c
    LEFT JOIN client_tax_assignments a ON a.client_id = c.id
    WHERE a.id IS NULL
  `;
  report.clientsWithoutAssignments = Number(clientsNoAssign?.[0]?.total || 0);

  const clientsNoAssignDetail = await prisma.$queryRaw<Array<{ id: string; razonSocial: string }>>`
    SELECT c.id, c.razon_social AS razonSocial
    FROM clients c
    LEFT JOIN client_tax_assignments a ON a.client_id = c.id
    WHERE a.id IS NULL
  `;

  const outDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const ts = Date.now();
  const outPath = path.join(outDir, `diagnostics-${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Diagnostics written to ${outPath}`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));

  // CSV helpers
  const toCsv = (rows: any[], headers: string[]) => {
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(headers.map((h) => esc((r as any)[h])).join(','));
    }
    return lines.join('\n');
  };

  fs.writeFileSync(
    path.join(outDir, `tax_calendar_duplicates-${ts}.csv`),
    toCsv(report.duplicatesTaxCalendar, ['modelCode','period','year','count']),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `declaraciones_orphans-${ts}.csv`),
    toCsv(orphanDeclsDetail, ['id','obligacionId','calendarioId']),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `obligaciones_overlaps-${ts}.csv`),
    toCsv(report.overlappingObligaciones, ['clienteId','impuestoId','count']),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, `clients_without_assignments-${ts}.csv`),
    toCsv(clientsNoAssignDetail, ['id','razonSocial']),
    'utf8'
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
