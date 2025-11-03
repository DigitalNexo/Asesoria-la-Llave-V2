import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import { TAX_RULES } from "@shared/tax-rules";
import { calculateDerivedFields } from "../services/tax-calendar-service";

config();

const prisma = new PrismaClient();

type PeriodSet = Set<string>;

type CalendarEntrySpec = {
  modelCode: string;
  period: string;
  year: number;
  start: Date;
  end: Date;
};

const MONTHLY = "MENSUAL";
const QUARTERLY = "TRIMESTRAL";
const ANNUAL = "ANUAL";
const SPECIAL = "ESPECIAL_FRACCIONADO";

function mapJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => `${item}`);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => `${item}`);
      }
    } catch {
      // ignore parsing errors
    }
  }
  return [];
}

function resolveTargetYear(): number {
  const argv = process.argv.slice(2);
  for (const arg of argv) {
    if (/^\d{4}$/.test(arg)) {
      return Number(arg);
    }
    const match = /^--year=(\d{4})$/.exec(arg);
    if (match) {
      return Number(match[1]);
    }
  }

  const envYear = process.env.YEAR;
  if (envYear && /^\d{4}$/.test(envYear)) {
    return Number(envYear);
  }

  return new Date().getFullYear();
}

async function loadAllowedPeriods(targetCode?: string): Promise<Map<string, PeriodSet>> {
  const whereClause = {
    isActive: true,
    ...(targetCode ? { code: targetCode } : {}),
  };

  const rawConfigs = await prisma.tax_models_config.findMany({
    where: whereClause,
    select: {
      code: true,
      allowedPeriods: true,
    },
  });

  const map = new Map<string, PeriodSet>();

  rawConfigs.forEach((config) => {
    const code = config.code.toUpperCase();
    const allowed = new Set<string>();
    mapJsonArray(config.allowedPeriods).forEach((period) => allowed.add(period.toUpperCase()));
    const rule = TAX_RULES[code];
    if (rule) {
      rule.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
    }
    if (allowed.size === 0) {
      allowed.add(QUARTERLY);
      allowed.add(ANNUAL);
    }
    map.set(code, allowed);
  });

  if (targetCode && !map.has(targetCode)) {
    const code = targetCode.toUpperCase();
    const allowed = new Set<string>();
    const rule = TAX_RULES[code];
    rule?.allowedPeriods.forEach((period) => allowed.add(period.toUpperCase()));
    if (allowed.size === 0) {
      allowed.add(QUARTERLY);
      allowed.add(ANNUAL);
    }
    map.set(code, allowed);
  }

  return map;
}

function makeDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day));
}

function buildEntriesForModel(year: number, code: string, allowed: PeriodSet): CalendarEntrySpec[] {
  const entries: CalendarEntrySpec[] = [];

  const push = (period: string, start: Date, end: Date) => {
    entries.push({
      modelCode: code,
      period,
      year,
      start,
      end,
    });
  };

  if (allowed.has(MONTHLY)) {
    for (let month = 1; month <= 12; month++) {
      const label = `M${String(month).padStart(2, "0")}`;
      const dueMonth = month === 12 ? 0 : month;
      const dueYear = month === 12 ? year + 1 : year;
      const start = makeDate(dueYear, dueMonth, 1);
      const end = makeDate(dueYear, dueMonth, month === 12 ? 30 : 20);
      push(label, start, end);
    }
  }

  if (allowed.has(QUARTERLY)) {
    const quarters = [
      { label: "1T", start: makeDate(year, 3, 1), end: makeDate(year, 3, 20) },
      { label: "2T", start: makeDate(year, 6, 1), end: makeDate(year, 6, 20) },
      { label: "3T", start: makeDate(year, 9, 1), end: makeDate(year, 9, 20) },
      { label: "4T", start: makeDate(year + 1, 0, 1), end: makeDate(year + 1, 0, 30) },
    ];
    quarters.forEach((quarter) => push(quarter.label, quarter.start, quarter.end));
  }

  if (allowed.has(ANNUAL)) {
    const start = makeDate(year + 1, 0, 1);
    const end = makeDate(year + 1, 0, 31);
    push("ANUAL", start, end);
  }

  if (allowed.has(SPECIAL) && code === "202") {
    const specialMonths = [
      { month: 4, endDay: 20 },
      { month: 10, endDay: 20 },
      { month: 12, endDay: 20 },
    ];
    specialMonths.forEach(({ month, endDay }) => {
      const dueMonth = month === 12 ? 0 : month;
      const dueYear = month === 12 ? year + 1 : year;
      const start = makeDate(dueYear, dueMonth, 1);
      const end = makeDate(dueYear, dueMonth, endDay);
      const label = `M${String(month).padStart(2, "0")}`;
      push(label, start, end);
    });
  }

  return entries;
}

