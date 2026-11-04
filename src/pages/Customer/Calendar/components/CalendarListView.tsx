import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Search, User, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment, AppointmentStatus } from '@/types/appointments';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';
import { appointmentDayKey, appointmentTimeLabel, dateFromKey, todayKey } from '@/utils/accountTime';
import { STATUS_STYLES, isWithoutOutcome, statusStyle } from './statusStyles';

interface CalendarListViewProps {
  appointments: Appointment[];
  /** Procedure name → color, to match the procedure filter. */
  categories?: { name: string; color: string }[];
  onSelectAppointment: (apt: Appointment) => void;
  onRefresh: () => void;
}

const normalize = (value: string | undefined | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const dayHeading = (key: string) => {
  const label = dateFromKey(key).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  return key === todayKey() ? `Hoje · ${capitalized}` : capitalized;
};

/** Appointments of the period grouped by day, with one-click outcome for open ones. */
export const CalendarListView: React.FC<CalendarListViewProps> = ({
  appointments,
  categories = [],
  onSelectAppointment,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const colorOf = useMemo(() => new Map(categories.map((c) => [c.name, c.color])), [categories]);

  const groups = useMemo(() => {
    const q = normalize(searchTerm.trim());
    const filtered = appointments
      .filter(
        (apt) =>
          !q ||
          [apt.title, apt.category, apt.contact?.name, apt.user?.name, apt.contact?.phone_number].some((v) =>
            normalize(v).includes(q),
          ),
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const byDay = new Map<string, Appointment[]>();
    filtered.forEach((apt) => {
      const key = appointmentDayKey(apt);
      byDay.set(key, [...(byDay.get(key) ?? []), apt]);
    });
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [appointments, searchTerm]);

  const handleStatusChange = async (apt: Appointment, status: AppointmentStatus) => {
    setSaving(apt.id);
    try {
      await appointmentsService.updateAppointment(apt.id, { status });
      toast.success(`${apt.contact?.name ?? apt.title}: ${STATUS_STYLES[status].label.toLowerCase()}.`);
      onRefresh();
    } catch {
      toast.error('Não foi possível alterar o status.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por paciente, telefone, procedimento ou profissional"
          aria-label="Buscar agendamentos"
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs"
        />
      </div>

      {groups.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          Nenhum agendamento encontrado para os filtros selecionados.
        </div>
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground px-1">
              {dayHeading(day)}
              <span className="text-xs font-normal text-muted-foreground">
                {items.length} {items.length === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs divide-y divide-border">
              {items.map((apt) => {
                const style = statusStyle(apt.status);
                const pending = isWithoutOutcome(apt);
                const open = apt.status === 'scheduled' || apt.status === 'confirmed';
                return (
                  <div
                    key={apt.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectAppointment(apt)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectAppointment(apt)}
                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-muted/40"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-16 shrink-0 text-center text-sm font-semibold tabular-nums ${
                          apt.all_day ? 'text-amber-600 text-xs' : ''
                        }`}
                      >
                        {appointmentTimeLabel(apt)}
                      </div>
                      <span className={`self-stretch w-1 rounded-full ${style.dot}`} aria-hidden />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {apt.contact?.name ?? apt.title}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            {style.label}
                          </span>
                          {pending && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <AlertCircle className="h-3 w-3" /> sem desfecho
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: colorOf.get(apt.category) ?? 'currentColor' }}
                            />
                            {apt.category}
                          </span>
                          {apt.user?.name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {apt.user.name}
                            </span>
                          )}
                          {apt.contact?.phone_number && <span>{apt.contact.phone_number}</span>}
                          {apt.price > 0 && <span className="font-medium text-foreground">{formatCurrency(apt.price)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center self-end shrink-0" onClick={(e) => e.stopPropagation()}>
                      {open && (
                        <>
                          <button
                            type="button"
                            disabled={saving === apt.id}
                            onClick={() => handleStatusChange(apt, 'attended')}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Compareceu
                          </button>
                          <button
                            type="button"
                            disabled={saving === apt.id}
                            onClick={() => handleStatusChange(apt, 'no_show')}
                            className="px-2.5 py-1 text-xs font-medium rounded-md border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Faltou
                          </button>
                        </>
                      )}
                      {apt.google_calendar_url && (
                        <a
                          href={apt.google_calendar_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md border border-border text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Abrir no Google Calendar"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
};
