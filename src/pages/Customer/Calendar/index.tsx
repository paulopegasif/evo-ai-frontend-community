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
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Group, GroupSeparator } from '@/components/ui/group';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
import { STATUS_STYLES, isWithoutOutcome, readableCategoryColor } from './components/statusStyles';
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
    return capitalize(date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
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

/** KPI tile of the visible period; clickable tiles apply the matching filter. */
const Counter = ({
  label,
  value,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    aria-pressed={onClick ? Boolean(active) : undefined}
    className={cn(
      'flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-left shadow-xs/5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring enabled:hover:bg-accent/50',
      active && 'border-primary/40 bg-primary/4',
    )}
  >
    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', tone)}>
      <Icon className="size-4" />
    </span>
    <span className="flex min-w-0 flex-col">
      <span className="font-semibold text-lg tabular-nums leading-tight">{value}</span>
      <span className="truncate text-muted-foreground text-xs" title={label}>
        {label}
      </span>
    </span>
  </button>
);

export const CalendarPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get('view');
  const storedView = typeof window !== 'undefined' ? window.localStorage.getItem(VIEW_KEY) : null;
  // Phones open on the list by default: seven columns do not fit.
  const defaultView: ViewMode = typeof window !== 'undefined' && window.innerWidth < 768 ? 'list' : 'week';
  const view: ViewMode = isView(rawView) ? rawView : isView(storedView) ? storedView : defaultView;
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
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => navigateTo({ view: 'day', date: day })}
              aria-label={`Ver o dia ${date.toLocaleDateString('pt-BR')}`}
            >
              {capitalize(date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''))}
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full font-semibold text-sm tabular-nums',
                  day === todayKey() ? 'bg-primary text-primary-foreground' : 'text-foreground',
                )}
              >
                {date.getDate()}
              </span>
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

  const userItems = useMemo(
    () => [{ value: ALL, label: 'Todos os profissionais' }, ...professionals.map((u) => ({ value: u.id, label: u.name }))],
    [professionals],
  );
  const statusItems = useMemo(() => [{ value: ALL, label: 'Todos os status' }, ...STATUS_FILTERS], []);
  const categoryItems = useMemo(
    () => [{ value: ALL, label: 'Todos os procedimentos' }, ...categories.map((c) => ({ value: c.name, label: c.name }))],
    [categories],
  );
  const toggleStatus = (status: string) => setSelectedStatus((current) => (current === status ? ALL : status));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 md:gap-6 md:p-6">
      <BaseHeader
        title="Agenda & Consultas"
        subtitle="Horários no fuso de Brasília · clique em um agendamento para ver o lead e mudar o status"
        primaryAction={{
          label: 'Novo agendamento',
          icon: <Plus />,
          onClick: () => openCreate(),
        }}
      />

      {/* Counters of the visible period */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Counter label={`total ${periodLabel}`} value={stats.total} icon={CalendarDays} tone="bg-primary/10 text-primary" />
        <Counter
          label="a confirmar"
          value={stats.scheduled}
          icon={Clock}
          tone="bg-primary/10 text-primary"
          active={selectedStatus === 'scheduled'}
          onClick={() => toggleStatus('scheduled')}
        />
        <Counter
          label="confirmados"
          value={stats.confirmed}
          icon={CheckCircle2}
          tone="bg-info/10 text-info-foreground"
          active={selectedStatus === 'confirmed'}
          onClick={() => toggleStatus('confirmed')}
        />
        <Counter
          label="compareceram"
          value={stats.attended}
          icon={CheckCircle2}
          tone="bg-success/10 text-success-foreground"
          active={selectedStatus === 'attended'}
          onClick={() => toggleStatus('attended')}
        />
        <Counter
          label="faltas"
          value={stats.noShow}
          icon={UserX}
          tone="bg-destructive/10 text-destructive-foreground"
          active={selectedStatus === 'no_show'}
          onClick={() => toggleStatus('no_show')}
        />
        <Counter
          label={stats.tbd > 0 ? `sem desfecho · ${stats.tbd} com horário a definir` : 'sem desfecho'}
          value={stats.noOutcome}
          icon={AlertCircle}
          tone="bg-warning/10 text-warning-foreground"
          onClick={() => navigateTo({ view: 'list' })}
        />
      </div>

      {/* Toolbar: period navigation, filters and view */}
      <Card className="gap-0 py-0">
        <CardPanel className="flex flex-col gap-3 p-3">
          <div className="flex flex-col justify-between gap-3 2xl:flex-row 2xl:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <Group aria-label="Navegar no período">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateTo({ date: shiftAnchor(view, anchor, -1) })}
                  aria-label="Anterior"
                >
                  <ChevronLeft />
                </Button>
                <GroupSeparator />
                <Button variant="outline" onClick={() => navigateTo({ date: todayKey() })}>
                  Hoje
                </Button>
                <GroupSeparator />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateTo({ date: shiftAnchor(view, anchor, 1) })}
                  aria-label="Próximo"
                >
                  <ChevronRight />
                </Button>
              </Group>
              <h2 className="ml-1 truncate font-semibold text-base sm:text-lg">{rangeTitle(view, anchor, range)}</h2>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground"
                      onClick={fetchAppointments}
                      disabled={loading}
                      aria-label="Atualizar"
                    />
                  }
                >
                  <RefreshCw className={cn(loading && 'animate-spin')} />
                </TooltipTrigger>
                <TooltipPopup>Atualizar</TooltipPopup>
              </Tooltip>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select items={userItems} value={selectedUser} onValueChange={(v) => setSelectedUser(v ?? ALL)}>
                <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por profissional">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {userItems.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <Select items={statusItems} value={selectedStatus} onValueChange={(v) => setSelectedStatus(v ?? ALL)}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por status">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {statusItems.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <Select items={categoryItems} value={selectedCategory} onValueChange={(v) => setSelectedCategory(v ?? ALL)}>
                <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por procedimento">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup className="max-h-80">
                  <SelectItem value={ALL}>Todos os procedimentos</SelectItem>
                  {categories.map((cat) => {
                    const count = visible.filter((a) => a.category === cat.name).length;
                    return (
                      <SelectItem key={cat.name} value={cat.name}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10"
                            style={{ backgroundColor: readableCategoryColor(cat.color) }}
                          />
                          <span className="truncate">{cat.name}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">{count}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectPopup>
              </Select>

              <Tabs value={view} onValueChange={(v) => navigateTo({ view: v as ViewMode })}>
                <TabsList aria-label="Visão">
                  {VIEWS.map(({ value, label, icon: Icon }) => (
                    <TabsTab key={value} value={value} aria-label={label}>
                      <Icon className="size-4" />
                      <span className="hidden sm:inline">{label}</span>
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Legend and cancelled toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-muted-foreground text-xs">
              {(['scheduled', 'confirmed', 'attended', 'no_show'] as const).map((status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span className={cn('size-2 rounded-full', STATUS_STYLES[status].dot)} />
                  {STATUS_STYLES[status].label}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-warning-foreground" /> sem desfecho
              </span>
            </div>
            <Label className="cursor-pointer text-muted-foreground text-xs">
              <Switch checked={hideCancelled} onCheckedChange={toggleHideCancelled} />
              Ocultar cancelados
            </Label>
          </div>
        </CardPanel>
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
        <CalendarListView
          appointments={visible}
          categories={categories}
          onSelectAppointment={setPanelAppointment}
          onRefresh={fetchAppointments}
        />
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
