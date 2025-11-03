import prisma from '../prisma-client';

export type GoalType = 'efficiency' | 'completion' | 'onTime' | 'leadTime' | 'volume';
export type GoalPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface Goal {
  id?: string;
  type: GoalType;
  period: GoalPeriod;
  targetValue: number;
  year: number;
  month?: number;
  quarter?: number;
  assigneeId?: string | null;
  description?: string;
  createdAt?: Date;
}

// Goals se guardan en localStorage por ahora (puede migrarse a DB después)
const GOALS_STORAGE_KEY = 'tax-reports-goals';

export function getGoals(): Goal[] {
  // Por ahora retornamos goals por defecto
  // En producción esto vendría de la base de datos
  return [
    {
      id: 'goal-1',
      type: 'efficiency',
      period: 'monthly',
      targetValue: 85,
      year: new Date().getFullYear(),
      description: 'Mantener eficiencia general sobre 85%',
    },
    {
      id: 'goal-2',
      type: 'onTime',
      period: 'monthly',
      targetValue: 95,
      year: new Date().getFullYear(),
      description: 'Presentar 95% de declaraciones a tiempo',
    },
    {
      id: 'goal-3',
      type: 'leadTime',
      period: 'monthly',
      targetValue: 15,
      year: new Date().getFullYear(),
      description: 'Reducir lead time promedio a 15 días',
    },
  ];
}

export function evaluateGoals(currentMetrics: any, goals: Goal[]) {
  return goals.map(goal => {
    let currentValue = 0;
    let achieved = false;
    let progress = 0;

    switch (goal.type) {
      case 'efficiency':
        currentValue = currentMetrics.efficiencyScore ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, (currentValue / goal.targetValue) * 100);
        break;
      case 'completion':
        currentValue = currentMetrics.completionRate ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, (currentValue / goal.targetValue) * 100);
        break;
      case 'onTime':
        currentValue = currentMetrics.onTimePct ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, (currentValue / goal.targetValue) * 100);
        break;
      case 'leadTime':
        currentValue = currentMetrics.leadTimeAvg ?? 0;
        // Para lead time, menor es mejor
        achieved = currentValue <= goal.targetValue;
        progress = Math.min(100, (goal.targetValue / (currentValue || 1)) * 100);
        break;
      case 'volume':
        currentValue = currentMetrics.presented ?? 0;
        achieved = currentValue >= goal.targetValue;
        progress = Math.min(100, (currentValue / goal.targetValue) * 100);
        break;
    }

    return {
      ...goal,
      currentValue: Math.round(currentValue * 10) / 10,
      achieved,
      progress: Math.round(progress),
      status: achieved ? 'achieved' : progress >= 80 ? 'on-track' : progress >= 50 ? 'at-risk' : 'off-track'
    };
  });
}

const goalTypeLabels: Record<GoalType, string> = {
  efficiency: 'Eficiencia',
  completion: 'Completitud',
  onTime: 'Cumplimiento',
  leadTime: 'Lead Time',
  volume: 'Volumen',
};

const goalTypeUnits: Record<GoalType, string> = {
  efficiency: '%',
  completion: '%',
  onTime: '%',
  leadTime: 'días',
  volume: 'declaraciones',
};

export function getGoalTypeLabel(type: GoalType): string {
  return goalTypeLabels[type] || type;
}

export function getGoalTypeUnit(type: GoalType): string {
  return goalTypeUnits[type] || '';
}
