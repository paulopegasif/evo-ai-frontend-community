import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Split, Plus, Trash2 } from '@/components/icons';
import { SplitNodeData, SplitVariant } from './SplitNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';

interface SplitPanelProps {
  nodeId: string;
  data: SplitNodeData;
  onUpdate: (nodeId: string, newData: SplitNodeData) => void;
  onClose: () => void;
}

export function SplitPanel({ nodeId, data, onUpdate, onClose }: SplitPanelProps) {
  const { t } = useLanguage('journey');

  const VARIANT_COLORS = [
    { value: 'blue', label: t('panels.split.colors.blue') },
    { value: 'purple', label: t('panels.split.colors.purple') },
    { value: 'green', label: t('panels.split.colors.green') },
    { value: 'orange', label: t('panels.split.colors.orange') },
    { value: 'red', label: t('panels.split.colors.red') },
    { value: 'yellow', label: t('panels.split.colors.yellow') },
  ];

  const defaultVariants = (): SplitVariant[] => [
    {
      id: uuidv4(),
      name: t('panels.split.variants.defaultNames.variantA'),
      percentage: 50,
      color: 'blue',
    },
    {
      id: uuidv4(),
      name: t('panels.split.variants.defaultNames.variantB'),
      percentage: 50,
      color: 'purple',
    },
  ];

  const [originalData] = useState<SplitNodeData>(() => ({
    ...data,
    variants: data.variants || defaultVariants(),
  }));
  const [formData, setFormData] = useState<SplitNodeData>(() => ({
    ...data,
    variants: data.variants || defaultVariants(),
  }));

  useEffect(() => {
    setFormData({
      ...data,
      variants: data.variants || defaultVariants(),
    });
  }, [data]);

  const handleSave = () => {
    const totalPercentage = formData.variants.reduce((sum, variant) => sum + variant.percentage, 0);
    const normalizedVariants = formData.variants.map(variant => ({
      ...variant,
      percentage:
        totalPercentage > 0 ? Math.round((variant.percentage / totalPercentage) * 100) : 0,
    }));

    const updatedData = {
      ...formData,
      variants: normalizedVariants,
    };
    onUpdate(nodeId, updatedData);
    onClose();
  };

  const addVariant = () => {
    const currentVariants = formData.variants || [];
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const variantLetter =
      letters[currentVariants.length] || `Variante ${currentVariants.length + 1}`;

    const newVariant: SplitVariant = {
      id: uuidv4(),
      name: `${t('panels.split.variants.defaultNames.variantA').replace('A', variantLetter)}`,
      percentage: 0,
      color: VARIANT_COLORS[currentVariants.length % VARIANT_COLORS.length].value,
    };

    setFormData(prev => ({
      ...prev,
      variants: [...currentVariants, newVariant],
    }));
  };

  const updateVariant = (variantId: string, updates: Partial<SplitVariant>) => {
    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map(variant =>
        variant.id === variantId ? { ...variant, ...updates } : variant,
      ),
    }));
  };

  const removeVariant = (variantId: string) => {
    if (formData.variants.length <= 2) return;

    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).filter(variant => variant.id !== variantId),
    }));
  };

  const distributeEqually = () => {
    const variantCount = formData.variants.length;
    const equalPercentage = Math.floor(100 / variantCount);
    const remainder = 100 - equalPercentage * variantCount;

    setFormData(prev => ({
      ...prev,
      variants: (prev.variants || []).map((variant, index) => ({
        ...variant,
        percentage: equalPercentage + (index < remainder ? 1 : 0),
      })),
    }));
  };

  const colorItems = VARIANT_COLORS.map(option => ({ value: option.value, label: option.label }));

  const totalPercentage = formData.variants.reduce((sum, variant) => sum + variant.percentage, 0);
  const dirty = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(originalData),
    [formData, originalData],
  );
  const isValid = totalPercentage > 0;

  const renderVariant = (variant: SplitVariant) => (
    <div key={variant.id} className="rounded-xl border bg-muted/24 p-4">
      <div className="grid grid-cols-12 items-end gap-3">
        <Field className="col-span-4 items-stretch">
          <FieldLabel className="text-xs">{t('panels.split.variants.name')}</FieldLabel>
          <Input
            value={variant.name}
            onChange={e => updateVariant(variant.id, { name: e.target.value })}
            placeholder={t('panels.split.placeholders.variantName')}
          />
        </Field>

        <Field className="col-span-3 items-stretch">
          <FieldLabel className="text-xs">{t('panels.split.variants.color')}</FieldLabel>
          <Select
            items={colorItems}
            value={variant.color || null}
            onValueChange={value => updateVariant(variant.id, { color: String(value ?? '') })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              {VARIANT_COLORS.map(option => (
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

        <Field className="col-span-3 items-stretch">
          <FieldLabel className="text-xs">{t('panels.split.variants.percentage')}</FieldLabel>
          <Input
            type="number"
            min="0"
            max="100"
            value={variant.percentage}
            onChange={e => updateVariant(variant.id, { percentage: parseInt(e.target.value) || 0 })}
          />
        </Field>

        <div className="col-span-2 flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeVariant(variant.id)}
            disabled={formData.variants.length <= 2}
            aria-label={t('panels.split.actions.removeVariant')}
            className="text-destructive-foreground hover:text-destructive-foreground"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.split.title')}
      icon={<Split className="size-5 text-flow-node-condition-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.split.actions.save')}
      cancelLabel={t('panels.split.actions.cancel')}
      contentClassName="max-w-3xl"
    >
      <div className="space-y-4">
        <h3 className="font-medium text-foreground text-sm">{t('panels.split.configuration')}</h3>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addVariant}>
            <Plus />
            {t('panels.split.actions.addVariant')}
          </Button>
          <Button variant="outline" size="sm" onClick={distributeEqually}>
            {t('panels.split.actions.distributeEqually')}
          </Button>
        </div>

        <div className="space-y-3">
          {formData.variants && formData.variants.length > 0 ? (
            formData.variants.map(variant => renderVariant(variant))
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/24 p-4 text-center">
              <Split className="mx-auto mb-2 size-8 text-muted-foreground" />
              <p className="text-muted-foreground">{t('panels.split.messages.emptyState')}</p>
            </div>
          )}
        </div>

        <FlowFeedbackBanner variant={totalPercentage === 100 ? 'success' : 'warn'}>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {t('panels.split.status.total')}: {totalPercentage}%
            </span>
            {totalPercentage !== 100 && (
              <Badge variant="outline">
                {totalPercentage > 100
                  ? t('panels.split.status.excess')
                  : t('panels.split.status.missing')}{' '}
                {Math.abs(100 - totalPercentage)}%
              </Badge>
            )}
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs mt-1">{t('panels.split.messages.normalizePercentages')}</p>
          )}
        </FlowFeedbackBanner>

        {formData.variants && formData.variants.length > 0 && (
          <FlowFeedbackBanner variant="info">
            <p className="mb-2 font-medium text-sm">{t('panels.split.status.summary')}:</p>
            <div className="space-y-1 text-sm">
              {formData.variants.map(variant => (
                <div key={variant.id}>
                  <Badge variant="outline" className="mr-2">
                    {variant.color}
                  </Badge>
                  {variant.name}: {variant.percentage}%
                </div>
              ))}
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
