import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface StartNewConversationButtonProps {
  onStartNew: () => void;
  widgetColor?: string;
}

const StartNewConversationButton: React.FC<StartNewConversationButtonProps> = ({
  onStartNew,
  widgetColor = '#1f93ff',
}) => {
  const { t } = useLanguage('widget');
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onStartNew();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border-t bg-background p-3">
      <Button
        size="lg"
        onClick={handleClick}
        loading={isLoading}
        className="w-full text-white hover:opacity-90"
        style={{ backgroundColor: widgetColor, borderColor: widgetColor }}
      >
        <MessageSquarePlus />
        {isLoading ? t('startNewConversation.starting') : t('startNewConversation.button')}
      </Button>
    </div>
  );
};

export default StartNewConversationButton;
