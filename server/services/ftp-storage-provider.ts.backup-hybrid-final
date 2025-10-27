import { Client as FTPClient } from 'basic-ftp';
import { StorageProvider } from './storage-provider';
import { Readable } from 'stream';
import path from 'path';

export interface FTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  basePath: string;
  secure?: boolean; // FTPS
}

export class FTPStorageProvider implements StorageProvider {
  private config: FTPConfig;
  private client: FTPClient | null = null;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(config: FTPConfig) {
    this.config = {
      ...config,
      basePath: config.basePath || '/uploads',
      secure: config.secure || false,
    };
  }

  private async ensureConnection(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    // Si ya hay una conexión en progreso, esperar a que termine
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        this.client = new FTPClient();
        this.client.ftp.verbose = false; // Desactivar logs verbose

        await this.client.access({
          host: this.config.host,
          port: this.config.port,
          user: this.config.user,
          password: this.config.password,
          secure: this.config.secure,
        });

        this.isConnected = true;
      } catch (error) {
        this.client = null;
        this.isConnected = false;
        throw new Error(`Error al conectar con FTP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  async upload(file: Buffer | Readable, relativePath: string): Promise<string> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Cliente FTP no conectado');

    const fullPath = path.posix.join(this.config.basePath, relativePath);
    const dir = path.posix.dirname(fullPath);

    // Crear directorio si no existe
    await this.client.ensureDir(dir);

    // Subir archivo
    if (Buffer.isBuffer(file)) {
      // Para buffers, podemos reintentar porque no se consumen
      try {
        const stream = Readable.from(file);
        await this.client.uploadFrom(stream, fullPath);
      } catch (error) {
        // Intentar reconectar y reintentar con nuevo stream
        this.isConnected = false;
        await this.ensureConnection();
        const stream = Readable.from(file);
        await this.client!.uploadFrom(stream, fullPath);
      }
    } else {
      // Para streams, no reintentar porque ya están consumidos
      // Si falla, propagar el error y el cliente debe reintentar
      await this.client.uploadFrom(file, fullPath);
    }

    return relativePath;
  }

  async download(relativePath: string): Promise<Buffer> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Cliente FTP no conectado');

    const fullPath = path.posix.join(this.config.basePath, relativePath);
    const chunks: Buffer[] = [];

    try {
      const writableStream = new (require('stream').Writable)({
        write(chunk: Buffer, encoding: string, callback: () => void) {
          chunks.push(chunk);
          callback();
        },
      });

      await this.client.downloadTo(writableStream, fullPath);
      return Buffer.concat(chunks);
    } catch (error) {
      // Intentar reconectar y reintentar
      this.isConnected = false;
      await this.ensureConnection();

      const writableStream = new (require('stream').Writable)({
        write(chunk: Buffer, encoding: string, callback: () => void) {
          chunks.push(chunk);
          callback();
        },
      });

      await this.client!.downloadTo(writableStream, fullPath);
      return Buffer.concat(chunks);
    }
  }

  async delete(relativePath: string): Promise<void> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Cliente FTP no conectado');

    const fullPath = path.posix.join(this.config.basePath, relativePath);

    try {
      await this.client.remove(fullPath);
    } catch (error) {
      // Intentar reconectar y reintentar
      this.isConnected = false;
      await this.ensureConnection();
      await this.client!.remove(fullPath);
    }
  }

  async list(relativePath: string = '', recursive: boolean = false): Promise<string[]> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Cliente FTP no conectado');

    const fullPath = path.posix.join(this.config.basePath, relativePath);
    const files: string[] = [];

    try {
      if (recursive) {
        // Listar recursivamente
        await this.listRecursive(fullPath, relativePath, files);
      } else {
        // Listar solo el directorio actual
        const items = await this.client.list(fullPath);
        for (const item of items) {
          if (item.type === 1) { // 1 = archivo
            const filePath = path.posix.join(relativePath, item.name);
            files.push(filePath);
          }
        }
      }

      return files;
    } catch (error) {
      // Si el directorio no existe, devolver array vacío
      if ((error as any).code === 550) {
        return [];
      }
      
      // Intentar reconectar y reintentar
      this.isConnected = false;
      await this.ensureConnection();
      return this.list(relativePath, recursive);
    }
  }

  private async listRecursive(fullPath: string, relativePath: string, files: string[]): Promise<void> {
    if (!this.client) return;

    const items = await this.client.list(fullPath);
    
    for (const item of items) {
      const itemRelativePath = path.posix.join(relativePath, item.name);
      const itemFullPath = path.posix.join(fullPath, item.name);

      if (item.type === 1) { // archivo
        files.push(itemRelativePath);
      } else if (item.type === 2) { // directorio
        await this.listRecursive(itemFullPath, itemRelativePath, files);
      }
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    await this.ensureConnection();
    if (!this.client) throw new Error('Cliente FTP no conectado');

    const fullPath = path.posix.join(this.config.basePath, relativePath);
    const dir = path.posix.dirname(fullPath);
    const filename = path.posix.basename(fullPath);

    try {
      const items = await this.client.list(dir);
      return items.some(item => item.name === filename);
    } catch (error) {
      // Si el directorio no existe, el archivo tampoco
      if ((error as any).code === 550) {
        return false;
      }
      
      // Intentar reconectar y reintentar
      this.isConnected = false;
      await this.ensureConnection();
      return this.exists(relativePath);
    }
  }

  getPublicUrl(relativePath: string): string {
    // Para FTP, devolver la ruta relativa
    // El servidor debe servir los archivos a través de un proxy
    return `/uploads/${relativePath}`;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
      this.isConnected = false;
    }
  }

  // Método de prueba de conexión
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureConnection();
      return this.isConnected;
    } catch (error) {
      return false;
    }
  }
}
