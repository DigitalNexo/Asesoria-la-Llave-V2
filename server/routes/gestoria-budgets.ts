import express, { Request, Response } from 'express';
import { gestoriaBudgetService, CreateBudgetInput, UpdateBudgetInput, BudgetFilters } from '../services/gestoria-budget-service';
import { gestoriaBudgetCalculationService, BudgetCalculationInput } from '../services/gestoria-budget-calculation-service';
import { gestoriaBudgetConfigService } from '../services/gestoria-budget-config-service';
import { gestoriaBudgetEmailService, SendBudgetEmailOptions } from '../services/gestoria-budget-email-service';
import { gestoriaBudgetConversionService, ConvertBudgetToClientOptions } from '../services/gestoria-budget-conversion-service';
import { gestoriaBudgetPDFService, BudgetPDFData } from '../services/gestoria-budget-pdf-service';

const router = express.Router();

// ===== CRUD DE PRESUPUESTOS =====

/**
 * GET /api/gestoria-budgets
 * Listar presupuestos con filtros
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: BudgetFilters = {
      tipoGestoria: req.query.tipo as any,
      estado: req.query.estado as any,
      nombreCliente: req.query.nombreCompleto as string,
      nifCif: req.query.cifNif as string,
      email: req.query.email as string,
      fechaDesde: req.query.fechaDesde ? new Date(req.query.fechaDesde as string) : undefined,
      fechaHasta: req.query.fechaHasta ? new Date(req.query.fechaHasta as string) : undefined
    };
    
    const budgets = await gestoriaBudgetService.listBudgets(filters);
    
    res.json({
      success: true,
      data: budgets
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gestoria-budgets/:id
 * Obtener presupuesto por ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    
    res.json({
      success: true,
      data: budget
    });
    
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets
 * Crear nuevo presupuesto
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const input: CreateBudgetInput = req.body;
    const budget = await gestoriaBudgetService.createBudget(input);
    
    res.status(201).json({
      success: true,
      data: budget,
      message: 'Presupuesto creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/:id
 * Actualizar presupuesto
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const input: UpdateBudgetInput = req.body;
    const budget = await gestoriaBudgetService.updateBudget(id, input);
    
    res.json({
      success: true,
      data: budget,
      message: 'Presupuesto actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/:id
 * Eliminar presupuesto
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await gestoriaBudgetService.deleteBudget(id);
    
    res.json({
      success: true,
      message: 'Presupuesto eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== CÁLCULOS =====

/**
 * POST /api/gestoria-budgets/calculate
 * Calcular presupuesto en tiempo real (sin guardar)
 */
