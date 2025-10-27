import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// Interfaz común para todos los proveedores de almacenamiento
export interface StorageProvider {
  // Subir un archivo desde un buffer o stream
  upload(file: Buffer | Readable, relativePath: string): Promise<string>;
  
  // Descargar un archivo como buffer
  download(relativePath: string): Promise<Buffer>;
  
  // Eliminar un archivo
  delete(relativePath: string): Promise<void>;
  
  // Listar archivos en una ruta (recursivo opcional)
  list(relativePath?: string, recursive?: boolean): Promise<string[]>;
  
  // Verificar si existe un archivo
  exists(relativePath: string): Promise<boolean>;
  
  // Obtener la URL pública de un archivo (si aplica)
  getPublicUrl(relativePath: string): string;
  
  // Cerrar conexiones (si aplica)
  disconnect?(): Promise<void>;
}

// Implementación local de almacenamiento (actual)
export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath: string = path.join(process.cwd(), 'uploads')) {
    this.basePath = basePath;
  }

  async upload(file: Buffer | Readable, relativePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, relativePath);
    const dir = path.dirname(fullPath);
    
    // Crear directorio si no existe
    await fs.mkdir(dir, { recursive: true });
    
    if (Buffer.isBuffer(file)) {
      // Escribir buffer directamente
      await fs.writeFile(fullPath, file);
    } else {
      // Escribir stream
      const writeStream = (await import('fs')).createWriteStream(fullPath);
      await new Promise((resolve, reject) => {
        file.pipe(writeStream);
        file.on('end', resolve);
        file.on('error', reject);
        writeStream.on('error', reject);
      });
    }
    
    return relativePath;
  }

  async download(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, relativePath);
    return await fs.readFile(fullPath);
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, relativePath);
    await fs.unlink(fullPath);
  }

  async list(relativePath: string = '', recursive: boolean = false): Promise<string[]> {
    const fullPath = path.join(this.basePath, relativePath);
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        
        if (entry.isFile()) {
          files.push(entryPath);
        } else if (entry.isDirectory() && recursive) {
          const subFiles = await this.list(entryPath, true);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // Si el directorio no existe, devolver array vacío
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
    
    return files;
  }

  async exists(relativePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, relativePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(relativePath: string): string {
    // Para almacenamiento local, devolver la ruta relativa
    // El servidor debe servir los archivos estáticamente
    return `/uploads/${relativePath}`;
  }
}

// Utilidad para convertir stream a buffer
export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
