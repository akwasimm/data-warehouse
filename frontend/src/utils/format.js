export function formatNumber(value) {
  if (value == null || Number.isNaN(value)) return '--';
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

export function formatCompact(value) {
  if (value == null || Number.isNaN(value)) return '--';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value) {
  if (!value) return '--';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-GB');
}

export function formatCell(value) {
  if (value == null) return '—';
  if (typeof value === 'number') return formatNumber(value);
  return String(value);
}
