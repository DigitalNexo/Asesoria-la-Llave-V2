import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = [
  'roles', 'permissions', 'role_permissions',
  'users', 'clients', 'client_employees', 'client_tax_assignments',
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

async function safeCount(table: string) {
  try {
    const res: any = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as cnt FROM \`${table}\``);
    const first = Array.isArray(res) ? res[0] : res;
    return Number(first?.cnt ?? 0);
  } catch (error) {
    return `ERROR: ${(error as Error).message}`;
  }
}

async function main() {
  const out: Record<string, number | string> = {};
  for (const t of tables) {
    process.stdout.write(`Counting ${t}... `);
    const c = await safeCount(t);
    out[t] = c;
    console.log(c);
  }
  console.log('\nSUMMARY:');
  console.log(JSON.stringify(out, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
