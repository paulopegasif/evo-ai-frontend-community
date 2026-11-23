import { Badge } from '@/components/ui/badge';
import { CampaignStatus } from '@/types/campaigns';
import { Clock, Send, Pause, StopCircle, CheckCircle, FileText, FlaskConical } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';

interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

export default function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const { t } = useLanguage('campaigns');

  const getStatusConfig = (status: CampaignStatus) => {
    switch (status) {
      case CampaignStatus.DRAFT:
        return {
          label: t('status.draft'),
          variant: 'secondary' as const,
          icon: FileText,
        };
      case CampaignStatus.SCHEDULED:
        return {
          label: t('status.scheduled'),
          variant: 'info' as const,
          icon: Clock,
        };
      case CampaignStatus.SENDING:
        return {
          label: t('status.sending'),
          variant: 'info' as const,
          icon: Send,
        };
      case CampaignStatus.PAUSED:
        return {
          label: t('status.paused'),
          variant: 'warning' as const,
          icon: Pause,
        };
      case CampaignStatus.STOPPED:
        return {
          label: t('status.stopped'),
          variant: 'error' as const,
          icon: StopCircle,
        };
      case CampaignStatus.COMPLETED:
        return {
          label: t('status.completed'),
          variant: 'success' as const,
          icon: CheckCircle,
        };
      case CampaignStatus.SENDING_TESTAB:
        return {
          label: t('status.sending_testab'),
          variant: 'info' as const,
          icon: FlaskConical,
        };
      default:
        return {
          label: t('status.draft'),
          variant: 'secondary' as const,
          icon: FileText,
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon />
      {config.label}
    </Badge>
  );
}
