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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 text-center py-2.5">
        {weekdays.map((w, idx) => (
          <div
            key={w}
            className={`text-xs font-semibold uppercase tracking-wider ${
              idx === 0 || idx === 6
                ? 'text-purple-600/70 dark:text-purple-400/70'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-200 dark:divide-zinc-800 border-b border-zinc-200 dark:border-zinc-800">
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
                  ? 'bg-white dark:bg-zinc-900 hover:bg-purple-50/20 dark:hover:bg-purple-950/10'
                  : 'bg-zinc-50/60 dark:bg-zinc-900/40 text-zinc-400 dark:text-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                    isCurrentDay
                      ? 'bg-purple-600 text-white shadow-xs'
                      : isCurrentMonth
                      ? 'text-zinc-800 dark:text-zinc-200 group-hover:text-purple-600'
                      : 'text-zinc-400 dark:text-zinc-600'
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
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all"
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
                    scheduled: 'border-l-purple-500 bg-purple-50/60 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200',
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
                  <div className="text-[10px] text-center font-medium text-purple-600 dark:text-purple-400 py-0.5">
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
