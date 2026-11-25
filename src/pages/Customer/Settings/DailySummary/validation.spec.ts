import { describe, expect, it } from 'vitest';
import { normalizePhone, validateDailySummary, type DailySummaryFormState } from './validation';

const t = (key: string, opts?: Record<string, unknown>) => (opts?.phone ? `${key}:${opts.phone}` : key);

const form = (patch: Partial<DailySummaryFormState> = {}): DailySummaryFormState => ({
  enabled: true,
  time: '19:00',
  inbox_id: 'inbox-1',
  phones: ['+5562999990000'],
  ...patch,
});

describe('daily summary validation', () => {
  it('accepts a valid enabled configuration', () => {
    expect(validateDailySummary(form(), t)).toBeNull();
  });

  it('flags phones that are not E.164, naming the number', () => {
    const errors = validateDailySummary(form({ phones: ['+5562999990000', '62999990000'] }), t);
    expect(errors?.phones).toEqual([undefined, 'summary.errors.phoneInvalid:62999990000']);
  });

  it('accepts formatted input after normalisation', () => {
    expect(normalizePhone('+55 (62) 99999-0000')).toBe('+5562999990000');
    expect(validateDailySummary(form({ phones: ['+55 (62) 99999-0000'] }), t)).toBeNull();
  });

  it('requires at least one phone and an inbox when enabled', () => {
    const errors = validateDailySummary(form({ phones: [''], inbox_id: '' }), t);
    expect(errors?.phones[0]).toBe('summary.errors.phoneRequired');
    expect(errors?.inbox).toBe('summary.errors.inboxRequired');
  });

  it('allows an empty configuration while disabled', () => {
    expect(validateDailySummary(form({ enabled: false, phones: [''], inbox_id: '' }), t)).toBeNull();
  });

  it('rejects more than five phones', () => {
    const phones = Array.from({ length: 6 }, (_, i) => `+55629999900${10 + i}`);
    expect(validateDailySummary(form({ phones }), t)?.phonesGeneral).toBe('summary.errors.phonesMax');
  });
});
