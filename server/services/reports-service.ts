import { PrismaClient, FilingStatus } from '@prisma/client';

const prisma = new PrismaClient();

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
  if (filters.year) where.period = { ...(where.period || {}), year: filters.year };
  return where;
}

export async function getReportsKpis(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { status: true, presentedAt: true, period: { select: { endsAt: true, startsAt: true } } } });
  let pending = 0, inProgress = 0, presented = 0, dueIn3 = 0;
  let ltSum = 0, ltCount = 0;
  const now = Date.now();
  for (const r of rows) {
    if (r.status === FilingStatus.NOT_STARTED) pending++;
    else if (r.status === FilingStatus.IN_PROGRESS) inProgress++;
    else presented++;
    // lead time
    if (r.presentedAt && r.period?.startsAt) {
      const end = r.presentedAt.getTime();
      const start = r.period.startsAt.getTime();
      const days = Math.max(0, Math.round((end - start) / (1000*60*60*24)));
      ltSum += days; ltCount += 1;
    }
    // due in 3 days
    const endsAt = r.period?.endsAt ? r.period.endsAt.getTime() : undefined;
    if (endsAt && (Math.ceil((endsAt - now)/(1000*60*60*24)) <= 3) && r.status !== FilingStatus.PRESENTED) dueIn3++;
  }
  const total = pending + inProgress + presented;
  const advancePct = total ? Math.round((presented/total)*1000)/10 : 0;
  const leadTimeAvg = ltCount ? Math.round((ltSum/ltCount)*10)/10 : 0;
  return { pending, inProgress, presented, advancePct, leadTimeAvg, dueIn3 };
}

export async function getSummaryByModel(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { status: true, taxModelCode: true, presentedAt: true, period: { select: { startsAt: true } } } });
  const map = new Map<string, any>();
  for (const r of rows) {
    const key = r.taxModelCode;
    if (!map.has(key)) map.set(key, { modelCode: key, total: 0, pending: 0, inProgress: 0, presented: 0, leadTimeSum: 0, leadTimeCount: 0 });
    const m = map.get(key);
    m.total += 1;
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
    if (r.presentedAt && r.period?.startsAt) {
      const end = r.presentedAt.getTime();
      const start = r.period.startsAt.getTime();
      const days = Math.max(0, Math.round((end - start) / (1000*60*60*24)));
      m.leadTimeSum += days; m.leadTimeCount += 1;
    }
  }
  return Array.from(map.values()).map((m) => ({
    modelCode: m.modelCode,
    total: m.total,
    pending: m.pending,
    inProgress: m.inProgress,
    presented: m.presented,
    advancePct: m.total ? Math.round((m.presented/m.total)*1000)/10 : 0,
    leadTimeAvg: m.leadTimeCount ? Math.round((m.leadTimeSum/m.leadTimeCount)*10)/10 : 0,
  })).sort((a,b)=>a.modelCode.localeCompare(b.modelCode));
}

export async function getSummaryByAssignee(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { status: true, assigneeId: true, assignee: { select: { username: true } } } });
  const map = new Map<string, any>();
  for (const r of rows) {
    const id = r.assigneeId ?? 'sin-gestor';
    if (!map.has(id)) map.set(id, { assigneeId: r.assigneeId ?? null, assigneeName: r.assignee?.username ?? 'Sin asignar', assigned: 0, pending: 0, inProgress: 0, presented: 0 });
    const m = map.get(id); m.assigned += 1;
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
  }
  return Array.from(map.values()).map((m) => ({ ...m, advancePct: m.assigned ? Math.round((m.presented/m.assigned)*1000)/10 : 0 }));
}

