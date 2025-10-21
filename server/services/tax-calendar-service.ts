export type TaxPeriodStatus = "PENDIENTE" | "ABIERTO" | "CERRADO";

const STATUS_PENDING: TaxPeriodStatus = "PENDIENTE";
const STATUS_OPEN: TaxPeriodStatus = "ABIERTO";
const STATUS_CLOSED: TaxPeriodStatus = "CERRADO";

const DAY_MS = 1000 * 60 * 60 * 24;

function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function diffInDays(target: Date, reference: Date): number {
  const ms = normalizeDate(target).getTime() - normalizeDate(reference).getTime();
  return Math.ceil(ms / DAY_MS);
}

export function calculateTaxPeriodStatus(startDate: Date, endDate: Date): TaxPeriodStatus {
  const today = normalizeDate(new Date());
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (today < start) {
    return STATUS_PENDING;
  }

  if (today > end) {
    return STATUS_CLOSED;
  }

  return STATUS_OPEN;
}

export function calculateDerivedFields(startDate: Date, endDate: Date) {
  const today = new Date();
  const status = calculateTaxPeriodStatus(startDate, endDate);

  const isPending = status === STATUS_PENDING;
  const isOpen = status === STATUS_OPEN;

  const daysToStart = isPending ? diffInDays(startDate, today) : null;
  const daysToEnd = isOpen ? diffInDays(endDate, today) : null;

  return {
    status,
    daysToStart,
    daysToEnd,
  };
}

export function withDerivedFields<T extends { startDate: Date; endDate: Date }>(
  entry: T
): T & {
  status: TaxPeriodStatus;
  daysToStart: number | null;
  daysToEnd: number | null;
} {
  const { status, daysToStart, daysToEnd } = calculateDerivedFields(entry.startDate, entry.endDate);

  return {
    ...entry,
    status,
    daysToStart,
    daysToEnd,
  };
}
