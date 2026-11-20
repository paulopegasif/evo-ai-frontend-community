import { TriangleAlert } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Pipeline } from '@/types/analytics';

interface DeletePipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
  onConfirm: () => void;
  loading: boolean;
}

export default function DeletePipelineModal({ open, onOpenChange, pipeline, onConfirm, loading }: DeletePipelineModalProps) {
  const { t } = useLanguage('pipelines');

  if (!pipeline) return null;

  const itemCount = pipeline.item_count || 0;
  const stageCount = pipeline.stages?.length || 0;
  const hasItems = itemCount > 0;
  const plural = (n: number) => (n !== 1 ? 's' : '');

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('deletePipeline.title')}
      description={
        <>
          {t('deletePipeline.confirmMessage')} <span className="font-medium text-foreground">"{pipeline.name}"</span>?{' '}
          {t('deletePipeline.description')}
        </>
      }
      cancelLabel={t('deletePipeline.cancel')}
      confirmLabel={t('deletePipeline.delete')}
      onConfirm={onConfirm}
      loading={loading}
    >
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-3 divide-x rounded-lg border bg-muted/48 text-sm">
          <div className="px-3 py-2">
            <dt className="text-muted-foreground text-xs">{t('deletePipeline.info.conversations')}</dt>
            <dd className="font-semibold tabular-nums">{itemCount}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-muted-foreground text-xs">{t('deletePipeline.info.stages')}</dt>
            <dd className="font-semibold tabular-nums">{stageCount}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className="text-muted-foreground text-xs">{t('deletePipeline.info.type')}</dt>
            <dd className="truncate font-semibold">{pipeline.pipeline_type}</dd>
          </div>
        </dl>

        {hasItems ? (
          <Alert variant="error">
            <TriangleAlert />
            <AlertTitle>{t('deletePipeline.warningTitle')}</AlertTitle>
            <AlertDescription>
              <p>{t('deletePipeline.warningMessage', { count: itemCount, plural: plural(itemCount) })}</p>
              <p className="text-xs">{t('deletePipeline.note')}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-muted-foreground text-sm">{t('deletePipeline.safeToDelete')}</p>
        )}

        <div className="text-muted-foreground text-sm">
          <span className="font-medium text-foreground">{t('deletePipeline.willDelete')}</span>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>{t('deletePipeline.effects.remove')}</li>
            <li>{t('deletePipeline.effects.deleteStages', { count: stageCount, plural: plural(stageCount) })}</li>
            {hasItems && (
              <li>{t('deletePipeline.effects.removeConversations', { count: itemCount, plural: plural(itemCount) })}</li>
            )}
            <li>{t('deletePipeline.effects.deleteHistory')}</li>
            <li>{t('deletePipeline.effects.invalidateReports')}</li>
          </ul>
        </div>
      </div>
    </ConfirmDialog>
  );
}
