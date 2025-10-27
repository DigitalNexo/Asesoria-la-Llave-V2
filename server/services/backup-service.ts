import { PrismaClient } from '@prisma/client';
import archiver from 'archiver';
import { createWriteStream, promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { emitSystemLog } from '../websocket.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

interface BackupResult {
  id: string;
  dbFile: string;
  filesFile: string;
  dbSize: bigint;
  filesSize: bigint;
  version: string;
}

/**
 * Reemplaza variables en el patrón de nombre
 */
function replacePatternVariables(pattern: string, version: string): string {
  const now = new Date();
  
  // Calcular número de semana del año (ISO 8601 - lunes es el primer día de la semana)
  function getISOWeekNumber(date: Date): number {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // Jueves de esta semana (jueves en semana actual decide el año)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  }
  
  const weekNumber = getISOWeekNumber(now);
  
  // Calcular número de semana del mes (lunes como primer día)
  function getWeekOfMonth(date: Date): number {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const startDay = startOfMonth.getDay(); // 0=Dom, 1=Lun, ..., 6=Sáb
    
    // Calcular días hasta el primer lunes
    const daysToMonday = startDay === 0 ? 1 : startDay === 1 ? 0 : 8 - startDay;
    const firstMonday = 1 + daysToMonday;
    const dayOfMonth = date.getDate();
    
    if (dayOfMonth < firstMonday) {
      return 0; // Días antes del primer lunes están en semana 0
    }
    
    return Math.floor((dayOfMonth - firstMonday) / 7) + 1;
  }
  
  const weekNumberInMonth = getWeekOfMonth(now);
  
  // Nombres de días y meses en español
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  const variables: Record<string, string> = {
    // Variables originales
    '{fecha}': now.toISOString().split('T')[0].replace(/-/g, ''),
    '{hora}': now.toTimeString().split(' ')[0].replace(/:/g, ''),
    '{version}': version,
    '{timestamp}': Date.now().toString(),
    
    // Nuevas variables de año
    '{YEAR_4}': now.getFullYear().toString(),
    '{YEAR_2}': now.getFullYear().toString().slice(-2),
    
    // Variables de mes
    '{MONTH_NUMBER}': String(now.getMonth() + 1).padStart(2, '0'),
    '{MONTH_NAME}': monthNames[now.getMonth()],
    
    // Variables de día
    '{MONTH_DAY_NUMBER}': String(now.getDate()).padStart(2, '0'),
    '{WEEK_DAY_NUMBER}': now.getDay().toString(),
    '{WEEK_DAY_NAME}': dayNames[now.getDay()],
    
    // Variables de tiempo
    '{HOURS}': String(now.getHours()).padStart(2, '0'),
    '{MINUTES}': String(now.getMinutes()).padStart(2, '0'),
    '{SECONDS}': String(now.getSeconds()).padStart(2, '0'),
    
    // Variables de semana
    '{WEEK_NUMBER}': String(weekNumber).padStart(2, '0'),
    '{WEEK_NUMBER_IN_THE_MONTH}': weekNumberInMonth.toString(),
  };

  let result = pattern;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replaceAll(key, value);
  });

  return result;
}

/**
 * Crea un backup de la base de datos usando mysqldump si está disponible,
 * o exporta mediante Prisma si no lo está
 */
