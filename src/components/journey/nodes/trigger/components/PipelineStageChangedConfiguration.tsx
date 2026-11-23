import { useEffect, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Workflow } from '@/components/icons';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { useLanguage } from '@/hooks/useLanguage';

export interface PipelineStageChangedSelection {
  pipelineId?: string;
  pipelineName?: string;
  fromStageId?: string;
  fromStageName?: string;
  toStageId?: string;
  toStageName?: string;
}

interface PipelineOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
}

interface PipelineStageChangedConfigurationProps {
  selection: PipelineStageChangedSelection;
  onChange: (next: PipelineStageChangedSelection) => void;
}

const ANY_STAGE_VALUE = '__any__';

export function PipelineStageChangedConfiguration({
  selection,
  onChange,
}: PipelineStageChangedConfigurationProps) {
  const { t } = useLanguage('journey');
  const [pipelines, setPipelines] = useState<PipelineOption[]>([]);
  const [stages, setStages] = useState<StageOption[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        setLoadingPipelines(true);
        setLoadError(false);
        const response = await pipelinesService.getPipelines();
        const list = (response?.data || []).map(p => ({
          id: p.id.toString(),
          name: p.name,
        }));
        setPipelines(list);
      } catch (error) {
        console.error(t('triggerComponents.pipelineStageChanged.loadError'), error);
        setLoadError(true);
      } finally {
        setLoadingPipelines(false);
      }
    };

    loadPipelines();
  }, []);

  useEffect(() => {
    if (!selection.pipelineId) {
      setStages([]);
      return;
    }

    let cancelled = false;
    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const response = await pipelinesService.getPipelineStages(selection.pipelineId!);
        if (cancelled) return;
        const list = (response?.data || []).map(s => ({
          id: s.id.toString(),
          name: s.name,
        }));
        setStages(list);
      } catch (error) {
        if (cancelled) return;
        console.error(t('triggerComponents.pipelineStageChanged.loadError'), error);
        setStages([]);
      } finally {
        if (!cancelled) setLoadingStages(false);
      }
    };

    loadStages();
    return () => {
      cancelled = true;
    };
  }, [selection.pipelineId]);

  const handlePipelineChange = (value: string) => {
    const pipeline = pipelines.find(p => p.id === value);
    onChange({
      pipelineId: value || undefined,
      pipelineName: pipeline?.name,
      fromStageId: undefined,
      fromStageName: undefined,
      toStageId: undefined,
      toStageName: undefined,
    });
  };

  const handleFromStageChange = (value: string) => {
    if (value === ANY_STAGE_VALUE) {
      onChange({ ...selection, fromStageId: undefined, fromStageName: undefined });
      return;
    }
    const stage = stages.find(s => s.id === value);
    onChange({ ...selection, fromStageId: value || undefined, fromStageName: stage?.name });
  };

  const handleToStageChange = (value: string) => {
    if (value === ANY_STAGE_VALUE) {
      onChange({ ...selection, toStageId: undefined, toStageName: undefined });
      return;
    }
    const stage = stages.find(s => s.id === value);
    onChange({ ...selection, toStageId: value || undefined, toStageName: stage?.name });
  };

  const pipelineItems = pipelines.map(p => ({ value: p.id, label: p.name }));
  const stageItems = [
    { value: ANY_STAGE_VALUE, label: t('triggerComponents.pipelineStageChanged.anyStage') },
    ...stages.map(s => ({ value: s.id, label: s.name })),
  ];

  const noFilters = !selection.pipelineId && !selection.fromStageId && !selection.toStageId;

  return (
    <div className="space-y-4">
      {loadError && (
        <FlowFeedbackBanner variant="error">
          <span>{t('triggerComponents.pipelineStageChanged.loadErrorBanner')}</span>
        </FlowFeedbackBanner>
      )}

      <Field>
        <FieldLabel>
          {t('triggerComponents.pipelineStageChanged.pipeline')}
        </FieldLabel>
        <Select
          items={pipelineItems}
          value={selection.pipelineId || null}
          onValueChange={v => handlePipelineChange(String(v ?? ''))}
          disabled={loadingPipelines}
        >
          <SelectTrigger
            className="w-full"
            aria-label={t('triggerComponents.pipelineStageChanged.pipeline')}
          >
            <SelectValue
              placeholder={
                loadingPipelines
                  ? t('triggerComponents.pipelineStageChanged.loadingPipelines')
                  : t('triggerComponents.pipelineStageChanged.selectPipeline')
              }
            />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            {pipelines.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        {!loadingPipelines && pipelines.length === 0 && !loadError && (
          <FieldDescription>
            {t('triggerComponents.pipelineStageChanged.noPipelinesFound')}
          </FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel>
          {t('triggerComponents.pipelineStageChanged.fromStage')}
        </FieldLabel>
        <Select
          value={selection.fromStageId || ANY_STAGE_VALUE}
          items={stageItems}
          onValueChange={v => handleFromStageChange(String(v ?? ''))}
          disabled={!selection.pipelineId || loadingStages}
        >
          <SelectTrigger
            className="w-full"
            aria-label={t('triggerComponents.pipelineStageChanged.fromStage')}
          >
            <SelectValue
              placeholder={
                loadingStages
                  ? t('triggerComponents.pipelineStageChanged.loadingStages')
                  : t('triggerComponents.pipelineStageChanged.anyStage')
              }
            />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            <SelectItem value={ANY_STAGE_VALUE}>
              {t('triggerComponents.pipelineStageChanged.anyStage')}
            </SelectItem>
            {stages.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      <Field>
        <FieldLabel>
          {t('triggerComponents.pipelineStageChanged.toStage')}
        </FieldLabel>
        <Select
          value={selection.toStageId || ANY_STAGE_VALUE}
          items={stageItems}
          onValueChange={v => handleToStageChange(String(v ?? ''))}
          disabled={!selection.pipelineId || loadingStages}
        >
          <SelectTrigger
            className="w-full"
            aria-label={t('triggerComponents.pipelineStageChanged.toStage')}
          >
            <SelectValue
              placeholder={
                loadingStages
                  ? t('triggerComponents.pipelineStageChanged.loadingStages')
                  : t('triggerComponents.pipelineStageChanged.anyStage')
              }
            />
          </SelectTrigger>
          <SelectPopup alignItemWithTrigger={false}>
            <SelectItem value={ANY_STAGE_VALUE}>
              {t('triggerComponents.pipelineStageChanged.anyStage')}
            </SelectItem>
            {stages.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Field>

      {noFilters ? (
        <FlowFeedbackBanner variant="info">
          <div className="flex items-center gap-2">
            <Workflow className="size-4" />
            <span>{t('triggerComponents.pipelineStageChanged.anyStageTransition')}</span>
          </div>
        </FlowFeedbackBanner>
      ) : (
        <FlowFeedbackBanner variant="info">
          <div className="flex items-center gap-2">
            <Workflow className="size-4" />
            <span>
              {t('triggerComponents.pipelineStageChanged.summary', {
                pipeline: selection.pipelineName || t('triggerComponents.pipelineStageChanged.anyPipeline'),
                from: selection.fromStageName || t('triggerComponents.pipelineStageChanged.anyStage'),
                to: selection.toStageName || t('triggerComponents.pipelineStageChanged.anyStage'),
              })}
            </span>
          </div>
        </FlowFeedbackBanner>
      )}
    </div>
  );
}
