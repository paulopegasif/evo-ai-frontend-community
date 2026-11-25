import { describe, it, expect } from 'vitest';
import {
  formatBRL,
  formatCents,
  formatLongDate,
  greetingKey,
  isValidE164,
  parseMaskedToCents,
  percentChange,
  shiftMonth,
} from './format';

describe('dailyPanel format helpers', () => {
  it('formats BRL with pt-BR separators', () => {
    expect(formatBRL(1240)).toBe('R$ 1.240,00');
    expect(formatBRL(1266.666)).toBe('R$ 1.266,67');
  });

  it('masks digits as cents', () => {
    expect(parseMaskedToCents('35000')).toBe(35000);
    expect(parseMaskedToCents('R$ 1.240,00')).toBe(124000);
    expect(parseMaskedToCents('')).toBe(0);
    expect(formatCents(124000)).toBe('1.240,00');
  });

  it('picks greeting by hour boundaries', () => {
    const at = (h: number, m = 0) => new Date(2026, 10, 25, h, m);
    expect(greetingKey(at(5))).toBe('morning');
    expect(greetingKey(at(11, 59))).toBe('morning');
    expect(greetingKey(at(12))).toBe('afternoon');
    expect(greetingKey(at(17, 59))).toBe('afternoon');
    expect(greetingKey(at(18))).toBe('evening');
    expect(greetingKey(at(4, 59))).toBe('evening');
  });

  it('formats the long pt-BR date', () => {
    expect(formatLongDate(new Date(2026, 10, 25, 14), 'pt-BR')).toBe('quarta-feira, 25 de novembro');
  });

  it('computes percent change only with a positive base', () => {
    expect(percentChange(1240, 800)).toBe(55);
    expect(percentChange(100, 0)).toBeNull();
  });

  it('shifts month keys across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('validates E.164 phones', () => {
    expect(isValidE164('+5562999990000')).toBe(true);
    expect(isValidE164('62999990000')).toBe(false);
    expect(isValidE164('+55 62 99999-0000')).toBe(false);
  });
});
