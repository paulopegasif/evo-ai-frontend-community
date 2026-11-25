import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { CircleDollarSign } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import RecordSaleDialog from './RecordSaleDialog';

interface RecordSaleButtonProps {
  conversationId?: string | number | null;
  contactId?: string | number | null;
}

/** "Registrar venda" action for the open conversation (icon-only below md). */
export default function RecordSaleButton({ conversationId, contactId }: RecordSaleButtonProps) {
  const { t } = useLanguage('dailyPanel');
  const [open, setOpen] = useState(false);
  const label = t('recordSale.button');

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label={label}
              onClick={() => setOpen(true)}
              data-testid="record-sale-button"
            />
          }
        >
          <CircleDollarSign aria-hidden />
          <span className="hidden lg:inline">{label}</span>
        </TooltipTrigger>
        <TooltipPopup>{label}</TooltipPopup>
      </Tooltip>
      <RecordSaleDialog
        open={open}
        onOpenChange={setOpen}
        conversationId={conversationId}
        contactId={contactId}
      />
    </>
  );
}
