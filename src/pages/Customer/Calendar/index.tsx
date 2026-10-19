import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Grid3X3,
  List,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@evoapi/design-system';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { usersService } from '@/services/users';
import { contactsService } from '@/services/contacts/contactsService';
import type {
  Appointment,
  AppointmentCategory,
} from '@/types/appointments';
import { CalendarMonthView } from './components/CalendarMonthView';
import { CalendarListView } from './components/CalendarListView';
import { AppointmentModal } from './components/AppointmentModal';
import { toast } from 'sonner';

export const CalendarPage: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [categories, setCategories] = useState<AppointmentCategory[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; name: string; phone_number?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedUser, setSelectedUser] = useState<string>('__all__');
  const [selectedCategory, setSelectedCategory] = useState<string>('__all__');
  const [selectedStatus, setSelectedStatus] = useState<string>('__all__');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);

  // Load Initial Metadata (Users & Contacts)
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [usersRes, contactsRes] = await Promise.allSettled([
          usersService.getUsers ? usersService.getUsers() : Promise.resolve([]),
          contactsService.getContacts ? contactsService.getContacts() : Promise.resolve([]),
        ]);

        if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
          setUsers(usersRes.value.map((u: any) => ({ id: u.id, name: u.name || u.display_name || u.email })));
        }

        if (contactsRes.status === 'fulfilled' && (contactsRes.value as any)?.payload) {
          const list = (contactsRes.value as any).payload;
          setContacts(list.map((c: any) => ({ id: c.id, name: c.name || c.email || 'Lead', phone_number: c.phone_number })));
        }
      } catch (e) {
        console.error('Failed to load metadata', e);
      }
    };

    fetchMetadata();
  }, []);

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

      if (selectedUser !== '__all__') params.user_id = selectedUser;
      if (selectedCategory !== '__all__') params.category = selectedCategory;
      if (selectedStatus !== '__all__') params.status = selectedStatus;

      const res = await appointmentsService.getAppointments(params);
      setAppointments(res.payload || []);
      if (res.categories && res.categories.length > 0) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar agendamentos da clínica.');
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-700 dark:text-purple-300">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Agenda & Consultas
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Lumom Beauty
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Gestão de agendamentos por profissional, procedimento e sincronização com Google Calendar
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchAppointments}
            disabled={loading}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-all"
            title="Atualizar agenda"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <Button
            type="button"
            onClick={() => handleCreateAppointment()}
            className="bg-purple-600 hover:bg-purple-700 text-white gap-2 font-medium shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* KPI Mini-Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Agendamentos no Mês
            </p>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {stats.total}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Próximos / Confirmados
            </p>
            <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.scheduled}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Atendidos (Show)
            </p>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.attended}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Show Rate (Presença)
            </p>
            <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
              {stats.showRate}%
            </h3>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-x border-zinc-200 dark:border-zinc-800 transition-colors"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 ml-2">
              {formattedMonthYear}
            </h2>
          </div>

          {/* View switcher & Filters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Professional Filter */}
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-400 shrink-0" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-medium focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="__all__">Todos os Profissionais</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 font-medium focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="__all__">Todos os Status</option>
              <option value="scheduled">Agendados</option>
              <option value="confirmed">Confirmados</option>
              <option value="attended">Compareceram (Show)</option>
              <option value="no_show">Faltas (No-show)</option>
              <option value="cancelled">Cancelados</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                Mês
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-300 shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Lista
              </button>
            </div>
          </div>
        </div>

        {/* Category Chips Bar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0 mr-1">
            Categorias:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('__all__')}
            className={`text-xs px-2.5 py-1 rounded-full border transition-all shrink-0 ${
              selectedCategory === '__all__'
                ? 'bg-purple-600 text-white border-purple-600 font-semibold shadow-2xs'
                : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-purple-300'
            }`}
          >
            Todas ({appointments.length})
          </button>
          {categories.map((cat) => {
            const count = appointments.filter((a) => a.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                type="button"
                key={cat.name}
                onClick={() => setSelectedCategory(isSelected ? '__all__' : cat.name)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-950 text-purple-900 dark:text-purple-200 font-semibold shadow-2xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-purple-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: cat.color }}
                />
                <span>{cat.name}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

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
        users={users}
        contacts={contacts}
        onSave={fetchAppointments}
      />
    </div>
  );
};

export default CalendarPage;
