import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
} from '@evoapi/design-system';
import {
  Calendar as CalendarIcon,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import type {
  Appointment,
  AppointmentCategory,
  AppointmentStatus,
  AppointmentCreateParams,
} from '@/types/appointments';
import { toast } from 'sonner';

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  initialDate?: Date;
  categories: AppointmentCategory[];
  users: { id: string; name: string }[];
  contacts: { id: string; name: string; phone_number?: string }[];
  onSave: () => void;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  open,
  onOpenChange,
  appointment,
  initialDate,
  categories,
  users,
  contacts,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [userId, setUserId] = useState('');
  const [contactId, setContactId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [location, setLocation] = useState('Consultório 1 - Lumom Beauty');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (appointment) {
      setTitle(appointment.title);
      setCategory(appointment.category);
      setUserId(appointment.user_id);
      setContactId(appointment.contact_id || '');
      const startDate = new Date(appointment.start_time);
      setDate(startDate.toISOString().split('T')[0]);
      setTime(startDate.toTimeString().slice(0, 5));
      setDuration(appointment.duration_minutes || 60);
      setStatus(appointment.status);
      setLocation(appointment.location || 'Consultório 1 - Lumom Beauty');
      setPrice(appointment.price || 0);
      setDescription(appointment.description || '');
    } else {
      const targetDate = initialDate || new Date();
      setDate(targetDate.toISOString().split('T')[0]);
      setTime('10:00');
      const defaultCat = categories[0] || { name: 'Avaliação Facial', duration: 45, price: 100 };
      setCategory(defaultCat.name);
      setDuration(defaultCat.duration);
      setPrice(defaultCat.price);
      setUserId(users[0]?.id || '');
      setContactId(contacts[0]?.id || '');
      setStatus('scheduled');
      setLocation('Consultório 1 - Lumom Beauty');
      setDescription('');
      setTitle(`${defaultCat.name}`);
    }
  }, [appointment, initialDate, categories, users, contacts, open]);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = categories.find((c) => c.name === catName);
    if (cat) {
      setDuration(cat.duration);
      setPrice(cat.price);
      const contactObj = contacts.find((c) => c.id === contactId);
      const contactName = contactObj ? ` - ${contactObj.name}` : '';
      setTitle(`${cat.name}${contactName}`);
    }
  };

  const handleContactChange = (newContactId: string) => {
    setContactId(newContactId);
    const contactObj = contacts.find((c) => c.id === newContactId);
    if (contactObj) {
      setTitle(`${category || 'Consulta'} - ${contactObj.name}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !userId || !category) {
      toast.error('Preencha os campos obrigatórios (Título, Data, Horário, Profissional e Procedimento).');
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(`${date}T${time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const payload: AppointmentCreateParams = {
        title,
        category,
        user_id: userId,
        contact_id: contactId || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_minutes: duration,
        status,
        location,
        price,
        description,
      };

      if (appointment) {
        await appointmentsService.updateAppointment(appointment.id, payload);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await appointmentsService.createAppointment(payload);
        toast.success('Agendamento criado com sucesso!');
      }

      onSave();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao salvar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    if (!confirm('Deseja realmente remover este agendamento?')) return;

    try {
      setLoading(true);
      await appointmentsService.deleteAppointment(appointment.id);
      toast.success('Agendamento removido.');
      onSave();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Erro ao excluir agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncGoogle = async () => {
    if (!appointment) return;
    try {
      const res = await appointmentsService.syncGoogleCalendar(appointment.id);
      toast.success('Agendamento pronto para o Google Calendar!');
      if (res.google_calendar_url) {
        window.open(res.google_calendar_url, '_blank', 'noopener,noreferrer');
      }
      onSave();
    } catch {
      toast.error('Erro ao sincronizar com Google Calendar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <CalendarIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              {appointment ? 'Editar Agendamento' : 'Novo Agendamento Lumom'}
            </DialogTitle>
            {appointment?.status && (
              <Badge
                className={
                  appointment.status === 'attended'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : appointment.status === 'no_show'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    : appointment.status === 'confirmed'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                }
              >
                {appointment.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Categoria / Procedimento */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Procedimento / Categoria
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`flex flex-col text-left p-2.5 rounded-lg border text-xs transition-all ${
                    category === cat.name
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 font-semibold shadow-sm'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300 hover:border-purple-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                    {cat.duration} min • R$ {cat.price.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Título do Agendamento *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              placeholder="Ex: Harmonização Facial - Dra. Camila / Paciente"
            />
          </div>

          {/* Contato & Profissional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Paciente / Contato (Lead)
              </label>
              <select
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                <option value="">Selecione um paciente...</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone_number ? `(${c.phone_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Profissional Responsável *
              </label>
              <div className="relative">
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Data *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Horário de Início *
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Duração (Minutos)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1h 30min (90 min)</option>
                <option value={120}>2 horas (120 min)</option>
              </select>
            </div>
          </div>

          {/* Status, Preço e Local */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Status do Atendimento
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
              >
                <option value="scheduled">Agendado</option>
                <option value="confirmed">Confirmado</option>
                <option value="attended">Compareceu (Show)</option>
                <option value="no_show">Não Compareceu (No-show)</option>
                <option value="cancelled">Cancelado</option>
                <option value="rescheduled">Remarcado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Valor do Procedimento (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
                Local / Sala
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Consultório 1, Sala Laser"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
              />
            </div>
          </div>

          {/* Observações Clínicas */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Observações Clínicas & Notas
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Queixa principal, histórico ou recomendações..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            />
          </div>

          {/* Sincronização Google Calendar */}
          {appointment && (
            <div className="p-3 bg-purple-50/60 dark:bg-purple-950/20 rounded-lg border border-purple-200/60 dark:border-purple-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Google Calendar
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sincronize com a agenda do profissional e envie convite ao paciente
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSyncGoogle}
                className="gap-1.5 text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100/50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Adicionar ao Google
              </Button>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
            {appointment ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-xs"
              >
                {loading ? 'Salvando...' : appointment ? 'Atualizar Agendamento' : 'Criar Agendamento'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
