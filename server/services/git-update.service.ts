import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

const PROJECT_PATH = '/root/www/Asesoria-la-Llave-V2';
const SYSTEMD_SERVICE = 'asesoria-llave.service';

interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Ejecuta una actualización desde GitHub
 * @param updateId ID del registro en system_updates
 */
export async function executeGitUpdate(updateId: string): Promise<void> {
  let logs = '';
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString();
    logs += `[${timestamp}] ${message}\n`;
    console.log(message);
  };

  try {
    addLog('=== INICIO DE ACTUALIZACIÓN DESDE GITHUB ===');

    // Obtener el registro
    const update = await prisma.system_updates.findUnique({
      where: { id: updateId }
    });

    if (!update) {
      throw new Error(`Update ${updateId} not found`);
    }

    if (!update.commit_hash) {
      throw new Error('Update does not have a commit hash');
    }

    addLog(`Commit: ${update.commit_hash.substring(0, 7)}`);
    addLog(`Mensaje: ${update.commit_message}`);
    addLog(`Autor: ${update.commit_author}`);
    addLog('');

    // Actualizar estado a APPLYING
    await prisma.system_updates.update({
      where: { id: updateId },
      data: {
        status: 'APPLYING',
        logs
      }
    });

    // Paso 1: Git fetch
    addLog('📡 Obteniendo cambios desde GitHub...');
    try {
      const fetchResult: ExecResult = await execAsync('git fetch origin', { cwd: PROJECT_PATH });
      if (fetchResult.stdout) addLog(fetchResult.stdout.trim());
      if (fetchResult.stderr) addLog(fetchResult.stderr.trim());
      addLog('✅ Fetch completado');
    } catch (error: any) {
      addLog(`❌ Error en git fetch: ${error.message}`);
      throw error;
    }
    addLog('');

    // Paso 2: Verificar si el commit existe
    addLog(`🔍 Verificando commit ${update.commit_hash.substring(0, 7)}...`);
    try {
      await execAsync(`git cat-file -t ${update.commit_hash}`, { cwd: PROJECT_PATH });
      addLog('✅ Commit encontrado');
    } catch (error: any) {
      addLog(`❌ Commit no encontrado: ${error.message}`);
      throw new Error('Commit not found in repository');
    }
    addLog('');

    // Paso 3: Hacer backup del estado actual (opcional)
    addLog('💾 Obteniendo commit actual...');
    let previousCommit = '';
    try {
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: PROJECT_PATH });
      previousCommit = stdout.trim();
      addLog(`Commit actual: ${previousCommit.substring(0, 7)}`);
    } catch (error: any) {
      addLog(`⚠️  No se pudo obtener commit actual: ${error.message}`);
    }
    addLog('');

    // Paso 4: Git pull / checkout
    addLog(`🔄 Aplicando commit ${update.commit_hash.substring(0, 7)}...`);
    try {
      const branch = update.branch || 'main';
      
      // Opción 1: Si estamos en la misma rama, hacer pull
      const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: PROJECT_PATH });
      if (currentBranch.trim() === branch) {
        const pullResult: ExecResult = await execAsync(`git pull origin ${branch}`, { cwd: PROJECT_PATH });
        if (pullResult.stdout) addLog(pullResult.stdout.trim());
        if (pullResult.stderr) addLog(pullResult.stderr.trim());
      } else {
        // Opción 2: Cambiar de rama
        await execAsync(`git checkout ${branch}`, { cwd: PROJECT_PATH });
        const pullResult: ExecResult = await execAsync(`git pull origin ${branch}`, { cwd: PROJECT_PATH });
        if (pullResult.stdout) addLog(pullResult.stdout.trim());
        if (pullResult.stderr) addLog(pullResult.stderr.trim());
      }
      
      addLog('✅ Código actualizado');
    } catch (error: any) {
      addLog(`❌ Error en git pull: ${error.message}`);
      throw error;
    }
    addLog('');

    // Paso 5: Instalar dependencias
    addLog('📦 Instalando dependencias...');
    try {
      const installResult: ExecResult = await execAsync('npm install', { 
        cwd: PROJECT_PATH,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      if (installResult.stdout) addLog(installResult.stdout.split('\n').slice(-5).join('\n')); // Solo últimas 5 líneas
      if (installResult.stderr) addLog(installResult.stderr.split('\n').slice(-5).join('\n'));
      addLog('✅ Dependencias instaladas');
    } catch (error: any) {
      addLog(`❌ Error instalando dependencias: ${error.message}`);
      throw error;
    }
    addLog('');

    // Paso 6: Build del proyecto
    addLog('🔨 Compilando proyecto...');
    try {
      const buildResult: ExecResult = await execAsync('npm run build', { 
        cwd: PROJECT_PATH,
        env: { ...process.env, NODE_ENV: 'production' }
      });
      if (buildResult.stdout) addLog(buildResult.stdout.split('\n').slice(-10).join('\n')); // Solo últimas 10 líneas
      if (buildResult.stderr) addLog(buildResult.stderr.split('\n').slice(-10).join('\n'));
      addLog('✅ Build completado');
    } catch (error: any) {
      addLog(`❌ Error en build: ${error.message}`);
      throw error;
    }
    addLog('');

    // Paso 7: Reiniciar aplicación con systemctl
    addLog('🔄 Reiniciando servicio systemd...');
    try {
      const restartResult: ExecResult = await execAsync(`sudo systemctl restart ${SYSTEMD_SERVICE}`);
      if (restartResult.stdout) addLog(restartResult.stdout.trim());
      if (restartResult.stderr) addLog(restartResult.stderr.trim());
      addLog('✅ Servicio reiniciado');
    } catch (error: any) {
      addLog(`❌ Error reiniciando servicio: ${error.message}`);
      throw error;
    }
    addLog('');

    // Paso 8: Verificar que la aplicación está corriendo
    addLog('🔍 Verificando estado del servicio...');
    try {
      const statusResult: ExecResult = await execAsync(`sudo systemctl status ${SYSTEMD_SERVICE}`);
      const isActive = statusResult.stdout.includes('active (running)');
      if (isActive) {
        addLog('✅ Servicio funcionando correctamente');
      } else {
        addLog('⚠️  El servicio no está activo');
      }
    } catch (error: any) {
      // systemctl status devuelve exit code 3 si está parado, pero aún así muestra info
      if (error.stdout && error.stdout.includes('active (running)')) {
        addLog('✅ Servicio funcionando correctamente');
      } else {
        addLog(`⚠️  No se pudo verificar estado: ${error.message}`);
      }
    }
    addLog('');

    addLog('=== ACTUALIZACIÓN COMPLETADA EXITOSAMENTE ===');

    // Actualizar registro como completado
    await prisma.system_updates.update({
      where: { id: updateId },
      data: {
        status: 'COMPLETED',
        completed_at: new Date(),
        logs,
        error_message: null
      }
    });

    // Actualizar configuración con el nuevo commit hash
    const config = await prisma.system_update_config.findFirst();
    if (config) {
      await prisma.system_update_config.update({
        where: { id: config.id },
        data: {
          currentCommitHash: update.commit_hash,
          lastCheckedAt: new Date()
        }
      });
    }

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    addLog('');
    addLog('=== ERROR EN LA ACTUALIZACIÓN ===');
    addLog(`❌ ${errorMessage}`);
    
    if (error.stack) {
      addLog('Stack trace:');
      addLog(error.stack);
    }

    // Actualizar registro como fallido
    await prisma.system_updates.update({
      where: { id: updateId },
      data: {
        status: 'FAILED',
        completed_at: new Date(),
        logs,
        error_message: errorMessage
      }
    });

    throw error;
  }
}

