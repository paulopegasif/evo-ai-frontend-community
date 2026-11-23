import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelHealthStatus } from '@/utils/channelStatus';

interface ChannelStatusBadgeProps {
  status: ChannelHealthStatus;
  className?: string;
}

const dotClasses: Record<ChannelHealthStatus, string> = {
  active: 'bg-success',
  attention: 'bg-warning',
  error: 'bg-destructive',
  available: 'bg-muted-foreground/40',
};

export default function ChannelStatusBadge({ status, className }: ChannelStatusBadgeProps) {
  const { t } = useLanguage('channels');

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-normal', className)}>
      <span className={cn('size-2 rounded-full', dotClasses[status])} aria-hidden="true" />
      {t(`overview.statusLabel.${status}`)}
    </Badge>
  );
}
