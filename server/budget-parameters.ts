/**
 * API para gestionar parámetros configurables de presupuestos
 * Permite editar precios de PYME, AUTONOMO, RENTA, HERENCIAS
 */

import { Router, Response } from 'express';
import prisma from './prisma-client';
import { authenticateToken, AuthRequest } from './middleware/auth';
import { clearParametersCache as clearPymeCache } from './services/budgets/calculatePyme';
import { clearParametersCache as clearAutonomoCache } from './services/budgets/calculateAutonomo';
import { clearParametersCache as clearRentaCache } from './services/budgets/calculateRenta';
import { clearParametersCache as clearHerenciasCache } from './services/budgets/calculateHerencias';

const router = Router();

// Middleware: Solo Administrador puede editar parámetros
function ensureAdmin(req: AuthRequest, res: any, next: any) {
  const roleName = req.user?.roleName;
  if (roleName === 'Administrador') return next();
  return res.status(403).json({ error: 'Solo administradores pueden editar parámetros' });
}

/**
 * GET /api/budget-parameters
 * Lista todos los parámetros, con filtro opcional por tipo
 */
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query;
    
    const where: any = { isActive: true };
    if (type) {
      where.budgetType = String(type).toUpperCase();
    }

    const parameters = await prisma.budget_parameters.findMany({
      where,
      orderBy: [
        { budgetType: 'asc' },
        { category: 'asc' },
        { minRange: 'asc' },
      ],
    });

    // Agrupar por tipo de presupuesto
    const grouped = parameters.reduce((acc: any, param) => {
      const type = param.budgetType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: param.id,
        category: param.category,
        subcategory: param.subcategory,
        key: param.paramKey,
        label: param.paramLabel,
        value: Number(param.paramValue),
        minRange: param.minRange,
        maxRange: param.maxRange,
        description: param.description,
      });
      return acc;
    }, {});

    res.json(grouped);
  } catch (error: any) {
    console.error('Error al obtener parámetros:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/budget-parameters/:id
 * Obtiene un parámetro específico
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const parameter = await prisma.budget_parameters.findUnique({
      where: { id },
    });

    if (!parameter) {
      return res.status(404).json({ error: 'Parámetro no encontrado' });
    }

    res.json({
      id: parameter.id,
      budgetType: parameter.budgetType,
      category: parameter.category,
      subcategory: parameter.subcategory,
      key: parameter.paramKey,
      label: parameter.paramLabel,
      value: Number(parameter.paramValue),
      minRange: parameter.minRange,
      maxRange: parameter.maxRange,
      description: parameter.description,
      isActive: parameter.isActive,
    });
  } catch (error: any) {
    console.error('Error al obtener parámetro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/budget-parameters/:id
 * Actualiza el valor de un parámetro
 */
router.put('/:id', authenticateToken, ensureAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { value, label, description } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'El valor es requerido' });
    }

    const numValue = Number(value);
    if (isNaN(numValue)) {
      return res.status(400).json({ error: 'El valor debe ser un número' });
    }

    const updateData: any = { paramValue: numValue };
    if (label !== undefined) updateData.paramLabel = label;
    if (description !== undefined) updateData.description = description;

    const updated = await prisma.budget_parameters.update({
      where: { id },
      data: updateData,
    });

    console.log(`✅ Parámetro actualizado: ${updated.paramKey} = ${numValue}€ (por ${req.user?.username})`);

    // Limpiar caché de cálculos según el tipo de presupuesto
    switch (updated.budgetType) {
      case 'PYME':
        clearPymeCache();
        break;
      case 'AUTONOMO':
        clearAutonomoCache();
        break;
      case 'RENTA':
        clearRentaCache();
        break;
      case 'HERENCIAS':
        clearHerenciasCache();
        break;
    }

    res.json({
      id: updated.id,
      budgetType: updated.budgetType,
      category: updated.category,
      key: updated.paramKey,
      label: updated.paramLabel,
      value: Number(updated.paramValue),
      minRange: updated.minRange,
      maxRange: updated.maxRange,
    });
  } catch (error: any) {
    console.error('Error al actualizar parámetro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/budget-parameters/bulk
 * Actualiza múltiples parámetros a la vez
 */
router.put('/bulk/update', authenticateToken, ensureAdmin, async (req: AuthRequest, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Se requiere un array de actualizaciones' });
    }

    const results = await Promise.all(
      updates.map(async (update: any) => {
        const { id, value } = update;
        if (!id || value === undefined) return null;

        return await prisma.budget_parameters.update({
          where: { id },
          data: { paramValue: Number(value) },
        });
      })
    );

    const successful = results.filter(r => r !== null).length;

    console.log(`✅ Actualización masiva: ${successful}/${updates.length} parámetros (por ${req.user?.username})`);

    // Limpiar TODAS las cachés porque no sabemos qué tipos fueron actualizados
    clearPymeCache();
    clearAutonomoCache();
    clearRentaCache();
    clearHerenciasCache();

    res.json({
      updated: successful,
      total: updates.length,
    });
  } catch (error: any) {
    console.error('Error en actualización masiva:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/budget-parameters/reset/:type
 * Restaura los valores por defecto de un tipo de presupuesto
 */
router.post('/reset/:type', authenticateToken, ensureAdmin, async (req: AuthRequest, res) => {
  try {
    const { type } = req.params;
    const budgetType = String(type).toUpperCase();

    if (!['PYME', 'AUTONOMO', 'RENTA', 'HERENCIAS'].includes(budgetType)) {
      return res.status(400).json({ error: 'Tipo de presupuesto inválido' });
    }

    // Aquí podrías implementar lógica para restaurar valores por defecto
    // Por ahora solo retornamos confirmación
    console.log(`⚠️  Solicitud de reset de parámetros ${budgetType} (por ${req.user?.username})`);

    res.json({
      message: `Parámetros de ${budgetType} listos para restaurar`,
      warning: 'Función de reset pendiente de implementar',
    });
  } catch (error: any) {
    console.error('Error al resetear parámetros:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
