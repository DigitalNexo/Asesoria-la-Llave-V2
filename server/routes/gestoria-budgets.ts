import express, { Request, Response } from 'express';
import { gestoriaBudgetService, CreateBudgetInput, UpdateBudgetInput, BudgetFilters } from '../services/gestoria-budget-service';
import { gestoriaBudgetCalculationService, BudgetCalculationInput } from '../services/gestoria-budget-calculation-service';
import { gestoriaBudgetConfigService } from '../services/gestoria-budget-config-service';
import { gestoriaBudgetEmailService, SendBudgetEmailOptions } from '../services/gestoria-budget-email-service';
import { gestoriaBudgetConversionService, ConvertBudgetToClientOptions } from '../services/gestoria-budget-conversion-service';
import { gestoriaBudgetPDFService, BudgetPDFData } from '../services/gestoria-budget-pdf-service';
import prisma from '../prisma-client';

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

// ===== CONFIGURACIÓN DINÁMICA DE AUTÓNOMOS (SISTEMA BASU) =====

/**
 * GET /api/gestoria-budgets/config/autonomo
 * Obtener configuración completa de Autónomos (con todos los tramos)
 */
router.get('/config/autonomo', async (req: Request, res: Response) => {
  try {
    const { getConfiguracionActual } = await import('../services/budgets/calculateAutonomo');
    const config = await getConfiguracionActual();
    
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
 * PUT /api/gestoria-budgets/config/autonomo
 * Actualizar porcentajes globales de la configuración de Autónomos
 */
router.put('/config/autonomo', async (req: Request, res: Response) => {
  try {
    const { porcentajePeriodoMensual, porcentajeEDN, porcentajeModulos, minimoMensual } = req.body;
    
    // Buscar config activa
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    // Actualizar
    const updated = await prisma.gestoria_budget_autonomo_config.update({
      where: { id: config.id },
      data: {
        porcentajePeriodoMensual: porcentajePeriodoMensual !== undefined ? porcentajePeriodoMensual : undefined,
        porcentajeEDN: porcentajeEDN !== undefined ? porcentajeEDN : undefined,
        porcentajeModulos: porcentajeModulos !== undefined ? porcentajeModulos : undefined,
        minimoMensual: minimoMensual !== undefined ? minimoMensual : undefined,
        modificadoPor: req.body.userId || 'system'
      }
    });
    
    // Limpiar caché
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: updated,
      message: 'Configuración actualizada exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== TRAMOS DE FACTURAS =====

/**
 * GET /api/gestoria-budgets/config/autonomo/invoice-tiers
 * Listar todos los tramos de facturas
 */
router.get('/config/autonomo/invoice-tiers', async (req: Request, res: Response) => {
  try {
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosFacturas: {
          orderBy: { orden: 'asc' }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    res.json({
      success: true,
      data: config.tramosFacturas
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config/autonomo/invoice-tiers
 * Crear nuevo tramo de facturas
 */
router.post('/config/autonomo/invoice-tiers', async (req: Request, res: Response) => {
  try {
    const { orden, minFacturas, maxFacturas, precio, etiqueta } = req.body;
    
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    const tramo = await prisma.gestoria_budget_invoice_tiers.create({
      data: {
        configId: config.id,
        orden,
        minFacturas,
        maxFacturas: maxFacturas || null,
        precio,
        etiqueta: etiqueta || null
      }
    });
    
    // Limpiar caché
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.status(201).json({
      success: true,
      data: tramo,
      message: 'Tramo de facturas creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/invoice-tiers/:id
 * Actualizar tramo de facturas
 */
router.put('/config/autonomo/invoice-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { orden, minFacturas, maxFacturas, precio, etiqueta } = req.body;
    
    const tramo = await prisma.gestoria_budget_invoice_tiers.update({
      where: { id },
      data: {
        orden: orden !== undefined ? orden : undefined,
        minFacturas: minFacturas !== undefined ? minFacturas : undefined,
        maxFacturas: maxFacturas !== undefined ? (maxFacturas || null) : undefined,
        precio: precio !== undefined ? precio : undefined,
        etiqueta: etiqueta !== undefined ? (etiqueta || null) : undefined
      }
    });
    
    // Limpiar caché
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: tramo,
      message: 'Tramo de facturas actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/autonomo/invoice-tiers/:id
 * Eliminar tramo de facturas
 */
router.delete('/config/autonomo/invoice-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    await prisma.gestoria_budget_invoice_tiers.delete({
      where: { id }
    });
    
    // Limpiar caché
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Tramo de facturas eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/invoice-tiers/reorder
 * Reordenar tramos de facturas
 */
router.put('/config/autonomo/invoice-tiers/reorder', async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array de { id: string, orden: number }
    
    // Actualizar en batch
    await Promise.all(
      orders.map((item: any) => 
        prisma.gestoria_budget_invoice_tiers.update({
          where: { id: item.id },
          data: { orden: item.orden }
        })
      )
    );
    
    // Limpiar caché
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Tramos reordenados exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== TRAMOS DE NÓMINAS =====

/**
 * GET /api/gestoria-budgets/config/autonomo/payroll-tiers
 * Listar todos los tramos de nóminas
 */
router.get('/config/autonomo/payroll-tiers', async (req: Request, res: Response) => {
  try {
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosNominas: {
          orderBy: { orden: 'asc' }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    res.json({
      success: true,
      data: config.tramosNominas
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config/autonomo/payroll-tiers
 * Crear nuevo tramo de nóminas
 */
router.post('/config/autonomo/payroll-tiers', async (req: Request, res: Response) => {
  try {
    const { orden, minNominas, maxNominas, precio, etiqueta } = req.body;
    
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    const tramo = await prisma.gestoria_budget_payroll_tiers.create({
      data: {
        configId: config.id,
        orden,
        minNominas,
        maxNominas: maxNominas || null,
        precio,
        etiqueta: etiqueta || null
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.status(201).json({
      success: true,
      data: tramo,
      message: 'Tramo de nóminas creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/payroll-tiers/:id
 * Actualizar tramo de nóminas
 */
router.put('/config/autonomo/payroll-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { orden, minNominas, maxNominas, precio, etiqueta } = req.body;
    
    const tramo = await prisma.gestoria_budget_payroll_tiers.update({
      where: { id },
      data: {
        orden: orden !== undefined ? orden : undefined,
        minNominas: minNominas !== undefined ? minNominas : undefined,
        maxNominas: maxNominas !== undefined ? (maxNominas || null) : undefined,
        precio: precio !== undefined ? precio : undefined,
        etiqueta: etiqueta !== undefined ? (etiqueta || null) : undefined
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: tramo,
      message: 'Tramo de nóminas actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/autonomo/payroll-tiers/:id
 * Eliminar tramo de nóminas
 */
router.delete('/config/autonomo/payroll-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    await prisma.gestoria_budget_payroll_tiers.delete({
      where: { id }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Tramo de nóminas eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== TRAMOS DE FACTURACIÓN ANUAL =====

/**
 * GET /api/gestoria-budgets/config/autonomo/billing-tiers
 * Listar todos los tramos de facturación anual
 */
router.get('/config/autonomo/billing-tiers', async (req: Request, res: Response) => {
  try {
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        tramosFacturacionAnual: {
          orderBy: { orden: 'asc' }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    res.json({
      success: true,
      data: config.tramosFacturacionAnual
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config/autonomo/billing-tiers
 * Crear nuevo tramo de facturación
 */
router.post('/config/autonomo/billing-tiers', async (req: Request, res: Response) => {
  try {
    const { orden, minFacturacion, maxFacturacion, multiplicador, etiqueta } = req.body;
    
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    const tramo = await prisma.gestoria_budget_annual_billing_tiers.create({
      data: {
        configId: config.id,
        orden,
        minFacturacion,
        maxFacturacion: maxFacturacion || null,
        multiplicador,
        etiqueta: etiqueta || null
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.status(201).json({
      success: true,
      data: tramo,
      message: 'Tramo de facturación creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/billing-tiers/:id
 * Actualizar tramo de facturación
 */
router.put('/config/autonomo/billing-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { orden, minFacturacion, maxFacturacion, multiplicador, etiqueta } = req.body;
    
    const tramo = await prisma.gestoria_budget_annual_billing_tiers.update({
      where: { id },
      data: {
        orden: orden !== undefined ? orden : undefined,
        minFacturacion: minFacturacion !== undefined ? minFacturacion : undefined,
        maxFacturacion: maxFacturacion !== undefined ? (maxFacturacion || null) : undefined,
        multiplicador: multiplicador !== undefined ? multiplicador : undefined,
        etiqueta: etiqueta !== undefined ? (etiqueta || null) : undefined
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: tramo,
      message: 'Tramo de facturación actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/autonomo/billing-tiers/:id
 * Eliminar tramo de facturación
 */
router.delete('/config/autonomo/billing-tiers/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    await prisma.gestoria_budget_annual_billing_tiers.delete({
      where: { id }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Tramo de facturación eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== PRECIOS DE MODELOS FISCALES =====

/**
 * GET /api/gestoria-budgets/config/autonomo/fiscal-models
 * Listar todos los modelos fiscales
 */
router.get('/config/autonomo/fiscal-models', async (req: Request, res: Response) => {
  try {
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        preciosModelosFiscales: {
          orderBy: { orden: 'asc' }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    res.json({
      success: true,
      data: config.preciosModelosFiscales
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config/autonomo/fiscal-models
 * Crear nuevo modelo fiscal
 */
router.post('/config/autonomo/fiscal-models', async (req: Request, res: Response) => {
  try {
    const { codigoModelo, nombreModelo, precio, activo, orden } = req.body;
    
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    const modelo = await prisma.gestoria_budget_fiscal_model_pricing.create({
      data: {
        configId: config.id,
        codigoModelo,
        nombreModelo,
        precio,
        activo: activo !== undefined ? activo : true,
        orden: orden !== undefined ? orden : 0
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.status(201).json({
      success: true,
      data: modelo,
      message: 'Modelo fiscal creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/fiscal-models/:id
 * Actualizar modelo fiscal
 */
router.put('/config/autonomo/fiscal-models/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { codigoModelo, nombreModelo, precio, activo, orden } = req.body;
    
    const modelo = await prisma.gestoria_budget_fiscal_model_pricing.update({
      where: { id },
      data: {
        codigoModelo: codigoModelo !== undefined ? codigoModelo : undefined,
        nombreModelo: nombreModelo !== undefined ? nombreModelo : undefined,
        precio: precio !== undefined ? precio : undefined,
        activo: activo !== undefined ? activo : undefined,
        orden: orden !== undefined ? orden : undefined
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: modelo,
      message: 'Modelo fiscal actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/autonomo/fiscal-models/:id
 * Eliminar modelo fiscal
 */
router.delete('/config/autonomo/fiscal-models/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    await prisma.gestoria_budget_fiscal_model_pricing.delete({
      where: { id }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Modelo fiscal eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ===== SERVICIOS ADICIONALES =====

/**
 * GET /api/gestoria-budgets/config/autonomo/services
 * Listar todos los servicios adicionales
 */
router.get('/config/autonomo/services', async (req: Request, res: Response) => {
  try {
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true },
      include: {
        preciosServiciosAdicionales: {
          orderBy: { orden: 'asc' }
        }
      }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    res.json({
      success: true,
      data: config.preciosServiciosAdicionales
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/gestoria-budgets/config/autonomo/services
 * Crear nuevo servicio adicional
 */
router.post('/config/autonomo/services', async (req: Request, res: Response) => {
  try {
    const { codigo, nombre, descripcion, precio, tipoServicio, activo, orden } = req.body;
    
    const config = await prisma.gestoria_budget_autonomo_config.findFirst({
      where: { activo: true }
    });
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró configuración activa'
      });
    }
    
    const servicio = await prisma.gestoria_budget_additional_service_pricing.create({
      data: {
        configId: config.id,
        codigo,
        nombre,
        descripcion: descripcion || null,
        precio,
        tipoServicio,
        activo: activo !== undefined ? activo : true,
        orden: orden !== undefined ? orden : 0
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.status(201).json({
      success: true,
      data: servicio,
      message: 'Servicio adicional creado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * PUT /api/gestoria-budgets/config/autonomo/services/:id
 * Actualizar servicio adicional
 */
router.put('/config/autonomo/services/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { codigo, nombre, descripcion, precio, tipoServicio, activo, orden } = req.body;
    
    const servicio = await prisma.gestoria_budget_additional_service_pricing.update({
      where: { id },
      data: {
        codigo: codigo !== undefined ? codigo : undefined,
        nombre: nombre !== undefined ? nombre : undefined,
        descripcion: descripcion !== undefined ? (descripcion || null) : undefined,
        precio: precio !== undefined ? precio : undefined,
        tipoServicio: tipoServicio !== undefined ? tipoServicio : undefined,
        activo: activo !== undefined ? activo : undefined,
        orden: orden !== undefined ? orden : undefined
      }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      data: servicio,
      message: 'Servicio adicional actualizado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * DELETE /api/gestoria-budgets/config/autonomo/services/:id
 * Eliminar servicio adicional
 */
router.delete('/config/autonomo/services/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    
    await prisma.gestoria_budget_additional_service_pricing.delete({
      where: { id }
    });
    
    const { clearConfigCache } = await import('../services/budgets/calculateAutonomo');
    clearConfigCache();
    
    res.json({
      success: true,
      message: 'Servicio adicional eliminado exitosamente'
    });
    
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
