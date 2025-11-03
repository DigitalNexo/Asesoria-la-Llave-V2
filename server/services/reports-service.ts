import prisma from '../prisma-client';

const FilingStatus = { NOT_STARTED: 'NOT_STARTED' as FilingStatus, IN_PROGRESS: 'IN_PROGRESS' as FilingStatus, PRESENTED: 'PRESENTED' as FilingStatus };
type FilingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PRESENTED';

export type ReportsFilters = {
  year?: number;
  periodId?: string;
  model?: string;
  assigneeId?: string;
  clientId?: string;
  status?: string; // UI or enum
};

function mapStatus(input?: string | null): FilingStatus | undefined {
  if (!input) return undefined;
  const s = String(input).toUpperCase();
  if (s === 'PENDIENTE' || s === 'NOT_STARTED') return FilingStatus.NOT_STARTED;
  if (s === 'CALCULADO' || s === 'IN_PROGRESS') return FilingStatus.IN_PROGRESS;
  if (s === 'PRESENTADO' || s === 'PRESENTED') return FilingStatus.PRESENTED;
  return undefined;
}

function buildWhere(filters: ReportsFilters) {
  const where: any = {};
  if (filters.periodId) where.periodId = filters.periodId;
  const m = mapStatus(filters.status);
  if (m) where.status = m;
  if (filters.model) where.taxModelCode = filters.model.toUpperCase();
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  // Filtro por año - solo aplicar si hay un año específico
  // Si no se especifica año, mostrar todos los registros
  if (filters.year) {
    where.fiscal_periods = {
      ...(where.fiscal_periods || {}),
      year: filters.year,
    };
  }

  return where;
}

// Nueva función para obtener datos incluso sin periodos fiscales
async function getFilingsWithoutPeriodRequirement(filters: ReportsFilters) {
  const where: any = {};
  const m = mapStatus(filters.status);
  if (m) where.status = m;
  if (filters.model) where.taxModelCode = filters.model.toUpperCase();
  if (filters.clientId) where.clientId = filters.clientId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;

  // Obtener todos los filings con sus periodos
  const filings = await prisma.client_tax_filings.findMany({
    where,
    include: {
      fiscal_periods: true,
    },
  });

  // Filtrar por año manualmente si se especifica
  if (filters.year) {
    return filings.filter(f => f.fiscal_periods?.year === filters.year);
  }

  return filings;
}

export async function getReportsKpis(filters: ReportsFilters) {
  const where = buildWhere(filters);

  // Primero intentar con el filtro normal
  let rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { ends_at: true, starts_at: true, year: true } },
    },
  });

  // Si no hay resultados y se está filtrando por año, verificar si hay datos sin ese año
  if (rows.length === 0 && filters.year) {
    const whereWithoutYear = { ...where };
    delete whereWithoutYear.fiscal_periods;

    const allRows = await prisma.client_tax_filings.findMany({
      where: whereWithoutYear,
      select: {
        status: true,
        presentedAt: true,
        fiscal_periods: { select: { ends_at: true, starts_at: true, year: true } },
      },
    });

    // Si hay datos pero no para el año filtrado, usar todos los datos
    if (allRows.length > 0) {
      rows = allRows;
    }
  }
  let pending = 0;
  let inProgress = 0;
  let presented = 0;
  let dueIn3 = 0;
  let dueIn7 = 0;
  let overdue = 0;
  let ltSum = 0;
  let ltCount = 0;
  let lateFilings = 0;
  let onTimeFilings = 0;
  let processingTimeSum = 0;
  let processingTimeCount = 0;
  let urgentCount = 0;

  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;

  for (const r of rows) {
    if (r.status === FilingStatus.NOT_STARTED) pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) inProgress += 1;
    else presented += 1;

    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();
    const createdAt = r.fiscal_periods?.starts_at?.getTime();

    // Lead time (tiempo desde inicio del periodo hasta presentación)
    if (r.presentedAt && periodStart) {
      const end = r.presentedAt.getTime();
      const start = periodStart;
      const days = Math.max(0, Math.round((end - start) / dayMs));
      ltSum += days;
      ltCount += 1;

      // Verificar si fue presentado tarde
      if (periodEnd && end > periodEnd) {
        lateFilings += 1;
      } else if (periodEnd) {
        onTimeFilings += 1;
      }
    }

    // Processing time (tiempo desde creación hasta presentación)
    if (r.presentedAt && createdAt) {
      const procDays = Math.max(0, Math.round((r.presentedAt.getTime() - createdAt) / dayMs));
      processingTimeSum += procDays;
      processingTimeCount += 1;
    }

    // Alertas de vencimiento
    if (periodEnd && r.status !== FilingStatus.PRESENTED) {
      const diffDays = Math.ceil((periodEnd - now) / dayMs);
      if (diffDays <= 3) {
        dueIn3 += 1;
        urgentCount += 1;
      }
      if (diffDays <= 7) dueIn7 += 1;
      if (diffDays < 0) overdue += 1;
    }
  }

  const total = pending + inProgress + presented;
  const advancePct = total ? Math.round((presented/total)*1000)/10 : 0;
  const leadTimeAvg = ltCount ? Math.round((ltSum/ltCount)*10)/10 : 0;
  const processingTimeAvg = processingTimeCount ? Math.round((processingTimeSum/processingTimeCount)*10)/10 : 0;
  const onTimePct = (lateFilings + onTimeFilings) ? Math.round((onTimeFilings/(lateFilings + onTimeFilings))*1000)/10 : 100;
  const efficiencyScore = total ? Math.round(((presented - lateFilings) / total) * 1000) / 10 : 0;
  const workload = pending + inProgress;
  const completionRate = total ? Math.round((presented / total) * 1000) / 10 : 0;

  return {
    // Métricas básicas
    pending,
    inProgress,
    presented,
    total,
    advancePct,

    // Tiempos
    leadTimeAvg,
    processingTimeAvg,

    // Alertas
    dueIn3,
    dueIn7,
    overdue,
    urgentCount,

    // Cumplimiento
    lateFilings,
    onTimeFilings,
    onTimePct,

    // Eficiencia
    efficiencyScore,
    workload,
    completionRate,
  };
}

