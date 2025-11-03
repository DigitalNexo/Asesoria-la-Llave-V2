import { PrismaClient } from '@prisma/client';
import { gestoriaBudgetPDFService, BudgetPDFData } from './gestoria-budget-pdf-service';

const prisma = new PrismaClient();

export interface ConvertBudgetToClientOptions {
  telefono?: string;
  direccion?: string;
}

/**
 * Servicio para convertir presupuestos aceptados en clientes
 */
export class GestoriaBudgetConversionService {
  
  /**
   * Convertir un presupuesto aceptado a cliente
   */
  async convertToClient(
    budgetId: string,
    options: ConvertBudgetToClientOptions = {}
  ): Promise<string> {
    try {
      // 1. Validar presupuesto
      const budget = await prisma.gestoria_budgets.findUnique({
        where: { id: budgetId },
        include: {
          serviciosAdicionales: true
        }
      });
      
      if (!budget) {
        throw new Error(`Presupuesto con ID ${budgetId} no encontrado`);
      }
      
      if (budget.estado !== 'ACEPTADO') {
        throw new Error('Solo se pueden convertir presupuestos en estado ACEPTADO');
      }
      
      if (budget.clienteId) {
        throw new Error('Este presupuesto ya ha sido convertido a cliente');
      }
      
      if (!budget.nifCif) {
        throw new Error('El presupuesto debe tener CIF/NIF para convertirlo a cliente');
      }
      
      // 2. Verificar que no exista ya un cliente con el mismo CIF/NIF
      const existingClient = await prisma.clients.findFirst({
        where: {
          nifCif: budget.nifCif
        }
      });
      
      if (existingClient) {
        throw new Error(`Ya existe un cliente con CIF/NIF ${budget.nifCif}`);
      }
      
      // 3. Crear cliente
      const client = await prisma.clients.create({
        data: {
          id: `CLI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          razonSocial: budget.nombreCliente,
          nifCif: budget.nifCif,
          tipo: 'AUTONOMO', // Por defecto, se puede ajustar según necesidad
          email: budget.email || null,
          telefono: budget.telefono || null,
          direccion: budget.direccion || null,
          tipoGestoria: budget.tipoGestoria,
          presupuestoOrigenId: budgetId,
          isActive: true,
          fechaAlta: new Date()
        }
      });
      
      // 4. Crear asignaciones de modelos fiscales
      await this.createTaxAssignments(client.id, budget);
      
      // 5. Archivar PDF del presupuesto como documento del cliente
      await this.archiveBudgetPDF(budget, client.id);
      
      // 6. Actualizar presupuesto con el ID del cliente
      await prisma.gestoria_budgets.update({
        where: { id: budgetId },
        data: {
          clienteId: client.id
        }
      });
      
      // 7. Registrar evento de conversión
      await prisma.gestoria_budget_statistics_events.create({
        data: {
          budgetId: budgetId,
          evento: 'CONVERTIDO',
          fecha: new Date()
        }
      });
      
      return client.id;
    } catch (error) {
      console.error('Error converting budget to client:', error);
      throw error;
    }
  }
  
  /**
   * Crear asignaciones de modelos fiscales
   */
  private async createTaxAssignments(clientId: string, budget: any): Promise<void> {
    const assignments: any[] = [];
    
    // Determinar periodicidad según el presupuesto
    let periodicidad = 'TRIMESTRAL'; // Por defecto
    
    if (budget.periodoDeclaraciones === 'Mensual') {
      periodicidad = 'MENSUAL';
    } else if (budget.periodoDeclaraciones === 'Anual') {
      periodicidad = 'ANUAL';
    }
    
    // Modelo 303 (IVA)
    if (budget.modelo303) {
      assignments.push({
        id: `${clientId}-303-${Date.now()}`,
        clientId,
        taxModelCode: '303',
        periodicidad,
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 111 (IRPF Retenciones)
    if (budget.modelo111) {
      assignments.push({
        id: `${clientId}-111-${Date.now() + 1}`,
        clientId,
        taxModelCode: '111',
        periodicidad,
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 115 (Retenciones Alquileres)
    if (budget.modelo115) {
      assignments.push({
        id: `${clientId}-115-${Date.now() + 2}`,
        clientId,
        taxModelCode: '115',
        periodicidad,
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 130 (IRPF Pagos fraccionados)
    if (budget.modelo130) {
      assignments.push({
        id: `${clientId}-130-${Date.now() + 3}`,
        clientId,
        taxModelCode: '130',
        periodicidad: 'TRIMESTRAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 100 (IRPF Anual)
    if (budget.modelo100) {
      assignments.push({
        id: `${clientId}-100-${Date.now() + 4}`,
        clientId,
        taxModelCode: '100',
        periodicidad: 'ANUAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 349 (Operaciones intracomunitarias)
    if (budget.modelo349) {
      assignments.push({
        id: `${clientId}-349-${Date.now() + 5}`,
        clientId,
        taxModelCode: '349',
        periodicidad: 'MENSUAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Modelo 347 (Operaciones con terceros)
    if (budget.modelo347) {
      assignments.push({
        id: `${clientId}-347-${Date.now() + 6}`,
        clientId,
        taxModelCode: '347',
        periodicidad: 'ANUAL',
        activo: true,
        fechaAsignacion: new Date()
      });
    }
    
    // Crear todas las asignaciones
    if (assignments.length > 0) {
      await prisma.client_tax_assignments.createMany({
        data: assignments
      });
    }
  }
  
  /**
   * Archivar PDF del presupuesto como documento del cliente
   */
  private async archiveBudgetPDF(budget: any, clientId: string): Promise<void> {
    try {
      // Simplemente registrar el documento
      await prisma.documents.create({
        data: {
          id: `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: clientId,
          name: `Presupuesto ${budget.numero}`,
          type: 'PRESUPUESTO',
          upload_date: new Date(),
          file_path: budget.pdfPath || null
        }
      });
    } catch (error) {
      console.error('Error archiving budget PDF:', error);
      // No lanzar error, solo loguear
    }
  }
  
  /**
   * Verificar si un presupuesto puede ser convertido a cliente
   */
  async canConvertToClient(budgetId: string): Promise<{
    canConvert: boolean;
    reason?: string;
  }> {
    const budget = await prisma.gestoria_budgets.findUnique({
      where: { id: budgetId }
    });
    
    if (!budget) {
      return { canConvert: false, reason: 'Presupuesto no encontrado' };
    }
    
    if (budget.estado !== 'ACEPTADO') {
      return { canConvert: false, reason: 'Solo se pueden convertir presupuestos aceptados' };
    }
    
    if (budget.clienteId) {
      return { canConvert: false, reason: 'Este presupuesto ya fue convertido' };
    }
    
    if (!budget.nifCif) {
      return { canConvert: false, reason: 'El presupuesto debe tener CIF/NIF' };
    }
    
    // Verificar si ya existe un cliente con ese CIF/NIF
    const existingClient = await prisma.clients.findFirst({
      where: {
        nifCif: budget.nifCif
      }
    });
    
    if (existingClient) {
      return { canConvert: false, reason: `Ya existe un cliente con CIF/NIF ${budget.nifCif}` };
    }
    
    return { canConvert: true };
  }
}

// Exportar instancia singleton
export const gestoriaBudgetConversionService = new GestoriaBudgetConversionService();
