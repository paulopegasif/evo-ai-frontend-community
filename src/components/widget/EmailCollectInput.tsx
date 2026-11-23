import { useState } from 'react';
import { CircleCheck } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { widgetService } from '@/services/widget/widgetService';

interface EmailCollectInputProps {
  messageId: string | number;
  widgetColor: string;
  onSubmitted?: (email: string) => void;
  alreadySubmitted?: boolean;
}

export const EmailCollectInput = ({
  messageId,
  widgetColor,
  onSubmitted,
  alreadySubmitted = false,
}: EmailCollectInputProps) => {
  const { t } = useLanguage('widget');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(alreadySubmitted);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async () => {
    if (!validateEmail(email)) {
      setError(t('emailCollect.invalidEmail'));
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('website_token') || '';
      if (!token) {
        setError(t('emailCollect.error'));
        return;
      }

      await widgetService.updateMessage(token, messageId, email);
      setIsSubmitted(true);
      onSubmitted?.(email);
    } catch {
      setError(t('emailCollect.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/24 bg-success/8 px-3 py-2 text-sm text-success-foreground">
        <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
        <span>{t('emailCollect.success')}</span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSubmit();
          }}
          placeholder={t('emailCollect.placeholder')}
          aria-label={t('emailCollect.placeholder')}
          aria-invalid={error ? true : undefined}
          disabled={isSubmitting}
          className="flex-1"
        />
        <Button
          onClick={handleSubmit}
          disabled={!email}
          loading={isSubmitting}
          className="shrink-0 text-white hover:opacity-90"
          style={{ backgroundColor: widgetColor, borderColor: widgetColor }}
        >
          {t('emailCollect.button')}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive-foreground text-xs">
          {error}
        </p>
      )}
    </div>
  );
};
