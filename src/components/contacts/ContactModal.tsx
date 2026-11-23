import { useLanguage } from '@/hooks/useLanguage';
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Contact, ContactFormData } from '@/types/contacts';
import ContactForm from './ContactForm';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact;
  isNew?: boolean;
  loading?: boolean;
  onSubmit: (data: ContactFormData) => void;
}

export default function ContactModal({
  open,
  onOpenChange,
  contact,
  isNew = false,
  loading = false,
  onSubmit,
}: ContactModalProps) {
  const { t } = useLanguage('contacts');

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSubmit = (data: ContactFormData) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? t('form.title.new') : t('form.title.edit')}</DialogTitle>
        </DialogHeader>

        <DialogPanel>
          <ContactForm
            contact={contact}
            isNew={isNew}
            loading={loading}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
