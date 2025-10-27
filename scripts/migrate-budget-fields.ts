import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('\n🔄 Ejecutando migración de campos de budgets...\n');

    const sqlFile = path.join(__dirname, '..', 'database', 'migrations', 'add_budget_fields.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');

    // Dividir por comandos SQL individuales
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));

    console.log(`📋 Total de comandos a ejecutar: ${commands.length}\n`);

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      if (cmd.startsWith('--') || cmd.length === 0) continue;

      try {
        console.log(`[${i + 1}/${commands.length}] Ejecutando: ${cmd.substring(0, 80)}...`);
        await prisma.$executeRawUnsafe(cmd);
        console.log(`✅ OK\n`);
      } catch (error: any) {
        // Ignorar errores de "column already exists" o "table already exists"
        if (error.message.includes('Duplicate column') || 
            error.message.includes('already exists') ||
            error.message.includes('Unknown column')) {
          console.log(`⚠️  Ya existe (ignorando)\n`);
        } else {
          console.error(`❌ Error:`, error.message, '\n');
        }
      }
    }

    console.log('\n✅ Migración completada\n');

  } catch (error) {
    console.error('\n❌ Error al ejecutar migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
