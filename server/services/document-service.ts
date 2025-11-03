import prisma from '../prisma-client';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

export class DocumentService {
  private uploadDir: string;
  private maxFileSize = 50 * 1024 * 1024; // 50MB

  constructor(uploadDir = './uploads/documents') {
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ============ DOCUMENTO CRUD ============

  async createDocument(data: {
    type: string;
    name: string;
    description?: string;
    templateId?: string;
    clientId?: string;
    createdBy: string;
  }) {
    const id = uuidv4();
    
    const document = await prisma.documents.create({
      data: {
        id,
        type: data.type,
        name: data.name,
        description: data.description,
        template_id: data.templateId,
        client_id: data.clientId,
        created_by: data.createdBy,
        status: 'draft',
        updated_at: new Date(),
      },
    });

    return document;
  }

  async getDocuments(filters: {
    clientId?: string;
    type?: string;
    status?: string;
    createdBy?: string;
  }) {
    const where: any = {};

    if (filters.clientId) where.client_id = filters.clientId;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.createdBy) where.created_by = filters.createdBy;

    const documents = await prisma.documents.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });

    return documents;
  }

  async getDocumentById(id: string) {
    const document = await prisma.documents.findUnique({
      where: { id },
    });

    return document;
  }

  async updateDocument(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      signatureStatus?: string;
      signatureDate?: Date;
      signedBy?: string;
    }
  ) {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.name) updateData.name = data.name;
    if (data.description) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.signatureStatus) updateData.signature_status = data.signatureStatus;
    if (data.signatureDate) updateData.signature_date = data.signatureDate;
    if (data.signedBy) updateData.signed_by = data.signedBy;

    const document = await prisma.documents.update({
      where: { id },
      data: updateData,
    });

    return document;
  }

  async deleteDocument(id: string) {
    const document = await prisma.documents.findUnique({
      where: { id },
    });

    if (!document) {
      throw new Error('Documento no encontrado');
    }

    // Eliminar archivo si existe
    if (document.file_path) {
      const fullPath = path.join(process.cwd(), document.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // Eliminar firmas y versiones
    await prisma.document_signatures.deleteMany({
      where: { document_id: id },
    });

    await prisma.document_versions.deleteMany({
      where: { document_id: id },
    });

    // Eliminar documento
    await prisma.documents.delete({
      where: { id },
    });

    return { success: true, id };
  }

  // ============ TEMPLATES ============

  async createTemplate(data: {
    type: string;
    name: string;
    description?: string;
    content: string;
    variables?: Record<string, string>;
  }) {
    const id = uuidv4();

    const template = await prisma.document_templates.create({
      data: {
        id,
        type: data.type,
        name: data.name,
        description: data.description,
        content: data.content,
        variables: data.variables ? JSON.stringify(data.variables) : null,
        is_active: true,
        updated_at: new Date(),
      },
    });

    return template;
  }

  async getTemplates(type?: string) {
    const where: any = {
      is_active: true,
    };

    if (type) where.type = type;

    const templates = await prisma.document_templates.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
    });

    return templates;
  }

  async getTemplateById(id: string) {
    const template = await prisma.document_templates.findUnique({
      where: { id },
    });

    return template;
  }

  // ============ FIRMAS ============

  async signDocument(
    documentId: string,
    userId: string,
    signatureType: 'digital' | 'electronic' | 'manual',
    ipAddress?: string,
    userAgent?: string
  ) {
    const signatureId = uuidv4();

    // Crear registro de firma
    const signature = await prisma.document_signatures.create({
      data: {
        id: signatureId,
        document_id: documentId,
        signed_by: userId,
        signature_type: signatureType,
        ip_address: ipAddress,
        user_agent: userAgent,
        signature_date: new Date(),
      },
      include: {
        users: true,
      },
    });

    // Actualizar documento
    await prisma.documents.update({
      where: { id: documentId },
      data: {
        signature_status: 'signed',
        signature_date: new Date(),
        signed_by: userId,
        status: 'signed',
        updated_at: new Date(),
      },
    });

    return signature;
  }

  async getSignatures(documentId: string) {
    const signatures = await prisma.document_signatures.findMany({
      where: { document_id: documentId },
      include: {
        users: true,
      },
      orderBy: {
        signature_date: 'desc',
      },
    });

    return signatures;
  }

  // ============ VERSIONADO ============

  async createVersion(documentId: string, content: string, createdBy: string) {
    // Obtener versión anterior para incrementar número
    const lastVersion = await prisma.document_versions.findFirst({
      where: { document_id: documentId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version ?? 0) + 1;
    const versionId = uuidv4();

    const version = await prisma.document_versions.create({
      data: {
        id: versionId,
        document_id: documentId,
        version: nextVersion,
        content,
        created_by: createdBy,
      },
      include: {
        users: true,
      },
    });

    return version;
  }

  async getVersions(documentId: string) {
    const versions = await prisma.document_versions.findMany({
      where: { document_id: documentId },
      include: {
        users: true,
      },
      orderBy: {
        version: 'desc',
      },
    });

    return versions;
  }

  // ============ ARCHIVOS ============

  async uploadFile(documentId: string, file: Express.Multer.File) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Generar nombre único
    const timestamp = Date.now();
    const fileName = `${documentId}-${timestamp}-${file.originalname}`;
    const filePath = path.join(this.uploadDir, fileName);
    const relativeFilePath = path.join('uploads/documents', fileName);

    // Guardar archivo
    fs.writeFileSync(filePath, file.buffer);

    // Actualizar documento
    const document = await prisma.documents.update({
      where: { id: documentId },
      data: {
        file_path: relativeFilePath,
        file_name: file.originalname,
        file_size: file.size,
        file_type: file.mimetype,
        updated_at: new Date(),
      },
    });

    return document;
  }

  async downloadFile(documentId: string) {
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
    });

    if (!document || !document.file_path) {
      return null;
    }

    const filePath = path.join(process.cwd(), document.file_path);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = document.file_name || `document-${documentId}`;

    return {
      buffer: fileBuffer,
      fileName,
      mimeType: document.file_type || 'application/octet-stream',
    };
  }

  // ============ UTILIDADES ============

  async getDocumentStats() {
    const stats = {
      totalDocuments: await prisma.documents.count(),
      byType: await prisma.documents.groupBy({
        by: ['type'],
        _count: true,
      }),
      byStatus: await prisma.documents.groupBy({
        by: ['status'],
        _count: true,
      }),
      totalSignatures: await prisma.document_signatures.count(),
      totalVersions: await prisma.document_versions.count(),
    };

    return stats;
  }

  async getClientDocuments(clientId: string) {
    const documents = await prisma.documents.findMany({
      where: { client_id: clientId },
      include: {
        users: true,
        signatures: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return documents;
  }

  async archiveDocument(documentId: string) {
    const document = await prisma.documents.update({
      where: { id: documentId },
      data: {
        status: 'archived',
        updated_at: new Date(),
      },
    });

    return document;
  }

  async searchDocuments(query: string) {
    const documents = await prisma.documents.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      },
      include: {
        users: true,
        signatures: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return documents;
  }
}

// Configurar Multer para uploads
export const configureMulter = () => {
  const storage = multer.memoryStorage();

  const upload = multer({
    storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
    fileFilter: (req, file, cb) => {
      // Permitir tipos MIME comunes para documentos
      const allowedMimes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
      ];

      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type'));
      }
    },
  });

  return upload;
};

// Exportar instancia singleton
export const documentService = new DocumentService();

export default documentService;
