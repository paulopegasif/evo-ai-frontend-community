import { PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/useLanguage';

interface ConnectionTestProps {
  onTest: () => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
  className?: string;
}

export const ConnectionTest = ({ onTest, isLoading, disabled = false, className }: ConnectionTestProps) => {
  const { t } = useLanguage('channels');
  return (
    <Button
      variant="outline"
      onClick={onTest}
      disabled={disabled || isLoading}
      loading={isLoading}
      className={className}
    >
      {!isLoading && <PlugZap />}
      {isLoading ? t('newChannel.buttons.testing') : t('newChannel.buttons.testConnection')}
    </Button>
  );
};
