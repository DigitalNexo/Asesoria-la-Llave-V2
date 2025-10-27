import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuraciones iniciales del sistema
const SYSTEM_CONFIGS = [
  {
    key: 'backup_db_pattern',
    value: 'backup_bd_{fecha}_{hora}_{version}.sql',
    description: 'Patrón para nombres de backups de base de datos. Variables disponibles: {fecha}, {hora}, {version}, {timestamp}, {YEAR_4}, {YEAR_2}, {MONTH_NUMBER}, {MONTH_NAME}, {MONTH_DAY_NUMBER}, {WEEK_DAY_NUMBER}, {WEEK_DAY_NAME}, {HOURS}, {MINUTES}, {SECONDS}, {WEEK_NUMBER}, {WEEK_NUMBER_IN_THE_MONTH}',
    isEditable: true,
  },
  {
    key: 'backup_files_pattern',
    value: 'backup_archivos_{fecha}_{hora}_{version}.zip',
    description: 'Patrón para nombres de backups de archivos. Variables disponibles: {fecha}, {hora}, {version}, {timestamp}, {YEAR_4}, {YEAR_2}, {MONTH_NUMBER}, {MONTH_NAME}, {MONTH_DAY_NUMBER}, {WEEK_DAY_NUMBER}, {WEEK_DAY_NAME}, {HOURS}, {MINUTES}, {SECONDS}, {WEEK_NUMBER}, {WEEK_NUMBER_IN_THE_MONTH}',
    isEditable: true,
  },
  {
    key: 'github_repo_url',
    value: '',
    description: 'URL del repositorio de GitHub para auto-actualización (ej: https://github.com/usuario/repo)',
    isEditable: true,
  },
  {
    key: 'github_branch',
    value: 'main',
    description: 'Rama de GitHub para auto-actualización',
    isEditable: true,
  },
  {
    key: 'auto_backup_before_update',
    value: 'true',
    description: 'Crear backup automático antes de actualizar',
    isEditable: true,
  },
  {
    key: 'backup_retention_days',
    value: '30',
    description: 'Días que se conservan los backups antes de eliminarse automáticamente (0 = sin límite)',
    isEditable: true,
  },
];

async function seedSystemConfig() {
  console.log('🔧 Iniciando seed de configuración del sistema...');

  for (const config of SYSTEM_CONFIGS) {
    try {
      // Usar upsert para crear o actualizar
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {
          description: config.description,
          isEditable: config.isEditable,
        },
        create: config,
      });
      console.log(`✅ Configuración "${config.key}" creada/actualizada`);
    } catch (error) {
      console.error(`❌ Error al crear configuración "${config.key}":`, error);
    }
  }

  console.log('✅ Seed de configuración del sistema completado');
}

// Ejecutar solo si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSystemConfig()
    .catch((error) => {
      console.error('❌ Error fatal al ejecutar seed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedSystemConfig };
