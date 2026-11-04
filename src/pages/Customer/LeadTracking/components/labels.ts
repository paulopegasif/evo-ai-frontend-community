import type { CostBasis } from '@/types/leadTracking';

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  attended: 'Compareceu',
  no_show: 'Faltou',
  cancelled: 'Cancelado',
  rescheduled: 'Reagendado',
};

export const COST_BASIS_LABELS: Record<Exclude<CostBasis, null>, string> = {
  ad_day: 'custo por conversa do anúncio no dia',
  campaign_day: 'custo por conversa da campanha no dia',
  campaign_period: 'custo por conversa da campanha no período',
};

export const statusLabel = (status: string | null | undefined) =>
  status ? (APPOINTMENT_STATUS_LABELS[status] ?? status) : '—';

/** dd/mm/aaaa in the account zone; all-day dates never show a time. */
export const formatDate = (iso: string | null | undefined, withTime = false, timeZone = 'America/Sao_Paulo') => {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString('pt-BR', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
};
