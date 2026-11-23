import { Badge } from '@/components/ui/badge';
import { CampaignChannelType } from '@/types/campaigns';
import { Mail, MessageCircle, Smartphone } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';

interface CampaignChannelBadgeProps {
  channelType?: CampaignChannelType;
  className?: string;
}

export default function CampaignChannelBadge({ channelType, className }: CampaignChannelBadgeProps) {
  const { t } = useLanguage('campaigns');

  if (!channelType) {
    return null;
  }

  const getChannelConfig = (channel: CampaignChannelType) => {
    switch (channel) {
      case CampaignChannelType.EMAIL:
        return {
          label: t('channel.email'),
          variant: 'outline' as const,
          icon: Mail,
          color: 'text-info',
        };
      case CampaignChannelType.WHATSAPP:
        return {
          label: t('channel.whatsapp'),
          variant: 'outline' as const,
          icon: MessageCircle,
          color: 'text-success',
        };
      case CampaignChannelType.SMS:
        return {
          label: t('channel.sms'),
          variant: 'outline' as const,
          icon: Smartphone,
          color: 'text-violet-500',
        };
      default:
        return {
          label: t('channel.email'),
          variant: 'outline' as const,
          icon: Mail,
          color: 'text-info',
        };
    }
  };

  const config = getChannelConfig(channelType);
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className={config.color} />
      {config.label}
    </Badge>
  );
}