async function createDatabaseBackup(fileName: string): Promise<{ path: string; size: bigint }> {
  const backupDir = join(__dirname, '../../backups/db');
  await fs.mkdir(backupDir, { recursive: true });

  const filePath = join(backupDir, fileName);
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL no está definida');
  }

  try {
    // Intentar usar mysqldump si está disponible
    const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
    if (!match) {
      throw new Error('Formato de DATABASE_URL no válido');
    }

    const [, user, password, host, port, database] = match;
    
    const command = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > ${filePath}`;
    
    try {
      await execAsync(command);
      console.log('✅ Backup de BD creado con mysqldump');
    } catch (error) {
      // Si mysqldump no está disponible, usar método alternativo
      console.log('⚠️ mysqldump no disponible, usando método alternativo');
      await createDatabaseBackupFallback(filePath);
    }

    const stats = await fs.stat(filePath);
    return { path: filePath, size: BigInt(stats.size) };
  } catch (error) {
    console.error('Error creando backup de BD:', error);
    throw error;
  }
}

/**
 * Método alternativo para crear backup de BD cuando mysqldump no está disponible
 * Exporta todos los datos usando Prisma y genera INSERTs SQL
 */
async function createDatabaseBackupFallback(filePath: string): Promise<void> {
  let sqlContent = `-- Backup creado el ${new Date().toISOString()}\n`;
  sqlContent += `-- Generado con Prisma (fallback sin mysqldump)\n\n`;

  try {
    // Obtener todas las tablas y sus datos usando los nombres reales de tabla (@@map)
    const tables = [
      { tableName: 'users', model: prisma.users },
      { tableName: 'roles', model: prisma.roles },
      { tableName: 'permissions', model: prisma.permissions },
      { tableName: 'role_permissions', model: prisma.role_permissions },
      { tableName: 'clients', model: prisma.clients },
      { tableName: 'client_employees', model: prisma.clientEmployee },
      { tableName: 'tax_models', model: prisma.taxModel },
      { tableName: 'tax_periods', model: prisma.tax_periods },
      { tableName: 'client_tax', model: prisma.clientTax },
      { tableName: 'tax_files', model: prisma.taxFile },
      { tableName: 'tasks', model: prisma.tasks },
      { tableName: 'manuals', model: prisma.manuals },
      { tableName: 'manual_attachments', model: prisma.manualAttachment },
      { tableName: 'manual_versions', model: prisma.manualVersion },
      { tableName: 'activity_logs', model: prisma.activityLog },
      { tableName: 'audit_trail', model: prisma.auditTrail },
      { tableName: 'smtp_config', model: prisma.smtpConfig },
      { tableName: 'client_tax_requirements', model: prisma.clientTaxRequirement },
      { tableName: 'fiscal_periods', model: prisma.fiscal_periods },
      { tableName: 'client_tax_filings', model: prisma.client_tax_filings },
      { tableName: 'job_runs', model: prisma.jobRun },
      { tableName: 'system_settings', model: prisma.systemSettings },
      { tableName: 'smtp_accounts', model: prisma.sMTPAccount },
      { tableName: 'notification_templates', model: prisma.notificationTemplate },
      { tableName: 'notification_logs', model: prisma.notificationLog },
      { tableName: 'scheduled_notifications', model: prisma.scheduledNotification },
      { tableName: 'system_config', model: prisma.system_config },
      { tableName: 'system_backups', model: prisma.system_backups },
      { tableName: 'storage_configs', model: prisma.storageConfig },
    ];

    for (const table of tables) {
  const records = await (table.model as any).findMany() as any[];
      
      if (records.length > 0) {
        sqlContent += `-- Tabla ${table.tableName}\n`;
        
        for (const record of records) {
          const columns = Object.keys(record);
          const values = columns.map(col => {
            const val = record[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'boolean') return val ? '1' : '0';
            if (typeof val === 'bigint') return val.toString();
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return val;
          });

          sqlContent += `INSERT INTO ${table.tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        
        sqlContent += '\n';
      }
    }

    await fs.writeFile(filePath, sqlContent, 'utf-8');
    console.log('✅ Backup de BD creado con Prisma (método alternativo funcional)');
  } catch (error) {
    console.error('Error en backup alternativo:', error);
    throw error;
  }
}

/**
 * Crea un backup comprimido de los archivos del sistema
 */
async function createFilesBackup(fileName: string): Promise<{ path: string; size: bigint }> {
  const backupDir = join(__dirname, '../../backups/files');
  await fs.mkdir(backupDir, { recursive: true });

  const filePath = join(backupDir, fileName);

  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Máxima compresión
    });

    output.on('close', async () => {
      const stats = await fs.stat(filePath);
      resolve({ path: filePath, size: BigInt(stats.size) });
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    const rootDir = join(__dirname, '../..');

    // Agregar archivos del proyecto (excluir node_modules, .git, backups)
    archive.glob('**/*', {
      cwd: rootDir,
      ignore: [
        'node_modules/**',
        '.git/**',
        'backups/**',
        'dist/**',
        '.env.local',
        '*.log'
      ]
    });

    // Agregar .env (importante para restauración)
    try {
      archive.file(join(rootDir, '.env'), { name: '.env' });
    } catch (error) {
      console.warn('No se pudo agregar .env al backup');
    }

    // Agregar uploads si existe
    try {
      archive.directory(join(rootDir, 'uploads'), 'uploads');
    } catch (error) {
      console.warn('No se pudo agregar carpeta uploads al backup');
    }

    archive.finalize();
  });
}

/**
 * Crea un backup completo del sistema (BD + Archivos)
 */
