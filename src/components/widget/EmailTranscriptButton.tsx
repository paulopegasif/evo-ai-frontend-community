import React, { useState } from 'react';
import { widgetService } from '@/services/widget/widgetService';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface EmailTranscriptButtonProps {
  websiteToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  widgetColor?: string;
}

const EmailTranscriptButton: React.FC<EmailTranscriptButtonProps> = ({
  websiteToken,
  onSuccess,
  onError,
  disabled = false,
  widgetColor = '#00d4aa',
}) => {
  const { t } = useLanguage('widget');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendTranscript = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      await widgetService.sendEmailTranscript(websiteToken);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="xs"
      onClick={handleSendTranscript}
      disabled={disabled}
      loading={isLoading}
      style={disabled ? undefined : { color: widgetColor }}
    >
      <Mail />
      {isLoading ? t('emailTranscript.sending') : t('emailTranscript.button')}
    </Button>
  );
};

export default EmailTranscriptButton;
