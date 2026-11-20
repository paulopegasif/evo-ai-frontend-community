import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Link2, List, Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';
import { ChannelTypeStatus, formatLastSync } from '@/utils/channelStatus';
import { Inbox, InboxConnectionState } from '@/types/channels/inbox';

const stateDotClasses: Record<InboxConnectionState, string> = {
  connected: 'bg-success',
  pending: 'bg-warning',
  disconnected: 'bg-destructive',
  error: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
};

interface ChannelConnectionsPopoverProps {
  /** The channel type whose connections are listed. */
  typeStatus: ChannelTypeStatus;
  /** Start the add-connection flow for this type. */
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  /** Open a single connection's settings (row click). */
  onOpenInbox: (inbox: Inbox) => void;
  /** Delete a single connection (per-row trash). Permission gating lives in the handler. */
  onDelete: (inbox: Inbox) => void;
  liveVerifiedIds?: Set<string>;
  liveLoadingIds?: Set<string>;
  liveFailedIds?: Set<string>;
  /** The trigger — the card's header connection group. */
  children: ReactElement;
}

// A lightweight popover, anchored to the card's connection group, that lists the
// channel type's connections with quick actions (open settings / delete / add).
// Chosen over a drawer/modal: it stays tied to the card and doesn't take the whole
// screen for what is a short list whose real actions jump elsewhere anyway.
export default function ChannelConnectionsPopover({
  typeStatus,
  onAdd,
  onOpenInbox,
  onDelete,
  liveVerifiedIds,
  liveLoadingIds,
  liveFailedIds,
  children,
}: ChannelConnectionsPopoverProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverPopup align="end" className="w-80 [&_[data-slot=popover-viewport]]:py-0 [&_[data-slot=popover-viewport]]:[--viewport-inline-padding:0px]">
        <div>
          <div className="border-b px-3 py-2.5">
            <p className="truncate font-semibold text-sm">{typeStatus.type.name}</p>
            <p className="text-muted-foreground text-xs">{t('overview.drawer.title')}</p>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            <ul className="flex flex-col gap-0.5">
              {typeStatus.inboxStates.map(({ inbox, state, unmonitored }) => {
                const id = String(inbox.id);
                const isLiveLoading = liveLoadingIds?.has(id) ?? false;
                const isLiveVerified = liveVerifiedIds?.has(id) ?? false;
                const liveFailed = liveFailedIds?.has(id) ?? false;
                const lastSync = formatLastSync(inbox.last_sync, currentLanguage);
                const stateLabel = unmonitored
                  ? t('overview.inboxState.unmonitored')
                  : t(`overview.inboxState.${state}`);
                const providerLabel = (
                  inbox.provider ||
                  inbox.channel_type?.replace('Channel::', '') ||
                  ''
                ).replace(/_/g, ' ');

                const openInbox = () => {
                  setOpen(false);
                  onOpenInbox(inbox);
                };

                return (
                  <li
                    key={id}
                    role="button"
                    tabIndex={0}
                    onClick={openInbox}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openInbox();
                      }
                    }}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={liveFailed ? t('overview.liveCheckFailed') : undefined}
                  >
                    <span
                      className={cn(
                        'size-2 shrink-0 rounded-full',
                        stateDotClasses[state],
                        isLiveLoading && 'animate-pulse',
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-sm">
                        {inbox.name}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Link2 className="size-3 shrink-0" aria-hidden="true" />
                        {providerLabel && <span className="truncate">{providerLabel}</span>}
                        {providerLabel && (
                          <span className="shrink-0" aria-hidden="true">
                            ·
                          </span>
                        )}
                        <span className="shrink-0">
                          {isLiveLoading ? (
                            t('overview.inboxState.checking')
                          ) : isLiveVerified ? (
                            <span className="text-success-foreground">
                              {t('overview.statusMeta.live')}
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger render={<span className="cursor-help" />}>
                                {stateLabel} · {t('overview.statusMeta.stored')}
                              </TooltipTrigger>
                              <TooltipPopup className="max-w-xs">
                                {t('overview.statusMeta.storedTooltip')}
                                {lastSync
                                  ? ` · ${t('overview.statusMeta.lastSync', { time: lastSync })}`
                                  : ''}
                              </TooltipPopup>
                            </Tooltip>
                          )}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('overview.actions.manage')}
                      onClick={event => {
                        event.stopPropagation();
                        openInbox();
                      }}
                      className="shrink-0 text-muted-foreground"
                    >
                      <List />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('overview.actions.deleteConnection')}
                      onClick={event => {
                        event.stopPropagation();
                        setOpen(false);
                        onDelete(inbox);
                      }}
                      className="shrink-0 text-muted-foreground hover:text-destructive-foreground"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="border-t p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false);
                onAdd(typeStatus);
              }}
            >
              <Plus />
              {t('overview.actions.addConnection')}
            </Button>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
