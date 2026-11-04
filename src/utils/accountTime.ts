/**
 * Calendar dates in the account's time zone, independent of the viewer's browser zone.
 *
 * Appointment instants come from the API in UTC. Grouping them with
 * `toISOString().split('T')[0]` or `toTimeString()` uses UTC or the browser zone and
 * shifts evening appointments (and all-day Bitrix dates stored at 00:00 BRT) to the
 * wrong day. Every calendar view goes through these helpers instead.
 */
export const ACCOUNT_TIME_ZONE = 'America/Sao_Paulo';

type Instant = Date | string | number;

const toDate = (value: Instant) => (value instanceof Date ? value : new Date(value));

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: ACCOUNT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const zonedParts = (value: Instant) => {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(toDate(value)).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD of an instant in the account zone. */
export const zonedDayKey = (value: Instant) => {
  const p = zonedParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

/** YYYY-MM-DD of a calendar cell (a local Date built from year/month/day, not an instant). */
export const cellDayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Local Date (midnight) for a YYYY-MM-DD key, for date pickers and grid cells. */
export const dateFromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** HH:mm of an instant in the account zone. */
export const zonedTime = (value: Instant) => {
  const p = zonedParts(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
};

/** Minutes since 00:00 in the account zone (for time grids). */
export const zonedMinutes = (value: Instant) => {
  const p = zonedParts(value);
  return p.hour * 60 + p.minute;
};

/** Offset of the account zone from UTC at a given instant, in minutes (BRT = -180). */
const offsetMinutes = (instant: Date) => {
  const p = zonedParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
};

/** The instant of a wall-clock day + time in the account zone. */
export const zonedInstant = (dayKey: string, time = '00:00') => {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const first = new Date(guess.getTime() - offsetMinutes(guess) * 60000);
  // Re-check once in case the offset differs at the target instant (DST edges).
  return new Date(guess.getTime() - offsetMinutes(first) * 60000);
};

/** [start, end] instants covering whole account-zone days from..to (inclusive). */
export const zonedDayRange = (fromKey: string, toKey: string): [Date, Date] => {
  const end = zonedInstant(addDaysKey(toKey, 1));
  return [zonedInstant(fromKey), new Date(end.getTime() - 1000)];
};

export const addDaysKey = (key: string, days: number) => {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + days);
  return cellDayKey(date);
};

export const todayKey = () => zonedDayKey(new Date());

interface DatedAppointment {
  start_time: string;
  all_day?: boolean;
  day?: string | null;
}

/** Account-zone day of an appointment; prefers the server-computed `day`. */
export const appointmentDayKey = (apt: DatedAppointment) => apt.day || zonedDayKey(apt.start_time);

/** "14:30", or "A definir" for appointments whose time is not known yet. */
export const appointmentTimeLabel = (apt: DatedAppointment) => (apt.all_day ? 'A definir' : zonedTime(apt.start_time));

/** Date formatted in pt-BR in the account zone. */
export const formatZoned = (value: Instant, options: Intl.DateTimeFormatOptions) =>
  toDate(value).toLocaleString('pt-BR', { timeZone: ACCOUNT_TIME_ZONE, ...options });
