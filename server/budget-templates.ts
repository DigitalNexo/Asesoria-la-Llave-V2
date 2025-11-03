import express from 'express';
import { randomUUID } from 'crypto';
import prisma from './prisma-client';
import { authenticateToken, checkIsAdmin } from './middleware/auth';
import logger from './logger';
const router = express.Router();

// Aplicar autenticación y verificación de admin a todas las rutas
router.use(authenticateToken);
router.use(checkIsAdmin);

// GET /api/budget-templates - Listar todas las plantillas
router.get('/', async (req, res) => {
  try {
    const { type, companyBrand, isActive, isDefault } = req.query;
    
    const where: any = {};
    if (type) where.type = type;
    if (companyBrand) where.companyBrand = companyBrand;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isDefault !== undefined) where.isDefault = isDefault === 'true';

    const templates = await prisma.budget_templates.findMany({
      where,
      orderBy: { updatedAt: 'desc' }
    });

    res.json(templates);
    logger.info(`Plantillas listadas: ${templates.length} encontradas`);
  } catch (error) {
    logger.error({ error }, 'Error al listar plantillas');
    res.status(500).json({ 
      message: 'Error al listar las plantillas de presupuesto',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/budget-templates/:id - Obtener una plantilla específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.budget_templates.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    res.json(template);
    logger.info(`Plantilla obtenida: ${template.name}`);
  } catch (error) {
    logger.error({ error }, 'Error al obtener plantilla');
    res.status(500).json({ 
      message: 'Error al obtener la plantilla',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget-templates - Crear una nueva plantilla
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      type, 
      companyBrand, 
      htmlContent, 
      availableVars,
      customCss,
      isDefault,
      isActive 
    } = req.body;

    // Validaciones básicas
    if (!name || !type || !htmlContent) {
      return res.status(400).json({ 
        message: 'Faltan campos requeridos: name, type, htmlContent' 
      });
    }

    // Si se marca como predeterminada, desmarcar la anterior
    if (isDefault) {
      await prisma.budget_templates.updateMany({
        where: {
          type,
          companyBrand: companyBrand || 'LA_LLAVE',
          isDefault: true
        },
        data: { isDefault: false }
      });
    }

    const template = await prisma.budget_templates.create({
      data: {
        id: randomUUID(),
        name,
        description,
        type,
        companyBrand: companyBrand || 'LA_LLAVE',
        htmlContent,
        availableVars,
        customCss,
        isDefault: isDefault || false,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: (req as any).user?.id,
        updatedBy: (req as any).user?.id,
        updatedAt: new Date()
      }
    });

    res.status(201).json(template);
    logger.info(`Plantilla creada: ${template.name} (${template.id})`);
  } catch (error) {
    logger.error({ error }, 'Error al crear plantilla');
    res.status(500).json({ 
      message: 'Error al crear la plantilla',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/budget-templates/:id - Actualizar una plantilla
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      type, 
      companyBrand, 
      htmlContent, 
      availableVars,
      customCss,
      isDefault,
      isActive 
    } = req.body;

    // Verificar que la plantilla existe
    const existing = await prisma.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Si se marca como predeterminada, desmarcar la anterior
    if (isDefault && !existing.isDefault) {
      await prisma.budget_templates.updateMany({
        where: {
          type: type || existing.type,
          companyBrand: companyBrand || existing.companyBrand,
          isDefault: true,
          id: { not: id }
        },
        data: { isDefault: false }
      });
    }

    const template = await prisma.budget_templates.update({
      where: { id },
      data: {
        name,
        description,
        type,
        companyBrand,
        htmlContent,
        availableVars,
        customCss,
        isDefault,
        isActive,
        updatedBy: (req as any).user?.id,
        updatedAt: new Date()
      }
    });

    res.json(template);
    logger.info(`Plantilla actualizada: ${template.name} (${template.id})`);
  } catch (error) {
    logger.error({ error }, 'Error al actualizar plantilla');
    res.status(500).json({ 
      message: 'Error al actualizar la plantilla',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DELETE /api/budget-templates/:id - Eliminar una plantilla
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la plantilla existe
    const existing = await prisma.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // No permitir eliminar plantillas predeterminadas
    if (existing.isDefault) {
      return res.status(400).json({ 
        message: 'No se puede eliminar una plantilla predeterminada. Primero marca otra como predeterminada.' 
      });
    }

    await prisma.budget_templates.delete({ where: { id } });

    res.json({ message: 'Plantilla eliminada exitosamente' });
    logger.info(`Plantilla eliminada: ${existing.name} (${id})`);
  } catch (error) {
    logger.error({ error }, 'Error al eliminar plantilla');
    res.status(500).json({ 
      message: 'Error al eliminar la plantilla',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/budget-templates/:id/set-default - Marcar como predeterminada
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la plantilla existe
    const existing = await prisma.budget_templates.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Plantilla no encontrada' });
    }

    // Desmarcar la anterior predeterminada del mismo tipo y empresa
    await prisma.budget_templates.updateMany({
      where: {
        type: existing.type,
        companyBrand: existing.companyBrand,
        isDefault: true,
        id: { not: id }
      },
      data: { isDefault: false }
    });

    // Marcar la actual como predeterminada
    const template = await prisma.budget_templates.update({
      where: { id },
      data: { 
        isDefault: true,
        updatedBy: (req as any).user?.id,
        updatedAt: new Date()
      }
    });

    res.json(template);
    logger.info(`Plantilla marcada como predeterminada: ${template.name} (${template.id})`);
  } catch (error) {
    logger.error({ error }, 'Error al marcar plantilla como predeterminada');
    res.status(500).json({ 
      message: 'Error al marcar la plantilla como predeterminada',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