router.post('/calculate', async (req: Request, res: Response) => {
  try {
    const input: BudgetCalculationInput = req.body.calculation;
    const tipo = req.body.tipo as 'OFICIAL' | 'ONLINE';
    
    const result = await gestoriaBudgetCalculationService.calculate(input, tipo);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/:id/recalculate
 * Recalcular presupuesto existente
 */
router.post('/:id/recalculate', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    
    const calculationInput: BudgetCalculationInput = {
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || undefined,
      facturacion: Number(budget.facturacion),
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      modelo303: budget.modelo303,
      modelo111: budget.modelo111,
      modelo115: budget.modelo115,
      modelo130: budget.modelo130,
      modelo100: budget.modelo100,
      modelo349: budget.modelo349,
      modelo347: budget.modelo347,
      solicitudCertificados: budget.solicitudCertificados,
      censosAEAT: budget.censosAEAT,
      recepcionNotificaciones: budget.recepcionNotificaciones,
      estadisticasINE: budget.estadisticasINE,
      solicitudAyudas: budget.solicitudAyudas,
      conLaboralSocial: budget.conLaboralSocial,
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento as any,
      valorDescuento: budget.valorDescuento ? Number(budget.valorDescuento) : undefined,
      serviciosAdicionales: budget.serviciosAdicionales?.map(s => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio,
        incluido: s.incluido
      }))
    };
    
    const result = await gestoriaBudgetCalculationService.calculate(calculationInput, budget.tipoGestoria);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== ACCIONES DE PRESUPUESTOS =====

/**
 * POST /api/gestoria-budgets/:id/send
 * Enviar presupuesto por email
 */
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const options: SendBudgetEmailOptions = req.body;
    
    await gestoriaBudgetEmailService.sendBudgetEmail(id, options);
    
    res.json({
      success: true,
      message: 'Presupuesto enviado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/:id/accept
 * Marcar presupuesto como aceptado
 */
router.post('/:id/accept', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.acceptBudget(id);
    
    res.json({
      success: true,
      data: budget,
      message: 'Presupuesto aceptado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/:id/reject
 * Marcar presupuesto como rechazado
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const motivoRechazo = req.body.motivoRechazo as string;
    
    const budget = await gestoriaBudgetService.rejectBudget(id, motivoRechazo);
    
    res.json({
      success: true,
      data: budget,
      message: 'Presupuesto rechazado'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/:id/convert
 * Convertir presupuesto aceptado a cliente
 */
router.post('/:id/convert', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const options: ConvertBudgetToClientOptions = req.body;
    
    const clientId = await gestoriaBudgetConversionService.convertToClient(id, options);
    
    res.json({
      success: true,
      data: { clientId },
      message: 'Presupuesto convertido a cliente exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gestoria-budgets/:id/can-convert
 * Verificar si un presupuesto puede ser convertido a cliente
 */
router.get('/:id/can-convert', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const result = await gestoriaBudgetConversionService.canConvertToClient(id);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== PDF =====

/**
 * GET /api/gestoria-budgets/:id/pdf
 * Descargar PDF del presupuesto
 */
router.get('/:id/pdf', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const budget = await gestoriaBudgetService.getBudgetById(id);
    
    // Preparar datos para PDF
    const pdfData: BudgetPDFData = {
      numero: budget.numero,
      fecha: budget.fechaCreacion,
      fechaValidez: new Date(budget.fechaCreacion.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 días después
      tipo: budget.tipoGestoria,
      
      nombreCompleto: budget.nombreCliente,
      cifNif: budget.nifCif || undefined,
      email: budget.email || undefined,
      telefono: budget.telefono || undefined,
      direccion: budget.direccion || undefined,
      codigoPostal: undefined, // No existe en schema
      ciudad: undefined, // No existe en schema
      provincia: undefined, // No existe en schema
      
      actividadEmpresarial: undefined, // No existe en schema
      facturacion: Number(budget.facturacion),
      facturasMes: budget.facturasMes,
      nominasMes: budget.nominasMes || undefined,
      sistemaTributacion: budget.sistemaTributacion,
      periodoDeclaraciones: budget.periodoDeclaraciones,
      
      serviciosContabilidad: [], // Se construyen en el servicio
      serviciosLaborales: [],
      serviciosAdicionales: budget.serviciosAdicionales.map(s => ({
        nombre: s.nombre,
        precio: Number(s.precio),
        tipoServicio: s.tipoServicio
      })),
      
      totalContabilidad: Number(budget.totalContabilidad),
      totalLaboral: Number(budget.totalLaboral),
      subtotal: Number(budget.totalContabilidad) + Number(budget.totalLaboral),
      descuentoCalculado: Number(budget.descuentoCalculado),
      totalFinal: Number(budget.totalFinal),
      
      aplicaDescuento: budget.aplicaDescuento,
      tipoDescuento: budget.tipoDescuento || undefined,
      valorDescuento: budget.valorDescuento ? Number(budget.valorDescuento) : undefined,
      motivoDescuento: budget.tipoDescuento || undefined, // Usar tipoDescuento como motivo
      
      observaciones: undefined // No existe en schema
    };
    
    // Generar PDF
    const pdfBuffer = await gestoriaBudgetPDFService.generatePDF(pdfData);
    
    // Enviar como descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Presupuesto_${budget.numero}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== ESTADÍSTICAS =====

/**
 * GET /api/gestoria-budgets/stats/summary
 * Obtener estadísticas resumidas
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tipo = req.query.tipo as 'OFICIAL' | 'ONLINE' | undefined;
    const fechaDesde = req.query.fechaDesde ? new Date(req.query.fechaDesde as string) : undefined;
    const fechaHasta = req.query.fechaHasta ? new Date(req.query.fechaHasta as string) : undefined;
    
    const stats = await gestoriaBudgetService.getStatistics(tipo, fechaDesde, fechaHasta);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gestoria-budgets/stats/by-month
 * Obtener estadísticas por mes
 */
router.get('/stats/by-month', async (req: Request, res: Response) => {
  try {
    const tipo = req.query.tipo as 'OFICIAL' | 'ONLINE' | undefined;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    
    // Implementación simplificada - se puede mejorar
    const months = [];
    
    for (let month = 1; month <= 12; month++) {
      const fechaDesde = new Date(year, month - 1, 1);
      const fechaHasta = new Date(year, month, 0, 23, 59, 59);
      
      const stats = await gestoriaBudgetService.getStatistics(tipo, fechaDesde, fechaHasta);
      
      months.push({
        month,
        year,
        ...stats
      });
    }
    
    res.json({
      success: true,
      data: months
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ===== CONFIGURACIÓN =====

/**
 * GET /api/gestoria-budgets/config/list
 * Listar todas las configuraciones
 */
router.get('/config/list', async (req: Request, res: Response) => {
  try {
    const filters = {
      tipo: req.query.tipo as 'OFICIAL' | 'ONLINE' | undefined,
      activo: req.query.activo ? req.query.activo === 'true' : undefined
    };
    
    const configs = await gestoriaBudgetConfigService.getAllConfigs(filters);
    
    res.json({
      success: true,
      data: configs
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/gestoria-budgets/config/active/:tipo
 * Obtener configuración activa
 */
router.get('/config/active/:tipo', async (req: Request, res: Response) => {
  try {
    const tipo = req.params.tipo as 'OFICIAL' | 'ONLINE';
    const config = await gestoriaBudgetConfigService.getActiveConfig(tipo);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: `No hay configuración activa para ${tipo}`
      });
    }
    
    res.json({
      success: true,
      data: config
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config
 * Crear nueva configuración
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const input = req.body;
    const config = await gestoriaBudgetConfigService.createConfig(input);
    
    res.status(201).json({
      success: true,
      data: config,
      message: 'Configuración creada exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/:id
 * Actualizar configuración
 */
router.put('/config/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const config = await gestoriaBudgetConfigService.updateConfig(id, input);
    
    res.json({
      success: true,
      data: config,
      message: 'Configuración actualizada exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/:id
 * Eliminar configuración
 */
router.delete('/config/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await gestoriaBudgetConfigService.deleteConfig(id);
    
    res.json({
      success: true,
      message: 'Configuración eliminada exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
