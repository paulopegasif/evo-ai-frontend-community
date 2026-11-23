import React from 'react';
import type { Appointment } from '@/types/appointments';
import { Plus } from '@/components/icons';
import { appointmentDayKey, appointmentTimeLabel, cellDayKey, todayKey } from '@/utils/accountTime';
import { cn } from '@/lib/utils';
import { statusStyle } from './statusStyles';

interface CalendarMonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (apt: Appointment) => void;
  /** Opens the day view (from the "+N mais" link). */
  onOpenDay?: (date: Date) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  appointments,
  onSelectDate,
  onSelectAppointment,
  onOpenDay,
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
  const lastDateOfMonth = new Date(year, month + 1, 0).getDate();
  const lastDateOfPrevMonth = new Date(year, month, 0).getDate();

  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, lastDateOfPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= lastDateOfMonth; d++) {
    days.push({
      date: new Date(year, month, d),
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill grid to multiple of 7
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let d = 1; d <= remainingDays; d++) {
      days.push({
        date: new Date(year, month + 1, d),
        isCurrentMonth: false,
      });
    }
  }

  const today = todayKey();
  const isToday = (d: Date) => cellDayKey(d) === today;

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Group by the account-zone day (never the UTC day of toISOString).
  const appointmentsByDate = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const dStr = appointmentDayKey(apt);
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(apt);
    return acc;
  }, {});

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b bg-muted/40 py-2 text-center">
        {weekdays.map((w, idx) => (
          <div
            key={w}
            className={cn('font-medium text-xs', idx === 0 || idx === 6 ? 'text-muted-foreground/72' : 'text-muted-foreground')}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid auto-rows-fr grid-cols-7 divide-x divide-y divide-border">
        {days.map(({ date, isCurrentMonth }, index) => {
          const dateKey = cellDayKey(date);
          // Timed appointments first, by time; "a definir" at the end of the day.
          const dayApts = (appointmentsByDate[dateKey] || []).sort(
            (a, b) => Number(Boolean(a.all_day)) - Number(Boolean(b.all_day)) || a.start_time.localeCompare(b.start_time),
          );
          const isCurrentDay = isToday(date);

          return (
            <div
              key={index}
              onClick={() => onSelectDate(date)}
              className={cn(
                'group relative flex min-h-28 cursor-pointer flex-col p-1.5 transition-colors',
                isCurrentMonth ? 'bg-card hover:bg-accent/40' : 'bg-muted/32 text-muted-foreground/72',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full font-medium text-xs tabular-nums',
                    isCurrentDay
                      ? 'bg-primary text-primary-foreground'
                      : isCurrentMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/72',
                  )}
                >
                  {date.getDate()}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(date);
                  }}
                  className="rounded-md p-1 text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  aria-label={`Agendar em ${date.toLocaleDateString('pt-BR')}`}
                  title="Agendar neste dia"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Appointments of the day */}
              <div className="mt-1 flex-1 space-y-1">
                {dayApts.slice(0, 3).map((apt) => {
                  const startTime = appointmentTimeLabel(apt);
                  return (
                    <button
                      type="button"
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(apt);
                      }}
                      className={cn(
                        'block w-full truncate rounded-md border-l-3 px-1.5 py-0.5 text-left text-[11px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                        statusStyle(apt.status).block,
                      )}
                      title={`${startTime} - ${apt.title} (${apt.contact?.name || ''})`}
                    >
                      <span className="flex items-center gap-1">
                        <span className="font-semibold tabular-nums">{startTime}</span>
                        <span className="truncate">{apt.contact?.name || apt.title}</span>
                      </span>
                      <span className="block truncate text-[10px] opacity-72">{apt.category}</span>
                    </button>
                  );
                })}
                {dayApts.length > 3 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      (onOpenDay ?? onSelectDate)(date);
                    }}
                    className="w-full rounded-md py-0.5 text-center font-medium text-[11px] text-primary hover:bg-primary/8"
                  >
                    +{dayApts.length - 3} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
