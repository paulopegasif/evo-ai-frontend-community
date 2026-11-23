import { useLanguage } from '@/hooks/useLanguage';
import TransferRules, { TransferRule } from '@/pages/Customer/Agents/Agent/sections/TransferRules';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';

interface TransferRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: TransferRule[];
  onChange: (rules: TransferRule[]) => void;
  availableUsers?: Array<{ id: string; name: string }>;
  availableTeams?: Array<{ id: string; name: string }>;
}

export const TransferRulesModal = ({
  open,
  onOpenChange,
  rules,
  onChange,
  availableUsers,
  availableTeams,
}: TransferRulesModalProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {t('edit.configuration.transferRules.modalTitle') || 'Regras de Transferência'}
          </DialogTitle>
          <DialogDescription>
            {t('edit.configuration.transferRules.modalDescription') ||
              'Configure quando e como o agente deve transferir conversas para humanos ou times.'}
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <TransferRules
            rules={rules}
            onChange={onChange}
            availableUsers={availableUsers}
            availableTeams={availableTeams}
          />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
};
