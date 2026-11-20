import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { ChannelIcon } from '@/components/channels';
import { ChannelType } from '@/hooks/channels/useChannelForm';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

interface ChannelCardProps {
  channel: ChannelType;
  disabled?: boolean;
  disabledTooltip?: string;
  onClick: () => void;
  'data-tour'?: string;
}

export const ChannelCard = ({
  channel,
  disabled = false,
  disabledTooltip,
  onClick,
  'data-tour': dataTour,
}: ChannelCardProps) => {
  const { t } = useLanguage('channels');

  const card = (
    <button
      type="button"
      onClick={() => !disabled && onClick()}
      aria-disabled={disabled || undefined}
      data-tour={dataTour}
      className={cn(
        'group relative flex h-full w-full items-start gap-3 rounded-xl border bg-card p-4 text-left shadow-xs/5 outline-none transition-[box-shadow,border-color,background-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        disabled ? 'cursor-not-allowed opacity-64' : 'cursor-pointer hover:border-primary/32 hover:bg-accent/40 hover:shadow-md/5',
      )}
    >
      <ChannelIcon channelType={channel.type} size="md" brandTile />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-sm">{channel.name}</h3>
          {disabled && (
            <Badge variant="outline" size="sm" className="shrink-0 font-normal text-muted-foreground">
              {t('newChannel.channelGrid.notConfigured')}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-relaxed">{channel.description}</p>
      </div>
      {!disabled && (
        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      )}
    </button>
  );

  if (disabled && disabledTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger render={<div className="h-full" />}>{card}</TooltipTrigger>
        <TooltipPopup className="max-w-xs">{disabledTooltip}</TooltipPopup>
      </Tooltip>
    );
  }

  return card;
};
