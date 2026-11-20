import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import RadioCardGroup from '@/components/base/RadioCard';
import { Plus, Users } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  Segment, 
  SegmentFormData, 
  SegmentDefinition,
  SegmentNodeUnion,
  DEFAULT_SEGMENT_DEFINITION,
  UserPropertyNode,
} from '@/types/analytics';
import SegmentConditionEditor from './SegmentConditionEditor';

interface SegmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: Segment;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: SegmentFormData) => void;
}


export default function SegmentModal({
  open,
  onOpenChange,
  segment,
  isNew,
  loading,
  onSubmit,
}: SegmentModalProps) {
  const { t } = useLanguage('segments');
  const [formData, setFormData] = useState<SegmentFormData>({
    name: '',
    definition: DEFAULT_SEGMENT_DEFINITION,
    status: 'running',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [definitionType, setDefinitionType] = useState<'Everyone' | 'And' | 'Or'>('Everyone');
  const [nodes, setNodes] = useState<SegmentNodeUnion[]>([]);

  useEffect(() => {
    if (segment && !isNew) {
      setFormData({
        name: segment.name,
        definition: segment.definition,
        status: segment.status,
      });
      setDefinitionType(segment.definition.entryNode.type as 'Everyone' | 'And' | 'Or');
      setNodes(segment.definition.nodes || []);
    } else {
      setFormData({
        name: '',
        definition: DEFAULT_SEGMENT_DEFINITION,
        status: 'running',
      });
      setDefinitionType('Everyone');
      setNodes([]);
    }
    setErrors({});
  }, [segment, isNew, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('modal.validation.nameRequired');
    }

    if (formData.name.trim().length < 2) {
      newErrors.name = t('modal.validation.nameMinLength');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build the segment definition based on current state
    const definition: SegmentDefinition = {
      nodes: nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    };

    onSubmit({
      ...formData,
      definition,
    });
  };

  const handleInputChange = (field: keyof SegmentFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleDefinitionTypeChange = (value: 'Everyone' | 'And' | 'Or') => {
    setDefinitionType(value);
    if (value === 'Everyone') {
      setNodes([]);
    }
  };

  const addCondition = () => {
    const newNode: UserPropertyNode = {
      id: uuidv4(),
      type: 'UserProperty',
      path: '',
      operator: {
        type: 'Equals',
        value: '',
      },
    };
    setNodes([...nodes, newNode]);
  };

  const updateCondition = (index: number, node: SegmentNodeUnion) => {
    const updated = [...nodes];
    updated[index] = node;
    setNodes(updated);
  };

  const removeCondition = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  const combinationOptions = [
    { value: 'Everyone', label: t('modal.combinationTypes.everyone') },
    { value: 'And', label: t('modal.combinationTypes.and') },
    { value: 'Or', label: t('modal.combinationTypes.or') },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>{isNew ? t('modal.createTitle') : t('modal.editTitle')}</DialogTitle>
            <DialogDescription>
              {isNew ? t('modal.createDescription') : t('modal.editDescription')}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-6">
            <Field invalid={Boolean(errors.name)}>
              <FieldLabel htmlFor="name">
                {t('modal.segmentName')} <span className="text-destructive-foreground">*</span>
              </FieldLabel>
              <Input
                id="name"
                placeholder={t('modal.segmentNamePlaceholder')}
                value={formData.name}
                onChange={e => handleInputChange('name', e.target.value)}
                aria-invalid={errors.name ? true : undefined}
              />
              {errors.name && <FieldError match>{errors.name}</FieldError>}
            </Field>

            <div className="flex flex-col gap-2">
              <span className="font-medium text-sm" id="segment-combination-label">
                {t('modal.combinationType')}
              </span>
              <RadioCardGroup
                aria-labelledby="segment-combination-label"
                value={definitionType}
                onValueChange={handleDefinitionTypeChange}
                className="sm:grid-cols-3"
                options={combinationOptions.map(opt => ({ value: opt.value, title: opt.label }))}
              />
            </div>

            {definitionType === 'Everyone' ? (
              <Alert variant="info">
                <Users />
                <AlertTitle>{t('modal.universalSegment.title')}</AlertTitle>
                <AlertDescription>{t('modal.universalSegment.description')}</AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col gap-3">
                <span className="font-medium text-sm">{t('modal.segmentConditions')}</span>
                {nodes.map((node, index) => (
                  <SegmentConditionEditor
                    key={node.id}
                    condition={node}
                    index={index}
                    onUpdate={updateCondition}
                    onRemove={removeCondition}
                  />
                ))}
                <Button type="button" variant="outline" onClick={addCondition} className="w-full border-dashed">
                  <Plus />
                  {t('modal.addCondition')}
                </Button>
              </div>
            )}
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />} disabled={loading}>
              {t('modal.cancel')}
            </DialogClose>
            <Button type="submit" loading={loading}>
              {loading
                ? isNew
                  ? t('modal.creating')
                  : t('modal.saving')
                : isNew
                  ? t('modal.createButton')
                  : t('modal.saveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
