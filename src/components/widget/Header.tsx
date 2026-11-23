import React from 'react';
import EndConversationButton from './EndConversationButton';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  color?: string;
  online?: boolean;
  avatarUrl?: string;
  replyTime?: string;
  websiteToken?: string;
  canEndConversation?: boolean;
  hasEndConversationEnabled?: boolean;
  onConversationEnded?: () => void;
  onError?: (error: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title = 'EvoAI',
  subtitle = 'Como podemos ajudar?',
  color = '#1f93ff',
  online = false,
  avatarUrl,
  replyTime,
  websiteToken = '',
  canEndConversation = false,
  hasEndConversationEnabled = false,
  onConversationEnded,
  onError,
}) => {
  const { t } = useLanguage('widget');
  const status = online
    ? t('header.onlineNow')
    : replyTime
      ? t('header.replyTime', { time: replyTime })
      : t('header.weAreResponding');

  return (
    <header className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: color }}>
      <div className="relative shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={title} className="size-9 rounded-full object-cover ring-2 ring-white/24" />
        ) : (
          <div className="flex size-9 items-center justify-center rounded-full bg-white/20 font-semibold text-sm ring-2 ring-white/24">
            {title.trim().charAt(0).toUpperCase() || 'E'}
          </div>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'absolute -end-0.5 -bottom-0.5 size-3 rounded-full ring-2',
            online ? 'bg-emerald-400' : 'bg-white/60',
          )}
          style={{ ['--tw-ring-color' as string]: color }}
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-semibold text-sm">{title}</p>
        <p className="truncate text-white/80 text-xs">{subtitle}</p>
        <p className="mt-0.5 truncate text-[11px] text-white/72">{status}</p>
      </div>

      <EndConversationButton
        websiteToken={websiteToken}
        canEndConversation={canEndConversation}
        hasEndConversationEnabled={hasEndConversationEnabled}
        onSuccess={onConversationEnded}
        onError={onError}
      />
    </header>
  );
};

export default Header;
