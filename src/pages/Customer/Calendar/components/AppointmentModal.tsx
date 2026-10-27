import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Badge,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Calendar,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@evoapi/design-system';
import {
  Calendar as CalendarIcon,
  Check,
  ChevronsUpDown,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { appointmentsService } from '@/services/appointments/appointmentsService';
import { formatCurrency } from '@/pages/Customer/Dashboard/components/dashboardUtils';
import type { AppointmentProfessional, AppointmentPatient } from '@/hooks/useAppointmentMetadata';
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
  users: AppointmentProfessional[];
  contacts: AppointmentPatient[];
  onSave: () => void;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = [
  { value: 'scheduled', label: 'Agendado' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'attended', label: 'Compareceu' },
  { value: 'no_show', label: 'Não compareceu' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'rescheduled', label: 'Remarcado' },
];

const STATUS_BADGE: Record<AppointmentStatus, string> = {
  attended: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  no_show: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30',
  confirmed: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30',
  scheduled: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  rescheduled: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

// 15-minute slots across the clinic day.
const TIME_SLOTS = Array.from({ length: (22 - 6) * 4 + 1 }, (_, i) => {
  const minutes = 6 * 60 + i * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

const controlClassName = 'bg-sidebar border-sidebar-border text-sidebar-foreground';

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
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState(0);
  const [description, setDescription] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    if (appointment) {
      setTitle(appointment.title);
      setCategory(appointment.category);
      setUserId(appointment.user_id);
      setContactId(appointment.contact_id || '');
      const startDate = new Date(appointment.start_time);
      setDate(startDate);
      setTime(format(startDate, 'HH:mm'));
      setDuration(appointment.duration_minutes || 60);
      setStatus(appointment.status);
      setLocation(appointment.location || '');
      setPrice(appointment.price || 0);
      setDescription(appointment.description || '');
    } else {
      setDate(initialDate || new Date());
      setTime('10:00');
      const defaultCat = categories[0];
      setCategory(defaultCat?.name || '');
      setDuration(defaultCat?.duration || 60);
      setPrice(defaultCat?.price || 0);
      setUserId('');
      setContactId('');
      setStatus('scheduled');
      setLocation('');
      setDescription('');
      setTitle(defaultCat?.name || '');
    }
  }, [appointment, initialDate, categories, open]);

  const timeSlots = useMemo(
    () => (TIME_SLOTS.includes(time) ? TIME_SLOTS : [...TIME_SLOTS, time].sort()),
    [time],
  );

  const selectedPatient = contacts.find((c) => c.id === contactId);

  const handleCategoryChange = (catName: string) => {
    setCategory(catName);
    const cat = categories.find((c) => c.name === catName);
    if (cat) {
      setDuration(cat.duration);
      setPrice(cat.price);
      setTitle(selectedPatient ? `${cat.name} - ${selectedPatient.name}` : cat.name);
    }
  };

  const handleContactChange = (newContactId: string) => {
    setContactId(newContactId);
    const contactObj = contacts.find((c) => c.id === newContactId);
    setTitle(contactObj ? `${category || 'Consulta'} - ${contactObj.name}` : category || title);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!title || !date || !time || !userId || !category) {
      toast.error('Preencha os campos obrigatórios: procedimento, título, profissional, data e horário.');
      return;
    }

    try {
      setLoading(true);
      const startDateTime = new Date(`${format(date, 'yyyy-MM-dd')}T${time}:00`);
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
        toast.success('Agendamento atualizado.');
      } else {
        await appointmentsService.createAppointment(payload);
        toast.success('Agendamento criado.');
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
      toast.success('Agendamento pronto para o Google Calendar.');
      if (res.google_calendar_url) {
        window.open(res.google_calendar_url, '_blank', 'noopener,noreferrer');
      }
      onSave();
    } catch {
      toast.error('Erro ao sincronizar com o Google Calendar.');
    }
  };

  const requiredError = (missing: boolean) =>
    submitted && missing ? 'border-red-500' : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle>{appointment ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
            {appointment?.status && (
              <Badge variant="outline" className={STATUS_BADGE[appointment.status]}>
                {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label ?? appointment.status}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Procedimento */}
          <div className="space-y-2">
            <Label>Procedimento *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => handleCategoryChange(cat.name)}
                  className={`flex flex-col text-left p-2.5 rounded-md border text-sm transition-colors ${
                    category === cat.name
                      ? 'border-primary bg-primary/10'
                      : 'border-sidebar-border bg-sidebar hover:bg-sidebar-accent'
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate">{cat.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDuration(cat.duration)} • {formatCurrency(cat.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="appointment-title">Título do agendamento *</Label>
            <Input
              id="appointment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${controlClassName} ${requiredError(!title)}`}
              placeholder="Ex.: Avaliação facial - Nome do paciente"
            />
          </div>

          {/* Paciente & Profissional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Popover open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={patientPickerOpen}
                    className={`w-full justify-between font-normal ${controlClassName} hover:bg-sidebar-accent`}
                  >
                    <span className={`truncate ${selectedPatient ? '' : 'text-muted-foreground'}`}>
                      {selectedPatient ? selectedPatient.name : 'Selecione um paciente'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar paciente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {contactId && (
                          <CommandItem
                            value="__none__ sem paciente"
                            onSelect={() => {
                              handleContactChange('');
                              setPatientPickerOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">Sem paciente</span>
                          </CommandItem>
                        )}
                        {contacts.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={`${c.name} ${c.phone_number ?? ''} ${c.id}`}
                            onSelect={() => {
                              handleContactChange(c.id);
                              setPatientPickerOpen(false);
                            }}
                          >
                            <Check className={`mr-2 h-4 w-4 ${contactId === c.id ? 'opacity-100' : 'opacity-0'}`} />
                            <span className="truncate">{c.name}</span>
                            {c.phone_number && (
                              <span className="ml-auto pl-2 text-xs text-muted-foreground">{c.phone_number}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Profissional responsável *</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className={`${controlClassName} ${requiredError(!userId)}`}>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data, Horário e Duração */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full justify-start text-left font-normal ${controlClassName} hover:bg-sidebar-accent ${requiredError(!date)}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {date ? format(date, 'dd/MM/yyyy', { locale: pt }) : 'Selecione'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-sidebar border-sidebar-border" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d: Date | undefined) => {
                      setDate(d);
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                    className="bg-sidebar text-sidebar-foreground"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Horário de início *</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger className={controlClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {timeSlots.map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {slot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger className={controlClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(DURATION_OPTIONS.includes(duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, duration].sort((a, b) => a - b)).map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {formatDuration(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status, Valor e Local */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
                <SelectTrigger className={controlClassName}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-price">Valor (R$)</Label>
              <Input
                id="appointment-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={controlClassName}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="appointment-location">Local / sala</Label>
              <Input
                id="appointment-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex.: Consultório 1"
                className={controlClassName}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="appointment-notes">Observações</Label>
            <Textarea
              id="appointment-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Queixa principal, histórico ou recomendações..."
              className={controlClassName}
            />
          </div>

          {/* Google Calendar */}
          {appointment && (
            <div className="p-3 rounded-md border border-sidebar-border bg-sidebar flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Adicione este agendamento à agenda do profissional
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleSyncGoogle} className="gap-1.5 shrink-0">
                <ExternalLink className="h-4 w-4" />
                Adicionar ao Google
              </Button>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border">
            {appointment ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="gap-1.5"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : appointment ? 'Salvar alterações' : 'Criar agendamento'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
