import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { refreshGlobalConfig } from '@/contexts/GlobalConfigContext';
import { useLanguage } from '@/hooks/useLanguage';

interface ClearConfigButtonProps {
  configType: string;
  configLabel: string;
  onCleared?: () => void;
}

export const ClearConfigButton = ({ configType, configLabel, onCleared }: ClearConfigButtonProps) => {
  const { t } = useLanguage('adminSettings');
  const [isClearing, setIsClearing] = useState(false);
  const [open, setOpen] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await adminConfigService.clearConfig(configType);
      await refreshGlobalConfig();
      toast.success(
        t('clearConfig.success', { config: configLabel }) ||
          `${configLabel} configuration cleared successfully`,
      );
      setOpen(false);
      onCleared?.();
    } catch (error) {
      console.error('Error clearing config:', error);
      toast.error(
        t('clearConfig.error', { config: configLabel }) ||
          `Failed to clear ${configLabel} configuration`,
      );
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <Button type="button" variant="destructive-outline" onClick={() => setOpen(true)}>
        <Trash2 />
        {t('clearConfig.button', 'Clear Configuration')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('clearConfig.dialogTitle', 'Clear Configuration')}
        description={
          t('clearConfig.dialogDescription', { config: configLabel }) ||
          `Are you sure? This will remove all ${configLabel} credentials. The provider will stop working until you reconfigure it.`
        }
        cancelLabel={t('clearConfig.cancel', 'Cancel')}
        confirmLabel={isClearing ? t('clearConfig.clearing', 'Clearing...') : t('clearConfig.confirm', 'Clear')}
        onConfirm={handleClear}
        loading={isClearing}
      />
    </>
  );
};
