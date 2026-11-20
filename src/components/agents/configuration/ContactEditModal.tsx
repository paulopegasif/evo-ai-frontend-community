import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import ContactEditRules, {
  ContactEditConfig,
} from '@/pages/Customer/Agents/Agent/sections/ContactEditRules';

interface ContactEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ContactEditConfig;
  onChange: (config: ContactEditConfig) => void;
}

const ContactEditModal = ({ open, onOpenChange, config, onChange }: ContactEditModalProps) => {
  const { t } = useLanguage('aiAgents');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('edit.configuration.contactEdit.modalTitle')}</DialogTitle>
        </DialogHeader>
        <DialogPanel>
          <ContactEditRules config={config} onChange={onChange} />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
};

export default ContactEditModal;