export async function getSummaryByModel(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      taxModelCode: true,
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true, ends_at: true } },
    },
  });
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.taxModelCode;
    if (!map.has(key)) {
      map.set(key, {
        modelCode: key,
        total: 0,
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0,
        leadTimeSum: 0,
        leadTimeCount: 0,
      });
    }
    const m = map.get(key)!;
    m.total += 1;
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;

    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();

    if (periodEnd && r.status !== FilingStatus.PRESENTED) {
      const diffDays = Math.ceil((periodEnd - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) m.overdue += 1;
    }

    if (r.presentedAt && periodStart) {
      const end = r.presentedAt.getTime();
      const start = periodStart;
      const days = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      m.leadTimeSum += days;
      m.leadTimeCount += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    modelCode: m.modelCode,
    total: m.total,
    pending: m.pending,
    inProgress: m.inProgress,
    presented: m.presented,
    advancePct: m.total ? Math.round((m.presented/m.total)*1000)/10 : 0,
    overdue: m.overdue,
    leadTimeAvg: m.leadTimeCount ? Math.round((m.leadTimeSum / m.leadTimeCount) * 10) / 10 : 0,
  })).sort((a,b)=>a.modelCode.localeCompare(b.modelCode));
}

export async function getSummaryByAssignee(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      assigneeId: true,
      users: { select: { username: true } },
      fiscal_periods: { select: { ends_at: true } },
    },
  });
  const map = new Map<string, any>();
  for (const r of rows) {
    const id = r.assigneeId ?? 'sin-gestor';
    if (!map.has(id)) {
      map.set(id, {
        assigneeId: r.assigneeId ?? null,
        assigneeName: r.users?.username ?? 'Sin asignar',
        assigned: 0,
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0,
      });
    }
    const m = map.get(id)!;
    m.assigned += 1;
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    const due = r.fiscal_periods?.ends_at?.getTime();
    if (due && r.status !== FilingStatus.PRESENTED && due < Date.now()) {
      m.overdue += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    ...m,
    advancePct: m.assigned ? Math.round((m.presented / m.assigned) * 1000) / 10 : 0,
    onTrack: m.assigned ? ((m.assigned - m.overdue) / m.assigned) * 100 : 0,
  }));
}