export async function getSummaryByClient(filters: ReportsFilters) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { status: true, clientId: true, client: { select: { razonSocial: true } }, taxModelCode: true } });
  const map = new Map<string, any>();
  for (const r of rows) {
    const id = r.clientId;
    if (!map.has(id)) map.set(id, { clientId: id, clientName: r.client?.razonSocial ?? '', models: new Set<string>(), pending: 0, inProgress: 0, presented: 0 });
    const m = map.get(id); m.models.add(r.taxModelCode);
    if (r.status === FilingStatus.NOT_STARTED) m.pending += 1;
    else if (r.status === FilingStatus.IN_PROGRESS) m.inProgress += 1;
    else m.presented += 1;
  }
  return Array.from(map.values()).map((m) => ({ clientId: m.clientId, clientName: m.clientName, modelsActive: m.models.size, pending: m.pending, inProgress: m.inProgress, presented: m.presented, incidents: 0 }));
}

export async function getTrends(filters: ReportsFilters & { granularity?: 'month'|'week' }) {
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { presentedAt: true, period: { select: { startsAt: true } } } });
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  const map = new Map<string, { presented: number; ltSum: number; ltCount: number }>();
  for (const r of rows) {
    if (!r.presentedAt) continue;
    const key = fmt(r.presentedAt);
    if (!map.has(key)) map.set(key, { presented: 0, ltSum: 0, ltCount: 0 });
    const m = map.get(key)!; m.presented += 1;
    const start = r.period?.startsAt ? r.period.startsAt.getTime() : undefined;
    const end = r.presentedAt.getTime();
    if (!start) return;
    m.ltSum += Math.max(0, Math.round((end-start)/(1000*60*60*24))); m.ltCount += 1;
  }
  const series = Array.from(map.entries()).sort((a,b)=>a[0]<b[0]?-1:1).map(([x,m])=>({ x, presented: m.presented, leadTimeAvg: m.ltCount? Math.round((m.ltSum/m.ltCount)*10)/10:0 }));
  return { series };
}

export async function getExceptions(filters: ReportsFilters) {
  // Simplificado: duplicados (si existieran), latePresented
  const where = buildWhere(filters);
  const rows = await prisma.client_tax_filings.findMany({ where, select: { clientId: true, taxModelCode: true, periodId: true, status: true, presentedAt: true, period: { select: { endsAt: true } } } });
  const key = (r: any) => `${r.clientId}:${r.taxModelCode}:${r.periodId}`;
  const countMap = new Map<string, number>();
  const latePresented: any[] = [];
  for (const r of rows) {
    const k = key(r); countMap.set(k, (countMap.get(k)||0)+1);
    if (r.presentedAt && r.period?.endsAt && r.presentedAt > r.period.endsAt) latePresented.push(r);
  }
  const duplicateFilings: any[] = [];
  for (const [k,c] of countMap.entries()) if (c>1) duplicateFilings.push({ key: k, count: c });
  return { missingFilings: [], duplicateFilings, latePresented };
}

export async function getFilings(filters: ReportsFilters & { page?: number; size?: number }) {
  const where = buildWhere(filters);
  const page = Number(filters.page||1);
  const size = Math.min(200, Number(filters.size||50));
  const skip = (page-1)*size;
  const [total, items] = await Promise.all([
    prisma.client_tax_filings.count({ where }),
    prisma.client_tax_filings.findMany({
      where,
      include: { client: { select: { razonSocial: true } }, period: true, assignee: { select: { username: true } } },
      orderBy: [{ period: { startsAt: 'desc' } }],
      skip, take: size,
    })
  ]);
  const mapped = items.map((f)=>({
    id: f.id,
    modelCode: f.taxModelCode,
    periodId: f.periodId,
    periodLabel: f.period ? (f.period.quarter? `${f.period.quarter}T/${f.period.year}` : `${f.period.label} ${f.period.year}`) : '',
    gestor: f.assignee?.username ?? '',
    cliente: f.client?.razonSocial ?? '',
    status: f.status,
    calculatedAt: undefined,
    presentedAt: f.presentedAt,
    cycleDays: f.presentedAt && f.period?.startsAt ? Math.max(0, Math.round((f.presentedAt.getTime()- f.period.startsAt.getTime())/(1000*60*60*24))) : null,
  }));
  return { items: mapped, total };
}