function keyOf(entry: CalendarEntrySpec) {
  return `${entry.modelCode}:${entry.period}:${entry.year}`;
}

async function syncCalendarForYear(
  year: number,
  allowedMap: Map<string, PeriodSet>
): Promise<{ created: number; updated: number; removed: number }> {
  const entries: CalendarEntrySpec[] = [];
  const managedCodes = Array.from(allowedMap.keys());

  managedCodes.forEach((code) => {
    const allowed = allowedMap.get(code);
    if (!allowed) return;
    entries.push(...buildEntriesForModel(year, code, allowed));
  });

  const expectedKeys = new Set(entries.map(keyOf));

  const existing = await prisma.tax_calendar.findMany({
    where: {
      year,
      modelCode: { in: managedCodes },
    },
  });

  const existingMap = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    const key = `${row.modelCode}:${row.period}:${row.year}`;
    if (expectedKeys.has(key)) {
      existingMap.set(key, row);
    }
  }

  let removed = 0;
  for (const row of existing) {
    const key = `${row.modelCode}:${row.period}:${row.year}`;
    if (!expectedKeys.has(key)) {
      await prisma.tax_calendar.delete({ where: { id: row.id } });
      removed += 1;
    }
  }

  let created = 0;
  let updated = 0;
  const now = new Date();

  for (const entry of entries) {
    const key = keyOf(entry);
    const derived = calculateDerivedFields(entry.start, entry.end);
    const payload = {
      startDate: entry.start,
      endDate: entry.end,
      status: derived.status,
      days_to_start: derived.daysToStart,
      days_to_end: derived.daysToEnd,
      active: true,
      updatedAt: now,
    };

    const existingRow = existingMap.get(key);

    await prisma.tax_calendar.upsert({
      where: {
        modelCode_period_year: {
          modelCode: entry.modelCode,
          period: entry.period,
          year: entry.year,
        },
      },
      create: {
        id: randomUUID(),
        modelCode: entry.modelCode,
        period: entry.period,
        year: entry.year,
        ...payload,
        createdAt: now,
      },
      update: payload,
    });

    if (existingRow) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return { created, updated, removed };
}

async function main() {
  try {
    const year = resolveTargetYear();
    const allowedMap = await loadAllowedPeriods();
    if (allowedMap.size === 0) {
      console.warn("No se encontraron modelos fiscales activos para generar el calendario.");
      return;
    }

    console.log(`\n📅 Generando calendario AEAT para ${year} y ${year + 1}`);
    const summaryYear = await syncCalendarForYear(year, allowedMap);
    const summaryNext = await syncCalendarForYear(year + 1, allowedMap);

    console.log(`\n✅ Calendario ${year} completado:`);
    console.log(`   - Creados: ${summaryYear.created}`);
    console.log(`   - Actualizados: ${summaryYear.updated}`);
    console.log(`   - Eliminados: ${summaryYear.removed}`);

    console.log(`\n✅ Calendario ${year + 1} completado:`);
    console.log(`   - Creados: ${summaryNext.created}`);
    console.log(`   - Actualizados: ${summaryNext.updated}`);
    console.log(`   - Eliminados: ${summaryNext.removed}`);
  } catch (error) {
    console.error("❌ Error generando el calendario AEAT:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
