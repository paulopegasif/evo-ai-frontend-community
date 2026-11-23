import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ExternalLink, Trash2 } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@/components/ui/combobox';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectButton, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/base';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt, ptBR } from 'date-fns/locale';
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
import { readableCategoryColor, statusStyle } from './statusStyles';
import { appointmentDayKey, dateFromKey, zonedInstant, zonedTime } from '@/utils/accountTime';

/** Time option for appointments whose date is known but the time is not ("horário a definir"). */
const TIME_TBD = '__tbd__';

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  initialDate?: Date;
  /** HH:mm preselected when the modal opens from a time-grid slot. */
  initialTime?: string;
  initialUserId?: string;
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

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  open,
  onOpenChange,
  appointment,
  initialDate,
  initialTime,
  initialUserId,
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
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setSubmitted(false);
    if (appointment) {
      setTitle(appointment.title);
      setCategory(appointment.category);
      setUserId(appointment.user_id);
      setContactId(appointment.contact_id || '');
      // Day and time in the account zone, whatever the browser zone is.
      setDate(dateFromKey(appointmentDayKey(appointment)));
      setTime(appointment.all_day ? TIME_TBD : zonedTime(appointment.start_time));
      setDuration(appointment.duration_minutes || 60);
      setStatus(appointment.status);
      setLocation(appointment.location || '');
      setPrice(appointment.price || 0);
      setDescription(appointment.description || '');
    } else {
      setDate(initialDate || new Date());
      setTime(initialTime || '10:00');
      const defaultCat = categories[0];
      setCategory(defaultCat?.name || '');
      setDuration(defaultCat?.duration || 60);
      setPrice(defaultCat?.price || 0);
      setUserId(initialUserId || '');
      setContactId('');
      setStatus('scheduled');
      setLocation('');
      setDescription('');
      setTitle(defaultCat?.name || '');
    }
  }, [appointment, initialDate, initialTime, initialUserId, categories, open]);

  const timeSlots = useMemo(
    () => (TIME_SLOTS.includes(time) || time === TIME_TBD ? TIME_SLOTS : [...TIME_SLOTS, time].sort()),
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
      const allDay = time === TIME_TBD;
      const startDateTime = zonedInstant(format(date, 'yyyy-MM-dd'), allDay ? '00:00' : time);
      const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

      const payload: AppointmentCreateParams = {
        title,
        category,
        user_id: userId,
        contact_id: contactId || undefined,
        start_time: startDateTime.toISOString(),
        // The API stretches all-day appointments over the whole account-zone day.
        end_time: allDay ? undefined : endDateTime.toISOString(),
        duration_minutes: allDay ? undefined : duration,
        all_day: allDay,
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

    try {
      setLoading(true);
      await appointmentsService.deleteAppointment(appointment.id);
      toast.success('Agendamento removido.');
      setConfirmDelete(false);
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

  const invalid = (missing: boolean) => submitted && missing;
  const requiredMessage = 'Campo obrigatório';

  const timeItems = useMemo(
    () => [{ value: TIME_TBD, label: 'A definir' }, ...timeSlots.map((slot) => ({ value: slot, label: slot }))],
    [timeSlots],
  );
  const durationItems = useMemo(
    () =>
      (DURATION_OPTIONS.includes(duration) ? DURATION_OPTIONS : [...DURATION_OPTIONS, duration].sort((a, b) => a - b)).map(
        (d) => ({ value: String(d), label: formatDuration(d) }),
      ),
    [duration],
  );
  const userItems = useMemo(() => users.map((u) => ({ value: u.id, label: u.name })), [users]);
  const statusItems = STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} noValidate className="contents">
          <DialogHeader>
            <div className="flex items-center gap-3 pe-8">
              <DialogTitle>{appointment ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
              {appointment?.status && (
                <Badge variant={statusStyle(appointment.status).badge}>
                  {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label ?? appointment.status}
                </Badge>
              )}
            </div>
            <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            {/* Procedimento */}
            <Field invalid={invalid(!category)} className="w-full">
              <FieldLabel render={<span />}>Procedimento *</FieldLabel>
              <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Procedimento">
                {categories.map((cat) => {
                  const selected = category === cat.name;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      key={cat.name}
                      onClick={() => handleCategoryChange(cat.name)}
                      className={cn(
                        'flex flex-col rounded-lg border bg-background p-2.5 text-left text-sm shadow-xs/5 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring dark:bg-input/32',
                        selected && 'border-primary bg-primary/6 ring-1 ring-primary/40 hover:bg-primary/8 dark:bg-primary/10',
                      )}
                    >
                      <span className="flex items-center gap-1.5 font-medium">
                        <span
                          className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/10"
                          style={{ backgroundColor: readableCategoryColor(cat.color) }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </span>
                      <span className="mt-1 text-muted-foreground text-xs">
                        {formatDuration(cat.duration)} · {formatCurrency(cat.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {invalid(!category) && <FieldError match>{requiredMessage}</FieldError>}
            </Field>

            {/* Título */}
            <Field invalid={invalid(!title)}>
              <FieldLabel>Título do agendamento *</FieldLabel>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Avaliação facial - Nome do paciente"
              />
              {invalid(!title) && <FieldError match>{requiredMessage}</FieldError>}
            </Field>

            {/* Paciente & Profissional */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Paciente</FieldLabel>
                <Combobox
                  items={contacts}
                  value={selectedPatient ?? null}
                  onValueChange={(c) => handleContactChange(c?.id ?? '')}
                  itemToStringLabel={(c) => c.name}
                  itemToStringValue={(c) => `${c.name} ${c.phone_number ?? ''}`}
                  isItemEqualToValue={(a, b) => a.id === b.id}
                >
                  <ComboboxInput placeholder="Buscar paciente..." showClear={Boolean(contactId)} />
                  <ComboboxPopup>
                    <ComboboxEmpty>Nenhum paciente encontrado.</ComboboxEmpty>
                    <ComboboxList>
                      {(c: AppointmentPatient) => (
                        <ComboboxItem key={c.id} value={c}>
                          <span className="flex items-center gap-2">
                            <span className="truncate">{c.name}</span>
                            {c.phone_number && (
                              <span className="ms-auto text-muted-foreground text-xs">{c.phone_number}</span>
                            )}
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>

              <Field invalid={invalid(!userId)}>
                <FieldLabel>Profissional responsável *</FieldLabel>
                <Select items={userItems} value={userId || null} onValueChange={(v) => setUserId(v ?? '')}>
                  <SelectTrigger aria-invalid={invalid(!userId) || undefined}>
                    <SelectValue placeholder="Selecione um profissional" />
                  </SelectTrigger>
                  <SelectPopup>
                    {userItems.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {invalid(!userId) && <FieldError match>{requiredMessage}</FieldError>}
              </Field>
            </div>

            {/* Data, Horário e Duração */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field invalid={invalid(!date)}>
                <FieldLabel>Data *</FieldLabel>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger render={<SelectButton aria-invalid={invalid(!date) || undefined} />}>
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="size-4 opacity-72" />
                      {date ? format(date, 'dd/MM/yyyy', { locale: pt }) : 'Selecione'}
                    </span>
                  </PopoverTrigger>
                  <PopoverPopup className="p-2" align="start">
                    <Calendar
                      mode="single"
                      locale={ptBR}
                      selected={date}
                      defaultMonth={date}
                      onSelect={(d: Date | undefined) => {
                        setDate(d);
                        setDatePickerOpen(false);
                      }}
                    />
                  </PopoverPopup>
                </Popover>
                {invalid(!date) && <FieldError match>{requiredMessage}</FieldError>}
              </Field>
              <Field>
                <FieldLabel>Horário de início *</FieldLabel>
                <Select items={timeItems} value={time} onValueChange={(v) => v && setTime(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup className="max-h-64">
                    {timeItems.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
              <Field disabled={time === TIME_TBD}>
                <FieldLabel>Duração</FieldLabel>
                <Select
                  items={durationItems}
                  value={String(duration)}
                  onValueChange={(v) => v && setDuration(Number(v))}
                  disabled={time === TIME_TBD}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {durationItems.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            </div>

            {/* Status, Valor e Local */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select items={statusItems} value={status} onValueChange={(v) => v && setStatus(v as AppointmentStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span className={cn('size-2 rounded-full', statusStyle(s.value).dot)} />
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Valor</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>R$</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="tabular-nums"
                  />
                </InputGroup>
              </Field>

              <Field>
                <FieldLabel>Local / sala</FieldLabel>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex.: Consultório 1" />
              </Field>
            </div>

            {/* Observações */}
            <Field>
              <FieldLabel>Observações</FieldLabel>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Queixa principal, histórico ou recomendações..."
              />
            </Field>

            {/* Google Calendar */}
            {appointment && (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">Google Calendar</p>
                  <p className="text-muted-foreground text-xs">Adicione este agendamento à agenda do profissional</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleSyncGoogle} className="shrink-0">
                  <ExternalLink />
                  Adicionar ao Google
                </Button>
              </div>
            )}
          </DialogPanel>

          <DialogFooter className="sm:justify-between">
            {appointment ? (
              <Button
                type="button"
                variant="destructive-outline"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
              >
                <Trash2 />
                Excluir
              </Button>
            ) : (
              <span className="hidden sm:block" />
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" loading={loading && !confirmDelete}>
                {appointment ? 'Salvar alterações' : 'Criar agendamento'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogPopup>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir agendamento?"
        description="Deseja realmente remover este agendamento? Esta ação não pode ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        loading={loading}
      />
    </Dialog>
  );
};
