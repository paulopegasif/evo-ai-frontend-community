import { describe, expect, it } from 'vitest';
import {
  appointmentDayKey,
  appointmentTimeLabel,
  zonedDayKey,
  zonedDayRange,
  zonedInstant,
  zonedMinutes,
  zonedTime,
} from './accountTime';

describe('accountTime', () => {
  it('groups evening appointments on their Brazilian day, not the UTC day', () => {
    // 22:30 BRT on Nov 4 is 01:30 UTC on Nov 5.
    expect(zonedDayKey('2026-11-05T01:30:00Z')).toBe('2026-11-04');
    expect(zonedTime('2026-11-05T01:30:00Z')).toBe('22:30');
    expect(zonedMinutes('2026-11-05T01:30:00Z')).toBe(22 * 60 + 30);
  });

  it('keeps all-day Bitrix dates (00:00 BRT) on the right day', () => {
    expect(zonedDayKey('2026-11-04T03:00:00Z')).toBe('2026-11-04');
    expect(appointmentTimeLabel({ start_time: '2026-11-04T03:00:00Z', all_day: true })).toBe('A definir');
  });

  it('prefers the server day', () => {
    expect(appointmentDayKey({ start_time: '2026-11-05T01:30:00Z', day: '2026-11-04' })).toBe('2026-11-04');
  });

  it('builds instants from wall-clock time in the account zone', () => {
    expect(zonedInstant('2026-11-04', '14:00').toISOString()).toBe('2026-11-04T17:00:00.000Z');
    const [start, end] = zonedDayRange('2026-11-01', '2026-11-30');
    expect(start.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T02:59:59.000Z');
  });
});
