import { PrismaClient } from '@prisma/client';
import { StorageProvider } from './storage-provider';
import { StorageFactory } from './storage-factory';
import { emitSystemLog } from '../websocket';
import path from 'path';
import { Readable } from 'stream';

const prisma = new PrismaClient();

interface MigrationProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  errors: string[];
}

interface MigrationResult {
  success: boolean;
  totalFiles: number;
  migratedFiles: number;
  errors: string[];
}

/**
 * Migra archivos de un proveedor de almacenamiento a otro
 */
export class MigrationService {
  private sourceProvider: StorageProvider;
  private targetProvider: StorageProvider;
  private progress: MigrationProgress;
  private migratedFiles: string[] = [];

  constructor(sourceProvider: StorageProvider, targetProvider: StorageProvider) {
    this.sourceProvider = sourceProvider;
    this.targetProvider = targetProvider;
    this.progress = {
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      errors: []
    };
  }

  /**
   * Lista todos los archivos recursivamente de un directorio
   */
  private async listAllFiles(provider: StorageProvider, basePath: string = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await provider.list(basePath);
      
      for (const item of items) {
        const fullPath = basePath ? path.join(basePath, item) : item;
        
        // Intentar listar como directorio
        try {
          const subItems = await provider.list(fullPath);
          if (subItems.length > 0) {
            // Es un directorio, listar recursivamente
            const subFiles = await this.listAllFiles(provider, fullPath);
            files.push(...subFiles);
          } else {
            // Es un archivo vacío o directorio vacío
            files.push(fullPath);
          }
        } catch {
          // No es un directorio, es un archivo
          files.push(fullPath);
        }
      }
    } catch (error: any) {
      emitSystemLog({
        type: 'migration',
        level: 'warning',
        message: `No se pudo listar ${basePath}: ${error.message}`
      });
    }
    
    return files;
  }

  /**
   * Copia un archivo del origen al destino
   */
  private async copyFile(filePath: string): Promise<void> {
    try {
      // Descargar del origen
      const fileBuffer = await this.sourceProvider.download(filePath);
      
      // Subir al destino (upload espera: file, relativePath)
      await this.targetProvider.upload(fileBuffer, filePath);
      
      this.migratedFiles.push(filePath);
      emitSystemLog({
        type: 'migration',
        level: 'success',
        message: `✓ Migrado: ${filePath}`
      });
    } catch (error: any) {
      const errorMsg = `Error migrando ${filePath}: ${error.message}`;
      this.progress.errors.push(errorMsg);
      emitSystemLog({
        type: 'migration',
        level: 'error',
        message: errorMsg
      });
      throw error;
    }
  }

  /**
   * Revierte la migración eliminando archivos copiados
   */
  private async rollback(): Promise<void> {
    emitSystemLog({
      type: 'migration',
      level: 'warning',
      message: 'Iniciando rollback de migración...'
    });
    
    for (const filePath of this.migratedFiles) {
      try {
        await this.targetProvider.delete(filePath);
        emitSystemLog({
          type: 'migration',
          level: 'info',
          message: `Eliminado: ${filePath}`
        });
      } catch (error: any) {
        emitSystemLog({
          type: 'migration',
          level: 'error',
          message: `Error eliminando ${filePath}: ${error.message}`
        });
      }
    }
    
    emitSystemLog({
      type: 'migration',
      level: 'info',
      message: `Rollback completado. ${this.migratedFiles.length} archivos eliminados.`
    });
  }

  /**
   * Ejecuta la migración completa
   */
  async migrate(): Promise<MigrationResult> {
    try {
      emitSystemLog({
        type: 'migration',
        level: 'info',
        message: '🚀 Iniciando migración de archivos...'
      });
      
      // Listar todos los archivos del origen
      emitSystemLog({
        type: 'migration',
        level: 'info',
        message: 'Listando archivos del origen...'
      });
      
      const allFiles = await this.listAllFiles(this.sourceProvider);
      
      this.progress.totalFiles = allFiles.length;
      emitSystemLog({
        type: 'migration',
        level: 'info',
        message: `Encontrados ${allFiles.length} archivos para migrar`
      });
      
      if (allFiles.length === 0) {
        emitSystemLog({
          type: 'migration',
          level: 'warning',
          message: 'No hay archivos para migrar'
        });
        return {
          success: true,
          totalFiles: 0,
          migratedFiles: 0,
          errors: []
        };
      }
      
      // Migrar cada archivo - abortar en el primer error
      for (const filePath of allFiles) {
        this.progress.currentFile = filePath;
        const progressPercent = Math.round(((this.progress.processedFiles + 1) / this.progress.totalFiles) * 100);
        
        emitSystemLog({
          type: 'migration',
          level: 'info',
          message: `Migrando [${this.progress.processedFiles + 1}/${this.progress.totalFiles}]: ${filePath}`,
          progress: progressPercent
        });
        
        // Si falla un archivo, abortar toda la migración
        await this.copyFile(filePath);
        this.progress.processedFiles++;
      }
      
      // Si llegamos aquí, todos los archivos se migraron exitosamente
      emitSystemLog({
        type: 'migration',
        level: 'success',
        message: `✅ Migración completada exitosamente: ${this.migratedFiles.length} archivos`
      });
      
      return {
        success: true,
        totalFiles: this.progress.totalFiles,
        migratedFiles: this.migratedFiles.length,
        errors: []
      };
      
    } catch (error: any) {
      emitSystemLog({
        type: 'migration',
        level: 'error',
        message: `❌ Error en migración: ${error.message}`
      });
      
      // Ejecutar rollback para eliminar archivos parcialmente copiados
      if (this.migratedFiles.length > 0) {
        try {
          await this.rollback();
        } catch (rollbackError: any) {
          emitSystemLog({
            type: 'migration',
            level: 'error',
            message: `Error durante rollback: ${rollbackError.message}`
          });
        }
      }
      
      // Re-lanzar el error original después del rollback
      throw error;
    }
  }
}

