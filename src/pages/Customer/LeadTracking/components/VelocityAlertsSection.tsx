import { AlertTriangle, CalendarX2, Clock, Timer, UserX } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import type { FunnelVelocity, TrackingAlerts } from '@/types/leadTracking';
import { DASH, plural } from './format';
import { formatDate, statusLabel } from './labels';

interface Props {
  velocity?: FunnelVelocity;
  alerts?: TrackingAlerts;
  onOpenLead: (contactId: string) => void;
}

const days = (value: number | null | undefined) =>
  value == null ? DASH : `${value.toLocaleString('pt-BR')} ${value === 1 ? 'dia' : 'dias'}`;

const VelocityAlertsSection = ({ velocity, alerts, onOpenLead }: Props) => (
  <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          Velocidade do funil
        </CardTitle>
        <CardDescription>Tempo mediano entre as etapas, para os leads que chegaram nelas</CardDescription>
      </CardHeader>
      <CardPanel className="space-y-4">
        <div>
          <p className="text-xs text-muted-foreground">Lead → avaliação</p>
          <p className="font-semibold text-2xl tabular-nums">{days(velocity?.lead_to_evaluation_days)}</p>
          <p className="text-xs text-muted-foreground">{plural(velocity?.lead_to_evaluation_count ?? 0, 'lead', 'leads')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Avaliação → fechamento</p>
          <p className="font-semibold text-2xl tabular-nums">{days(velocity?.evaluation_to_close_days)}</p>
          <p className="text-xs text-muted-foreground">{plural(velocity?.evaluation_to_close_count ?? 0, 'venda', 'vendas')}</p>
        </div>
      </CardPanel>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserX className="h-4 w-4 text-warning-foreground" />
          Leads sem agendamento
          <Badge variant={alerts?.stale_leads.count ? 'warning' : 'secondary'} className="tabular-nums">{alerts?.stale_leads.count ?? 0}</Badge>
        </CardTitle>
        <CardDescription>
          Há mais de {alerts?.stale_days ?? 3} dias sem avaliação marcada e fora da etapa de perdidos
        </CardDescription>
      </CardHeader>
      <CardPanel className="max-h-64 overflow-y-auto divide-y divide-border">
        {(alerts?.stale_leads.sample ?? []).map((lead) => (
          <button
            type="button"
            key={lead.id}
            onClick={() => onOpenLead(lead.id)}
            className="w-full rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <p className="text-sm font-medium">{lead.name}</p>
            <p className="text-xs text-muted-foreground">
              Entrou em {formatDate(lead.created_at)} · {lead.campaign_name ?? 'Sem campanha'}
            </p>
          </button>
        ))}
        {!alerts?.stale_leads.count && <p className="text-sm text-muted-foreground py-2">Nenhum lead parado. 🎉</p>}
      </CardPanel>
    </Card>

    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarX2 className="h-4 w-4 text-warning-foreground" />
          Agendamentos sem desfecho
          <Badge variant={alerts?.no_outcome.count ? 'warning' : 'secondary'} className="tabular-nums">{alerts?.no_outcome.count ?? 0}</Badge>
        </CardTitle>
        <CardDescription>Data já passou e o status continua agendado ou confirmado</CardDescription>
      </CardHeader>
      <CardPanel className="max-h-64 overflow-y-auto divide-y divide-border">
        {(alerts?.no_outcome.sample ?? []).map((apt) => (
          <button
            type="button"
            key={apt.id}
            disabled={!apt.contact_id}
            onClick={() => apt.contact_id && onOpenLead(apt.contact_id)}
            className="w-full rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
          >
            <p className="text-sm font-medium">{apt.contact_name ?? 'Sem contato'}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(apt.start_time, !apt.all_day)} · {statusLabel(apt.status)}
              {apt.user_name ? ` · ${apt.user_name}` : ''}
            </p>
          </button>
        ))}
        {!alerts?.no_outcome.count && <p className="text-sm text-muted-foreground py-2">Tudo em dia.</p>}
      </CardPanel>
    </Card>

    {(alerts?.unlinked_sales.count ?? 0) > 0 && (
      <p className="xl:col-span-3 text-xs text-warning-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        {plural(alerts!.unlinked_sales.count, 'venda do Bitrix aguarda', 'vendas do Bitrix aguardam')} ligação a um lead
        na aba “Revisão”.
      </p>
    )}
  </div>
);

export default VelocityAlertsSection;
