import { Dialog, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import NewChannel from './index';

interface NewChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Pre-selects the channel (by `id` in getChannelTypes), opening the modal at
   * the provider step (multi-provider channels) or straight at the config screen
   * (single-provider channels). Omit to open at the channel grid.
   */
  initialChannelId?: string;
}

/**
 * Modal host for the Connect / New Channel flow. Wraps the embedded NewChannel
 * (compact layout, `onExit` closes the modal instead of navigating).
 *
 * NewChannel is only rendered while `open` is true so that closing the modal
 * unmounts it — its cleanup effects must run (e.g. Evolution Go provisions a
 * remote instance during "test connection" and deletes it on unmount; merely
 * hiding the modal would orphan that instance).
 */
export default function NewChannelModal({
  open,
  onOpenChange,
  initialChannelId,
}: NewChannelModalProps) {
  const { t } = useLanguage('channels');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        bottomStickOnMobile={false}
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">{t('newChannel.configureTitle')}</DialogTitle>
        {open && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <NewChannel
              initialChannelId={initialChannelId}
              onExit={() => onOpenChange(false)}
            />
          </div>
        )}
      </DialogPopup>
    </Dialog>
  );
}