export async function getSummaryByClient(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      clientId: true,
      clients: { select: { razonSocial: true } },
      taxModelCode: true,
      fiscal_periods: { select: { ends_at: true } },
    },
  });
  const map = new Map<string, any>();
  for (const r of rows) {
    const id = r.clientId;
    if (!map.has(id)) {
      map.set(id, {
        clientId: id,
        clientName: r.clients?.razonSocial ?? '',
        models: new Set<string>(),
        pending: 0,
        inProgress: 0,
        presented: 0,
        overdue: 0,
      });
    }
    const m = map.get(id)!;
    m.models.add(r.taxModelCode);
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    const due = r.fiscal_periods?.ends_at?.getTime();
    if (due && r.status !== FilingStatus.PRESENTED && due < Date.now()) {
      m.overdue += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    clientId: m.clientId,
    clientName: m.clientName,
    modelsActive: m.models.size,
    pending: m.pending,
    inProgress: m.inProgress,
    presented: m.presented,
    overdue: m.overdue,
    advancePct: m.models.size ? Math.round((m.presented / (m.pending + m.inProgress + m.presented || 1)) * 1000) / 10 : 0,
  }));
}

export async function getTrends(filters: ReportsFilters & { granularity?: 'month'|'week' }) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true } },
    },
  });
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const map = new Map<string, { presented: number; ltSum: number; ltCount: number }>();
  for (const r of rows) {
    if (!r.presentedAt) continue;
    const key = fmt(r.presentedAt);
    if (!map.has(key)) map.set(key, { presented: 0, ltSum: 0, ltCount: 0 });
    const m = map.get(key)!;
    m.presented += 1;
    const start = r.fiscal_periods?.starts_at ? r.fiscal_periods.starts_at.getTime() : undefined;
    const end = r.presentedAt.getTime();
    if (!start) continue;
    m.ltSum += Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    m.ltCount += 1;
  }
  const series = Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([x, m]) => ({
      x,
      presented: m.presented,
      leadTimeAvg: m.ltCount ? Math.round((m.ltSum / m.ltCount) * 10) / 10 : 0,
    }));
  return { series };
}

export async function getExceptions(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      clientId: true,
      taxModelCode: true,
      periodId: true,
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { ends_at: true, label: true, year: true } },
      clients: { select: { razonSocial: true } },
    },
  });
  const key = (r: any) => `${r.clientId}:${r.taxModelCode}:${r.periodId}`;
  const countMap = new Map<string, number>();
  const latePresented: any[] = [];
  const overdueFilings: any[] = [];
  for (const r of rows) {
    const k = key(r);
    countMap.set(k, (countMap.get(k) || 0) + 1);
    const dueDate = r.fiscal_periods?.ends_at;
    if (r.presentedAt && dueDate && r.presentedAt > dueDate) {
      latePresented.push({
        clientId: r.clientId,
        clientName: r.clients?.razonSocial ?? '',
        taxModelCode: r.taxModelCode,
        periodId: r.periodId,
        dueDate,
        presentedAt: r.presentedAt,
      });
    } else if (dueDate && r.status !== FilingStatus.PRESENTED && dueDate < new Date()) {
      overdueFilings.push({
        clientId: r.clientId,
        clientName: r.clients?.razonSocial ?? '',
        taxModelCode: r.taxModelCode,
        periodId: r.periodId,
        dueDate,
      });
    }
  }
  const duplicateFilings: any[] = [];
  for (const [k, c] of countMap.entries()) {
    if (c > 1) duplicateFilings.push({ key: k, count: c });
  }
  return { duplicateFilings, latePresented, overdueFilings };
}

