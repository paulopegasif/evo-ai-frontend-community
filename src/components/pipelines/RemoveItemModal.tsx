import { useLanguage } from '@/hooks/useLanguage';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { PipelineItem } from '@/types/analytics';

interface RemoveItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PipelineItem | null;
  onConfirm: () => void;
  loading: boolean;
}

export default function RemoveItemModal({ open, onOpenChange, item, onConfirm, loading }: RemoveItemModalProps) {
  const { t } = useLanguage('pipelines');

  if (!item) return null;

  const displayName =
    item.type === 'contact' || !item.conversation
      ? item.contact?.name || t('removeItem.unknownUser')
      : item.conversation?.contact?.name || t('removeItem.unknownUser');
  const displayId = item.type === 'conversation' && item.conversation ? item.conversation.display_id : item.id;
  const status = item.type === 'conversation' && item.conversation ? item.conversation.status || 'N/A' : 'N/A';
  const inbox = item.type === 'conversation' ? item.conversation?.inbox?.name : undefined;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('removeItem.title')}
      description={t('removeItem.note')}
      cancelLabel={t('removeItem.cancel')}
      confirmLabel={t('removeItem.remove')}
      onConfirm={onConfirm}
      loading={loading}
    >
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 rounded-lg border bg-muted/48 p-3 text-sm">
        <dt className="text-muted-foreground">{t('removeItem.contact')}</dt>
        <dd className="truncate font-medium">{displayName}</dd>
        <dt className="text-muted-foreground">{t('removeItem.id')}</dt>
        <dd className="tabular-nums">#{displayId}</dd>
        <dt className="text-muted-foreground">{t('removeItem.status')}</dt>
        <dd>{status}</dd>
        {inbox && (
          <>
            <dt className="text-muted-foreground">{t('removeItem.inbox')}</dt>
            <dd className="truncate">{inbox}</dd>
          </>
        )}
      </dl>
    </ConfirmDialog>
  );
}