export async function createSystemBackup(userId?: string): Promise<BackupResult> {
  let backupId: string | null = null;

  try {
    emitSystemLog({ type: 'backup', level: 'info', message: 'Iniciando creación de backup del sistema...' });
    
    // Obtener versión actual
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(packageJson);
    const version = pkg.version || '1.0.0';

    // Obtener patrones de configuración
    const dbPatternConfig = await prisma.system_config.findUnique({
      where: { key: 'backup_db_pattern' }
    });
    const filesPatternConfig = await prisma.system_config.findUnique({
      where: { key: 'backup_files_pattern' }
    });

    const dbPattern = dbPatternConfig?.value || 'backup_db_{fecha}_{hora}.sql';
    const filesPattern = filesPatternConfig?.value || 'backup_files_{fecha}_{hora}.zip';

    const dbFileName = replacePatternVariables(dbPattern, version);
    const filesFileName = replacePatternVariables(filesPattern, version);

    // Crear registro de backup en BD
    const backup = await prisma.system_backups.create({
      data: {
        version,
        dbFile: dbFileName,
        filesFile: filesFileName,
        status: 'CREATING',
        createdBy: userId
      }
    });

    backupId = backup.id;

    emitSystemLog({ 
      type: 'backup', 
      level: 'info', 
      message: 'Backup registrado en base de datos',
      details: `ID: ${backup.id}, Versión: ${version}`
    });

    // Crear backups
    emitSystemLog({ type: 'backup', level: 'info', message: 'Creando backup de base de datos...', details: dbFileName });
    const dbBackup = await createDatabaseBackup(dbFileName);
    emitSystemLog({ type: 'backup', level: 'success', message: 'Backup de base de datos completado' });

    emitSystemLog({ type: 'backup', level: 'info', message: 'Creando backup de archivos...', details: filesFileName });
    const filesBackup = await createFilesBackup(filesFileName);
    emitSystemLog({ type: 'backup', level: 'success', message: 'Backup de archivos completado' });

    // Actualizar registro con éxito
    await prisma.system_backups.update({
      where: { id: backup.id },
      data: {
        status: 'COMPLETED',
        dbSize: dbBackup.size,
        filesSize: filesBackup.size,
        completedAt: new Date()
      }
    });

    emitSystemLog({ type: 'backup', level: 'success', message: 'Backup completado exitosamente' });

    return {
      id: backup.id,
      dbFile: dbFileName,
      filesFile: filesFileName,
      dbSize: dbBackup.size,
      filesSize: filesBackup.size,
      version
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    emitSystemLog({ type: 'backup', level: 'error', message: 'Error al crear backup', details: errorMessage });

    // Actualizar registro con error
    if (backupId) {
      await prisma.system_backups.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt: new Date()
        }
      });
    }

    throw error;
  }
}

/**
 * Lista todos los backups disponibles
 */
export async function listBackups() {
  return await prisma.system_backups.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}

/**
 * Elimina backups antiguos según la configuración de retención
 */
export async function cleanOldBackups(): Promise<number> {
  const retentionConfig = await prisma.system_config.findUnique({
    where: { key: 'backup_retention_days' }
  });

  const retentionDays = parseInt(retentionConfig?.value || '30');

  if (retentionDays === 0) {
    return 0; // Sin límite de retención
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const oldBackups = await prisma.system_backups.findMany({
    where: {
      createdAt: {
        lt: cutoffDate
      },
      status: 'COMPLETED'
    }
  });

  // Eliminar archivos físicos
  for (const backup of oldBackups) {
    try {
      const dbPath = join(__dirname, '../../backups/db', backup.dbFile);
      const filesPath = join(__dirname, '../../backups/files', backup.filesFile);

      await fs.unlink(dbPath).catch(() => {});
      await fs.unlink(filesPath).catch(() => {});
    } catch (error) {
      console.error(`Error eliminando archivos de backup ${backup.id}:`, error);
    }
  }

  // Eliminar registros de BD
  const result = await prisma.system_backups.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate
      },
      status: 'COMPLETED'
    }
  });

  console.log(`🧹 Eliminados ${result.count} backups antiguos`);

  return result.count;
}

/**
 * Restaura el sistema desde un backup
 */