export async function getFilings(filters: ReportsFilters & { page?: number; size?: number }) {
  const where = buildWhere(filters);
  const page = Number(filters.page || 1);
  const size = Math.min(500, Number(filters.size || 50));
  const skip = (page - 1) * size;
  const [total, items] = await Promise.all([
    prisma.client_tax_filings.count({ where }),
    prisma.client_tax_filings.findMany({
      where,
      include: {
        clients: { select: { razonSocial: true } },
        fiscal_periods: true,
        users: { select: { username: true } },
      },
      orderBy: [{ fiscal_periods: { starts_at: 'desc' } }],
      skip,
      take: size,
    }),
  ]);
  const mapped = items.map((f) => {
    const dueDate = f.fiscal_periods?.ends_at ?? null;
    const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const isOverdue = typeof daysRemaining === 'number' ? daysRemaining < 0 && f.status !== FilingStatus.PRESENTED : false;
    return {
    id: f.id,
    modelCode: f.taxModelCode,
    periodId: f.periodId,
    periodLabel: f.fiscal_periods
      ? f.fiscal_periods.quarter
        ? `${f.fiscal_periods.quarter}T/${f.fiscal_periods.year}`
        : `${f.fiscal_periods.label ?? ''} ${f.fiscal_periods.year}`
      : '',
    gestor: f.users?.username ?? '',
    cliente: f.clients?.razonSocial ?? '',
    status: f.status,
    presentedAt: f.presentedAt,
    dueDate,
    daysRemaining,
    isOverdue,
    cycleDays:
      f.presentedAt && f.fiscal_periods?.starts_at
        ? Math.max(
            0,
            Math.round(
              (f.presentedAt.getTime() - f.fiscal_periods.starts_at.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        : null,
  };
  });
  return { items: mapped, total };
}

// Nueva función: Comparativa entre años
export async function getYearComparison(year1: number, year2: number, filters: Omit<ReportsFilters, 'year'>) {
  const [data1, data2] = await Promise.all([
    getReportsKpis({ ...filters, year: year1 }),
    getReportsKpis({ ...filters, year: year2 }),
  ]);

  return {
    year1: { year: year1, ...data1 },
    year2: { year: year2, ...data2 },
    comparison: {
      totalChange: data2.total - data1.total,
      totalChangePct: data1.total ? Math.round(((data2.total - data1.total) / data1.total) * 1000) / 10 : 0,
      presentedChange: data2.presented - data1.presented,
      presentedChangePct: data1.presented ? Math.round(((data2.presented - data1.presented) / data1.presented) * 1000) / 10 : 0,
      efficiencyChange: data2.efficiencyScore - data1.efficiencyScore,
      leadTimeChange: data2.leadTimeAvg - data1.leadTimeAvg,
      onTimeChange: data2.onTimePct - data1.onTimePct,
    }
  };
}

// Nueva función: Análisis de productividad por gestor
export async function getProductivityAnalysis(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      assigneeId: true,
      presentedAt: true,
      users: { select: { username: true } },
      fiscal_periods: { select: { starts_at: true, ends_at: true } },
    },
  });

  const gestorMap = new Map<string, any>();
  const dayMs = 1000 * 60 * 60 * 24;
  const now = Date.now();

  for (const r of rows) {
    const id = r.assigneeId ?? 'sin-asignar';
    if (!gestorMap.has(id)) {
      gestorMap.set(id, {
        gestorId: r.assigneeId,
        gestorName: r.users?.username ?? 'Sin asignar',
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
        onTime: 0,
        late: 0,
        avgProcessingTime: 0,
        avgLeadTime: 0,
        procTimeSum: 0,
        procTimeCount: 0,
        leadTimeSum: 0,
        leadTimeCount: 0,
        workloadScore: 0,
        efficiencyScore: 0,
      });
    }

    const g = gestorMap.get(id)!;
    g.total += 1;

    if (r.status === FilingStatus.PRESENTED) g.completed += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) g.inProgress += 1;
    else g.pending += 1;

    // Processing time (aprox. desde inicio de periodo)
    const createdAt = r.fiscal_periods?.starts_at?.getTime();
    if (r.presentedAt && createdAt) {
      const procDays = Math.round((r.presentedAt.getTime() - createdAt) / dayMs);
      g.procTimeSum += procDays;
      g.procTimeCount += 1;
    }

    // Lead time y cumplimiento
    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();

    if (r.presentedAt && periodStart) {
      const leadDays = Math.round((r.presentedAt.getTime() - periodStart) / dayMs);
      g.leadTimeSum += leadDays;
      g.leadTimeCount += 1;

      if (periodEnd && r.presentedAt.getTime() <= periodEnd) {
        g.onTime += 1;
      } else if (periodEnd) {
        g.late += 1;
      }
    }

    // Overdue
    if (periodEnd && r.status !== FilingStatus.PRESENTED && periodEnd < now) {
      g.overdue += 1;
    }
  }

  return Array.from(gestorMap.values()).map((g) => {
    const completionRate = g.total ? (g.completed / g.total) * 100 : 0;
    const onTimeRate = (g.onTime + g.late) ? (g.onTime / (g.onTime + g.late)) * 100 : 100;
    g.avgProcessingTime = g.procTimeCount ? Math.round((g.procTimeSum / g.procTimeCount) * 10) / 10 : 0;
    g.avgLeadTime = g.leadTimeCount ? Math.round((g.leadTimeSum / g.leadTimeCount) * 10) / 10 : 0;
    g.efficiencyScore = Math.round((completionRate * 0.4 + onTimeRate * 0.4 + (100 - Math.min(g.avgProcessingTime * 2, 100)) * 0.2) * 10) / 10;
    g.workloadScore = g.pending + g.inProgress + g.overdue;
    return {
      gestorId: g.gestorId,
      gestorName: g.gestorName,
      total: g.total,
      completed: g.completed,
      pending: g.pending,
      inProgress: g.inProgress,
      overdue: g.overdue,
      onTime: g.onTime,
      late: g.late,
      completionRate: Math.round(completionRate * 10) / 10,
      onTimeRate: Math.round(onTimeRate * 10) / 10,
      avgProcessingTime: g.avgProcessingTime,
      avgLeadTime: g.avgLeadTime,
      efficiencyScore: g.efficiencyScore,
      workloadScore: g.workloadScore,
    };
  }).sort((a, b) => b.efficiencyScore - a.efficiencyScore);
}

