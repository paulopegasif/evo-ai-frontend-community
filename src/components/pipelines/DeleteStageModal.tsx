import { TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { PipelineStage } from '@/types/analytics';

interface DeleteStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: PipelineStage | null;
  itemCount?: number;
  onConfirm: () => void;
  loading: boolean;
}

export default function DeleteStageModal({
  open,
  onOpenChange,
  stage,
  itemCount = 0,
  onConfirm,
  loading,
}: DeleteStageModalProps) {
  const { t } = useLanguage('pipelines');

  if (!stage) return null;

  const hasConversations = itemCount > 0;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('deleteStage.title')}
      description={
        <>
          {t('deleteStage.confirmMessage')} <span className="font-medium text-foreground">"{stage.name}"</span>?{' '}
          {t('deleteStage.description')}
        </>
      }
      cancelLabel={t('deleteStage.cancel')}
      confirmLabel={t('deleteStage.delete')}
      onConfirm={onConfirm}
      loading={loading}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5 rounded-lg border bg-muted/48 px-3 py-2">
          <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{stage.name}</div>
            {stage.description && <div className="truncate text-muted-foreground text-xs">{stage.description}</div>}
          </div>
        </div>

        {hasConversations ? (
          <Alert variant="error">
            <TriangleAlert />
            <AlertTitle>{t('deleteStage.warningTitle')}</AlertTitle>
            <AlertDescription>
              {t('deleteStage.warningMessage', {
                count: itemCount,
                plural: itemCount !== 1 ? 's' : '',
                pronoun: itemCount !== 1 ? 'elas' : 'ela',
                verbPlural: itemCount !== 1 ? 'ão' : '',
              })}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground text-sm">{t('deleteStage.safeToDelete')}</p>
        )}

        <div className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{t('deleteStage.important')}</span>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>{t('deleteStage.effects.remove')}</li>
            {hasConversations && <li>{t('deleteStage.effects.removeConversations')}</li>}
            <li>{t('deleteStage.effects.reorder')}</li>
          </ul>
        </div>
      </div>
    </ConfirmDialog>
  );
}
