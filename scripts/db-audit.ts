import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista conservadora de tablas (usar los nombres reales de la BD según @@map en prisma/schema.prisma)
const tables = [
  'roles', 'permissions', 'role_permissions',
  'users',
  'clients', 'client_tax_assignments', 'tax_models_config', 'client_employees',
  'tasks', 'manuals', 'manual_attachments', 'manual_versions',
  'activity_logs', 'audit_trail',
  'smtp_config', 'smtp_accounts',
  'notification_templates', 'notification_logs', 'scheduled_notifications',
  'system_config', 'system_backups', 'system_updates', 'storage_configs', 'system_settings',
  'job_runs',
  'impuestos', 'obligaciones_fiscales', 'tax_calendar', 'declaraciones', 'notificaciones',
  'tax_models', 'tax_periods', 'client_tax', 'tax_files', 'client_tax_requirements',
  'fiscal_periods', 'client_tax_filings'
];

async function columnNamesForTable(table: string) {
  const rows: Array<{ COLUMN_NAME: string; DATA_TYPE: string }> = await prisma.$queryRawUnsafe(
    `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    table
  );
  return rows;
}

async function safeCount(table: string) {
  try {
    const result: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\``);
    // result is DB-driver dependent; normalize safely
    const first = Array.isArray(result) ? result[0] : result;
    const cnt = first?.cnt ?? first?.COUNT ?? Object.values(first ?? {})[0];
    return Number(cnt ?? 0);
  } catch (error) {
    return { error: (error as Error).message };
  }
}

async function minMaxDate(table: string, column: string) {
  try {
    const res: any = await prisma.$queryRawUnsafe(`SELECT MIN(\`${column}\`) AS min_date, MAX(\`${column}\`) AS max_date FROM \`${table}\``);
    const row = res && res[0];
    return { min: row?.min_date ?? null, max: row?.max_date ?? null };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

async function sampleRows(table: string, limit = 5) {
  try {
    const rows: any = await prisma.$queryRawUnsafe(`SELECT * FROM \`${table}\` LIMIT ${limit}`);
    return rows;
  } catch (error) {
    return { error: (error as Error).message };
  }
}

async function analyzeTable(table: string) {
  const colInfo = await columnNamesForTable(table);
  const count = await safeCount(table);

  // intentar detectar una columna de tipo fecha/fecha_creacion
  const dateCols = colInfo.filter(c => /date|time|timestamp/.test(c.DATA_TYPE));
  let dateRange: any = null;
  if (dateCols.length > 0) {
    // priorizar nombres comunes
    const preferred = ['created_at', 'createdAt', 'fecha_creacion', 'fechaCreacion', 'created_at', 'createdAt', 'fecha_creacion'];
    const found = dateCols.map(d => d.COLUMN_NAME);
    const pick = preferred.find(p => found.includes(p)) ?? found[0];
    if (pick) dateRange = await minMaxDate(table, pick);
  }

  const sample = await sampleRows(table, 5);

  return { table, count, dateRange, sample, columns: colInfo.map(c => c.COLUMN_NAME) };
}

async function main() {
  console.log('DB Audit - read-only checks');
  console.log('Tables to analyze:', tables.length);

  for (const t of tables) {
    process.stdout.write(`Analyzing ${t} ... `);
    try {
      const result = await analyzeTable(t);
      console.log('OK');
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.log('ERROR');
      console.error((error as Error).message);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error('Fatal error:', e);
  prisma.$disconnect();
  process.exit(1);
});
