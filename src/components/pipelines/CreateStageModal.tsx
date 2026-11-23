import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CreateStageData } from '@/types/analytics';

interface CreateStageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateStageData) => void;
  loading: boolean;
}

const getColorOptions = (t: (key: string) => string) => [
  { value: '#3B82F6', label: t('createStage.colors.blue'), color: '#3B82F6' },
  { value: '#10B981', label: t('createStage.colors.green'), color: '#10B981' },
  { value: '#F59E0B', label: t('createStage.colors.orange'), color: '#F59E0B' },
  { value: '#EF4444', label: t('createStage.colors.red'), color: '#EF4444' },
  { value: '#8B5CF6', label: t('createStage.colors.purple'), color: '#8B5CF6' },
  { value: '#F97316', label: t('createStage.colors.darkOrange'), color: '#F97316' },
  { value: '#06B6D4', label: t('createStage.colors.cyan'), color: '#06B6D4' },
  { value: '#84CC16', label: t('createStage.colors.lime'), color: '#84CC16' },
];

export default function CreateStageModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreateStageModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState<CreateStageData>({
    name: '',
    color: '#3B82F6',
    stage_type: 'active',
    automation_rules: { description: '' },
  });

  const colorOptions = getColorOptions(t);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    onSubmit(formData);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form
    setFormData({
      name: '',
      color: '#3B82F6',
      stage_type: 'active',
      automation_rules: { description: '' },
    });
  };

  const typeItems = (['active', 'completed', 'cancelled'] as const).map(value => ({
    value,
    label: t(`createStage.stageTypes.${value}`),
  }));

  return (
    <Dialog open={open} onOpenChange={next => !next && handleClose()}>
      <DialogPopup className="max-w-lg">
        <Form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t('createStage.title')}</DialogTitle>
            <DialogDescription>{t('createStage.description')}</DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <Field>
              <FieldLabel>{t('createStage.name')}</FieldLabel>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('createStage.namePlaceholder')}
                required
                disabled={loading}
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel>{t('createStage.descriptionLabel')}</FieldLabel>
              <Textarea
                value={formData.automation_rules?.description || ''}
                onChange={e =>
                  setFormData({
                    ...formData,
                    automation_rules: { ...formData.automation_rules, description: e.target.value },
                  })
                }
                placeholder={t('createStage.descriptionPlaceholder')}
                rows={3}
                disabled={loading}
              />
            </Field>

            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm">{t('createStage.color')}</span>
              {/* Stage colors are a categorical palette */}
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('createStage.color')}>
                {colorOptions.map(colorOption => {
                  const selected = formData.color === colorOption.value;
                  return (
                    <button
                      key={colorOption.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={colorOption.label}
                      title={colorOption.label}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-white outline-none ring-offset-2 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring',
                        selected && 'ring-2 ring-foreground/48',
                      )}
                      style={{ backgroundColor: colorOption.color }}
                      onClick={() => setFormData({ ...formData, color: colorOption.value })}
                      disabled={loading}
                    >
                      {selected && <Check className="size-4" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field>
              <FieldLabel>{t('createStage.stageType')}</FieldLabel>
              <Select
                items={typeItems}
                value={formData.stage_type}
                onValueChange={value =>
                  value && setFormData({ ...formData, stage_type: value as 'active' | 'completed' | 'cancelled' })
                }
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('createStage.selectType')} />
                </SelectTrigger>
                <SelectPopup>
                  {typeItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={loading}>
              {t('createStage.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.name?.trim()} loading={loading}>
              {t('createStage.create')}
            </Button>
          </DialogFooter>
        </Form>
      </DialogPopup>
    </Dialog>
  );
}
