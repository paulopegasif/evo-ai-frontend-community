import React, { useMemo, useState } from 'react';
import { AlertCircle, CalendarSearch, CheckCircle2, ExternalLink, Search, User, XCircle } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Appointment, AppointmentStatus } from '@/types/appointments';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';
import { appointmentDayKey, appointmentTimeLabel, dateFromKey, todayKey } from '@/utils/accountTime';
import { STATUS_STYLES, isWithoutOutcome, readableCategoryColor, statusStyle } from './statusStyles';

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
      <InputGroup className="max-w-xl">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por paciente, telefone, procedimento ou profissional"
          aria-label="Buscar agendamentos"
        />
      </InputGroup>

      {groups.length === 0 ? (
        <Empty className="rounded-xl border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarSearch />
            </EmptyMedia>
            <EmptyTitle>Nenhum agendamento</EmptyTitle>
            <EmptyDescription>Nenhum agendamento encontrado para os filtros selecionados.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        groups.map(([day, items]) => (
          <section key={day} className="space-y-2">
            <h3 className="flex items-center gap-2 px-1 font-semibold text-foreground text-sm">
              {dayHeading(day)}
              <span className="font-normal text-muted-foreground text-xs tabular-nums">
                {items.length} {items.length === 1 ? 'agendamento' : 'agendamentos'}
              </span>
            </h3>
            <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-xs/5">
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
                    className="flex cursor-pointer flex-col gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={cn(
                          'w-16 shrink-0 text-center font-semibold text-sm tabular-nums',
                          apt.all_day && 'text-warning-foreground text-xs',
                        )}
                      >
                        {appointmentTimeLabel(apt)}
                      </div>
                      <span className={`self-stretch w-1 rounded-full ${style.dot}`} aria-hidden />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {apt.contact?.name ?? apt.title}
                          </span>
                          <Badge variant={style.badge} size="sm">
                            {style.label}
                          </Badge>
                          {pending && (
                            <Badge variant="warning" size="sm">
                              <AlertCircle /> sem desfecho
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full ring-1 ring-foreground/10"
                              style={{ backgroundColor: colorOf.has(apt.category) ? readableCategoryColor(colorOf.get(apt.category)) : 'currentColor' }}
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
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving === apt.id}
                            onClick={() => handleStatusChange(apt, 'attended')}
                            className="text-success-foreground"
                          >
                            <CheckCircle2 /> Compareceu
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive-outline"
                            disabled={saving === apt.id}
                            onClick={() => handleStatusChange(apt, 'no_show')}
                          >
                            <XCircle /> Faltou
                          </Button>
                        </>
                      )}
                      {apt.google_calendar_url && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Abrir no Google Calendar"
                                render={<a href={apt.google_calendar_url} target="_blank" rel="noopener noreferrer" />}
                              />
                            }
                          >
                            <ExternalLink />
                          </TooltipTrigger>
                          <TooltipPopup>Abrir no Google Calendar</TooltipPopup>
                        </Tooltip>
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
