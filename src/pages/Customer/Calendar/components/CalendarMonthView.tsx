import React from 'react';
import type { Appointment } from '@/types/appointments';
import { Plus } from 'lucide-react';

interface CalendarMonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onSelectDate: (date: Date) => void;
  onSelectAppointment: (apt: Appointment) => void;
}

export const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  appointments,
  onSelectDate,
  onSelectAppointment,
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

  const today = new Date();
  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Map appointments to date string key: YYYY-MM-DD
  const appointmentsByDate = appointments.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const dStr = new Date(apt.start_time).toISOString().split('T')[0];
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(apt);
    return acc;
  }, {});

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-center py-2.5">
        {weekdays.map((w, idx) => (
          <div
            key={w}
            className={`text-xs font-semibold ${
              idx === 0 || idx === 6
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border border-b border-border">
        {days.map(({ date, isCurrentMonth }, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayApts = appointmentsByDate[dateKey] || [];
          const isCurrentDay = isToday(date);

          return (
            <div
              key={index}
              onClick={() => onSelectDate(date)}
              className={`min-h-[110px] p-2 transition-colors group relative cursor-pointer flex flex-col justify-between ${
                isCurrentMonth
                  ? 'bg-card hover:bg-primary/10'
                  : 'bg-muted/30 text-muted-foreground/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                    isCurrentDay
                      ? 'bg-primary text-white shadow-xs'
                      : isCurrentMonth
                      ? 'text-foreground group-hover:text-primary'
                      : 'text-muted-foreground/70'
                  }`}
                >
                  {date.getDate()}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(date);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  title="Agendar neste dia"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Appointments List for Day */}
              <div className="mt-1 space-y-1 flex-1 overflow-y-auto max-h-[85px] no-scrollbar">
                {dayApts.slice(0, 3).map((apt) => {
                  const startTime = new Date(apt.start_time).toTimeString().slice(0, 5);
                  const statusColors: Record<string, string> = {
                    attended: 'border-l-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200',
                    no_show: 'border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200',
                    confirmed: 'border-l-blue-500 bg-blue-50/60 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200',
                    scheduled: 'border-l-primary bg-primary/10 text-primary',
                  };
                  const colorClass = statusColors[apt.status] || statusColors.scheduled;

                  return (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAppointment(apt);
                      }}
                      className={`text-[11px] px-1.5 py-1 rounded-md border-l-3 transition-transform hover:scale-[1.02] shadow-2xs truncate ${colorClass}`}
                      title={`${startTime} - ${apt.title} (${apt.contact?.name || ''})`}
                    >
                      <div className="font-semibold flex items-center justify-between">
                        <span>{startTime}</span>
                        <span className="text-[10px] font-normal truncate opacity-80 ml-1">
                          {apt.contact?.name || apt.title}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-75 truncate">{apt.category}</div>
                    </div>
                  );
                })}
                {dayApts.length > 3 && (
                  <div className="text-[10px] text-center font-medium text-primary py-0.5">
                    +{dayApts.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
