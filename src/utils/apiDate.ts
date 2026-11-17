/**
 * Parses a timestamp as the CRM API sends it. Several serializers emit Unix
 * *seconds* (`created_at.to_i` in label/user/team/... serializers) while others
 * send ISO strings, so `new Date(value)` alone shows 1970 for the former.
 * Numbers (or numeric strings) below 1e12 are read as seconds, otherwise ms.
 */
export const parseApiDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim()) ? Number(value) : NaN;
  const date = Number.isFinite(n) ? new Date(n < 1e12 ? n * 1000 : n) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatApiDate = (value: unknown, locale = 'pt-BR', fallback = '—'): string =>
  parseApiDate(value)?.toLocaleDateString(locale) ?? fallback;