// Nueva función: Predicciones y tendencias
export async function getPredictions(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where: { ...where, status: { not: FilingStatus.PRESENTED } },
    select: {
      status: true,
      fiscal_periods: { select: { ends_at: true } },
    },
  });

  const dayMs = 1000 * 60 * 60 * 24;
  const now = Date.now();
  let atRiskCount = 0;
  let criticalCount = 0;
  const alerts = [];

  for (const r of rows) {
    const dueDate = r.fiscal_periods?.ends_at?.getTime();
    if (!dueDate) continue;

    const daysRemaining = Math.ceil((dueDate - now) / dayMs);
    const daysSinceCreated = 0;

    if (daysRemaining <= 3 && daysRemaining >= 0) {
      criticalCount += 1;
      if (r.status === FilingStatus.NOT_STARTED) {
        alerts.push({
          type: 'critical',
          message: `Declaración sin iniciar que vence en ${daysRemaining} día(s)`,
          daysRemaining,
          status: r.status,
        });
      }
    } else if (daysRemaining <= 7 && daysRemaining > 3) {
      atRiskCount += 1;
    }

    // Predicción: si lleva más de 7 días sin completarse
    if (daysSinceCreated > 7 && r.status === FilingStatus.IN_PROGRESS && daysRemaining <= 10) {
      alerts.push({
        type: 'warning',
        message: `Declaración en progreso por ${daysSinceCreated} días, vence en ${daysRemaining} días`,
        daysRemaining,
        status: r.status,
      });
    }
  }

  return {
    atRiskCount,
    criticalCount,
    alerts: alerts.slice(0, 10),
    riskLevel: criticalCount > 5 ? 'high' : atRiskCount > 10 ? 'medium' : 'low',
  };
}

// Nueva función: Análisis de rendimiento temporal (week over week, month over month)
export async function getTemporalPerformance(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({
    where,
    select: {
      status: true,
      presentedAt: true,
      fiscal_periods: { select: { starts_at: true, ends_at: true } },
    },
  });

  // Agrupar por mes
  const monthlyData = new Map<string, any>();
  const dayMs = 1000 * 60 * 60 * 24;

  for (const r of rows) {
    if (!r.presentedAt) continue;
    const date = new Date(r.presentedAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        month: monthKey,
        presented: 0,
        onTime: 0,
        late: 0,
        avgLeadTime: 0,
        leadSum: 0,
        leadCount: 0,
      });
    }

    const m = monthlyData.get(monthKey)!;
    m.presented += 1;

    const periodStart = r.fiscal_periods?.starts_at?.getTime();
    const periodEnd = r.fiscal_periods?.ends_at?.getTime();

    if (periodStart) {
      const leadDays = Math.round((r.presentedAt.getTime() - periodStart) / dayMs);
      m.leadSum += leadDays;
      m.leadCount += 1;
    }

    if (periodEnd && r.presentedAt.getTime() <= periodEnd) {
      m.onTime += 1;
    } else if (periodEnd) {
      m.late += 1;
    }
  }

  const series = Array.from(monthlyData.values())
    .map((m) => ({
      ...m,
      avgLeadTime: m.leadCount ? Math.round((m.leadSum / m.leadCount) * 10) / 10 : 0,
      onTimeRate: (m.onTime + m.late) ? Math.round((m.onTime / (m.onTime + m.late)) * 1000) / 10 : 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { series };
}
