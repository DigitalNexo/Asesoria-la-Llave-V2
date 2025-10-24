export function statusBadgeClass(status: string) {
  const s = String(status).toUpperCase();
  if (s === 'PENDIENTE' || s === 'NOT_STARTED') return 'bg-red-100 text-red-700';
  if (s === 'IN_PROGRESS' || s === 'CALCULADO') return 'bg-amber-100 text-amber-700';
  if (s === 'PRESENTED' || s === 'PRESENTADO') return 'bg-emerald-100 text-emerald-700';
  return 'bg-muted';
}

export function fmtDate(value?: string | Date | null) {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES');
}

