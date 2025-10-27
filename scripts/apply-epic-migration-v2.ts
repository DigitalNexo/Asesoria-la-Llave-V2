import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyEpicTasksMigration() {
  try {
    console.log('🚀 Aplicando migración épica de tareas...\n');
    
    // 1. Añadir nuevos campos a tasks
    console.log('1️⃣  Añadiendo campos nuevos a tabla tasks...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS fecha_inicio DATETIME(3) NULL,
        ADD COLUMN IF NOT EXISTS etiquetas TEXT NULL,
        ADD COLUMN IF NOT EXISTS progreso INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tiempo_estimado INT NULL,
        ADD COLUMN IF NOT EXISTS tiempo_invertido INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS color VARCHAR(7) NULL,
        ADD COLUMN IF NOT EXISTS parent_task_id VARCHAR(36) NULL,
        ADD COLUMN IF NOT EXISTS depends_on TEXT NULL,
        ADD COLUMN IF NOT EXISTS orden INT NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE
      `;
      console.log('   ✅ Campos añadidos\n');
    } catch (e: any) {
      console.log('   ⚠️  Campos ya existen o error:', e.message, '\n');
    }
    
    // 2. Crear tabla task_comments
    console.log('2️⃣  Creando tabla task_comments...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS task_comments (
          id VARCHAR(36) NOT NULL,
          task_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          contenido TEXT NOT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          updated_at DATETIME(3) NOT NULL,
          PRIMARY KEY (id),
          INDEX task_comments_task_id_idx (task_id),
          INDEX task_comments_user_id_idx (user_id),
          INDEX task_comments_created_at_idx (created_at),
          CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('   ✅ Tabla creada\n');
    } catch (e: any) {
      console.log('   ⚠️  Tabla ya existe o error:', e.message, '\n');
    }
    
    // 3. Crear tabla task_attachments
    console.log('3️⃣  Creando tabla task_attachments...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS task_attachments (
          id VARCHAR(36) NOT NULL,
          task_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_type VARCHAR(100) NOT NULL,
          file_size INT NOT NULL,
          uploaded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          INDEX task_attachments_task_id_idx (task_id),
          INDEX task_attachments_user_id_idx (user_id),
          CONSTRAINT task_attachments_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          CONSTRAINT task_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('   ✅ Tabla creada\n');
    } catch (e: any) {
      console.log('   ⚠️  Tabla ya existe o error:', e.message, '\n');
    }
    
    // 4. Crear tabla task_time_entries
    console.log('4️⃣  Creando tabla task_time_entries...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS task_time_entries (
          id VARCHAR(36) NOT NULL,
          task_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          descripcion TEXT NULL,
          minutos INT NOT NULL,
          fecha DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          started_at DATETIME(3) NULL,
          ended_at DATETIME(3) NULL,
          PRIMARY KEY (id),
          INDEX task_time_entries_task_id_idx (task_id),
          INDEX task_time_entries_user_id_idx (user_id),
          INDEX task_time_entries_fecha_idx (fecha),
          CONSTRAINT task_time_entries_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          CONSTRAINT task_time_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('   ✅ Tabla creada\n');
    } catch (e: any) {
      console.log('   ⚠️  Tabla ya existe o error:', e.message, '\n');
    }
    
    // 5. Crear tabla task_activities
    console.log('5️⃣  Creando tabla task_activities...');
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS task_activities (
          id VARCHAR(36) NOT NULL,
          task_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          accion VARCHAR(100) NOT NULL,
          descripcion TEXT NOT NULL,
          metadata TEXT NULL,
          created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
          PRIMARY KEY (id),
          INDEX task_activities_task_id_idx (task_id),
          INDEX task_activities_user_id_idx (user_id),
          INDEX task_activities_created_at_idx (created_at),
          CONSTRAINT task_activities_task_id_fkey FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
          CONSTRAINT task_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      console.log('   ✅ Tabla creada\n');
    } catch (e: any) {
      console.log('   ⚠️  Tabla ya existe o error:', e.message, '\n');
    }
    
    console.log('🎉 ¡Migración épica de tareas completada exitosamente!\n');
    console.log('📌 Próximos pasos:');
    console.log('   1. Ejecuta: npx prisma db pull (para actualizar schema desde BD)');
    console.log('   2. Ejecuta: npx prisma generate (para regenerar cliente)');
    console.log('   3. Reinicia el servidor\n');
    
  } catch (error) {
    console.error('❌ Error fatal:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyEpicTasksMigration();
