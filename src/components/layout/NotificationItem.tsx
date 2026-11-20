import { useLanguage } from '@/hooks/useLanguage';
import { useRelativeTime } from '@/lib/useRelativeTime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, pt, enUS, es, fr, it } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { useMemo } from 'react';
import { Notification } from '@/services/notifications/NotificationsService';

const DATE_FNS_LOCALES: Record<string, DateFnsLocale> = {
  'pt-BR': ptBR,
  'pt': pt,
  'en': enUS,
  'es': es,
  'fr': fr,
  'it': it,
};

interface NotificationItemProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  getTypeLabel: (type: string) => string;
}

const CHANNEL_NAMES: Record<string, string> = {
  'Channel::Whatsapp': 'WhatsApp',
  'Channel::Telegram': 'Telegram',
  'Channel::Api': 'API',
  'Channel::WebWidget': 'Web Chat',
  'Channel::Email': 'E-mail',
  'Channel::Sms': 'SMS',
  'Channel::Line': 'LINE',
  'Channel::FacebookPage': 'Facebook',
  'Channel::Instagram': 'Instagram',
  'Channel::TwitterProfile': 'Twitter',
  'Channel::Slack': 'Slack',
  'Channel::TwilioSms': 'SMS',
  'Channel::Voice': 'Voice',
};

const NEW_MESSAGE_TYPES = new Set([
  'assigned_conversation_new_message',
  'participating_conversation_new_message',
]);

function getInitials(name: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function NotificationItem({
  notification,
  onOpen,
  getTypeLabel,
}: NotificationItemProps) {
  const { t, currentLanguage } = useLanguage('layout');
  const dateFnsLocale = DATE_FNS_LOCALES[currentLanguage] ?? enUS;
  const isUnread = !notification.read_at;

  const sender = notification.sender ?? null;
  const contact = notification.primary_actor?.contact ?? null;
  const displayId = notification.primary_actor?.display_id;
  const channelType = notification.primary_actor?.channel ?? null;

  const senderName = sender?.name ?? contact?.name ?? (displayId ? `#${displayId}` : t('notifications.item.noAssignee'));
  const senderAvatarUrl = sender?.avatar_url ?? contact?.avatar_url ?? undefined;

  const channelName = channelType ? CHANNEL_NAMES[channelType] ?? null : null;
  const badgeLabel = NEW_MESSAGE_TYPES.has(notification.notification_type) && channelName
    ? t('notifications.panel.types.channel_message', { channel: channelName })
    : getTypeLabel(notification.notification_type);

  const activityDate = useMemo(() => {
    if (!notification.last_activity_at) return null;
    const d = new Date(notification.last_activity_at);
    return isNaN(d.getTime()) ? null : d;
  }, [notification.last_activity_at]);

  useRelativeTime(activityDate);
  const timeLabel = activityDate
    ? formatDistanceToNow(activityDate, { addSuffix: true, locale: dateFnsLocale })
    : t('notifications.item.someTimeAgo');

  const preview = notification.push_message_body || notification.push_message_title || t('notifications.item.noContent');

  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg p-3 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        isUnread && 'bg-primary/4',
      )}
    >
      <span className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={senderAvatarUrl} alt={senderName} />
          <AvatarFallback className="bg-primary/12 text-primary text-xs">
            {getInitials(sender?.name ?? contact?.name ?? '')}
          </AvatarFallback>
        </Avatar>
        {isUnread && (
          <span className="absolute -top-0.5 -left-0.5 size-2.5 rounded-full bg-primary ring-2 ring-popover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={cn('truncate text-sm', isUnread ? 'font-semibold' : 'font-medium')}>{senderName}</span>
          <span className="shrink-0 text-muted-foreground text-xs">{timeLabel}</span>
        </span>
        <Badge variant="secondary" className="mt-1 max-w-full truncate">
          {badgeLabel}
        </Badge>
        <span className="mt-1 block truncate text-muted-foreground text-sm">{preview}</span>
      </span>
    </button>
  );
}
