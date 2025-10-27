import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('📦 Leyendo script de migración...');
    
    const sqlPath = path.join(process.cwd(), 'database', 'migrations', 'epic_tasks_upgrade.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Dividir el SQL en statements individuales
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));
    
    console.log(`📝 Ejecutando ${statements.length} statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);
          await prisma.$executeRawUnsafe(statement);
          console.log('  ✅ OK');
        } catch (error: any) {
          // Ignorar errores de "ya existe" pero mostrar otros
          if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
            console.log('  ⚠️  Ya existe, continuando...');
          } else {
            console.error('  ❌ Error:', error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('\n🎉 Migración épica de tareas aplicada exitosamente!');
    console.log('\n📌 Próximos pasos:');
    console.log('  1. Ejecuta: npx prisma generate');
    console.log('  2. Reinicia el servidor');
    
  } catch (error) {
    console.error('❌ Error al aplicar migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
