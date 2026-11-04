import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Grid3X3,
  List,
  Plus,
  RefreshCw,
  Square,
  UserX,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { useAppointmentMetadata } from '@/hooks/useAppointmentMetadata';
import type { Appointment } from '@/types/appointments';
import {
  addDaysKey,
  appointmentDayKey,
  cellDayKey,
  dateFromKey,
  todayKey,
  zonedDayRange,
} from '@/utils/accountTime';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarListView } from './components/CalendarListView';
import { AppointmentModal } from './components/AppointmentModal';
import CalendarTimeGrid, { type TimeGridColumn } from './components/CalendarTimeGrid';
import AppointmentSidePanel from './components/AppointmentSidePanel';
import { STATUS_STYLES, isWithoutOutcome } from './components/statusStyles';
import { toast } from 'sonner';

const ALL = '__all__';
const VIEW_KEY = 'calendar:view';
const HIDE_CANCELLED_KEY = 'calendar:hideCancelled';

type ViewMode = 'day' | 'week' | 'month' | 'list';
const VIEWS: { value: ViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'day', label: 'Dia', icon: Square },
  { value: 'week', label: 'Semana', icon: Columns3 },
  { value: 'month', label: 'Mês', icon: Grid3X3 },
  { value: 'list', label: 'Lista', icon: List },
];
const isView = (v: string | null): v is ViewMode => VIEWS.some((o) => o.value === v);
const isDayKey = (v: string | null): v is string => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));

