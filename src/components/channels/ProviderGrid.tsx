import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { ChannelIcon } from '@/components/channels';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelTypeId } from '@/types/channels/providers';
import { cn } from '@/utils/cn';

export interface Provider {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  popular?: boolean;
}

interface ProviderGridProps {
  channelType: ChannelTypeId;
  providers: Provider[];
  isDisabled?: (providerId: string) => boolean;
  disabledTooltip?: (providerId: string) => string | undefined;
  onSelect: (provider: Provider) => void;
}

const ProviderGrid: React.FC<ProviderGridProps> = ({
  channelType,
  providers,
  isDisabled,
  disabledTooltip,
  onSelect,
}) => {
  const { t } = useLanguage('channels');

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {providers.map(provider => {
        const disabled = isDisabled ? isDisabled(provider.id) : false;
        const tooltipText = disabled && disabledTooltip ? disabledTooltip(provider.id) : undefined;

        const card = (
          <button
            key={provider.id}
            type="button"
            aria-disabled={disabled || undefined}
            onClick={() => !disabled && onSelect(provider)}
            className={cn(
              'group relative flex h-full w-full items-start gap-4 rounded-xl border bg-card p-4 text-left shadow-xs/5 outline-none transition-[box-shadow,border-color,background-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              disabled
                ? 'cursor-not-allowed opacity-64'
                : 'cursor-pointer hover:border-primary/32 hover:bg-accent/40 hover:shadow-md/5',
            )}
          >
            <ChannelIcon channelType={channelType} provider={provider.id} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-sm">{provider.name}</h4>
                {provider.recommended && (
                  <Badge variant="success" size="sm">
                    {t('newChannel.providers.badges.recommended')}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground text-xs leading-relaxed">{provider.description}</p>
            </div>
            {!disabled && (
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            )}
          </button>
        );

        if (tooltipText) {
          return (
            <Tooltip key={provider.id}>
              <TooltipTrigger render={<div className="h-full" />}>{card}</TooltipTrigger>
              <TooltipPopup className="max-w-xs">{tooltipText}</TooltipPopup>
            </Tooltip>
          );
        }

        return <React.Fragment key={provider.id}>{card}</React.Fragment>;
      })}
    </div>
  );
};

export default ProviderGrid;
