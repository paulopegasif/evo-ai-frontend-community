import { useEffect, useMemo, useState } from 'react';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tag, X } from 'lucide-react';
import { RemoveLabelNodeData } from './RemoveLabelNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { labelsService } from '@/services/contacts/labelsService';
import type { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface RemoveLabelPanelProps {
  nodeId: string;
  data: RemoveLabelNodeData;
  onUpdate: (nodeId: string, newData: RemoveLabelNodeData) => void;
  onClose: () => void;
}

export function RemoveLabelPanel({ nodeId, data, onUpdate, onClose }: RemoveLabelPanelProps) {
  const { t } = useLanguage('journey');
  const [originalData] = useState<RemoveLabelNodeData>(() => ({ ...data }));
  const [formData, setFormData] = useState<RemoveLabelNodeData>({ ...data });
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(data);
  }, [data]);

  useEffect(() => {
    fetchLabels();
  }, []);

  const fetchLabels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await labelsService.getLabels();
      setLabels(response.data || []);
    } catch (err) {
      console.error('Error fetching labels:', err);
      setError(t('panels.removeLabel.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onUpdate(nodeId, formData);
    onClose();
  };

  const handleLabelChange = (labelId: string) => {
    const selectedLabel = labels.find(label => label.id === labelId);

    setFormData(prev => ({
      ...prev,
      labelId,
      labelName: selectedLabel?.title || '',
      labelColor: selectedLabel?.color || '',
    }));
  };

  const isValid = Boolean(formData.labelId && formData.labelName);
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.removeLabel.title')}
      icon={
        <div className="relative">
          <Tag className="h-5 w-5 text-flow-node-action-label-fg" />
          <X className="h-3 w-3 text-flow-node-action-label-fg absolute -top-1 -right-1" />
        </div>
      }
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.removeLabel.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              <li>{t('panels.removeLabel.selectLabel')}</li>
            </ul>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>{t('panels.removeLabel.labelToRemove')}</FieldLabel>
          <Select
            items={labels.map(label => ({ value: label.id, label: label.title }))}
            value={formData.labelId || null}
            onValueChange={value => handleLabelChange(String(value ?? ''))}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  loading
                    ? t('panels.removeLabel.loading')
                    : t('panels.removeLabel.selectLabelPlaceholder')
                }
              />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {labels.map(label => (
                <SelectItem key={label.id} value={label.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-full border"
                      style={{ backgroundColor: label.color }}
                    />
                    <div>
                      <div className="font-medium">{label.title}</div>
                      {label.description && (
                        <div className="text-xs text-muted-foreground">{label.description}</div>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </Field>

        {error && (
          <FlowFeedbackBanner variant="error">
            <p>{error}</p>
          </FlowFeedbackBanner>
        )}

        {formData.labelId && formData.labelName && (
          <FlowFeedbackBanner variant="error">
            <p className="mb-2">
              <strong>{t('panels.removeLabel.selectedLabel')}:</strong>
            </p>
            <div className="flex items-center gap-2">
              <div
                className="size-4 rounded-full border"
                style={{ backgroundColor: formData.labelColor }}
              />
              <span className="font-medium">{formData.labelName}</span>
            </div>
            <p className="text-xs mt-2">{t('panels.removeLabel.description')}</p>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="warn">
          <p>
            <strong>⚠️ {t('panels.removeLabel.warning')}:</strong>{' '}
            {t('panels.removeLabel.warningDescription')}
          </p>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
