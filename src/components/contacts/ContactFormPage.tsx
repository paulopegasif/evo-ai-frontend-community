import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ContactDetailsCard from './ContactDetailsCard';
import type { ContactFormData } from '@/types/contacts';

interface ContactFormPageProps {
  loading?: boolean;
  onSubmit: (data: ContactFormData) => void | Promise<void>;
  onClose: () => void;
}

/** "/contacts/new" — full page hosting just the (empty, editable) details card, no
 *  Pipeline/Notes/Journey columns (they only make sense once the contact exists). */
export default function ContactFormPage({ loading, onSubmit, onClose }: ContactFormPageProps) {
  const { t } = useLanguage('contacts');

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="flex items-center gap-3 pb-6">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('details.page.back')} />}
          >
            <ArrowLeft />
          </TooltipTrigger>
          <TooltipPopup>{t('details.page.back')}</TooltipPopup>
        </Tooltip>
        <h1 className="truncate font-semibold text-xl md:text-2xl">{t('form.title.new')}</h1>
      </div>

      <div className="w-full max-w-2xl pb-4">
        <ContactDetailsCard isNew loading={loading} onSave={onSubmit} onCancelNew={onClose} />
      </div>
    </div>
  );
}
