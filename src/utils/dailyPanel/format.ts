/** Formatting helpers for the Painel do Dia (BRL money, greeting, dates). */

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlPlain = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `1240` → `R$ 1.240,00` (normalises the non-breaking space Intl emits). */
export function formatBRL(value: number | null | undefined): string {
  return brl.format(Number(value) || 0).replace(/\u00a0/g, ' ');
}

/** Digits-only BRL mask: cents integer → `1.240,00` (no currency symbol). */
export function formatCents(cents: number): string {
  return brlPlain.format(cents / 100);
}

/** Masked input text → cents. Every typed digit shifts in from the right. */
export function parseMaskedToCents(text: string): number {
  const digits = text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 13);
  return digits ? Number(digits) : 0;
}

/** Amount (reais) → cents, rounded. */
export function toCents(amount: number | null | undefined): number {
  return Math.round((Number(amount) || 0) * 100);
}

export type GreetingKey = 'morning' | 'afternoon' | 'evening';

/** Bom dia 5–11:59, Boa tarde 12–17:59, Boa noite 18–4:59. */
export function greetingKey(date: Date): GreetingKey {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

/** `quarta-feira, 25 de novembro` for pt-BR; equivalent long form for other locales. */
export function formatLongDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

/** Rounded % change, or null when the comparison base is not positive. */
export function percentChange(current: number, base: number): number | null {
  if (!(base > 0)) return null;
  return Math.round(((current - base) / base) * 100);
}

/** `2026-11` for the given date (local time). */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Shift a `YYYY-MM` key by n months. */
export function shiftMonth(key: string, n: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

/** `novembro de 2026` style label for a `YYYY-MM` key. */
export function formatMonthLabel(key: string, locale: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(y, m - 1, 1));
}

/** E.164: `+` followed by 8–15 digits, first digit non-zero. */
export const E164_RE = /^\+[1-9]\d{7,14}$/;

export function isValidE164(phone: string): boolean {
  return E164_RE.test(phone.trim());
}
