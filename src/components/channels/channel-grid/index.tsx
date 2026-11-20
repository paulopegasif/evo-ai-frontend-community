import { useMemo, useState, type ReactNode } from 'react';
import { Search, SearchX } from 'lucide-react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelCard } from './ChannelCard';
import { ChannelType } from '@/hooks/channels/useChannelForm';

interface ChannelGridProps {
  channels: ChannelType[];
  onChannelSelect: (channel: ChannelType) => void;
  canFB: boolean;
  canIG: boolean;
  /** Progress indicator rendered under the page title. */
  stepper?: ReactNode;
}

export const ChannelGrid = ({ channels, onChannelSelect, canFB, canIG, stepper }: ChannelGridProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage('channels');

  const filteredChannels = useMemo(
    () =>
      channels.filter(
        channel =>
          channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          channel.description.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, channels],
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 md:px-6">
      <div className="flex flex-col gap-4" data-tour="channel-grid-header">
        <div>
          <h1 className="font-semibold text-xl md:text-2xl">{t('newChannel.channelGrid.title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('newChannel.channelGrid.subtitle')}</p>
        </div>
        {stepper}
      </div>

      <div data-tour="channel-grid-search">
        <InputGroup className="max-w-md">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('newChannel.channelGrid.searchPlaceholder')}
            aria-label={t('newChannel.channelGrid.searchPlaceholder')}
          />
        </InputGroup>
      </div>

      {filteredChannels.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t('newChannel.channelGrid.noResults')}</EmptyTitle>
            <EmptyDescription>{t('newChannel.channelGrid.noResultsDescription')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-3 pb-8 sm:grid-cols-2 xl:grid-cols-3" data-tour="channel-grid-list">
          {filteredChannels.map((channel, index) => {
            // Gate tiles by the backend-sourced `hasXxxConfig` booleans (single
            // source of truth with the admin save endpoint). Twitter has no
            // channel type yet — extend here if/when it lands.
            const disabled =
              channel.type === 'facebook' ? !canFB : channel.type === 'instagram' ? !canIG : false;

            return (
              <ChannelCard
                key={channel.id}
                channel={channel}
                disabled={disabled}
                disabledTooltip={disabled ? t('newChannel.channelGrid.notConfiguredTooltip') : undefined}
                onClick={() => onChannelSelect(channel)}
                data-tour={index === 0 ? 'channel-grid-first-card' : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