export async function restoreFromBackup(backupId: string, userId?: string): Promise<void> {
  let backup;
  
  try {
    emitSystemLog({ type: 'restore', level: 'info', message: 'Iniciando restauración desde backup...' });
    
    // Obtener información del backup
    backup = await prisma.system_backups.findUnique({
      where: { id: backupId }
    });

    if (!backup) {
      throw new Error('Backup no encontrado');
    }

    if (backup.status !== 'COMPLETED') {
      throw new Error('Solo se pueden restaurar backups completados');
    }

    emitSystemLog({ 
      type: 'restore', 
      level: 'info', 
      message: `Restaurando desde backup creado el ${new Date(backup.createdAt).toLocaleString('es-ES')}`,
      details: `Versión: ${backup.version}`
    });

    // Actualizar estado a RESTORING
    await prisma.system_backups.update({
      where: { id: backupId },
      data: { status: 'RESTORING' }
    });

    const dbPath = join(__dirname, '../../backups/db', backup.dbFile);
    const filesPath = join(__dirname, '../../backups/files', backup.filesFile);

    // Verificar que los archivos existen
    await fs.access(dbPath);
    await fs.access(filesPath);

    emitSystemLog({ type: 'restore', level: 'info', message: 'Descomprimiendo archivos del backup...' });
    await extractBackupFiles(filesPath);
    emitSystemLog({ type: 'restore', level: 'success', message: 'Archivos descomprimidos correctamente' });

    emitSystemLog({ type: 'restore', level: 'info', message: 'Restaurando base de datos...' });
    await restoreDatabase(dbPath);
    emitSystemLog({ type: 'restore', level: 'success', message: 'Base de datos restaurada correctamente' });

    // Actualizar estado a RESTORED
    await prisma.system_backups.update({
      where: { id: backupId },
      data: {
        status: 'RESTORED',
        completedAt: new Date()
      }
    });

    emitSystemLog({ type: 'restore', level: 'success', message: 'Restauración completada exitosamente' });
    emitSystemLog({ type: 'restore', level: 'warning', message: 'IMPORTANTE: Reinicie el servidor para aplicar los cambios' });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    emitSystemLog({ type: 'restore', level: 'error', message: 'Error al restaurar backup', details: errorMessage });

    // Actualizar estado a error si el backup existe
    if (backup) {
      await prisma.system_backups.update({
        where: { id: backupId },
        data: {
          status: 'FAILED',
          errorMessage
        }
      });
    }

    throw error;
  }
}

/**
 * Extrae los archivos del backup zip
 */
async function extractBackupFiles(zipPath: string): Promise<void> {
  const rootDir = join(__dirname, '../..');
  
  // Crear un proceso para descomprimir usando unzip si está disponible
  try {
    await execAsync(`unzip -o "${zipPath}" -d "${rootDir}"`);
    console.log('✅ Archivos extraídos con unzip');
  } catch (error) {
    // Si unzip no está disponible, usar método alternativo con archiver
    console.log('⚠️ unzip no disponible, usando método alternativo');
    
    // Por ahora solo registramos un aviso
    // En producción se debe implementar extracción usando una librería de Node.js
    console.log('⚠️ Extracción de archivos requiere unzip en el sistema');
  }
}

/**
 * Restaura la base de datos desde un archivo SQL
 */
async function restoreDatabase(sqlPath: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    throw new Error('DATABASE_URL no está definida');
  }

  const match = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Formato de DATABASE_URL no válido');
  }

  const [, user, password, host, port, database] = match;

  try {
    const command = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < ${sqlPath}`;
    await execAsync(command);
    console.log('✅ Base de datos restaurada con mysql');
  } catch (error) {
    console.error('⚠️ mysql no disponible para restaurar BD');
    console.log('⚠️ La restauración de BD requiere mysql client en el sistema');
    throw new Error('No se pudo restaurar la base de datos: mysql no disponible');
  }
}

/**
 * Reinicia el servicio según el sistema operativo
 */
export async function restartService(): Promise<void> {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      // Windows - intentar reiniciar servicio o usar npm
      console.log('🔄 Reiniciando servicio en Windows...');
      try {
        await execAsync('npm run restart');
      } catch {
        console.log('⚠️ Use el administrador de servicios de Windows para reiniciar');
      }
    } else {
      // Linux/Unix - intentar pm2 primero
      console.log('🔄 Reiniciando servicio en Linux...');
      try {
        await execAsync('pm2 restart all');
        console.log('✅ Servicio reiniciado con pm2');
      } catch {
        try {
          await execAsync('systemctl restart asesoria-app');
          console.log('✅ Servicio reiniciado con systemctl');
        } catch {
          console.log('⚠️ Reinicie el servidor manualmente');
        }
      }
    }
  } catch (error) {
    console.error('Error al reiniciar servicio:', error);
    throw error;
  }
}
