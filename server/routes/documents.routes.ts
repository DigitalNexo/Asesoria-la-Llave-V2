import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { documentsService } from '../services/documents.service';
import { documentPdfService } from '../services/document-pdf.service';
import { documentEmailService } from '../services/document-email.service';
import { AuthRequest } from '../types/express';
import multer from 'multer';
import path from 'path';
import { nanoid } from 'nanoid';

const router = Router();

// Configurar multer para subida de archivos firmados
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'uploads', 'documents', 'signed'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${nanoid()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF'));
    }
  },
});

// ============================================================================
// RECIBOS
// ============================================================================

/**
 * Crear recibo
 */
router.post('/receipts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const receipt = await documentsService.createReceipt({
      ...req.body,
      createdBy: userId,
    });

    res.status(201).json(receipt);
  } catch (error: any) {
    console.error('Error creating receipt:', error);
    res.status(500).json({ error: error.message || 'Error al crear recibo' });
  }
});

/**
 * Listar recibos
 */
router.get('/receipts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { status, clientId, year } = req.query;

    const receipts = await documentsService.listReceipts({
      status: status as string,
      clientId: clientId as string,
      year: year ? parseInt(year as string) : undefined,
    });

    res.json(receipts);
  } catch (error: any) {
    console.error('Error listing receipts:', error);
    res.status(500).json({ error: error.message || 'Error al listar recibos' });
  }
});

/**
 * Obtener recibo por ID
 */
router.get('/receipts/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const receipt = await documentsService.getReceiptById(req.params.id);
    res.json(receipt);
  } catch (error: any) {
    console.error('Error getting receipt:', error);
    res.status(404).json({ error: error.message || 'Recibo no encontrado' });
  }
});

/**
 * Generar PDF de recibo
 */
router.post('/receipts/:id/generate-pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const receipt = await documentsService.getReceiptById(req.params.id);

    const pdfPath = await documentPdfService.generateReceiptPdf(receipt);

    await documentsService.updateReceipt(req.params.id, { pdf_path: pdfPath });

    res.json({
      success: true,
      message: 'PDF generado correctamente',
      pdfPath,
    });
  } catch (error: any) {
    console.error('Error generating receipt PDF:', error);
    res.status(500).json({ error: error.message || 'Error al generar PDF' });
  }
});

/**
 * Enviar recibo por email
 */
router.post('/receipts/:id/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { to, subject, message } = req.body;

    const receipt = await documentsService.getReceiptById(req.params.id);

    if (!receipt.pdf_path) {
      return res.status(400).json({ error: 'Debe generar el PDF primero' });
    }

    await documentEmailService.sendReceiptEmail(req.params.id, receipt.pdf_path, to || receipt.recipient_email);

    res.json({
      success: true,
      message: 'Recibo enviado correctamente',
    });
  } catch (error: any) {
    console.error('Error sending receipt:', error);
    res.status(500).json({ error: error.message || 'Error al enviar recibo' });
  }
});

// ============================================================================
// DOCUMENTOS (Protección de Datos, Domiciliación Bancaria)
// ============================================================================

/**
 * Crear documento
 */
router.post('/documents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const document = await documentsService.createDocument({
      ...req.body,
      createdBy: userId,
    });

    res.status(201).json(document);
  } catch (error: any) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: error.message || 'Error al crear documento' });
  }
});

/**
 * Listar documentos
 */
router.get('/documents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type, status, clientId } = req.query;

    const documents = await documentsService.listDocuments({
      type: type as string,
      status: status as string,
      clientId: clientId as string,
    });

    res.json(documents);
  } catch (error: any) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: error.message || 'Error al listar documentos' });
  }
});

/**
 * Obtener documento por ID
 */
router.get('/documents/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const document = await documentsService.getDocumentById(req.params.id);
    res.json(document);
  } catch (error: any) {
    console.error('Error getting document:', error);
    res.status(404).json({ error: error.message || 'Documento no encontrado' });
  }
});

/**
 * Generar PDF de documento
 */
router.post('/documents/:id/generate-pdf', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const document = await documentsService.getDocumentById(req.params.id);

    const pdfPath = await documentPdfService.generateDocumentPdf(document);

    await documentsService.updateDocument(req.params.id, { filePath: pdfPath });

    res.json({
      success: true,
      message: 'PDF generado correctamente',
      pdfPath,
    });
  } catch (error: any) {
    console.error('Error generating document PDF:', error);
    res.status(500).json({ error: error.message || 'Error al generar PDF' });
  }
});

/**
 * Enviar documento por email
 */
router.post('/documents/:id/send', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { to, subject, message } = req.body;

    const document = await documentsService.getDocumentById(req.params.id);

    if (!document.file_path) {
      return res.status(400).json({ error: 'Debe generar el PDF primero' });
    }

    await documentEmailService.sendDocumentEmail(
      req.params.id,
      document.file_path,
      to || document.clients?.email
    );

    res.json({
      success: true,
      message: 'Documento enviado correctamente',
    });
  } catch (error: any) {
    console.error('Error sending document:', error);
    res.status(500).json({ error: error.message || 'Error al enviar documento' });
  }
});

/**
 * Marcar documento como aceptado y subir firmado
 */
router.post(
  '/documents/:id/accept',
  authenticateToken,
  upload.single('signedFile'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Debe adjuntar el archivo firmado' });
      }

      const document = await documentsService.markDocumentAsAccepted(
        req.params.id,
        req.file.path,
        userId
      );

      res.json({
        success: true,
        message: 'Documento marcado como aceptado',
        document,
      });
    } catch (error: any) {
      console.error('Error accepting document:', error);
      res.status(500).json({ error: error.message || 'Error al aceptar documento' });
    }
  }
);

// ============================================================================
// PLANTILLAS
// ============================================================================

/**
 * Crear plantilla
 */
router.post('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const template = await documentsService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Error al crear plantilla' });
  }
});

/**
 * Listar plantillas
 */
router.get('/templates', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type, isActive } = req.query;

    const templates = await documentsService.listTemplates({
      type: type as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });

    res.json(templates);
  } catch (error: any) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: error.message || 'Error al listar plantillas' });
  }
});

/**
 * Obtener plantilla por ID
 */
router.get('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const template = await documentsService.getTemplateById(req.params.id);
    res.json(template);
  } catch (error: any) {
    console.error('Error getting template:', error);
    res.status(404).json({ error: error.message || 'Plantilla no encontrada' });
  }
});

/**
 * Actualizar plantilla
 */
router.put('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const template = await documentsService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar plantilla' });
  }
});

/**
 * Eliminar plantilla
 */
router.delete('/templates/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    await documentsService.deleteTemplate(req.params.id);
    res.json({ success: true, message: 'Plantilla eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar plantilla' });
  }
});

export default router;
