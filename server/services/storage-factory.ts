import { PrismaClient } from '@prisma/client';
import { StorageProvider, LocalStorageProvider } from './storage-provider';
import { FTPStorageProvider, FTPConfig } from './ftp-storage-provider';
import { SMBStorageProvider, SMBConfig } from './smb-storage-provider';
import crypto from 'crypto';
import path from 'path';

const prisma = new PrismaClient();

// Clave de cifrado AES-256-GCM
const ALGORITHM = 'aes-256-gcm';

// Obtener y validar clave de cifrado solo cuando se necesite
function getEncryptionKey(): string {
  const envKey = process.env.STORAGE_ENCRYPTION_KEY;
  if (!envKey || envKey.length < 32) {
    throw new Error('STORAGE_ENCRYPTION_KEY no configurada o muy corta. Debe tener al menos 32 caracteres.');
  }
  return envKey;
}

// Cifrar contraseña
export function encryptPassword(password: string): string {
  const ENCRYPTION_KEY = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Formato: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

// Descifrar contraseña
export function decryptPassword(encryptedData: string): string {
  try {
    const ENCRYPTION_KEY = getEncryptionKey();
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de datos cifrados inválido');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Error al descifrar contraseña');
  }
}

export class StorageFactory {
  private static instance: StorageProvider | null = null;
  private static currentConfigId: string | null = null;

  // Obtener el provider de almacenamiento activo
  static async getActiveProvider(): Promise<StorageProvider> {
    // Obtener configuración activa de la base de datos
    const activeConfig = await prisma.storageConfig.findFirst({
      where: { isActive: true },
    });

    // Si no hay configuración activa o cambió, recrear el provider
    if (!activeConfig || this.currentConfigId !== activeConfig.id || !this.instance) {
      this.instance = await this.createProvider(activeConfig);
      this.currentConfigId = activeConfig?.id || null;
    }

    return this.instance;
  }

  // Obtener provider para una configuración específica por ID
  static async getProviderById(configId: string): Promise<StorageProvider> {
    const config = await prisma.storageConfig.findUnique({
      where: { id: configId }
    });

    if (!config) {
      throw new Error(`Configuración de storage no encontrada: ${configId}`);
    }

    return this.createProvider(config);
  }

  // Crear provider según configuración
  private static async createProvider(config: any): Promise<StorageProvider> {
    // Si no hay configuración o es LOCAL, usar almacenamiento local
    if (!config || config.type === 'LOCAL') {
      // Usar el basePath del config o el default del LocalStorageProvider
      // Si no hay config, pasar undefined para usar el default de LocalStorageProvider
      const basePath = config?.basePath ? path.join(process.cwd(), config.basePath) : undefined;
      return new LocalStorageProvider(basePath);
    }

    // FTP
    if (config.type === 'FTP') {
      if (!config.host || !config.port || !config.username || !config.encryptedPassword) {
        throw new Error('Configuración FTP incompleta');
      }

      const ftpConfig: FTPConfig = {
        host: config.host,
        port: config.port,
        user: config.username,
        password: decryptPassword(config.encryptedPassword),
        basePath: config.basePath || '/uploads',
        secure: false, // Puede ser configurable
      };

      return new FTPStorageProvider(ftpConfig);
    }

    // SMB
    if (config.type === 'SMB') {
      if (!config.host || !config.username || !config.encryptedPassword) {
        throw new Error('Configuración SMB incompleta');
      }

      // Extraer share del basePath (formato: share/path)
      const pathParts = config.basePath.split('/').filter((p: string) => p);
      const share = pathParts[0] || 'uploads';
      const basePath = '/' + pathParts.slice(1).join('/');

      const smbConfig: SMBConfig = {
        host: config.host,
        port: config.port || 445,
        domain: '', // Puede ser configurable
        username: config.username,
        password: decryptPassword(config.encryptedPassword),
        basePath: basePath || '/',
        share: share,
      };

      return new SMBStorageProvider(smbConfig);
    }

    // Por defecto, usar almacenamiento local
    return new LocalStorageProvider('/uploads');
  }

  // Probar conexión con una configuración específica guardada
  static async testConfiguration(configId: string): Promise<boolean> {
    const config = await prisma.storageConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Configuración no encontrada');
    }

    const provider = await this.createProvider(config);

    // Probar conexión
    if ('testConnection' in provider && typeof provider.testConnection === 'function') {
      return await provider.testConnection();
    }

    // Si no tiene método de prueba, asumir que funciona
    return true;
  }

  // Probar conexión con una configuración temporal (sin guardar)
  static async testConfigurationData(config: any): Promise<{ success: boolean; message: string }> {
    try {
      const provider = await this.createProvider(config);

      // Probar conexión si el provider lo soporta
      if ('testConnection' in provider && typeof provider.testConnection === 'function') {
        const success = await provider.testConnection();
        if (success) {
          return { success: true, message: 'Conexión exitosa' };
        } else {
          return { success: false, message: 'Conexión fallida' };
        }
      }

      // Si no tiene método de prueba, solo verificar que se creó
      return { success: true, message: 'Provider creado correctamente' };
    } catch (error: any) {
      return { success: false, message: error.message || 'Error al probar configuración' };
    }
  }

  // Limpiar instancia (útil para pruebas o cambio de configuración)
  static async clearInstance(): Promise<void> {
    if (this.instance && 'disconnect' in this.instance) {
      await this.instance.disconnect?.();
    }
    this.instance = null;
    this.currentConfigId = null;
  }

  // Crear provider para una configuración específica (sin activarla)
  static async createProviderForConfig(configId: string): Promise<StorageProvider> {
    const config = await prisma.storageConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error('Configuración no encontrada');
    }

    return await this.createProvider(config);
  }
}
