/**
 * Métodos de Storage migrados para usar client_tax_models en lugar de client_tax_assignments
 * Este archivo contiene las versiones actualizadas de los métodos relacionados con modelos fiscales
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper para convertir period_type a formato español
function periodTypeToSpanish(periodType: string): string {
  const map: Record<string, string> = {
    'MONTHLY': 'MENSUAL',
    'QUARTERLY': 'TRIMESTRAL',
    'ANNUAL': 'ANUAL',
    'SPECIAL': 'ESPECIAL_FRACCIONADO'
  };
  return map[periodType] || periodType;
}

// Helper para convertir periodicidad española a inglés
function spanishToEnglish(periodicidad: string): string {
  const map: Record<string, string> = {
    'MENSUAL': 'MONTHLY',
    'TRIMESTRAL': 'QUARTERLY',
    'ANUAL': 'ANNUAL',
    'ESPECIAL_FRACCIONADO': 'SPECIAL'
  };
  return map[periodicidad] || periodicidad;
}

/**
 * Obtener modelos fiscales por código de modelo
 */
export async function getModelsByTaxModelCode(modelNumber: string) {
  const models = await prisma.client_tax_models.findMany({
    where: {
      model_number: modelNumber,
      is_active: true,
    },
    include: {
      clients: {
        select: {
          id: true,
          razonSocial: true,
          nifCif: true,
        },
      },
    },
  });
  
  return models.map(m => ({
    id: m.id,
    clientId: m.client_id,
    taxModelCode: m.model_number,
    periodicity: periodTypeToSpanish(m.period_type),
    startDate: m.start_date,
    endDate: m.end_date,
    activeFlag: m.is_active,
    notes: m.notes,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    clients: m.clients,
    effectiveActive: m.is_active && (!m.end_date || m.end_date > new Date())
  }));
}

/**
 * Buscar modelo fiscal de un cliente por código
 */
export async function findClientTaxModelByCode(clientId: string, modelNumber: string) {
  const model = await prisma.client_tax_models.findFirst({
    where: {
      client_id: clientId,
      model_number: modelNumber,
    },
  });
  
  if (!model) return null;
  
  return {
    id: model.id,
    clientId: model.client_id,
    taxModelCode: model.model_number,
    periodicity: periodTypeToSpanish(model.period_type),
    startDate: model.start_date,
    endDate: model.end_date,
    activeFlag: model.is_active,
    notes: model.notes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
    effectiveActive: model.is_active && (!model.end_date || model.end_date > new Date())
  };
}

/**
 * Obtener todos los modelos fiscales de un cliente
 */
export async function getClientTaxModels(clientId: string) {
  const models = await prisma.client_tax_models.findMany({
    where: { client_id: clientId },
    orderBy: [{ start_date: 'desc' }, { model_number: 'asc' }],
  });
  
  return models.map(m => ({
    id: m.id,
    clientId: m.client_id,
    taxModelCode: m.model_number,
    periodicity: periodTypeToSpanish(m.period_type),
    startDate: m.start_date,
    endDate: m.end_date,
    activeFlag: m.is_active,
    notes: m.notes,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
    effectiveActive: m.is_active && (!m.end_date || m.end_date > new Date())
  }));
}

/**
 * Obtener un modelo fiscal por ID
 */
export async function getClientTaxModel(id: string) {
  const model = await prisma.client_tax_models.findUnique({
    where: { id },
  });
  
  if (!model) return null;
  
  return {
    id: model.id,
    clientId: model.client_id,
    taxModelCode: model.model_number,
    periodicity: periodTypeToSpanish(model.period_type),
    startDate: model.start_date,
    endDate: model.end_date,
    activeFlag: model.is_active,
    notes: model.notes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
    effectiveActive: model.is_active && (!model.end_date || model.end_date > new Date())
  };
}

/**
 * Crear un nuevo modelo fiscal para un cliente
 */
export async function createClientTaxModel(data: {
  clientId: string;
  taxModelCode: string;
  periodicity: string;
  startDate: Date;
  endDate?: Date;
  activeFlag?: boolean;
  notes?: string;
}) {
  const model = await prisma.client_tax_models.create({
    data: {
      client_id: data.clientId,
      model_number: data.taxModelCode,
      period_type: spanishToEnglish(data.periodicity),
      start_date: data.startDate,
      end_date: data.endDate || null,
      is_active: data.activeFlag !== undefined ? data.activeFlag : true,
      notes: data.notes || null,
    },
  });
  
  return {
    id: model.id,
    clientId: model.client_id,
    taxModelCode: model.model_number,
    periodicity: periodTypeToSpanish(model.period_type),
    startDate: model.start_date,
    endDate: model.end_date,
    activeFlag: model.is_active,
    notes: model.notes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
    effectiveActive: model.is_active && (!model.end_date || model.end_date > new Date())
  };
}

/**
 * Actualizar un modelo fiscal
 */
export async function updateClientTaxModel(id: string, data: {
  taxModelCode?: string;
  periodicity?: string;
  startDate?: Date;
  endDate?: Date;
  activeFlag?: boolean;
  notes?: string;
}) {
  const updateData: any = {};
  
  if (data.taxModelCode !== undefined) updateData.model_number = data.taxModelCode;
  if (data.periodicity !== undefined) updateData.period_type = spanishToEnglish(data.periodicity);
  if (data.startDate !== undefined) updateData.start_date = data.startDate;
  if (data.endDate !== undefined) updateData.end_date = data.endDate;
  if (data.activeFlag !== undefined) updateData.is_active = data.activeFlag;
  if (data.notes !== undefined) updateData.notes = data.notes;
  
  const model = await prisma.client_tax_models.update({
    where: { id },
    data: updateData,
  });
  
  return {
    id: model.id,
    clientId: model.client_id,
    taxModelCode: model.model_number,
    periodicity: periodTypeToSpanish(model.period_type),
    startDate: model.start_date,
    endDate: model.end_date,
    activeFlag: model.is_active,
    notes: model.notes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
    effectiveActive: model.is_active && (!model.end_date || model.end_date > new Date())
  };
}

/**
 * Eliminar un modelo fiscal
 */
export async function deleteClientTaxModel(id: string) {
  const model = await prisma.client_tax_models.delete({
    where: { id },
  });
  
  return {
    id: model.id,
    clientId: model.client_id,
    taxModelCode: model.model_number,
    periodicity: periodTypeToSpanish(model.period_type),
    startDate: model.start_date,
    endDate: model.end_date,
    activeFlag: model.is_active,
    notes: model.notes,
    createdAt: model.created_at,
    updatedAt: model.updated_at,
    effectiveActive: false
  };
}
