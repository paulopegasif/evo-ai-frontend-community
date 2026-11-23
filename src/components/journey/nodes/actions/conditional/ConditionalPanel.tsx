import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { GitBranch, Plus, Trash2, Copy } from 'lucide-react';
import {
  ConditionalNodeData,
  ConditionalPath,
  Condition,
  PIPELINE_STAGE_FIELD,
} from './ConditionalNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { VariableInput, VariableSelect } from '@/components/journey/environment-manager';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { isBalancedExpression } from '@/utils/templateVariables';

const PIPELINE_STAGE_OPERATORS = ['equals', 'not_equals'];

interface StageOption {
  id: string;
  label: string;
}

interface ConditionalPanelProps {
  nodeId: string;
  data: ConditionalNodeData;
  onUpdate: (nodeId: string, newData: ConditionalNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function ConditionalPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: ConditionalPanelProps) {
  const { t } = useLanguage('journey');
  const initialFormData: ConditionalNodeData = {
    ...data,
    paths: data.paths || [],
  };
  const [originalData] = useState<ConditionalNodeData>(() => initialFormData);
  const [formData, setFormData] = useState<ConditionalNodeData>(initialFormData);

  const OPERATORS = [
    { value: 'equals', label: t('panels.conditional.operators.equals') },
    { value: 'not_equals', label: t('panels.conditional.operators.notEquals') },
    { value: 'greater_than', label: t('panels.conditional.operators.greaterThan') },
    { value: 'less_than', label: t('panels.conditional.operators.lessThan') },
    { value: 'contains', label: t('panels.conditional.operators.contains') },
    { value: 'not_contains', label: t('panels.conditional.operators.notContains') },
    { value: 'starts_with', label: t('panels.conditional.operators.startsWith') },
    { value: 'ends_with', label: t('panels.conditional.operators.endsWith') },
    { value: 'is_empty', label: t('panels.conditional.operators.isEmpty') },
    { value: 'is_not_empty', label: t('panels.conditional.operators.isNotEmpty') },
  ];

  const PATH_COLORS = [
    { value: 'green', label: t('panels.conditional.colors.green'), hex: '#10b981' },
    { value: 'blue', label: t('panels.conditional.colors.blue'), hex: '#3b82f6' },
    { value: 'purple', label: t('panels.conditional.colors.purple'), hex: '#8b5cf6' },
    { value: 'orange', label: t('panels.conditional.colors.orange'), hex: '#f97316' },
    { value: 'yellow', label: t('panels.conditional.colors.yellow'), hex: '#eab308' },
  ];

  const colorItems = PATH_COLORS.map(color => ({
    value: color.value,
    label: (
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-full" style={{ backgroundColor: color.hex }} />
        {color.label}
      </span>
    ),
  }));

  const logicalOperatorItems = [
    { value: 'AND', label: t('panels.conditional.andAll') },
    { value: 'OR', label: t('panels.conditional.orAny') },
  ];

  const [activePathId, setActivePathId] = useState<string>('');
  const [stageOptions, setStageOptions] = useState<StageOption[]>([]);

  useEffect(() => {
    setFormData({
      ...data,
      paths: data.paths || [],
    });

    if (data.paths && data.paths.length > 0) {
      setActivePathId(data.paths[0].id);
    }
  }, [data]);

  const hasPipelineStageCondition = useMemo(
    () =>
      formData.paths.some(path =>
        path.conditions.some(condition => condition.field === PIPELINE_STAGE_FIELD),
      ),
    [formData.paths],
  );

  useEffect(() => {
    if (!hasPipelineStageCondition || stageOptions.length > 0) return;

    let cancelled = false;
    (async () => {
      try {
        const pipelinesResponse = await pipelinesService.getPipelines();
        const pipelines = pipelinesResponse?.data ?? [];

        const stagesByPipeline = await Promise.all(
          pipelines.map(async pipeline => {
            const stagesResponse = await pipelinesService.getPipelineStages(pipeline.id);
            return (stagesResponse?.data ?? []).map(stage => ({
              id: stage.id,
              label: `[${pipeline.name}] ${stage.name}`,
            }));
          }),
        );

        if (!cancelled) setStageOptions(stagesByPipeline.flat());
      } catch {
        // Stage picker stays empty on failure; reopening the panel retries.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasPipelineStageCondition, stageOptions.length]);

  const handleSave = () => {
    // Save is gated by saveDisabled below; this guard is defense-in-depth.
    if (hasInvalidExpression) return;
    onUpdate(nodeId, formData);
    onClose();
  };

  const addPath = () => {
    const newPath: ConditionalPath = {
      id: uuidv4(),
      name: t('panels.conditional.pathNumber', { number: formData.paths.length + 1 }),
      color: PATH_COLORS[formData.paths.length % PATH_COLORS.length].value,
      logicalOperator: 'AND',
      conditions: [],
    };

    setFormData(prev => ({
      ...prev,
      paths: [...prev.paths, newPath],
    }));

    setActivePathId(newPath.id);
  };

  const updatePath = (pathId: string, updates: Partial<ConditionalPath>) => {
    setFormData(prev => ({
      ...prev,
      paths: prev.paths.map(path => (path.id === pathId ? { ...path, ...updates } : path)),
    }));
  };

  const removePath = (pathId: string) => {
    setFormData(prev => ({
      ...prev,
      paths: prev.paths.filter(path => path.id !== pathId),
    }));

    if (activePathId === pathId && formData.paths.length > 1) {
      const remainingPaths = formData.paths.filter(p => p.id !== pathId);
      if (remainingPaths.length > 0) {
        setActivePathId(remainingPaths[0].id);
      }
    }
  };

  const duplicatePath = (pathId: string) => {
    const pathToDuplicate = formData.paths.find(p => p.id === pathId);
    if (pathToDuplicate) {
      const newPath: ConditionalPath = {
        ...pathToDuplicate,
        id: uuidv4(),
        name: `${pathToDuplicate.name} (${t('actions.duplicate')})`,
        conditions: pathToDuplicate.conditions.map(c => ({
          ...c,
          id: uuidv4(),
        })),
      };

      setFormData(prev => ({
        ...prev,
        paths: [...prev.paths, newPath],
      }));

      setActivePathId(newPath.id);
    }
  };

  const addCondition = (pathId: string, type: 'trigger' | 'contact' | 'system' | 'custom') => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    const newCondition: Condition = {
      id: uuidv4(),
      type,
      field: '',
      operator: 'equals',
      value: '',
    };

    updatePath(pathId, {
      conditions: [...path.conditions, newCondition],
    });
  };

  const updateCondition = (pathId: string, conditionId: string, updates: Partial<Condition>) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    updatePath(pathId, {
      conditions: path.conditions.map(condition =>
        condition.id === conditionId ? { ...condition, ...updates } : condition,
      ),
    });
  };

  const removeCondition = (pathId: string, conditionId: string) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return;

    updatePath(pathId, {
      conditions: path.conditions.filter(c => c.id !== conditionId),
    });
  };

  const needsValue = (operator: string) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  // A condition's value is only validated when it actually drives a free-text
  // expression: skip pipeline-stage (id-only) and operators that take no value.
  // Non-string / blank values are treated as balanced so a numeric value never
  // throws at render (the shared util expects a string).
  const isConditionValueBalanced = (condition: Condition) => {
    if (condition.field === PIPELINE_STAGE_FIELD) return true;
    if (!needsValue(condition.operator)) return true;
    const value = condition.value;
    if (typeof value !== 'string' || value.trim() === '') return true;
    return isBalancedExpression(value);
  };

  // Cheap derived traversal (a handful of conditions) — recompute on each
  // render rather than memoizing, which would force isConditionValueBalanced
  // into the dep array and re-run every render anyway.
  const hasInvalidExpression = formData.paths.some(path =>
    path.conditions.some(condition => !isConditionValueBalanced(condition)),
  );

  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  const handleFieldChange = (pathId: string, condition: Condition, field: string) => {
    // Any field change invalidates a previously denormalized value label.
    const updates: Partial<Condition> = { field, valueLabel: undefined };
    const wasPipelineStage = condition.field === PIPELINE_STAGE_FIELD;
    if (field === PIPELINE_STAGE_FIELD) {
      // Pipeline-stage conditions only support id equality; reset incompatible
      // operator/value carried over from a previous field selection.
      if (!PIPELINE_STAGE_OPERATORS.includes(condition.operator)) {
        updates.operator = 'equals';
      }
      updates.value = '';
    } else if (wasPipelineStage) {
      // Leaving the stage field: drop the stale stage id left in the value input.
      updates.value = '';
    }
    updateCondition(pathId, condition.id, updates);
  };

  const renderCondition = (pathId: string, condition: Condition, index: number) => {
    const path = formData.paths.find(p => p.id === pathId);
    if (!path) return null;

    const isPipelineStageField = condition.field === PIPELINE_STAGE_FIELD;
    const operatorOptions = isPipelineStageField
      ? OPERATORS.filter(option => PIPELINE_STAGE_OPERATORS.includes(option.value))
      : OPERATORS;

    const valueBalanced = isConditionValueBalanced(condition);
    const exprErrorId = `conditional-expr-error-${condition.id}`;

    return (
      <div key={condition.id} className="flex flex-col gap-3 rounded-xl border bg-muted/24 p-3">
        {index > 0 && (
          <div className="flex items-center gap-2 border-b pb-2">
            <Badge variant="outline" className="text-xs">
              {path.logicalOperator === 'AND'
                ? t('panels.conditional.logicalOperators.and')
                : t('panels.conditional.logicalOperators.or')}
            </Badge>
          </div>
        )}

        <div className="grid grid-cols-12 items-end gap-2">
          <Field className="col-span-4 items-stretch">
            <FieldLabel className="text-xs">{t('panels.conditional.field')}</FieldLabel>
            <VariableSelect
              value={condition.field || ''}
              onValueChange={value => handleFieldChange(pathId, condition, value)}
              placeholder={t('panels.conditional.placeholders.selectVariable')}
              journeyId={journeyId}
              className="w-full"
              showSystemVariables={true}
              showContactAttributes={true}
              triggerTestId="conditional-field-select"
            />
          </Field>

          <Field className="col-span-3 items-stretch">
            <FieldLabel className="text-xs">{t('panels.conditional.operator')}</FieldLabel>
            <Select
              items={operatorOptions}
              value={condition.operator || null}
              onValueChange={value =>
                updateCondition(pathId, condition.id, { operator: String(value ?? '') })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {operatorOptions.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          <Field className="col-span-4 items-stretch">
            <FieldLabel className="text-xs">{t('panels.conditional.value')}</FieldLabel>
            {isPipelineStageField ? (
              <Select
                items={stageOptions.map(option => ({ value: option.id, label: option.label }))}
                value={condition.value || null}
                onValueChange={next => {
                  const value = String(next ?? '');
                  updateCondition(pathId, condition.id, {
                    value,
                    valueLabel: stageOptions.find(option => option.id === value)?.label,
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t('panels.conditional.placeholders.selectStage')}
                  />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {stageOptions.map(option => (
                    <SelectItem
                      key={option.id}
                      value={option.id}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            ) : needsValue(condition.operator) ? (
              <>
                <VariableInput
                  value={condition.value || ''}
                  onChange={e =>
                    updateCondition(pathId, condition.id, {
                      value: e.target.value,
                      valueLabel: undefined,
                    })
                  }
                  placeholder={t('panels.conditional.value')}
                  className="w-full"
                  journeyId={journeyId}
                  aria-invalid={!valueBalanced}
                  aria-describedby={valueBalanced ? undefined : exprErrorId}
                />
                {!valueBalanced && (
                  <p id={exprErrorId} className="text-xs text-flow-feedback-error-fg">
                    {t('environmentManager.invalidExpression')}
                  </p>
                )}
              </>
            ) : (
              <div className="flex h-9 items-center px-3 text-muted-foreground text-xs italic sm:h-8">
                {t('panels.conditional.notNecessary')}
              </div>
            )}
          </Field>

          <div className="col-span-1 flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeCondition(pathId, condition.id)}
              aria-label={t('panels.conditional.removeCondition')}
              className="text-destructive-foreground hover:text-destructive-foreground"
            >
              <Trash2 />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPath = (path: ConditionalPath) => {
    const pathColor = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-3 shrink-0 rounded-full" style={{ backgroundColor: pathColor.hex }} />
            <Input
              value={path.name}
              onChange={e => updatePath(path.id, { name: e.target.value })}
              placeholder={t('panels.conditional.pathName')}
              className="w-48"
            />
            <Select
              items={colorItems}
              value={path.color || null}
              onValueChange={value => updatePath(path.id, { color: String(value ?? '') })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {PATH_COLORS.map(color => (
                  <SelectItem
                    key={color.value}
                    value={color.value}
                  >
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full" style={{ backgroundColor: color.hex }} />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => duplicatePath(path.id)}
              aria-label={t('panels.conditional.duplicatePath')}
            >
              <Copy />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => removePath(path.id)}
              aria-label={t('panels.conditional.removePath')}
              className="text-destructive-foreground hover:text-destructive-foreground"
            >
              <Trash2 />
            </Button>
          </div>
        </div>

        <Field className="flex-row items-center gap-2">
          <FieldLabel className="font-normal">
            {t('panels.conditional.logicalOperatorBetweenConditions')}
          </FieldLabel>
          <Select
            items={logicalOperatorItems}
            value={path.logicalOperator || null}
            onValueChange={value =>
              value != null && updatePath(path.id, { logicalOperator: value as 'AND' | 'OR' })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              <SelectItem value="AND">
                {t('panels.conditional.andAll')}
              </SelectItem>
              <SelectItem value="OR">
                {t('panels.conditional.orAny')}
              </SelectItem>
            </SelectPopup>
          </Select>
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'trigger')}>
            <Plus />
            {t('panels.conditional.trigger')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'contact')}>
            <Plus />
            {t('panels.conditional.contact')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'system')}>
            <Plus />
            {t('panels.conditional.system')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => addCondition(path.id, 'custom')}>
            <Plus />
            {t('panels.conditional.customVariable')}
          </Button>
        </div>

        <div className="space-y-3">
          {path.conditions.length > 0 ? (
            path.conditions.map((condition, index) => renderCondition(path.id, condition, index))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/24 p-4 text-center">
              <p className="text-muted-foreground text-sm">
                {t('panels.conditional.noConditionsAdded')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('panels.conditional.clickButtonsToAdd')}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.conditional.title')}
      icon={<GitBranch className="size-5 text-flow-node-condition-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty}
      saveDisabled={hasInvalidExpression}
      saveLabel={t('actions.save')}
      cancelLabel={t('actions.cancel')}
      contentClassName="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground text-sm">
            {t('panels.conditional.pathsTitle')}
          </h3>
          <Button variant="outline" size="sm" onClick={addPath}>
            <Plus />
            {t('panels.conditional.addPath')}
          </Button>
        </div>

        {formData.paths.length > 0 ? (
          <>
            <Tabs value={activePathId} onValueChange={value => setActivePathId(String(value))}>
              <TabsList
                className="grid w-full"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(formData.paths.length, 4)}, 1fr)`,
                }}
              >
                {formData.paths.map(path => {
                  const color = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];
                  return (
                    <TabsTab key={path.id} value={path.id} className="flex items-center gap-2">
                      <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color.hex }} />
                      <span className="truncate">{path.name}</span>
                    </TabsTab>
                  );
                })}
              </TabsList>

              {formData.paths.map(path => (
                <TabsPanel key={path.id} value={path.id} className="mt-4">
                  {renderPath(path)}
                </TabsPanel>
              ))}
            </Tabs>

            <FlowFeedbackBanner variant="info">
              <p className="mb-2 font-medium text-sm">{t('panels.conditional.summary.title')}</p>
              <div className="space-y-2">
                {formData.paths.map(path => {
                  const color = PATH_COLORS.find(c => c.value === path.color) || PATH_COLORS[0];
                  return (
                    <div key={path.id} className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="size-2 rounded-full" style={{ backgroundColor: color.hex }} />
                        <span className="font-medium">{path.name}:</span>
                      </div>
                      {path.conditions.length > 0 ? (
                        <div className="ml-4 text-xs">
                          {t('panels.conditional.summary.conditionsCount', {
                            count: path.conditions.length,
                            operator: path.logicalOperator,
                          })}
                        </div>
                      ) : (
                        <div className="ml-4 text-xs text-muted-foreground">
                          {t('panels.conditional.summary.noConditionsConfigured')}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="text-sm mt-2 pt-2 border-t border-flow-feedback-info-border">
                  <span className="text-flow-feedback-error-fg font-medium">
                    {t('panels.conditional.otherwiseCase')}:
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {t('panels.conditional.summary.otherwiseAlwaysAvailable')}
                  </span>
                </div>
              </div>
            </FlowFeedbackBanner>
          </>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/24 p-6 text-center">
            <GitBranch className="mx-auto mb-2 size-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t('panels.conditional.emptyState.noPathsConfigured')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('panels.conditional.emptyState.clickToCreateFirst')}
            </p>
          </div>
        )}
      </div>
    </NodeConfigModal>
  );
}
