import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Grid3X3,
  List,
  RefreshCw,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@evoapi/design-system';
import BaseHeader from '@/components/base/BaseHeader';
import DashboardMetricCard from '@/pages/Customer/Dashboard/components/DashboardMetricCard';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { useAppointmentMetadata } from '@/hooks/useAppointmentMetadata';
import type { Appointment } from '@/types/appointments';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarListView } from './components/CalendarListView';
import { AppointmentModal } from './components/AppointmentModal';
import { toast } from 'sonner';

const ALL = '__all__';

const STATUS_FILTERS = [
  { value: 'scheduled', label: 'Agendados' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'attended', label: 'Compareceram' },
  { value: 'no_show', label: 'Faltas' },
  { value: 'cancelled', label: 'Cancelados' },
];

const controlClassName = 'h-9 bg-sidebar border-sidebar-border text-sidebar-foreground';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { professionals, patients, categories } = useAppointmentMetadata();

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>(ALL);
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL);
  const [selectedStatus, setSelectedStatus] = useState<string>(ALL);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);

  // Fetch Appointments
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      // Range: start of month - 7 days to end of month + 7 days
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startRange = new Date(year, month, 1 - 7).toISOString();
      const endRange = new Date(year, month + 1, 7).toISOString();

      const params: Record<string, string> = {
        since: startRange,
        until: endRange,
      };

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
  }, [currentDate, selectedUser, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Date Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const formattedMonthYear = useMemo(() => {
    const raw = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [currentDate]);

  // Open Modal to create
  const handleCreateAppointment = (date?: Date) => {
    setSelectedAppointment(null);
    setModalInitialDate(date || new Date());
    setIsModalOpen(true);
  };

  // Open Modal to edit
  const handleSelectAppointment = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setModalInitialDate(undefined);
    setIsModalOpen(true);
  };

  // Counts for Top Bar
  const stats = useMemo(() => {
    const total = appointments.length;
    const attended = appointments.filter((a) => a.status === 'attended').length;
    const noShow = appointments.filter((a) => a.status === 'no_show').length;
    const scheduled = appointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed').length;
    const showRate = attended + noShow > 0 ? Math.round((attended / (attended + noShow)) * 100) : (total > 0 ? 100 : 0);
    return { total, attended, noShow, scheduled, showRate };
  }, [appointments]);

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <BaseHeader
        title="Agenda & Consultas"
        subtitle="Gestão de agendamentos por profissional, procedimento e status"
        primaryAction={{
          label: 'Novo agendamento',
          icon: <Plus className="h-4 w-4" />,
          onClick: () => handleCreateAppointment(),
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

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <DashboardMetricCard
          title="Agendamentos no mês"
          value={stats.total}
          icon={Clock}
          accentClassName="bg-primary/15 text-primary"
        />
        <DashboardMetricCard
          title="Próximos / confirmados"
          value={stats.scheduled}
          icon={CalendarIcon}
          accentClassName="bg-sky-500/15 text-sky-500"
        />
        <DashboardMetricCard
          title="Atendidos"
          value={stats.attended}
          icon={CheckCircle2}
          accentClassName="bg-emerald-500/15 text-emerald-500"
        />
        <DashboardMetricCard
          title="Taxa de comparecimento"
          value={`${stats.showRate}%`}
          icon={Sparkles}
          accentClassName="bg-primary/15 text-primary"
        />
      </div>

      {/* Controls & filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevMonth} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={handleToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextMonth} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold ml-2">{formattedMonthYear}</h2>
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

              <div className="flex items-center gap-1">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9"
                  onClick={() => setViewMode('month')}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Mês
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  className="h-9"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4 mr-2" />
                  Lista
                </Button>
              </div>
            </div>
          </div>

          {/* Category filter */}
          <div className="pt-3 border-t border-border flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-sm text-muted-foreground shrink-0 mr-1">Categorias</span>
            <Button
              variant={selectedCategory === ALL ? 'default' : 'outline'}
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => setSelectedCategory(ALL)}
            >
              Todas ({appointments.length})
            </Button>
            {categories.map((cat) => {
              const count = appointments.filter((a) => a.category === cat.name).length;
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
        </CardContent>
      </Card>

      {/* Main View Component */}
      {viewMode === 'month' ? (
        <CalendarMonthView
          currentDate={currentDate}
          appointments={appointments}
          onSelectDate={handleCreateAppointment}
          onSelectAppointment={handleSelectAppointment}
        />
      ) : (
        <CalendarListView
          appointments={appointments}
          onSelectAppointment={handleSelectAppointment}
          onRefresh={fetchAppointments}
        />
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        appointment={selectedAppointment}
        initialDate={modalInitialDate}
        categories={categories}
        users={professionals}
        contacts={patients}
        onSave={fetchAppointments}
      />
    </div>
  );
};

export default CalendarPage;
