import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Tablas candidatas a archivar (según auditoría read-only).
const candidates = [
  'smtp_config',
  'smtp_accounts',
  'storage_configs',
  'system_backups',
  'system_updates',
  'job_runs',
  'tax_models',
  'tax_periods',
  'client_tax',
  'tax_files',
  'client_tax_requirements',
  'notificaciones',
  'scheduled_notifications',
  // añade otras tablas si las quieres archivar
];

async function ensureReportsDir() {
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

async function archiveTable(table: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `archive_${table}`;
  try {
    // Crear tabla archive si no existe
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`${archiveName}\` LIKE \`${table}\``);
    // Copiar datos (si hay) - usamos INSERT IGNORE para evitar duplicados si se reejecuta
    const inserted = await prisma.$executeRawUnsafe(
      `INSERT IGNORE INTO \`${archiveName}\` SELECT * FROM \`${table}\``
    );

    // Obtener conteos
    const beforeRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\``);
    const afterRes: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${archiveName}\``);
    const before = Array.isArray(beforeRes) ? Number(beforeRes[0]?.cnt ?? 0) : Number(beforeRes?.cnt ?? 0);
    const after = Array.isArray(afterRes) ? Number(afterRes[0]?.cnt ?? 0) : Number(afterRes?.cnt ?? 0);

    return { table, archiveName, beforeCount: before, archiveCount: after, inserted: Number(inserted ?? 0) };
  } catch (error) {
    return { table, error: (error as Error).message };
  }
}

async function main() {
  const reportsDir = await ensureReportsDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `archive-report-${ts}.json`);

  console.log('Archiving candidate tables:', candidates.join(', '));
  const results: any[] = [];
  for (const t of candidates) {
    process.stdout.write(`Archiving ${t} ... `);
    const res = await archiveTable(t);
    results.push(res);
    if ((res as any).error) {
      console.log('ERROR');
      console.error((res as any).error);
    } else {
      console.log('OK');
      console.log(JSON.stringify(res));
    }
  }

  fs.writeFileSync(reportPath, JSON.stringify({ ts: new Date().toISOString(), results }, null, 2));
  console.log(`Report written to ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error archiving tables:', e);
  await prisma.$disconnect();
  process.exit(1);
});
