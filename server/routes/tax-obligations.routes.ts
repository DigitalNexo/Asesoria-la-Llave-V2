import { Router, Request, Response } from 'express';
import TaxObligationsService from '../services/tax-obligations.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/tax-obligations
 * Obtener todas las obligaciones con filtros opcionales
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { clientId, status, modelNumber, year, dueDateFrom, dueDateTo } = req.query;

    const filters: any = {};
    if (clientId) filters.clientId = clientId as string;
    if (status) filters.status = status as string;
    if (modelNumber) filters.modelNumber = modelNumber as string;
    if (year) filters.year = parseInt(year as string);
    if (dueDateFrom) filters.dueDateFrom = new Date(dueDateFrom as string);
    if (dueDateTo) filters.dueDateTo = new Date(dueDateTo as string);

    const obligations = await TaxObligationsService.getObligations(filters);

    res.json({
      success: true,
      data: obligations,
      count: obligations.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo obligaciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo obligaciones fiscales',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-obligations/open-periods
 * Obtener obligaciones de periodos ABIERTOS
 * Esta es la ruta clave para el control de impuestos (tarjetas automáticas)
 */
router.get('/open-periods', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    const obligations = await TaxObligationsService.getObligationsFromOpenPeriods(
      clientId as string | undefined
    );

    res.json({
      success: true,
      data: obligations,
      count: obligations.length,
      message: 'Obligaciones de periodos abiertos',
    });
  } catch (error: any) {
    console.error('Error obteniendo obligaciones de periodos abiertos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo obligaciones de periodos abiertos',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-obligations/stats
 * Obtener estadísticas de obligaciones
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.query;

    const stats = await TaxObligationsService.getObligationStats(
      clientId as string | undefined
    );

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
 * GET /api/tax-obligations/:id
 * Obtener una obligación por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const obligation = await TaxObligationsService.getObligationById(id);

    if (!obligation) {
      return res.status(404).json({
        success: false,
        message: 'Obligación no encontrada',
      });
    }

    res.json({
      success: true,
      data: obligation,
    });
  } catch (error: any) {
    console.error('Error obteniendo obligación:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo obligación',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax-obligations/generate-auto
 * Generar obligaciones automáticamente
 * Esta es la función principal que:
 * 1. Detecta periodos ABIERTOS en el calendario AEAT
 * 2. Busca clientes con esos modelos activos
 * 3. Crea obligaciones automáticamente
 */
router.post('/generate-auto', async (req: Request, res: Response) => {
  try {
    const result = await TaxObligationsService.generateAutomaticObligations();

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error generando obligaciones automáticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando obligaciones automáticas',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax-obligations/generate-period/:taxCalendarId
 * Generar obligaciones para un periodo específico
 */
router.post('/generate-period/:taxCalendarId', async (req: Request, res: Response) => {
  try {
    const { taxCalendarId } = req.params;

    const result = await TaxObligationsService.generateObligationsForPeriod(taxCalendarId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error generando obligaciones del periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando obligaciones del periodo',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax-obligations/generate-client/:clientId
 * Generar obligaciones para un cliente específico
 * Busca todos los modelos activos del cliente y genera obligaciones
 * para los periodos ABIERTOS de esos modelos
 */
router.post('/generate-client/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;

    const result = await TaxObligationsService.generateObligationsForClient(clientId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error generando obligaciones del cliente:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando obligaciones del cliente',
      error: error.message,
    });
  }
});

/**
 * PUT /api/tax-obligations/:id
 * Actualizar una obligación
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, amount, notes } = req.body;

    const updatedObligation = await TaxObligationsService.updateObligation(id, {
      status,
      amount: amount ? parseFloat(amount) : undefined,
      notes,
    });

    res.json({
      success: true,
      message: 'Obligación actualizada exitosamente',
      data: updatedObligation,
    });
  } catch (error: any) {
    console.error('Error actualizando obligación:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando obligación',
      error: error.message,
    });
  }
});

/**
 * PUT /api/tax-obligations/:id/complete
 * Marcar una obligación como completada
 */
router.put('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    const userId = (req as any).user.id; // ID del usuario autenticado

    const completedObligation = await TaxObligationsService.completeObligation(
      id,
      userId,
      amount ? parseFloat(amount) : undefined
    );

    res.json({
      success: true,
      message: 'Obligación marcada como completada',
      data: completedObligation,
    });
  } catch (error: any) {
    console.error('Error completando obligación:', error);
    res.status(500).json({
      success: false,
      message: 'Error completando obligación',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax-obligations/mark-overdue
 * Marcar obligaciones vencidas (OVERDUE)
 * Esta ruta debe ser llamada por un cron job diariamente
 */
router.post('/mark-overdue', async (req: Request, res: Response) => {
  try {
    const result = await TaxObligationsService.markOverdueObligations();

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error marcando obligaciones vencidas:', error);
    res.status(500).json({
      success: false,
      message: 'Error marcando obligaciones vencidas',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/tax-obligations/:id
 * Eliminar una obligación
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await TaxObligationsService.deleteObligation(id);

    res.json({
      success: true,
      message: 'Obligación eliminada exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando obligación:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando obligación',
      error: error.message,
    });
  }
});

export default router;
