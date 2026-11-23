import type { AppointmentStatus } from '@/types/appointments';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error' | 'info';

/** One color per status, shared by every calendar view, the legend and the dialogs (theme tokens only). */
export const STATUS_STYLES: Record<
  AppointmentStatus,
  { label: string; block: string; dot: string; badge: BadgeVariant }
> = {
  scheduled: {
    label: 'Agendado',
    block: 'border-l-primary bg-primary/10 text-foreground hover:bg-primary/16',
    dot: 'bg-primary',
    badge: 'outline',
  },
  confirmed: {
    label: 'Confirmado',
    block: 'border-l-info bg-info/10 text-foreground hover:bg-info/16',
    dot: 'bg-info',
    badge: 'info',
  },
  attended: {
    label: 'Compareceu',
    block: 'border-l-success bg-success/10 text-foreground hover:bg-success/16',
    dot: 'bg-success',
    badge: 'success',
  },
  no_show: {
    label: 'Faltou',
    block: 'border-l-destructive bg-destructive/10 text-foreground hover:bg-destructive/16',
    dot: 'bg-destructive',
    badge: 'error',
  },
  cancelled: {
    label: 'Cancelado',
    block: 'border-l-muted-foreground/48 bg-muted text-muted-foreground line-through hover:bg-accent',
    dot: 'bg-muted-foreground/48',
    badge: 'secondary',
  },
  rescheduled: {
    label: 'Reagendado',
    block: 'border-l-warning bg-warning/10 text-foreground hover:bg-warning/16',
    dot: 'bg-warning',
    badge: 'warning',
  },
};

export const statusStyle = (status: string) => STATUS_STYLES[status as AppointmentStatus] ?? STATUS_STYLES.scheduled;

/** Past appointment still scheduled/confirmed: the outcome was never recorded. */
export const isWithoutOutcome = (apt: { status: string; end_time: string }) =>
  (apt.status === 'scheduled' || apt.status === 'confirmed') && new Date(apt.end_time).getTime() < Date.now();

/**
 * Procedure colors come from the account settings and can be near-black (e.g. "Harmonização Facial"),
 * which disappears on dark surfaces. Very dark colors get mixed with the foreground so they stay readable
 * in both themes; everything else is used as is.
 */
export const readableCategoryColor = (color?: string | null): string => {
  if (!color) return 'var(--muted-foreground)';
  const hex = color.trim().replace('#', '');
  const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return color;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance < 0.04 ? `color-mix(in oklab, ${color} 55%, var(--foreground))` : color;
};
