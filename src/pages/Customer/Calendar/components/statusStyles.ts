import type { AppointmentStatus } from '@/types/appointments';

/** One color per status, shared by every calendar view and the legend. */
export const STATUS_STYLES: Record<AppointmentStatus, { label: string; block: string; dot: string }> = {
  scheduled: {
    label: 'Agendado',
    block: 'border-l-primary bg-primary/10 text-foreground',
    dot: 'bg-primary',
  },
  confirmed: {
    label: 'Confirmado',
    block: 'border-l-sky-500 bg-sky-500/10 text-foreground',
    dot: 'bg-sky-500',
  },
  attended: {
    label: 'Compareceu',
    block: 'border-l-emerald-500 bg-emerald-500/10 text-foreground',
    dot: 'bg-emerald-500',
  },
  no_show: {
    label: 'Faltou',
    block: 'border-l-rose-500 bg-rose-500/10 text-foreground',
    dot: 'bg-rose-500',
  },
  cancelled: {
    label: 'Cancelado',
    block: 'border-l-zinc-400 bg-muted text-muted-foreground line-through',
    dot: 'bg-zinc-400',
  },
  rescheduled: {
    label: 'Reagendado',
    block: 'border-l-amber-500 bg-amber-500/10 text-foreground',
    dot: 'bg-amber-500',
  },
};

export const statusStyle = (status: string) => STATUS_STYLES[status as AppointmentStatus] ?? STATUS_STYLES.scheduled;

/** Past appointment still scheduled/confirmed: the outcome was never recorded. */
export const isWithoutOutcome = (apt: { status: string; end_time: string }) =>
  (apt.status === 'scheduled' || apt.status === 'confirmed') && new Date(apt.end_time).getTime() < Date.now();