/**
 * Inicia una migración desde la configuración actual a una nueva configuración
 */
export async function migrateStorage(targetConfigId: string): Promise<MigrationResult> {
  try {
    // Obtener configuración actual activa
    const currentConfig = await prisma.storageConfig.findFirst({
      where: { isActive: true }
    });
    
    if (!currentConfig) {
      throw new Error('No hay configuración de almacenamiento activa');
    }
    
    // Obtener configuración de destino
    const targetConfig = await prisma.storageConfig.findUnique({
      where: { id: targetConfigId }
    });
    
    if (!targetConfig) {
      throw new Error('Configuración de destino no encontrada');
    }
    
    if (currentConfig.id === targetConfig.id) {
      throw new Error('La configuración origen y destino son la misma');
    }
    
    emitSystemLog({
      type: 'migration',
      level: 'info',
      message: `Migrando de ${currentConfig.type} a ${targetConfig.type}`
    });
    
    // Crear proveedores usando el método público
    const sourceProvider = await StorageFactory.getActiveProvider();
    const targetProvider = await StorageFactory.getProviderById(targetConfigId);
    
    // Ejecutar migración
    const migrationService = new MigrationService(sourceProvider, targetProvider);
    const result = await migrationService.migrate();
    
    // Solo actualizar configuración activa si la migración fue 100% exitosa
    if (result.success) {
      await prisma.storageConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      
      await prisma.storageConfig.update({
        where: { id: targetConfigId },
        data: { isActive: true }
      });
      
      emitSystemLog({
        type: 'migration',
        level: 'success',
        message: `Configuración activa cambiada a ${targetConfig.type}`
      });
    } else {
      emitSystemLog({
        type: 'migration',
        level: 'warning',
        message: 'Migración falló, configuración activa sin cambios'
      });
    }
    
    return result;
    
  } catch (error: any) {
    // El error viene de migrate(), que ya ejecutó rollback si fue necesario
    emitSystemLog({
      type: 'migration',
      level: 'warning',
      message: 'Migración cancelada - archivos parciales eliminados, configuración activa sin cambios'
    });
    
    emitSystemLog({
      type: 'migration',
      level: 'error',
      message: `Error en migración: ${error.message}`
    });
    
    throw error;
  }
}
