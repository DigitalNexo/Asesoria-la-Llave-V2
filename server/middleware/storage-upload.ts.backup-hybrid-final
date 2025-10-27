import { Request, Response, NextFunction } from 'express';
import { StorageFactory } from '../services/storage-factory';
import fs from 'fs/promises';
import path from 'path';

// Middleware para subir archivos al StorageProvider activo
export async function uploadToStorage(req: Request, res: Response, next: NextFunction) {
  try {
    // Si no hay archivos, continuar
    if (!req.file && !req.files) {
      return next();
    }

    const provider = await StorageFactory.getActiveProvider();
    
    // Procesar un solo archivo
    if (req.file) {
      await processFile(req.file, provider);
    }

    // Procesar múltiples archivos
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        await processFile(file, provider);
      }
    }

    // Procesar archivos por campo
    if (req.files && !Array.isArray(req.files)) {
      for (const fieldname in req.files) {
        const files = req.files[fieldname];
        for (const file of files) {
          await processFile(file, provider);
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error al subir archivo al storage:', error);
    next(error);
  }
}

async function processFile(file: Express.Multer.File, provider: any) {
  // Determinar la ruta relativa del archivo
  // Mantener la estructura de carpetas relativa
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const relativePath = path.relative(uploadsDir, file.path);

  // Si es LOCAL, el archivo ya está en el lugar correcto, no hacer nada
  const isLocal = provider.constructor.name === 'LocalStorageProvider';
  if (isLocal) {
    file.path = relativePath;
    file.destination = path.dirname(relativePath);
    return;
  }

  // Para providers remotos (FTP/SMB), usar stream para evitar cargar todo en memoria
  const tempFilePath = file.path; // Guardar ruta absoluta original para cleanup
  const readStream = (await import('fs')).createReadStream(tempFilePath);

  try {
    // Subir al provider usando stream
    await provider.upload(readStream, relativePath);

    // Actualizar la propiedad del archivo para reflejar la nueva ubicación
    file.path = relativePath;
    file.destination = path.dirname(relativePath);

    // Eliminar el archivo temporal usando la ruta original guardada
    await fs.unlink(tempFilePath);
  } catch (error) {
    // Si falla, asegurar que el stream se cierre
    readStream.destroy();
    throw error;
  }
}

// Middleware para descargar archivos desde el StorageProvider
export async function downloadFromStorage(relativePath: string): Promise<Buffer> {
  const provider = await StorageFactory.getActiveProvider();
  return await provider.download(relativePath);
}

// Middleware para servir archivos estáticos desde el StorageProvider
export function serveFromStorage() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Obtener la ruta relativa del archivo
      const relativePath = req.path.replace('/uploads/', '');

      const provider = await StorageFactory.getActiveProvider();

      // Verificar si el archivo existe
      const exists = await provider.exists(relativePath);
      if (!exists) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
      }

      // Descargar el archivo
      const fileBuffer = await provider.download(relativePath);

      // Determinar el tipo MIME
      const ext = path.extname(relativePath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.zip': 'application/zip',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Enviar el archivo
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', fileBuffer.length);
      res.send(fileBuffer);
    } catch (error) {
      console.error('Error al servir archivo desde storage:', error);
      next(error);
    }
  };
}
