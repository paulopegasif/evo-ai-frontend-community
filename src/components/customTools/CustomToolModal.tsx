import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { CustomTool, CustomToolFormData } from '@/types/ai';
import CustomToolForm from './CustomToolForm';

interface CustomToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: CustomTool;
  /**
   * Edit or view existing tools. Create flow is handled by the standalone
   * wizard page at `/agents/custom-tools/new` (see CustomToolWizardModal embedded mode).
   */
  mode?: 'edit' | 'view';
  loading?: boolean;
  onSubmit: (data: CustomToolFormData) => void;
}

export default function CustomToolModal({
  open,
  onOpenChange,
  tool,
  mode = 'edit',
  loading = false,
  onSubmit,
}: CustomToolModalProps) {
  const { t } = useLanguage('customTools');

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view'
              ? tool?.name
                ? t('modal.title.view', { name: tool.name })
                : t('modal.title.viewFallback')
              : tool?.name
                ? t('modal.title.edit', { name: tool.name })
                : t('modal.title.editFallback')}
          </DialogTitle>
        </DialogHeader>

        <DialogPanel>
          <CustomToolForm
            tool={tool}
            mode={mode}
            loading={loading}
            onSubmit={onSubmit}
            onCancel={handleCancel}
          />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
