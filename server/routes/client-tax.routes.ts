import { Router, Request, Response } from 'express';
import ClientTaxService from '../services/client-tax.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/clients/:clientId/tax-models
 * Obtener todos los modelos fiscales de un cliente
 */
router.get('/:clientId/tax-models', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { activeOnly } = req.query;

    let models;
    if (activeOnly === 'true') {
      models = await ClientTaxService.getActiveClientTaxModels(clientId);
    } else {
      models = await ClientTaxService.getClientTaxModels(clientId);
    }

    res.json({
      success: true,
      data: models,
      count: models.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo modelos del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo modelos fiscales del cliente',
      error: error.message,
    });
  }
});

/**
 * GET /api/clients/:clientId/tax-models/stats
 * Obtener estadísticas de modelos de un cliente
 */
router.get('/:clientId/tax-models/stats', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const stats = await ClientTaxService.getClientTaxStats(clientId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo estadísticas',
      error: error.message,
    });
  }
});

/**
 * GET /api/clients/tax-models/:id
 * Obtener un modelo fiscal específico
 */
router.get('/tax-models/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const model = await ClientTaxService.getClientTaxModel(id);

    if (!model) {
      return res.status(404).json({
        success: false,
        message: 'Modelo fiscal no encontrado',
      });
    }

    res.json({
      success: true,
      data: model,
    });
  } catch (error: any) {
    console.error('Error obteniendo modelo fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo modelo fiscal',
      error: error.message,
    });
  }
});

/**
 * POST /api/clients/:clientId/tax-models
 * Dar de alta un modelo fiscal para un cliente
 */
router.post('/:clientId/tax-models', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { model_number, period_type, start_date, end_date, notes } = req.body;

    // Validaciones
    if (!model_number || !period_type || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: model_number, period_type, start_date',
      });
    }

    if (!['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(period_type)) {
      return res.status(400).json({
        success: false,
        message: 'period_type debe ser MONTHLY, QUARTERLY o ANNUAL',
      });
    }

    const newModel = await ClientTaxService.createClientTaxModel({
      client_id: clientId,
      model_number,
      period_type,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : undefined,
      notes,
    });

    res.status(201).json({
      success: true,
      message: 'Modelo fiscal dado de alta exitosamente',
      data: newModel,
    });
  } catch (error: any) {
    console.error('Error creando modelo fiscal:', error);
    
    if (error.message.includes('ya está dado de alta')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error dando de alta modelo fiscal',
      error: error.message,
    });
  }
});

/**
 * PUT /api/clients/tax-models/:id
 * Actualizar un modelo fiscal
 */
router.put('/tax-models/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Convertir fechas si existen
    if (data.start_date) data.start_date = new Date(data.start_date);
    if (data.end_date) data.end_date = new Date(data.end_date);

    const updatedModel = await ClientTaxService.updateClientTaxModel(id, data);

    res.json({
      success: true,
      message: 'Modelo fiscal actualizado exitosamente',
      data: updatedModel,
    });
  } catch (error: any) {
    console.error('Error actualizando modelo fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando modelo fiscal',
      error: error.message,
    });
  }
});

/**
 * PUT /api/clients/tax-models/:id/toggle
 * Activar/Desactivar un modelo fiscal
 */
router.put('/tax-models/:id/toggle', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo is_active debe ser booleano',
      });
    }

    const updatedModel = await ClientTaxService.toggleClientTaxModel(id, is_active);

    res.json({
      success: true,
      message: `Modelo fiscal ${is_active ? 'activado' : 'desactivado'} exitosamente`,
      data: updatedModel,
    });
  } catch (error: any) {
    console.error('Error cambiando estado del modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Error cambiando estado del modelo',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/clients/tax-models/:id
 * Eliminar un modelo fiscal
 */
router.delete('/tax-models/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await ClientTaxService.deleteClientTaxModel(id);

    res.json({
      success: true,
      message: 'Modelo fiscal eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando modelo fiscal:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando modelo fiscal',
      error: error.message,
    });
  }
});

/**
 * GET /api/clients/tax-models/by-model/:modelNumber
 * Obtener todos los clientes que tienen un modelo específico activo
 */
router.get('/tax-models/by-model/:modelNumber', async (req: Request, res: Response) => {
  try {
    const { modelNumber } = req.params;
    const clientsWithModel = await ClientTaxService.getClientsWithActiveModel(modelNumber);

    res.json({
      success: true,
      data: clientsWithModel,
      count: clientsWithModel.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo clientes con modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo clientes con modelo activo',
      error: error.message,
    });
  }
});

export default router;
