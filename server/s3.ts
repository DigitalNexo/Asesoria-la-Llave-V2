import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { fileTypeFromBuffer } from "file-type";
import crypto from "crypto";
import path from "path";

// Configuración S3
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true, // Para MinIO
});

const BUCKET = process.env.S3_BUCKET || "asesoria-llave";

// MIME types permitidos
const ALLOWED_MIME_TYPES = {
  // Documentos
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel": ".xls",
  "application/msword": ".doc",
  "text/plain": ".txt",
  "text/csv": ".csv",
  
  // Imágenes
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  
  // Otros
  "application/zip": ".zip",
  "application/x-rar-compressed": ".rar",
} as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadedFile {
  key: string;
  url: string;
  size: number;
  mimeType: string;
  originalName: string;
}

export interface UploadOptions {
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

/**
 * Sube un archivo a S3
 */
export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  options: UploadOptions = {}
): Promise<UploadedFile> {
  const { folder = "uploads", maxSize = MAX_FILE_SIZE, allowedTypes } = options;

  // Validar tamaño
  if (buffer.length > maxSize) {
    throw new Error(`Archivo demasiado grande. Máximo permitido: ${maxSize / 1024 / 1024}MB`);
  }

  // Detectar MIME type real del archivo
  const fileType = await fileTypeFromBuffer(buffer);
  const mimeType = fileType?.mime || "application/octet-stream";

  // Validar MIME type
  const allowed = allowedTypes || Object.keys(ALLOWED_MIME_TYPES);
  if (!allowed.includes(mimeType)) {
    throw new Error(`Tipo de archivo no permitido: ${mimeType}`);
  }

  // Generar nombre único
  const ext = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES] || path.extname(originalName);
  const hash = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();
  const fileName = `${timestamp}_${hash}${ext}`;
  const key = `${folder}/${fileName}`;

  // Subir a S3
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: "max-age=31536000", // 1 año
      },
    });

    await upload.done();

    // Generar URL
    const url = process.env.S3_ENDPOINT
      ? `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`
      : `https://${BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;

    return {
      key,
      url,
      size: buffer.length,
      mimeType,
      originalName,
    };
  } catch (error) {
    console.error("Error al subir archivo a S3:", error);
    throw new Error("Error al subir archivo");
  }
}

/**
 * Elimina un archivo de S3
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Error al eliminar archivo de S3:", error);
    throw new Error("Error al eliminar archivo");
  }
}

/**
 * Descarga un archivo de S3
 */
export async function downloadFile(key: string): Promise<Buffer> {
  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error("Archivo no encontrado");
    }

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error("Error al descargar archivo de S3:", error);
    throw new Error("Error al descargar archivo");
  }
}

/**
 * Verifica si S3 está configurado correctamente
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_BUCKET
  );
}

/**
 * Middleware de Express para subir archivos desde multipart/form-data
 */
export function createUploadMiddleware(options: UploadOptions = {}) {
  return async (req: any, res: any, next: any) => {
    if (!req.file && !req.files) {
      return next();
    }

    try {
      const files = req.files || [req.file];
      const uploadedFiles: UploadedFile[] = [];

      for (const file of files) {
        const uploaded = await uploadFile(file.buffer, file.originalname, options);
        uploadedFiles.push(uploaded);
      }

      req.uploadedFiles = uploadedFiles;
      req.uploadedFile = uploadedFiles[0];
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default {
  uploadFile,
  deleteFile,
  downloadFile,
  isS3Configured,
  createUploadMiddleware,
};