/**
 * Verificar si hay actualizaciones disponibles en GitHub
 * (útil para checkear manualmente sin webhook)
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const config = await prisma.system_update_config.findFirst();
    
    if (!config || !config.githubRepo) {
      console.log('No GitHub config found');
      return;
    }

    console.log(`Checking for updates in ${config.githubRepo}...`);

    // Obtener el commit actual
    const { stdout: currentCommit } = await execAsync('git rev-parse HEAD', { cwd: PROJECT_PATH });
    const currentHash = currentCommit.trim();

    // Hacer fetch
    await execAsync('git fetch origin', { cwd: PROJECT_PATH });

    // Obtener el último commit de la rama remota
    const branch = config.githubBranch || 'main';
    const { stdout: remoteCommit } = await execAsync(`git rev-parse origin/${branch}`, { cwd: PROJECT_PATH });
    const remoteHash = remoteCommit.trim();

    if (currentHash === remoteHash) {
      console.log('Already up to date');
      return;
    }

    console.log(`New commit available: ${remoteHash.substring(0, 7)}`);

    // Obtener info del commit
    const { stdout: commitInfo } = await execAsync(
      `git log ${remoteHash} -1 --pretty=format:"%an|%aI|%s"`,
      { cwd: PROJECT_PATH }
    );

    const [author, date, message] = commitInfo.split('|');

    // Crear registro si no existe
    const existingUpdate = await prisma.system_updates.findFirst({
      where: { commit_hash: remoteHash }
    });

    if (!existingUpdate) {
      const { v4: uuidv4 } = require('uuid');
      
      await prisma.system_updates.create({
        data: {
          id: uuidv4(),
          update_type: 'GITHUB',
          commit_hash: remoteHash,
          commit_message: message,
          commit_author: author,
          commit_date: new Date(date),
          branch,
          status: 'PENDING',
          logs: 'Update detected manually\n'
        }
      });

      console.log('Update record created');
    }

  } catch (error: any) {
    console.error('Error checking for updates:', error.message);
    throw error;
  }
}
