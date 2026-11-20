import { useMemo } from 'react';
import { Card, CardPanel } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/useLanguage';
import { Inbox } from '@/types/channels/inbox';
import { getChannelTypes } from '@/constants/channelTypes';
import { buildChannelTypeStatuses, ChannelTypeStatus } from '@/utils/channelStatus';
import useLiveChannelStatus from '@/hooks/channels/useLiveChannelStatus';
import ChannelTypeCard from './ChannelTypeCard';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

interface ChannelTypeHubProps {
  inboxes: Inbox[];
  isLoading: boolean;
  onAdd: (typeStatus: ChannelTypeStatus) => void;
  onOpenInbox: (inbox: Inbox) => void;
  onDelete: (inbox: Inbox) => void;
}

export default function ChannelTypeHub({
  inboxes,
  isLoading,
  onAdd,
  onOpenInbox,
  onDelete,
}: ChannelTypeHubProps) {
  const { t, currentLanguage } = useLanguage('channels');
  const { states: liveStates, loadingIds, failedIds } = useLiveChannelStatus(inboxes);
  const config = useGlobalConfig();

  // Email can only be connected once an OAuth integration (Gmail or Outlook) is set
  // up. If neither is, the email card mirrors the disabled provider grid: its action
  // is disabled with an explanatory tooltip instead of leading to a dead-end screen
  // where every provider is greyed out.
  const emailIntegrationConfigured =
    (typeof config.googleOAuthClientId === 'string' && config.googleOAuthClientId.length > 0) ||
    (typeof config.azureAppId === 'string' && config.azureAppId.length > 0);

  // getChannelTypes() reads translated labels, so recompute when language changes.
  const typeStatuses = useMemo(
    () => buildChannelTypeStatuses(getChannelTypes(), inboxes, liveStates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inboxes, liveStates, currentLanguage],
  );

  // Only ids present in the live overlay were confirmed live by the probe;
  // everything else renders as stored state, never as real-time.
  const liveVerifiedIds = useMemo(() => new Set(Object.keys(liveStates)), [liveStates]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Card key={idx}>
            <CardPanel className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
              <Skeleton className="h-8 w-full" />
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-semibold text-base">{t('overview.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('overview.subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {typeStatuses.map(typeStatus => (
          <ChannelTypeCard
            key={typeStatus.type.id}
            typeStatus={typeStatus}
            onAdd={onAdd}
            onOpenInbox={onOpenInbox}
            onDelete={onDelete}
            liveVerifiedIds={liveVerifiedIds}
            liveLoadingIds={loadingIds}
            liveFailedIds={failedIds}
            disabledReason={
              typeStatus.type.type === 'email' && !emailIntegrationConfigured
                ? t('overview.noIntegrationConfigured')
                : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
