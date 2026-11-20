import { useLanguage } from '@/hooks/useLanguage';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface IntegrationBackButtonProps {
  onBack?: () => void;
}

export default function IntegrationBackButton({ onBack }: IntegrationBackButtonProps) {
  const { t } = useLanguage('integrations');

  if (!onBack) return null;

  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="w-fit">
      <ArrowLeft />
      {t('actions.backToIntegrations')}
    </Button>
  );
}
