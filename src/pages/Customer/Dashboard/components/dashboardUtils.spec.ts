import { describe, expect, it } from 'vitest';
import { CHART_COLORS, formatDecimal, formatInteger, formatPercent } from './dashboardUtils';

describe('dashboard formatters (pt-BR)', () => {
  it('formats percentages with comma decimals and no trailing zeros', () => {
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(42.857)).toBe('42,9%');
    expect(formatPercent(0)).toBe('0%');
  });

  it('formats ratings and counts', () => {
    expect(formatDecimal(4.5)).toBe('4,50');
    expect(formatInteger(1234.4)).toBe('1.234');
  });

  it('uses the theme chart palette', () => {
    expect(CHART_COLORS[0]).toBe('var(--chart-1)');
  });
});
