import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createSystemBackup, restoreFromBackup, restartService } from './backup-service.js';
import { getCurrentVersion, checkForUpdates, performHealthCheck } from './version-service.js';
import { emitSystemLog } from '../websocket.js';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

interface UpdateProgress {
  step: string;
  message: string;
  timestamp: Date;
}

interface UpdateResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  backupId?: string;
  logs: UpdateProgress[];
  error?: string;
}

/**
 * Ejecuta el proceso de actualización del sistema con rollback automático
 */
export async function performSystemUpdate(
  userId?: string,
  onProgress?: (progress: UpdateProgress) => void
): Promise<UpdateResult> {
  const logs: UpdateProgress[] = [];
  let updateRecord: any = null;
  let backupId: string | null = null;

  const log = (step: string, message: string, level: "info" | "success" | "warning" | "error" = "info") => {
    const progress = { step, message, timestamp: new Date() };
    logs.push(progress);
    console.log(`[${step}] ${message}`);
    
    // Emitir log en tiempo real vía WebSocket
    emitSystemLog({
      type: "update",
      level,
      message,
      details: step
    });
    
    if (onProgress) {
      onProgress(progress);
    }
  };

  try {
    // 1. Obtener versión actual
    const currentVersion = await getCurrentVersion();
    log('VERSION_CHECK', `Versión actual: ${currentVersion}`);

    // 2. Verificar configuración de GitHub
    const repoUrlConfig = await prisma.systemConfig.findUnique({
      where: { key: 'github_repo_url' }
    });

    if (!repoUrlConfig?.value) {
      throw new Error('URL del repositorio de GitHub no configurada');
    }

    const repoUrl = repoUrlConfig.value;
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    
    if (!match) {
      throw new Error('URL de GitHub no válida');
    }

    const [, owner, repo] = match;

    // 3. Verificar si hay actualizaciones disponibles
    log('UPDATE_CHECK', 'Verificando actualizaciones disponibles...');
    const versionInfo = await checkForUpdates(owner, repo.replace('.git', ''));

    if (!versionInfo.updateAvailable) {
      log('NO_UPDATE', 'No hay actualizaciones disponibles');
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: currentVersion,
        logs
      };
    }

    log('UPDATE_AVAILABLE', `Nueva versión disponible: ${versionInfo.latest}`);

    // 4. Crear registro de actualización
    updateRecord = await prisma.systemUpdate.create({
      data: {
        fromVersion: currentVersion,
        toVersion: versionInfo.latest || 'unknown',
        status: 'CHECKING',
        initiatedBy: userId,
        logs: JSON.stringify(logs)
      }
    });

    // 5. SIEMPRE crear backup automático antes de actualizar (crítico para rollback)
    log('BACKUP_START', 'Creando backup de seguridad antes de actualizar...');
    await prisma.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: 'BACKING_UP', logs: JSON.stringify(logs) }
    });

    const backup = await createSystemBackup(userId);
    backupId = backup.id;
    
    await prisma.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { backupId: backup.id }
    });

    log('BACKUP_COMPLETE', `Backup creado exitosamente: ${backup.id}`, 'success');

    // 6. Actualizar estado a DOWNLOADING
    await prisma.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: 'DOWNLOADING', logs: JSON.stringify(logs) }
    });

    // 7. Ejecutar git pull
    log('GIT_PULL', 'Descargando cambios desde GitHub...');
    const branchConfig = await prisma.systemConfig.findUnique({
      where: { key: 'github_branch' }
    });
    const branch = branchConfig?.value || 'main';

    try {
      const { stdout: pullOutput } = await execAsync(`git pull origin ${branch}`);
      log('GIT_PULL_SUCCESS', `Código descargado exitosamente desde rama '${branch}'`, 'success');
      
      // Verificar si package.json cambió (nueva versión)
      const newVersion = await getCurrentVersion();
      if (newVersion !== currentVersion) {
        log('VERSION_CHANGED', `✨ Versión actualizada: ${currentVersion} → ${newVersion}`, 'success');
      }
    } catch (error: any) {
      log('GIT_PULL_ERROR', `Error en git pull: ${error.message}`, 'error');
      throw new Error(`Error al descargar cambios: ${error.message}`);
    }

    // 8. Actualizar estado a INSTALLING
    await prisma.systemUpdate.update({
      where: { id: updateRecord.id },
      data: { status: 'INSTALLING', logs: JSON.stringify(logs) }
    });

    // 9. Ejecutar npm install
    log('NPM_INSTALL', 'Instalando dependencias...');
    try {
      const { stdout: installOutput } = await execAsync('npm install');
      log('NPM_INSTALL_SUCCESS', 'Dependencias instaladas correctamente', 'success');
    } catch (error: any) {
      log('NPM_INSTALL_ERROR', `Error en npm install: ${error.message}`, 'error');
      throw new Error(`Error al instalar dependencias: ${error.message}`);
    }

    // 10. Ejecutar migraciones de base de datos si es necesario
    log('DB_MIGRATE', 'Aplicando migraciones de base de datos...');
    try {
      await execAsync('npx prisma db push');
      log('DB_MIGRATE_SUCCESS', 'Migraciones aplicadas correctamente', 'success');
    } catch (error: any) {
      log('DB_MIGRATE_WARNING', `Advertencia en migraciones: ${error.message}`, 'warning');
      // No fallar si hay advertencias de migración
    }

    // 11. Ejecutar build de producción
    log('BUILD', 'Compilando aplicación para producción...');
    try {
      await execAsync('npm run build');
      log('BUILD_SUCCESS', 'Aplicación compilada exitosamente', 'success');
    } catch (error: any) {
      log('BUILD_ERROR', `Error en compilación: ${error.message}`, 'error');
      throw new Error(`Error al compilar aplicación: ${error.message}`);
    }

    // 12. Health check post-actualización
    log('HEALTH_CHECK', 'Verificando estado del sistema...', 'info');
    try {
      const healthResult = await performHealthCheck();
      
      if (healthResult.success) {
        log('HEALTH_CHECK_SUCCESS', 'Todas las verificaciones pasaron correctamente', 'success');
      } else {
        const failedChecks = healthResult.checks
          .filter(c => c.status === 'fail')
          .map(c => c.name)
          .join(', ');
        log('HEALTH_CHECK_WARNING', `Algunas verificaciones fallaron: ${failedChecks}`, 'warning');
      }
      
      // Log individual de cada verificación
      for (const check of healthResult.checks) {
        const level = check.status === 'pass' ? 'success' : 'warning';
        log(`HEALTH_${check.name.toUpperCase()}`, `${check.name}: ${check.message}`, level);
      }
    } catch (error: any) {
      log('HEALTH_CHECK_ERROR', `Error en health check: ${error.message}`, 'warning');
      // No fallar la actualización por health check
    }

    // 13. Actualización completada
    await prisma.systemUpdate.update({
      where: { id: updateRecord.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        logs: JSON.stringify(logs)
      }
    });

    log('UPDATE_COMPLETE', `✅ Actualización completada: ${currentVersion} → ${versionInfo.latest}`, 'success');
    log('RESTART_REQUIRED', '⚠️  Reinicie el servidor para aplicar los cambios', 'warning');

    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: versionInfo.latest || 'unknown',
      backupId: backupId || undefined,
      logs
    };

  } catch (error: any) {
    log('ERROR', `Error durante la actualización: ${error.message}`, 'error');

    // ROLLBACK AUTOMÁTICO
    if (backupId) {
      log('ROLLBACK_START', 'Iniciando rollback automático...');
      try {
        await restoreFromBackup(backupId, userId);
        log('ROLLBACK_SUCCESS', 'Rollback completado exitosamente', 'success');
        
        if (updateRecord) {
          await prisma.systemUpdate.update({
            where: { id: updateRecord.id },
            data: {
              status: 'ROLLED_BACK',
              errorMessage: error.message,
              completedAt: new Date(),
              logs: JSON.stringify(logs)
            }
          });
        }
      } catch (rollbackError: any) {
        log('ROLLBACK_ERROR', `Error en rollback: ${rollbackError.message}`, 'error');
        
        if (updateRecord) {
          await prisma.systemUpdate.update({
            where: { id: updateRecord.id },
            data: {
              status: 'FAILED',
              errorMessage: `Update failed: ${error.message}. Rollback also failed: ${rollbackError.message}`,
              completedAt: new Date(),
              logs: JSON.stringify(logs)
            }
          });
        }
      }
    } else {
      // Sin backup, solo marcar como fallido
      if (updateRecord) {
        await prisma.systemUpdate.update({
          where: { id: updateRecord.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message,
            completedAt: new Date(),
            logs: JSON.stringify(logs)
          }
        });
      }
    }

    return {
      success: false,
      fromVersion: await getCurrentVersion(),
      toVersion: 'unknown',
      backupId: backupId || undefined,
      logs,
      error: error.message
    };
  }
}

/**
 * Verifica si Git está instalado y configurado
 */
export async function verifyGitSetup(): Promise<{ installed: boolean; configured: boolean; message: string }> {
  try {
    // Verificar si git está instalado
    await execAsync('git --version');

    // Verificar si hay un repositorio configurado
    try {
      const { stdout } = await execAsync('git remote -v');
      if (stdout.includes('origin')) {
        return {
          installed: true,
          configured: true,
          message: 'Git está instalado y configurado correctamente'
        };
      } else {
        return {
          installed: true,
          configured: false,
          message: 'Git está instalado pero no hay un repositorio remoto configurado'
        };
      }
    } catch {
      return {
        installed: true,
        configured: false,
        message: 'Git está instalado pero este no es un repositorio Git'
      };
    }
  } catch {
    return {
      installed: false,
      configured: false,
      message: 'Git no está instalado en el sistema'
    };
  }
}

/**
 * Lista el historial de actualizaciones
 */
export async function getUpdateHistory(limit: number = 10) {
  return await prisma.systemUpdate.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      initiator: {
        select: {
          id: true,
          username: true,
          email: true
        }
      }
    }
  });
}
