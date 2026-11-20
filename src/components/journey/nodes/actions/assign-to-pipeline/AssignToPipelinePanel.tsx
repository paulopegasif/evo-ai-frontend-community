import { useEffect, useMemo, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Workflow } from 'lucide-react';
import { AssignToPipelineNodeData, AssignToPipelinePipelineOption } from './AssignToPipelineNode';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface AssignToPipelinePanelProps {
  nodeId: string;
  data: AssignToPipelineNodeData;
  onUpdate: (nodeId: string, newData: AssignToPipelineNodeData) => void;
  onClose: () => void;
}

export function AssignToPipelinePanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: AssignToPipelinePanelProps) {
  const { t } = useLanguage('journey');
  const [pipelineId, setPipelineId] = useState<string>(data.pipeline_id?.toString() || '');
  const [originalPipelineId] = useState<string>(() => data.pipeline_id?.toString() || '');
  const [pipelines, setPipelines] = useState<AssignToPipelinePipelineOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadPipelines = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await pipelinesService.getPipelines();
        const list = (response?.data || []).map(p => ({
          id: p.id.toString(),
          name: p.name,
        }));
        setPipelines(list);
      } catch (error) {
        console.error(t('panels.assignToPipeline.loadDataError'), error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadPipelines();
  }, []);

  const handleSave = () => {
    const selectedPipeline = pipelines.find(p => p.id === pipelineId);

    const updatedData: AssignToPipelineNodeData = {
      ...data,
      pipeline_id: pipelineId || '',
      pipeline_name: selectedPipeline?.name || '',
      formDataOptions: { pipelines },
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const dirty = useMemo(() => pipelineId !== originalPipelineId, [pipelineId, originalPipelineId]);
  const isValid = Boolean(pipelineId);

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.assignToPipeline.title')}
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
              <span>{t('panels.assignToPipeline.loadErrorBanner')}</span>
            </div>
          </FlowFeedbackBanner>
        )}
        <Field>
          <FieldLabel>
            {t('panels.assignToPipeline.pipeline')}
          </FieldLabel>
          <Select
            items={pipelines.map(pipeline => ({ value: pipeline.id, label: pipeline.name }))}
            value={pipelineId || null}
            onValueChange={value => setPipelineId(String(value ?? ''))}
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.assignToPipeline.pipeline')}
            >
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.assignToPipeline.loadingPipelines')
                    : t('panels.assignToPipeline.selectPipeline')
                }
              />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {pipelines.map(pipeline => (
                <SelectItem
                  key={pipeline.id}
                  value={pipeline.id}
                >
                  <div className="flex items-center gap-2">
                    <div className="size-8 rounded-md bg-flow-node-action-pipeline-bg text-flow-node-action-pipeline-fg flex items-center justify-center">
                      <Workflow className="size-4" />
                    </div>
                    <div className="font-medium">{pipeline.name}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>

          {!loading && pipelines.length === 0 && (
            <FieldDescription className="text-sm">
              {t('panels.assignToPipeline.noPipelinesFound')}
            </FieldDescription>
          )}
        </Field>

        {pipelineId && (
          <FlowFeedbackBanner variant="info">
            <div className="flex items-center gap-2">
              <Workflow className="size-4" />
              <span>
                {t('panels.assignToPipeline.conversationWillBeAssigned')}{' '}
                <strong>
                  {pipelines.find(p => p.id === pipelineId)?.name ||
                    `${t('panels.assignToPipeline.pipeline')} #${pipelineId}`}
                </strong>
                {' — '}
                {t('panels.assignToPipeline.replacesAnyPrevious')}
              </span>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
