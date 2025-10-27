import SMB2 from '@marsaud/smb2';
import { StorageProvider } from './storage-provider';
import { Readable } from 'stream';
import path from 'path';

export interface SMBConfig {
  host: string;
  port?: number;
  domain?: string;
  username: string;
  password: string;
  basePath: string;
  share: string; // Nombre del recurso compartido (ej: 'uploads', 'backups')
}

export class SMBStorageProvider implements StorageProvider {
  private config: SMBConfig;
  private client: any = null;

  constructor(config: SMBConfig) {
    this.config = {
      ...config,
      port: config.port || 445,
      basePath: config.basePath || '/uploads',
      domain: config.domain || '',
    };
    this.initializeClient();
  }

  private initializeClient(): void {
    this.client = new SMB2({
      share: `\\\\${this.config.host}\\${this.config.share}`,
      domain: this.config.domain || '',
      username: this.config.username,
      password: this.config.password,
      port: this.config.port,
    });
  }

  private getSMBPath(relativePath: string): string {
    // SMB usa backslashes como separadores
    const combined = path.posix.join(this.config.basePath, relativePath);
    return combined.replace(/\//g, '\\');
  }

  async upload(file: Buffer | Readable, relativePath: string): Promise<string> {
    const smbPath = this.getSMBPath(relativePath);
    const dir = path.dirname(smbPath);

    return new Promise((resolve, reject) => {
      // Crear directorio si no existe
      this.client.mkdir(dir, (err: any) => {
        // Ignorar error si el directorio ya existe
        if (err && err.code !== 'STATUS_OBJECT_NAME_COLLISION') {
          // Continuar de todos modos, el directorio puede existir
        }

        if (Buffer.isBuffer(file)) {
          // Escribir buffer
          this.client.writeFile(smbPath, file, (writeErr: any) => {
            if (writeErr) {
              reject(new Error(`Error al escribir archivo SMB: ${writeErr.message}`));
            } else {
              resolve(relativePath);
            }
          });
        } else {
          // Escribir stream
          const writeStream = this.client.createWriteStream(smbPath);
          
          writeStream.on('error', (streamErr: Error) => {
            reject(new Error(`Error al escribir stream SMB: ${streamErr.message}`));
          });

          writeStream.on('finish', () => {
            resolve(relativePath);
          });

          file.pipe(writeStream);
        }
      });
    });
  }

  async download(relativePath: string): Promise<Buffer> {
    const smbPath = this.getSMBPath(relativePath);

    return new Promise((resolve, reject) => {
      this.client.readFile(smbPath, (err: any, data: Buffer) => {
        if (err) {
          reject(new Error(`Error al leer archivo SMB: ${err.message}`));
        } else {
          resolve(data);
        }
      });
    });
  }

  async delete(relativePath: string): Promise<void> {
    const smbPath = this.getSMBPath(relativePath);

    return new Promise((resolve, reject) => {
      this.client.unlink(smbPath, (err: any) => {
        if (err) {
          reject(new Error(`Error al eliminar archivo SMB: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  async list(relativePath: string = '', recursive: boolean = false): Promise<string[]> {
    const smbPath = this.getSMBPath(relativePath);
    const files: string[] = [];

    try {
      if (recursive) {
        await this.listRecursive(smbPath, relativePath, files);
      } else {
        const items = await this.readdir(smbPath);
        for (const item of items) {
          if (item.type === 'file') {
            const filePath = path.posix.join(relativePath, item.name);
            files.push(filePath);
          }
        }
      }

      return files;
    } catch (error) {
      // Si el directorio no existe, devolver array vacío
      return [];
    }
  }

  private async readdir(smbPath: string): Promise<Array<{ name: string; type: string }>> {
    return new Promise((resolve, reject) => {
      this.client.readdir(smbPath, (err: any, files: any[]) => {
        if (err) {
          reject(err);
        } else {
          const items = files.map((file) => ({
            name: file.name,
            type: file.type === 'directory' ? 'directory' : 'file',
          }));
          resolve(items);
        }
      });
    });
  }

  private async listRecursive(smbPath: string, relativePath: string, files: string[]): Promise<void> {
    const items = await this.readdir(smbPath);

    for (const item of items) {
      const itemRelativePath = path.posix.join(relativePath, item.name);
      const itemSMBPath = path.join(smbPath, item.name);

      if (item.type === 'file') {
        files.push(itemRelativePath);
      } else if (item.type === 'directory') {
        await this.listRecursive(itemSMBPath, itemRelativePath, files);
      }
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    const smbPath = this.getSMBPath(relativePath);

    return new Promise((resolve) => {
      this.client.exists(smbPath, (err: any, exists: boolean) => {
        if (err) {
          resolve(false);
        } else {
          resolve(exists);
        }
      });
    });
  }

  getPublicUrl(relativePath: string): string {
    // Para SMB, devolver la ruta relativa
    // El servidor debe servir los archivos a través de un proxy
    return `/uploads/${relativePath}`;
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }
      resolve();
    });
  }

  // Método de prueba de conexión
  async testConnection(): Promise<boolean> {
    try {
      // Intentar listar el directorio raíz
      const basePath = this.config.basePath.replace(/\//g, '\\');
      await this.readdir(basePath);
      return true;
    } catch (error) {
      return false;
    }
  }
}
