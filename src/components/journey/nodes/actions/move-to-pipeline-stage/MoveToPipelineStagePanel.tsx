import { useEffect, useMemo, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Workflow } from '@/components/icons';
import {
  MoveToPipelineStageNodeData,
  MoveToPipelineStagePipelineOption,
  MoveToPipelineStageStageOption,
} from './MoveToPipelineStageNode';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface MoveToPipelineStagePanelProps {
  nodeId: string;
  data: MoveToPipelineStageNodeData;
  onUpdate: (nodeId: string, newData: MoveToPipelineStageNodeData) => void;
  onClose: () => void;
}

export function MoveToPipelineStagePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: MoveToPipelineStagePanelProps) {
  const { t } = useLanguage('journey');
  const [pipelineId, setPipelineId] = useState<string>(data.pipeline_id?.toString() || '');
  const [stageId, setStageId] = useState<string>(data.stage_id?.toString() || '');
  const [originalStageId] = useState<string>(() => data.stage_id?.toString() || '');
  const [pipelines, setPipelines] = useState<MoveToPipelineStagePipelineOption[]>([]);
  const [stages, setStages] = useState<MoveToPipelineStageStageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await pipelinesService.getPipelines();
        const list = (response?.data || []).map(p => ({ id: p.id.toString(), name: p.name }));
        setPipelines(list);
      } catch (error) {
        console.error(t('panels.moveToPipelineStage.loadDataError'), error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPipelines();
  }, []);

  useEffect(() => {
    if (!pipelineId) {
      setStages([]);
      return;
    }

    const loadStages = async () => {
      try {
        setLoadingStages(true);
        const response = await pipelinesService.getPipelineStages(pipelineId);
        const list = (response?.data || []).map(s => ({
          id: s.id.toString(),
          name: s.name,
          pipeline_id: pipelineId,
        }));
        setStages(list);
      } catch (error) {
        console.error(t('panels.moveToPipelineStage.loadStagesError'), error);
        setStages([]);
      } finally {
        setLoadingStages(false);
      }
    };

    loadStages();
  }, [pipelineId]);

  const handlePipelineChange = (value: string) => {
    setPipelineId(value);
    setStageId('');
  };

  const handleSave = () => {
    const selectedPipeline = pipelines.find(p => p.id === pipelineId);
    const selectedStage = stages.find(s => s.id === stageId);

    const updatedData: MoveToPipelineStageNodeData = {
      ...data,
      pipeline_id: pipelineId || '',
      pipeline_name: selectedPipeline?.name || '',
      stage_id: stageId || '',
      stage_name: selectedStage?.name || '',
      formDataOptions: { pipelines, stages },
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const dirty = useMemo(() => stageId !== originalStageId, [stageId, originalStageId]);
  const isValid = Boolean(stageId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.moveToPipelineStage.title')}
      icon={<Workflow className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        {loadError && (
          <FlowFeedbackBanner variant="error">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4" />
              <span>{t('panels.moveToPipelineStage.loadErrorBanner')}</span>
            </div>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>
            {t('panels.moveToPipelineStage.pipeline')}
          </FieldLabel>
          <Select
            items={pipelines.map(pipeline => ({ value: pipeline.id, label: pipeline.name }))}
            value={pipelineId || null}
            onValueChange={value => handlePipelineChange(String(value ?? ''))}
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.moveToPipelineStage.pipeline')}
            >
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.moveToPipelineStage.loadingPipelines')
                    : t('panels.moveToPipelineStage.selectPipeline')
                }
              />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {pipelines.map(pipeline => (
                <SelectItem
                  key={pipeline.id}
                  value={pipeline.id}
                >
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.moveToPipelineStage.stage')}
          </FieldLabel>
          <Select
            items={stages.map(stage => ({ value: stage.id, label: stage.name }))}
            value={stageId || null}
            onValueChange={value => setStageId(String(value ?? ''))}
            disabled={!pipelineId || loadingStages}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.moveToPipelineStage.stage')}
            >
              <SelectValue
                placeholder={
                  loadingStages
                    ? t('panels.moveToPipelineStage.loadingStages')
                    : t('panels.moveToPipelineStage.selectStage')
                }
              />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>

          {!loadingStages && pipelineId && stages.length === 0 && (
            <FieldDescription className="text-sm">
              {t('panels.moveToPipelineStage.noStagesFound')}
            </FieldDescription>
          )}
        </Field>

        {stageId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <Workflow className="size-4" />
              <span>
                {t('panels.moveToPipelineStage.conversationWillMove')}{' '}
                <strong>{stages.find(s => s.id === stageId)?.name}</strong>
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
