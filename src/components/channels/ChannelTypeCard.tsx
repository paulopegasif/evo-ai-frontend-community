import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Layers, Link2, Plus } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelHealthStatus, ChannelTypeStatus } from '@/utils/channelStatus';
import { CHANNEL_CAPABILITIES, ChannelCapability } from '@/constants/channelCapabilities';
import ChannelIcon from './ChannelIcon';
import ChannelConnectionsPopover from './ChannelConnectionsPopover';
import { Inbox } from '@/types/channels/inbox';

// Status dot color for the summary line, keyed by the type-level health status.
const statusDotClasses: Record<ChannelHealthStatus, string> = {
  active: 'bg-success',
  attention: 'bg-warning',
  error: 'bg-destructive',
  available: 'bg-muted-foreground/40',
};

// Capability chips are color-coded by capability (reference design, EVO-2092):
// publishing = green, conversations = blue, campaigns = purple.
// Campaigns has no status token, so it keeps a categorical violet tint.
const capabilityChipClasses: Record<ChannelCapability, string> = {
  publishing: 'bg-success/8 text-success-foreground dark:bg-success/16',
  conversations: 'bg-info/8 text-info-foreground dark:bg-info/16',
  campaigns: 'bg-violet-500/8 text-violet-700 dark:bg-violet-500/16 dark:text-violet-300',
};

interface ChannelTypeCardProps {
  typeStatus: ChannelTypeStatus;
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  /** Open a single connection's settings. */
  onOpenInbox: (inbox: Inbox) => void;
  /** Delete a single connection. Permission gating lives in the handler. */
  onDelete: (inbox: Inbox) => void;
  liveVerifiedIds?: Set<string>;
  liveLoadingIds?: Set<string>;
  liveFailedIds?: Set<string>;
  /** When set, the connect/add action is disabled and this text is shown on hover. */
  disabledReason?: string;
}

export default function ChannelTypeCard({
  typeStatus,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
  disabledReason,
}: ChannelTypeCardProps) {
  const { t } = useLanguage('channels');
  const { type, total, status } = typeStatus;
  const isConfigured = total > 0;
  const capabilities = CHANNEL_CAPABILITIES[type.type] ?? [];
  // Only WhatsApp surfaces a provider count pill, sourced from the catalog entry.
  const providerCount = type.type === 'whatsapp' ? type.providers?.length ?? 0 : 0;

  // Outline action keeps the page's single solid CTA ("Novo Canal") as the primary.
  const actionDisabled = !!disabledReason;
  const actionButton = (
    <Button
      variant="outline"
      className="w-full"
      disabled={actionDisabled}
      onClick={() => !actionDisabled && onAdd(typeStatus)}
    >
      <Plus />
      {isConfigured ? t('overview.actions.addConnection') : t('overview.actions.connect')}
    </Button>
  );

  // When the type has no configured integration (e.g. email with neither Gmail nor
  // Outlook OAuth set up), disable the action and explain why on hover.
  const primaryAction = actionDisabled ? (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-block w-full" />}>{actionButton}</TooltipTrigger>
      <TooltipPopup>{disabledReason}</TooltipPopup>
    </Tooltip>
  ) : (
    actionButton
  );

  return (
    <Card className="group relative transition-shadow duration-200 hover:shadow-md/5">
      <CardPanel className="flex flex-col gap-4">
        {/* Header: brand tile + name + subtitle, with a connection count on the far right. */}
        <div className="flex items-start gap-3">
          <ChannelIcon channelType={type.type} size="md" brandTile />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-base">{type.name}</h3>
            <p className="truncate text-muted-foreground text-xs">{type.description}</p>
          </div>
          {isConfigured && (
            <ChannelConnectionsPopover
              typeStatus={typeStatus}
              onAdd={onAdd}
              onOpenInbox={onOpenInbox}
              onDelete={onDelete}
              liveVerifiedIds={liveVerifiedIds}
              liveLoadingIds={liveLoadingIds}
              liveFailedIds={liveFailedIds}
            >
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('overview.actions.manage')}
                className="shrink-0 text-muted-foreground"
              >
                <span className={cn('size-2 rounded-full', statusDotClasses[status])} aria-hidden="true" />
                <Link2 aria-hidden="true" />
                <span className="tabular-nums">{total}</span>
                <ChevronRight className="opacity-60" aria-hidden="true" />
              </Button>
            </ChannelConnectionsPopover>
          )}
        </div>

        {/* Capability chips (+ WhatsApp provider count). */}
        {(capabilities.length > 0 || providerCount > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {capabilities.map(capability => (
              <Badge key={capability} className={cn('rounded-full px-2', capabilityChipClasses[capability])}>
                {t(`overview.capabilities.${capability}`)}
              </Badge>
            ))}
            {providerCount > 0 && (
              <Badge variant="secondary" className="rounded-full px-2 font-normal text-muted-foreground">
                <Layers aria-hidden="true" />
                {t('overview.providersCount', { count: providerCount })}
              </Badge>
            )}
          </div>
        )}

        {primaryAction}
      </CardPanel>
    </Card>
  );
}
