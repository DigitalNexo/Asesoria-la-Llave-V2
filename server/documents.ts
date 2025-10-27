import { Router, Request, Response, NextFunction } from 'express';
import { documentService, configureMulter } from './services/document-service';

interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    roleId: string;
    roleName?: string | null;
    permissions: string[];
  };
}

const documentsRouter = Router();
const upload = configureMulter();

// Middleware de autenticación simple (verificar que exista user)
const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: "Usuario no autenticado" });
  }
  next();
};

// Middleware de permisos
const checkPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    // Si el usuario es administrador, tiene acceso a todo
    if (req.user.roleName === 'Administrador') {
      return next();
    }

    // Para otros usuarios, verificar si tienen el permiso específico
    if (!req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        error: "No tienes permisos para esta acción",
        required: requiredPermission 
      });
    }
    
    next();
  };
};

// Aplicar autenticación a todas las rutas
documentsRouter.use(requireAuth);

// ============ DOCUMENTOS - CRUD ============

/**
 * POST /api/documents
 * Crear nuevo documento
 * Permisos requeridos: documents:create
 */
documentsRouter.post(
  '/',
  checkPermission('documents:create'),
  async (req: Request, res: Response) => {
    try {
      const { type, name, description, templateId, clientId } = req.body;

      // Validar campos requeridos
      if (!type || !name) {
        return res.status(400).json({
          success: false,
          error: 'type y name son requeridos',
        });
      }

      const document = await documentService.createDocument({
        type,
        name,
        description,
        templateId,
        clientId,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents
 * Listar documentos con filtros opcionales
 * Query params: type, status, clientId, createdBy
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { type, status, clientId, createdBy } = req.query;

      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (clientId) filters.clientId = clientId as string;
      if (createdBy) filters.createdBy = createdBy as string;

      const documents = await documentService.getDocuments(filters);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/:id
 * Obtener documento específico
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/:id',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const document = await documentService.getDocumentById(id);

      if (!document) {
        return res.status(404).json({
          success: false,
          error: 'Documento no encontrado',
        });
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/documents/:id
 * Actualizar documento
 * Permisos requeridos: documents:update
 */
documentsRouter.put(
  '/:id',
  checkPermission('documents:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const document = await documentService.updateDocument(id, updateData);

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * DELETE /api/documents/:id
 * Eliminar documento
 * Permisos requeridos: documents:delete
 */
documentsRouter.delete(
  '/:id',
  checkPermission('documents:delete'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await documentService.deleteDocument(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============ FIRMAS DIGITALES ============

/**
 * POST /api/documents/:id/sign
 * Firmar documento
 * Body: { signatureType: 'digital' | 'electronic' | 'manual' }
 * Permisos requeridos: documents:sign
 */
documentsRouter.post(
  '/:id/sign',
  checkPermission('documents:sign'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { signatureType } = req.body;

      if (!signatureType) {
        return res.status(400).json({
          success: false,
          error: 'signatureType es requerido',
        });
      }

      const signature = await documentService.signDocument(
        id,
        req.user.id,
        signatureType,
        req.ip,
        req.get('user-agent')
      );

      res.json({
        success: true,
        data: signature,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/:id/signatures
 * Obtener todas las firmas de un documento
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/:id/signatures',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const signatures = await documentService.getSignatures(id);

      res.json({
        success: true,
        data: signatures,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============ VERSIONADO ============

/**
 * POST /api/documents/:id/versions
 * Crear nueva versión de un documento
 * Body: { content: string }
 * Permisos requeridos: documents:update
 */
documentsRouter.post(
  '/:id/versions',
  checkPermission('documents:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          error: 'content es requerido',
        });
      }

      const version = await documentService.createVersion(
        id,
        content,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: version,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/:id/versions
 * Obtener historial de versiones
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/:id/versions',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const versions = await documentService.getVersions(id);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============ ARCHIVOS ============

/**
 * POST /api/documents/:id/upload
 * Subir archivo para un documento
 * Multipart form data: file
 * Permisos requeridos: documents:update
 */
documentsRouter.post(
  '/:id/upload',
  checkPermission('documents:update'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file provided',
        });
      }

      const document = await documentService.uploadFile(id, req.file);

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/:id/download
 * Descargar archivo de un documento
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/:id/download',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const fileData = await documentService.downloadFile(id);

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileData.fileName}"`
      );
      res.setHeader('Content-Type', fileData.mimeType);

      res.send(fileData.buffer);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============ PLANTILLAS ============

/**
 * GET /api/templates
 * Listar plantillas
 * Query params: type
 * Permisos requeridos: Ninguno (público)
 */
documentsRouter.get('/templates', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const templates = await documentService.getTemplates(type as string);

    res.json({
      success: true,
      data: templates,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/templates
 * Crear nueva plantilla
 * Permisos requeridos: admin
 */
documentsRouter.post(
  '/templates',
  checkPermission('admin:templates'),
  async (req: Request, res: Response) => {
    try {
      const { type, name, description, content, variables } = req.body;

      if (!type || !name || !content) {
        return res.status(400).json({
          success: false,
          error: 'type, name y content son requeridos',
        });
      }

      const template = await documentService.createTemplate({
        type,
        name,
        description,
        content,
        variables,
      });

      res.status(201).json({
        success: true,
        data: template,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

// ============ UTILIDADES ============

/**
 * GET /api/documents/stats/all
 * Obtener estadísticas de documentos
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/stats/all',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const stats = await documentService.getDocumentStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/client/:clientId
 * Obtener todos los documentos de un cliente
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/client/:clientId',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { clientId } = req.params;

      const documents = await documentService.getClientDocuments(clientId);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * PUT /api/documents/:id/archive
 * Archivar un documento
 * Permisos requeridos: documents:update
 */
documentsRouter.put(
  '/:id/archive',
  checkPermission('documents:update'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const document = await documentService.archiveDocument(id);

      res.json({
        success: true,
        data: document,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/documents/search/:query
 * Buscar documentos
 * Permisos requeridos: documents:read
 */
documentsRouter.get(
  '/search/:query',
  checkPermission('documents:read'),
  async (req: Request, res: Response) => {
    try {
      const { query } = req.params;

      if (!query || query.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Query debe tener al menos 2 caracteres',
        });
      }

      const documents = await documentService.searchDocuments(query);

      res.json({
        success: true,
        data: documents,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export { documentsRouter };
