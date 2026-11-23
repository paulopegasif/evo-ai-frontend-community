import { useEffect, useState } from 'react';
import { CalendarCheck, DollarSign, ExternalLink, Megaphone, MessageSquare, MoveRight, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { leadTrackingService } from '@/services/dashboard/leadTrackingService';
import type { JourneyConversation, JourneyEvent, LeadJourney } from '@/types/leadTracking';
import { DASH, currencyOrDash, formatCurrency } from './format';
import { COST_BASIS_LABELS, formatDate, statusLabel } from './labels';

interface LeadJourneySheetProps {
  contactId: string | null;
  onClose: () => void;
}

const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm font-medium truncate">{value || DASH}</p>
  </div>
);

const eventIcon = (type: JourneyEvent['type']) =>
  ({ lead_created: UserPlus, stage_changed: MoveRight, appointment: CalendarCheck, sale: DollarSign })[type];

const eventText = (event: JourneyEvent) => {
  switch (event.type) {
    case 'lead_created':
      return 'Lead entrou no CRM';
    case 'stage_changed':
      return event.from ? `Etapa: ${event.from} → ${event.to}` : `Entrou na etapa ${event.to}`;
    case 'appointment':
      return `${event.category} — ${statusLabel(event.status)}${event.user_name ? ` · ${event.user_name}` : ''}`;
    case 'sale':
      return `Venda de ${formatCurrency(event.price)}`;
  }
};

const eventDate = (event: JourneyEvent) =>
  'all_day' in event && event.all_day ? `${formatDate(event.at)} · horário a definir` : formatDate(event.at, true);

const Conversation = ({ conversation }: { conversation: JourneyConversation }) => (
  <div className="rounded-lg border border-border">
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
      <span className="text-xs font-medium flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        {conversation.inbox_name ?? 'Conversa'}
      </span>
      <span className="text-xs text-muted-foreground">
        {conversation.mirrored ? 'Cópia do Bitrix24 · ' : ''}
        {formatDate(conversation.started_at, true)}
      </span>
    </div>
    <div className="max-h-80 overflow-y-auto p-3 space-y-2">
      {conversation.messages.map((m) =>
        m.message_type === 'activity' || m.private ? (
          <p key={m.id} className="text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-primary/40 pl-2">
            {m.content}
          </p>
        ) : (
          <div key={m.id} className={`flex ${m.message_type === 'incoming' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-1.5 text-sm whitespace-pre-wrap ${
                m.message_type === 'incoming' ? 'bg-muted' : 'bg-primary/15'
              }`}
            >
              {m.author_name && m.message_type !== 'incoming' && (
                <p className="text-[11px] font-medium text-primary">{m.author_name}</p>
              )}
              {m.content}
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">{formatDate(m.created_at, true)}</p>
            </div>
          </div>
        ),
      )}
      {conversation.messages.length === 0 && <p className="text-xs text-muted-foreground">Sem mensagens.</p>}
    </div>
  </div>
);

const LeadJourneySheet = ({ contactId, onClose }: LeadJourneySheetProps) => {
  const [journey, setJourney] = useState<LeadJourney | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    setJourney(null);
    setError(false);
    leadTrackingService
      .getLeadJourney(contactId)
      .then((data) => !cancelled && setJourney(data))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  const origin = journey?.origin;

  return (
    <Sheet open={Boolean(contactId)} onOpenChange={(open) => !open && onClose()}>
      <SheetPopup side="right" className="sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="pe-8 font-semibold text-lg">{journey?.contact.name ?? 'Jornada do lead'}</SheetTitle>
          <SheetDescription>
            {journey ? `${journey.contact.phone_number ?? 'Sem telefone'} · entrou em ${formatDate(journey.contact.created_at, true)}` : ' '}
          </SheetDescription>
        </SheetHeader>

        <SheetPanel>
        {error && (
          <Alert variant="error">
            <AlertDescription>Não foi possível carregar a jornada deste lead.</AlertDescription>
          </Alert>
        )}
        {!journey && !error && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {journey && origin && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/32 p-3">
              <Field
                label="Custo estimado"
                value={
                  <span title={origin.cost_basis ? COST_BASIS_LABELS[origin.cost_basis] : undefined}>
                    {currencyOrDash(journey.summary.estimated_cost)}
                  </span>
                }
              />
              <Field label="Receita" value={formatCurrency(journey.summary.revenue)} />
              <Field
                label="Retorno"
                value={journey.summary.roi == null ? DASH : `${journey.summary.roi.toLocaleString('pt-BR')}x`}
              />
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Megaphone className="h-4 w-4 text-primary" />
                Origem
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Canal" value={origin.source} />
                <Field label="Campanha" value={origin.campaign_name} />
                {/* Ad fields only when the lead came from an ad. */}
                {origin.adset_name && <Field label="Conjunto" value={origin.adset_name} />}
                {origin.ad_id && (
                  <Field
                    label="Anúncio"
                    value={origin.ad_unavailable ? `${origin.ad_id} (removido ou de outra conta)` : origin.ad_name ?? origin.ad_id}
                  />
                )}
                {origin.ad_headline && <Field label="Texto do anúncio" value={origin.ad_headline} />}
                {origin.ctwa_clid && <Field label="ID de clique (CTWA)" value={origin.ctwa_clid} />}
              </div>
              {origin.cost_basis && (
                <p className="text-xs text-muted-foreground">Custo estimado pelo {COST_BASIS_LABELS[origin.cost_basis]}.</p>
              )}
              {origin.ad_source_url && (
                <a
                  href={origin.ad_source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1"
                >
                  Ver anúncio <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {journey.summary.sale_match && (
                <Badge variant="info">
                  Venda do {journey.summary.sale_match.source} ligada{' '}
                  {journey.summary.sale_match.match === 'manual' ? 'manualmente' : 'automaticamente'}
                </Badge>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Linha do tempo</h3>
              <ol className="relative border-l border-border ml-2 space-y-3">
                {journey.events.map((event, index) => {
                  const Icon = eventIcon(event.type);
                  return (
                    <li key={`${event.type}-${index}`} className="ml-4">
                      <span className="absolute -left-2.5 flex size-5 items-center justify-center rounded-full border bg-background">
                        <Icon className="h-3 w-3 text-primary" />
                      </span>
                      <p className="text-sm">{eventText(event)}</p>
                      <p className="text-xs text-muted-foreground">{eventDate(event)}</p>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Conversas</h3>
              {journey.conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma conversa registrada. As conversas do Bitrix24 aparecem aqui quando o espelho estiver ativo.
                </p>
              ) : (
                journey.conversations.map((c) => <Conversation key={c.id} conversation={c} />)
              )}
            </section>
          </div>
        )}
        </SheetPanel>
      </SheetPopup>
    </Sheet>
  );
};

export default LeadJourneySheet;
