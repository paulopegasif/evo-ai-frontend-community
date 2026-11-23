import { useEffect, useMemo, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardList, AlertCircle } from '@/components/icons';
import {
  CreatePipelineTaskNodeData,
  CreatePipelineTaskAgentOption,
  CreatePipelineTaskDueDate,
} from './CreatePipelineTaskNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface CreatePipelineTaskPanelProps {
  nodeId: string;
  data: CreatePipelineTaskNodeData;
  onUpdate: (nodeId: string, newData: CreatePipelineTaskNodeData) => void;
  onClose: () => void;
}

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// Mirrors the PipelineTask `task_type` enum in the CRM
// (call/email/meeting/follow_up/note/other). The executor forwards this value
// verbatim and the CRM defaults to `call` when blank, so we default the same.
const TASK_TYPES = ['call', 'email', 'meeting', 'follow_up', 'note', 'other'];
const DEFAULT_TASK_TYPE = 'call';

const DUE_PRESETS: { key: string; due: CreatePipelineTaskDueDate | null }[] = [
  { key: 'none', due: null },
  { key: 'in1h', due: { value: 1, unit: 'hours' } },
  { key: 'in4h', due: { value: 4, unit: 'hours' } },
  { key: 'in1d', due: { value: 1, unit: 'days' } },
  { key: 'in3d', due: { value: 3, unit: 'days' } },
  { key: 'in1w', due: { value: 7, unit: 'days' } },
];

const dueKey = (due?: CreatePipelineTaskDueDate | null): string =>
  DUE_PRESETS.find(p => p.due?.value === due?.value && p.due?.unit === due?.unit)?.key || 'none';

export function CreatePipelineTaskPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
}: CreatePipelineTaskPanelProps) {
  const { t } = useLanguage('journey');
  const [title, setTitle] = useState<string>(data.title || '');
  const [description, setDescription] = useState<string>(data.description || '');
  const [taskType, setTaskType] = useState<string>(data.task_type || DEFAULT_TASK_TYPE);
  const [assignedToId, setAssignedToId] = useState<string>(data.assigned_to_id?.toString() || '');
  const [priority, setPriority] = useState<string>(data.priority || 'medium');
  const [duePreset, setDuePreset] = useState<string>(dueKey(data.due_date));
  const [agents, setAgents] = useState<CreatePipelineTaskAgentOption[]>(
    data.formDataOptions?.agents || [],
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const formData = await automationService.getFormData();
        setAgents(formData.agents || []);
      } catch (error) {
        console.error(t('panels.createPipelineTask.loadDataError'), error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const due = DUE_PRESETS.find(p => p.key === duePreset)?.due ?? null;
    const selectedAgent = agents.find(a => a.id.toString() === assignedToId);

    const updatedData: CreatePipelineTaskNodeData = {
      ...data,
      title: title.trim(),
      description: description.trim() || undefined,
      task_type: taskType,
      priority,
      assigned_to_id: assignedToId || undefined,
      assigned_to_name: selectedAgent?.name || undefined,
      due_date: due,
      formDataOptions: { agents },
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  const isValid = title.trim().length > 0;
  const dirty = useMemo(
    () =>
      title.trim() !== (data.title || '') ||
      description.trim() !== (data.description || '') ||
      taskType !== (data.task_type || DEFAULT_TASK_TYPE) ||
      assignedToId !== (data.assigned_to_id?.toString() || '') ||
      priority !== (data.priority || 'medium') ||
      duePreset !== dueKey(data.due_date),
    [title, description, taskType, assignedToId, priority, duePreset, data],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.createPipelineTask.title')}
      icon={<ClipboardList className="h-5 w-5 text-flow-node-action-pipeline-fg" />}
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
              <span>{t('panels.createPipelineTask.loadErrorBanner')}</span>
            </div>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.taskTitle')}
          </FieldLabel>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('panels.createPipelineTask.taskTitlePlaceholder')}
            className="w-full"
            aria-label={t('panels.createPipelineTask.taskTitle')}
          />
          <FieldDescription>{t('panels.createPipelineTask.variablesHint')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.description')}
          </FieldLabel>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('panels.createPipelineTask.descriptionPlaceholder')}
            className="w-full"
          />
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.taskType')}
          </FieldLabel>
          <Select
            items={TASK_TYPES.map(type => ({
              value: type,
              label: t(`panels.createPipelineTask.taskTypes.${type}`),
            }))}
            value={taskType || null}
            onValueChange={value => setTaskType(String(value ?? ''))}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.createPipelineTask.taskType')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {TASK_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {t(`panels.createPipelineTask.taskTypes.${type}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.assignee')}
          </FieldLabel>
          <Select
            items={agents.map(agent => ({ value: agent.id.toString(), label: agent.name }))}
            value={assignedToId || null}
            onValueChange={value => setAssignedToId(String(value ?? ''))}
            disabled={loading}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.createPipelineTask.assignee')}
            >
              <SelectValue placeholder={t('panels.createPipelineTask.noAssignee')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {agents.map(agent => (
                <SelectItem
                  key={agent.id}
                  value={agent.id.toString()}
                >
                  {agent.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.dueDate')}
          </FieldLabel>
          <Select
            items={DUE_PRESETS.map(preset => ({
              value: preset.key,
              label: t(`panels.createPipelineTask.due.${preset.key}`),
            }))}
            value={duePreset || null}
            onValueChange={value => setDuePreset(String(value ?? ''))}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.createPipelineTask.dueDate')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {DUE_PRESETS.map(preset => (
                <SelectItem
                  key={preset.key}
                  value={preset.key}
                >
                  {t(`panels.createPipelineTask.due.${preset.key}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.createPipelineTask.priority')}
          </FieldLabel>
          <Select
            items={PRIORITIES.map(p => ({
              value: p,
              label: t(`panels.createPipelineTask.priorities.${p}`),
            }))}
            value={priority || null}
            onValueChange={value => setPriority(String(value ?? ''))}
          >
            <SelectTrigger
              className="w-full"
              aria-label={t('panels.createPipelineTask.priority')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {PRIORITIES.map(p => (
                <SelectItem key={p} value={p}>
                  {t(`panels.createPipelineTask.priorities.${p}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>
      </div>
    </NodeConfigModal>
  );
}
