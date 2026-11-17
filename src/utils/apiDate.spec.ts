import { describe, expect, it } from 'vitest';
import { formatApiDate, parseApiDate } from './apiDate';

describe('parseApiDate', () => {
  it('reads Unix seconds (serializer `.to_i`) as seconds, not milliseconds', () => {
    expect(parseApiDate(1763251200)?.toISOString()).toBe('2025-11-16T00:00:00.000Z');
    expect(parseApiDate('1763251200')?.toISOString()).toBe('2025-11-16T00:00:00.000Z');
  });

  it('keeps millisecond timestamps and ISO strings', () => {
    expect(parseApiDate(1763251200000)?.toISOString()).toBe('2025-11-16T00:00:00.000Z');
    expect(parseApiDate('2025-11-16T00:00:00Z')?.toISOString()).toBe('2025-11-16T00:00:00.000Z');
  });

  it('returns null for empty or invalid input', () => {
    expect(parseApiDate(null)).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate('not a date')).toBeNull();
  });
});

describe('formatApiDate', () => {
  it('formats seconds in pt-BR and falls back for missing values', () => {
    expect(formatApiDate(1763294400)).toBe('16/11/2025');
    expect(formatApiDate(undefined)).toBe('—');
  });
});
