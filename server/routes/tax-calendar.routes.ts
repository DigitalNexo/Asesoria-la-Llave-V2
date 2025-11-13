import { Router, Request, Response } from 'express';
import TaxCalendarService from '../services/tax-calendar.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * GET /api/tax-calendar
 * Obtener todos los periodos del calendario fiscal (con filtros opcionales)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { year, modelCode, status } = req.query;

    const filters: any = {};
    if (year) filters.year = parseInt(year as string);
    if (modelCode) filters.modelCode = modelCode as string;
    if (status) filters.status = status as string;

    const periods = await TaxCalendarService.getAllPeriods(filters);

    res.json({
      success: true,
      data: periods,
      count: periods.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo periodos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo periodos del calendario fiscal',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-calendar/open
 * Obtener periodos ABIERTOS (status = ABIERTO)
 */
router.get('/open', async (req: Request, res: Response) => {
  try {
    const { modelCode } = req.query;

    const openPeriods = await TaxCalendarService.getOpenPeriods(
      modelCode as string | undefined
    );

    res.json({
      success: true,
      data: openPeriods,
      count: openPeriods.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo periodos abiertos:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo periodos abiertos',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-calendar/year/:year
 * Obtener periodos por año
 */
router.get('/year/:year', async (req: Request, res: Response) => {
  try {
    const { year } = req.params;
    const periods = await TaxCalendarService.getPeriodsByYear(parseInt(year));

    res.json({
      success: true,
      data: periods,
      count: periods.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo periodos por año:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo periodos por año',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-calendar/model/:modelCode
 * Obtener periodos por modelo
 */
router.get('/model/:modelCode', async (req: Request, res: Response) => {
  try {
    const { modelCode } = req.params;
    const periods = await TaxCalendarService.getPeriodsByModel(modelCode);

    res.json({
      success: true,
      data: periods,
      count: periods.length,
    });
  } catch (error: any) {
    console.error('Error obteniendo periodos por modelo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo periodos por modelo',
      error: error.message,
    });
  }
});

/**
 * GET /api/tax-calendar/:id
 * Obtener un periodo por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const period = await TaxCalendarService.getPeriodById(id);

    if (!period) {
      return res.status(404).json({
        success: false,
        message: 'Periodo no encontrado',
      });
    }

    res.json({
      success: true,
      data: period,
    });
  } catch (error: any) {
    console.error('Error obteniendo periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo periodo',
      error: error.message,
    });
  }
});

/**
 * POST /api/tax-calendar
 * Crear un nuevo periodo
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { modelCode, period, year, startDate, endDate, status, days_to_start, days_to_end } = req.body;

    // Validaciones
    if (!modelCode || !period || !year || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos obligatorios: modelCode, period, year, startDate, endDate',
      });
    }

    // Verificar si ya existe
    const exists = await TaxCalendarService.periodExists(modelCode, period, year);
    if (exists) {
      return res.status(409).json({
        success: false,
        message: `Ya existe un periodo ${period} del modelo ${modelCode} para el año ${year}`,
      });
    }

    const newPeriod = await TaxCalendarService.createPeriod({
      modelCode,
      period,
      year: parseInt(year),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
      days_to_start,
      days_to_end,
    });

    res.status(201).json({
      success: true,
      message: 'Periodo creado exitosamente',
      data: newPeriod,
    });
  } catch (error: any) {
    console.error('Error creando periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando periodo',
      error: error.message,
    });
  }
});

/**
 * PUT /api/tax-calendar/:id
 * Actualizar un periodo
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Convertir fechas si existen
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updatedPeriod = await TaxCalendarService.updatePeriod(id, data);

    res.json({
      success: true,
      message: 'Periodo actualizado exitosamente',
      data: updatedPeriod,
    });
  } catch (error: any) {
    console.error('Error actualizando periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando periodo',
      error: error.message,
    });
  }
});

/**
 * PUT /api/tax-calendar/:id/status
 * Cambiar el estado de un periodo (PENDIENTE -> ABIERTO -> CERRADO)
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['PENDIENTE', 'ABIERTO', 'CERRADO'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Estado inválido. Debe ser PENDIENTE, ABIERTO o CERRADO',
      });
    }

    const updatedPeriod = await TaxCalendarService.updatePeriodStatus(id, status);

    res.json({
      success: true,
      message: `Periodo actualizado a ${status}`,
      data: updatedPeriod,
    });
  } catch (error: any) {
    console.error('Error actualizando estado del periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando estado del periodo',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/tax-calendar/:id
 * Eliminar (desactivar) un periodo
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await TaxCalendarService.deletePeriod(id);

    res.json({
      success: true,
      message: 'Periodo eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('Error eliminando periodo:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando periodo',
      error: error.message,
    });
  }
});

export default router;
