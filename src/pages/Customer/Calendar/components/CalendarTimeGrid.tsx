import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type { Appointment } from '@/types/appointments';
import { appointmentDayKey, dateFromKey, todayKey, zonedMinutes, zonedTime } from '@/utils/accountTime';
import { isWithoutOutcome, statusStyle } from './statusStyles';

export interface TimeGridColumn {
  key: string;
  label: React.ReactNode;
  /** Day of the column (YYYY-MM-DD). */
  day: string;
  /** Professional of the column (day view); undefined in the week view. */
  userId?: string;
}

interface Props {
  columns: TimeGridColumn[];
  appointments: Appointment[];
  onSelectAppointment: (apt: Appointment) => void;
  onSelectSlot: (day: string, time: string, userId?: string) => void;
}

const HOUR_HEIGHT = 56;
const DEFAULT_START = 7;
const DEFAULT_END = 21;

interface Placed {
  apt: Appointment;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

/** Side-by-side lanes for overlapping appointments (classic interval partitioning). */
const layout = (items: Appointment[]): Placed[] => {
  const sorted = items
    .map((apt) => {
      const start = zonedMinutes(apt.start_time);
      const end = Math.max(start + 15, start + (apt.duration_minutes || 30));
      return { apt, start, end, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((p) => p.lane + 1));
    cluster.forEach((p) => (p.lanes = lanes));
    cluster = [];
  };

  sorted.forEach((item) => {
    if (item.start >= clusterEnd) flush();
    const taken = new Set(cluster.filter((p) => p.end > item.start).map((p) => p.lane));
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    item.lane = lane;
    cluster.push(item);
    placed.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  });
  flush();
  return placed;
};

/** Minutes since midnight in the account zone, refreshed every minute. */
const useNowMinutes = () => {
  const [now, setNow] = useState(() => zonedMinutes(new Date()));
  useEffect(() => {
    const timer = setInterval(() => setNow(zonedMinutes(new Date())), 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
};

const CalendarTimeGrid: React.FC<Props> = ({ columns, appointments, onSelectAppointment, onSelectSlot }) => {
  const today = todayKey();
  const nowMinutes = useNowMinutes();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { timed, allDay, startHour, endHour } = useMemo(() => {
    const timedApts = appointments.filter((a) => !a.all_day);
    // Expand the default 07–21 window when something falls outside it.
    const minutes = timedApts.flatMap((a) => {
      const start = zonedMinutes(a.start_time);
      return [start, start + (a.duration_minutes || 30)];
    });
    const first = minutes.length ? Math.floor(Math.min(...minutes) / 60) : DEFAULT_START;
    const last = minutes.length ? Math.ceil(Math.max(...minutes) / 60) : DEFAULT_END;
    return {
      timed: timedApts,
      allDay: appointments.filter((a) => a.all_day),
      startHour: Math.min(DEFAULT_START, first),
      endHour: Math.min(24, Math.max(DEFAULT_END, last)),
    };
  }, [appointments]);

  const belongs = (apt: Appointment, column: TimeGridColumn) =>
    appointmentDayKey(apt) === column.day && (!column.userId || apt.user_id === column.userId);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const showsToday = columns.some((c) => c.day === today);
  const columnsKey = columns.map((c) => c.key).join('|');

  // Open on the first appointment (or the current hour today) instead of the top of the day.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const visibleDays = new Set(columns.map((c) => c.day));
    const starts = timed.filter((a) => visibleDays.has(appointmentDayKey(a))).map((a) => zonedMinutes(a.start_time));
    const target = showsToday ? nowMinutes : starts.length ? Math.min(...starts) : DEFAULT_START * 60 + 60;
    const offset = ((Math.max(target, startHour * 60) - startHour * 60) / 60 - 1) * HOUR_HEIGHT;
    container.scrollTop = Math.max(0, offset);
    // Only when the visible range changes, not on every minute tick or refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsKey, timed.length > 0]);
  const gridTemplate = `56px repeat(${columns.length}, minmax(140px, 1fr))`;
  const hasAllDay = allDay.length > 0;

  return (
    <div ref={scrollRef} className="bg-card border border-border rounded-xl overflow-auto shadow-xs max-h-[calc(100vh-260px)]">
      <div className="min-w-fit">
        {/* Column headers */}
        <div className="grid sticky top-0 z-20 bg-card border-b border-border" style={{ gridTemplateColumns: gridTemplate }}>
          <div />
          {columns.map((c) => (
            <div
              key={c.key}
              className={`px-2 py-2 text-center text-xs font-semibold border-l border-border ${
                c.day === today && !c.userId ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {c.label}
            </div>
          ))}
        </div>

        {/* All-day band: appointments with a date but no time yet */}
        {hasAllDay && (
          <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: gridTemplate }}>
            <div className="text-[10px] text-muted-foreground px-1 py-2 text-right leading-tight">A definir</div>
            {columns.map((c) => (
              <div key={c.key} className="border-l border-border p-1 space-y-1 min-h-[32px]">
                {allDay
                  .filter((a) => belongs(a, c))
                  .map((apt) => (
                    <button
                      type="button"
                      key={apt.id}
                      onClick={() => onSelectAppointment(apt)}
                      className={`w-full text-left text-[11px] px-1.5 py-1 rounded border-l-3 truncate ${statusStyle(apt.status).block}`}
                      title={`Horário a definir · ${apt.contact?.name ?? apt.title}`}
                    >
                      {apt.contact?.name ?? apt.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}

        {/* Hour grid */}
        <div className="grid relative" style={{ gridTemplateColumns: gridTemplate }}>
          <div>
            {hours.map((h) => (
              <div key={h} className="text-[10px] text-muted-foreground text-right pr-2 -translate-y-1.5" style={{ height: HOUR_HEIGHT }}>
                {String(h).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {columns.map((c) => {
            const placed = layout(timed.filter((a) => belongs(a, c)));
            const isToday = c.day === today;
            return (
              <div key={c.key} className={`relative border-l border-border ${isToday ? 'bg-primary/[0.03]' : ''}`}>
                {hours.map((h) => (
                  <div key={h} className="border-t border-border/60 grid grid-rows-2" style={{ height: HOUR_HEIGHT }}>
                    {[0, 30].map((m) => (
                      <button
                        type="button"
                        key={m}
                        aria-label={`Agendar ${dateFromKey(c.day).toLocaleDateString('pt-BR')} ${h}:${m || '00'}`}
                        className="hover:bg-primary/5 transition-colors"
                        onClick={() => onSelectSlot(c.day, `${String(h).padStart(2, '0')}:${m ? '30' : '00'}`, c.userId)}
                      />
                    ))}
                  </div>
                ))}

                {isToday && nowMinutes >= startHour * 60 && nowMinutes < endHour * 60 && (
                  <div
                    className="absolute left-0 right-0 z-30 pointer-events-none"
                    style={{ top: ((nowMinutes - startHour * 60) / 60) * HOUR_HEIGHT }}
                    aria-hidden
                  >
                    <div className="relative h-px bg-rose-500">
                      <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-rose-500" />
                    </div>
                  </div>
                )}

                {placed.map(({ apt, start, end, lane, lanes }) => {
                  const top = ((start - startHour * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(22, ((end - start) / 60) * HOUR_HEIGHT - 2);
                  const width = 100 / lanes;
                  const pending = isWithoutOutcome(apt);
                  return (
                    <button
                      type="button"
                      key={apt.id}
                      onClick={() => onSelectAppointment(apt)}
                      className={`absolute z-10 text-left text-[11px] leading-tight px-1.5 py-1 rounded-md border-l-3 shadow-2xs overflow-hidden hover:z-20 hover:shadow-md transition-shadow ${statusStyle(apt.status).block}`}
                      style={{ top, height, left: `calc(${lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                      title={`${zonedTime(apt.start_time)} · ${apt.contact?.name ?? apt.title} · ${apt.category}`}
                    >
                      {height < 40 ? (
                        <span className="flex items-center gap-1 truncate">
                          <span className="font-semibold">{zonedTime(apt.start_time)}</span>
                          {pending && <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Sem desfecho" />}
                          <span className="truncate">{apt.contact?.name ?? apt.title}</span>
                        </span>
                      ) : (
                        <>
                          <span className="font-semibold flex items-center gap-1">
                            {zonedTime(apt.start_time)}
                            {pending && <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" aria-label="Sem desfecho" />}
                          </span>
                          <span className="block truncate">{apt.contact?.name ?? apt.title}</span>
                        </>
                      )}
                      {height > 44 && <span className="block truncate opacity-70">{apt.category}</span>}
                      {height > 58 && !c.userId && apt.user?.name && (
                        <span className="block truncate opacity-60">{apt.user.name}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarTimeGrid;