const STATUS_FILTERS = [
  { value: 'scheduled', label: 'Agendados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'attended', label: 'Compareceram' },
  { value: 'no_show', label: 'Faltas' },
  { value: 'cancelled', label: 'Cancelados' },
];

const controlClassName = 'h-9 bg-sidebar border-sidebar-border text-sidebar-foreground';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** First and last day (YYYY-MM-DD) shown by a view around the anchor day. */
const visibleRange = (view: ViewMode, anchor: string): [string, string] => {
  const date = dateFromKey(anchor);
  if (view === 'day') return [anchor, anchor];
  if (view === 'week') {
    const start = addDaysKey(anchor, -date.getDay());
    return [start, addDaysKey(start, 6)];
  }
  // Month and list: the whole month grid, including the padding weeks.
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [addDaysKey(cellDayKey(first), -first.getDay()), addDaysKey(cellDayKey(last), 6 - last.getDay())];
};

const shiftAnchor = (view: ViewMode, anchor: string, direction: 1 | -1) => {
  if (view === 'day') return addDaysKey(anchor, direction);
  if (view === 'week') return addDaysKey(anchor, 7 * direction);
  const date = dateFromKey(anchor);
  return cellDayKey(new Date(date.getFullYear(), date.getMonth() + direction, 1));
};

const rangeTitle = (view: ViewMode, anchor: string, [from, to]: [string, string]) => {
  const date = dateFromKey(anchor);
  if (view === 'day') {
    return capitalize(date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  }
  if (view === 'week') {
    const a = dateFromKey(from);
    const b = dateFromKey(to);
    const sameMonth = a.getMonth() === b.getMonth();
    return `${a.getDate()}${sameMonth ? '' : ` ${a.toLocaleDateString('pt-BR', { month: 'short' })}`} – ${b.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }
  return capitalize(date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
};

const Counter = ({
  label,
  value,
  icon: Icon,
  className,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  className: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left enabled:hover:bg-muted/40 transition-colors"
  >
    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${className}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span>
      <span className="block text-lg font-semibold leading-none">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  </button>
);

export const CalendarPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const storedView = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_KEY) : null;
  const view: ViewMode = isView(rawView) ? rawView : isView(storedView) ? storedView : 'week';
  const rawDate = searchParams.get('date');
  const anchor = isDayKey(rawDate) ? rawDate : todayKey();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { professionals, patients, categories } = useAppointmentMetadata();

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>(ALL);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL);
  const [hideCancelled, setHideCancelled] = useState(() => window.localStorage.getItem(HIDE_CANCELLED_KEY) !== 'false');

  // Side panel and modal
  const [panelAppointment, setPanelAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalInitial, setModalInitial] = useState<{ date?: Date; time?: string; userId?: string }>({});

  const navigateTo = useCallback(
    (changes: { view?: ViewMode; date?: string }) => {
      if (changes.view) window.localStorage.setItem(VIEW_KEY, changes.view);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (changes.view) next.set('view', changes.view);
          if (changes.date) {
            if (changes.date === todayKey()) next.delete('date');
            else next.set('date', changes.date);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const range = useMemo(() => visibleRange(view, anchor), [view, anchor]);
  const [rangeFrom, rangeTo] = range;

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      // Whole days in the account time zone, whatever the browser zone is.
      const [since, until] = zonedDayRange(rangeFrom, rangeTo);
      const params: Record<string, string> = { since: since.toISOString(), until: until.toISOString() };
      if (selectedUser !== ALL) params.user_id = selectedUser;
      if (selectedCategory !== ALL) params.category = selectedCategory;
      if (selectedStatus !== ALL) params.status = selectedStatus;

      const res = await appointmentsService.getAppointments(params);
      setAppointments(res.payload || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar os agendamentos.');
    } finally {
      setLoading(false);
    }
  }, [rangeFrom, rangeTo, selectedUser, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const toggleHideCancelled = (value: boolean) => {
    setHideCancelled(value);
    window.localStorage.setItem(HIDE_CANCELLED_KEY, String(value));
  };

  const visible = useMemo(
    () =>
      appointments.filter(
        (a) => !(hideCancelled && a.status === 'cancelled' && selectedStatus !== 'cancelled'),
      ),
    [appointments, hideCancelled, selectedStatus],
  );

  // Counters of the visible period (day, week or month).
  const stats = useMemo(() => {
    const inRange = appointments.filter((a) => {
      const day = appointmentDayKey(a);
      return day >= rangeFrom && day <= rangeTo;
    });
    const by = (status: string) => inRange.filter((a) => a.status === status).length;
    return {
      total: inRange.filter((a) => a.status !== 'cancelled').length,
      scheduled: by('scheduled'),
      confirmed: by('confirmed'),
      attended: by('attended'),
      noShow: by('no_show'),
      noOutcome: inRange.filter(isWithoutOutcome).length,
      tbd: inRange.filter((a) => a.all_day && a.status !== 'cancelled').length,
    };
  }, [appointments, rangeFrom, rangeTo]);

  const periodLabel = view === 'day' ? 'no dia' : view === 'week' ? 'na semana' : 'no mês';

  const columns = useMemo<TimeGridColumn[]>(() => {
    if (view === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDaysKey(rangeFrom, i);
        const date = dateFromKey(day);
        return {
          key: day,
          day,
          label: (
            <button type="button" className="hover:text-primary" onClick={() => navigateTo({ view: 'day', date: day })}>
              {capitalize(date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''))}{' '}
              <span className="text-sm text-foreground">{date.getDate()}</span>
            </button>
          ),
        };
      });
    }
    // Day view: one column per professional (the filtered one, or everyone with appointments + the team).
    const ids = selectedUser !== ALL ? [selectedUser] : professionals.map((p) => p.id);
    const withAppointments = new Set(visible.filter((a) => appointmentDayKey(a) === anchor).map((a) => a.user_id));
    const ordered = [...ids.filter((id) => withAppointments.has(id)), ...ids.filter((id) => !withAppointments.has(id))];
    const missing = [...withAppointments].filter((id) => id && !ids.includes(id));
    return [...ordered, ...missing].map((id) => ({
      key: id,
      day: anchor,
      userId: id,
      label:
        professionals.find((p) => p.id === id)?.name ??
        visible.find((a) => a.user_id === id)?.user?.name ??
        'Profissional',
    }));
  }, [view, rangeFrom, anchor, selectedUser, professionals, visible, navigateTo]);

  const openCreate = (date?: Date, time?: string, userId?: string) => {
    setSelectedAppointment(null);
    setModalInitial({ date: date ?? dateFromKey(anchor), time, userId });
    setIsModalOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setPanelAppointment(null);
    setSelectedAppointment(apt);
    setModalInitial({});
    setIsModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <BaseHeader
        title="Agenda & Consultas"
        subtitle="Horários no fuso de Brasília · clique em um agendamento para ver o lead e mudar o status"
        primaryAction={{
          label: 'Novo agendamento',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => openCreate(),
        }}
        secondaryActions={[
          {
            label: 'Atualizar',
            icon: <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />,
            onClick: fetchAppointments,
            disabled: loading,
          },
        ]}
      />

      {/* Counters of the visible period */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <Counter label={`agendamentos ${periodLabel}`} value={stats.total} icon={CalendarDays} className="bg-primary/15 text-primary" />
        <Counter
          label="a confirmar"
          value={stats.scheduled}
          icon={Clock}
          className="bg-primary/15 text-primary"
          onClick={() => setSelectedStatus('scheduled')}
        />
        <Counter
          label="confirmados"
          value={stats.confirmed}
          icon={CheckCircle2}
          className="bg-sky-500/15 text-sky-500"
          onClick={() => setSelectedStatus('confirmed')}
        />
        <Counter
          label="compareceram"
          value={stats.attended}
          icon={CheckCircle2}
          className="bg-emerald-500/15 text-emerald-500"
          onClick={() => setSelectedStatus('attended')}
        />
        <Counter
          label="faltas"
          value={stats.noShow}
          icon={UserX}
          className="bg-rose-500/15 text-rose-500"
          onClick={() => setSelectedStatus('no_show')}
        />
        <Counter
          label={stats.tbd > 0 ? `sem desfecho · ${stats.tbd} com horário a definir` : 'sem desfecho'}
          value={stats.noOutcome}
          icon={AlertCircle}
          className="bg-amber-500/15 text-amber-600"
          onClick={() => navigateTo({ view: 'list' })}
        />
      </div>

      {/* Controls & filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigateTo({ date: shiftAnchor(view, anchor, -1) })}
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => navigateTo({ date: todayKey() })}>
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => navigateTo({ date: shiftAnchor(view, anchor, 1) })}
                aria-label="Próximo"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-2">{rangeTitle(view, anchor, range)}</h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className={`${controlClassName} w-[200px]`} aria-label="Filtrar por profissional">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os profissionais</SelectItem>
                  {professionals.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className={`${controlClassName} w-[170px]`} aria-label="Filtrar por status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os status</SelectItem>
                  {STATUS_FILTERS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border border-border p-0.5" role="tablist" aria-label="Visão">
                {VIEWS.map(({ value, label, icon: Icon }) => (
                  <Button
                    key={value}
                    role="tab"
                    aria-selected={view === value}
                    variant={view === value ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8"
                    onClick={() => navigateTo({ view: value })}
                  >
                    <Icon className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Category filter, legend and cancelled toggle */}
          <div className="pt-3 border-t border-border flex flex-col xl:flex-row xl:items-center gap-3 justify-between">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-sm text-muted-foreground shrink-0 mr-1">Procedimentos</span>
              <Button
                variant={selectedCategory === ALL ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => setSelectedCategory(ALL)}
              >
                Todos ({visible.length})
              </Button>
              {categories.map((cat) => {
                const count = visible.filter((a) => a.category === cat.name).length;
                const isSelected = selectedCategory === cat.name;
                return (
                  <Button
                    key={cat.name}
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    className="shrink-0 rounded-full gap-1.5"
                    onClick={() => setSelectedCategory(isSelected ? ALL : cat.name)}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                    <span className="text-xs opacity-70">({count})</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-4 flex-wrap shrink-0">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {(['scheduled', 'confirmed', 'attended', 'no_show'] as const).map((status) => (
                  <span key={status} className="flex items-center gap-1">
                    <span className={`h-2 w-2 rounded-full ${STATUS_STYLES[status].dot}`} />
                    {STATUS_STYLES[status].label}
                  </span>
                ))}
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3 w-3 text-amber-500" /> sem desfecho
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="hide-cancelled" checked={hideCancelled} onCheckedChange={toggleHideCancelled} />
                <Label htmlFor="hide-cancelled" className="text-xs text-muted-foreground cursor-pointer">
                  Ocultar cancelados
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(view === 'week' || view === 'day') && (
        <CalendarTimeGrid
          columns={columns}
          appointments={visible}
          onSelectAppointment={setPanelAppointment}
          onSelectSlot={(day, time, userId) => openCreate(dateFromKey(day), time, userId)}
        />
      )}
      {view === 'month' && (
        <CalendarMonthView
          currentDate={dateFromKey(anchor)}
          appointments={visible}
          onSelectDate={(date) => openCreate(date)}
          onSelectAppointment={setPanelAppointment}
          onOpenDay={(date) => navigateTo({ view: 'day', date: cellDayKey(date) })}
        />
      )}
      {view === 'list' && (
        <CalendarListView appointments={visible} onSelectAppointment={setPanelAppointment} onRefresh={fetchAppointments} />
      )}

      <AppointmentSidePanel
        appointment={panelAppointment}
        onClose={() => setPanelAppointment(null)}
        onEdit={openEdit}
        onChanged={fetchAppointments}
      />

      <AppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        appointment={selectedAppointment}
        initialDate={modalInitial.date}
        initialTime={modalInitial.time}
        initialUserId={modalInitial.userId}
        categories={categories}
        users={professionals}
        contacts={patients}
        onSave={fetchAppointments}
      />
    </div>
  );
};

export default CalendarPage;
