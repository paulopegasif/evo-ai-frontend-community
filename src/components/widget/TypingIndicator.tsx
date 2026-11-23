import React from 'react';
import { useLanguage } from '@/hooks/useLanguage';

interface TypingIndicatorProps {
  isVisible: boolean;
  avatarUrl?: string;
  agentName?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible, avatarUrl, agentName = 'Atendente' }) => {
  const { t } = useLanguage('widget');
  if (!isVisible) return null;

  return (
    <div className="fade-in flex animate-in items-end gap-2 px-3 pb-2 duration-200" aria-live="polite">
      <img
        src={avatarUrl || '/default-avatar.png'}
        alt=""
        className="size-6 shrink-0 rounded-full object-cover ring-1 ring-border"
      />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-3 py-2 shadow-xs/5">
          <span className="text-muted-foreground text-xs">{t('typing.typing', { name: agentName })}</span>
          <span className="flex gap-1" aria-hidden="true">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="size-1.5 animate-bounce rounded-full bg-muted-foreground/64"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        </div>
        <span className="ps-1 text-[10px] text-muted-foreground">{t('typing.now')}</span>
      </div>
    </div>
  );
};

export default TypingIndicator;
