import { useLanguage } from '@/hooks/useLanguage';
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import PipelineAutomation, {
  PipelineAutomationConfig,
} from '@/pages/Customer/Agents/Agent/sections/PipelineAutomation';

interface PipelineAutomationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: PipelineAutomationConfig[];
  onChange: (rules: PipelineAutomationConfig[]) => void;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
}

const PipelineAutomationModal = ({
  open,
  onOpenChange,
  rules,
  onChange,
  availablePipelines = [],
}: PipelineAutomationModalProps) => {
  const { t } = useLanguage('aiAgents');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{t('edit.configuration.pipelineAutomation.modalTitle')}</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <PipelineAutomation
            rules={rules}
            onChange={onChange}
            availablePipelines={availablePipelines}
          />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
};

export default PipelineAutomationModal;
