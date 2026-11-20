import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { journeyService } from '@/services';
import { Journey, TriggerType } from '@/types/automation';
import type { Node, Edge } from '@xyflow/react';
import { validateJourney } from '@/utils/journeyFlowValidation';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface JourneyModalProps {
  open: boolean;
  onClose: () => void;
  journey?: Journey | null;
  onSave: () => void;
}

export default function JourneyModal({ open, onClose, journey, onSave }: JourneyModalProps) {
  const { t } = useLanguage('journey');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    if (journey) {
      setFormData({
        name: journey.name || '',
        description: journey.description || '',
        isActive: journey.isActive ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true,
      });
    }
  }, [journey]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error(t('modal.fields.name.required'));
      return;
    }

    try {
      setLoading(true);

      const basePayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive,
      };

      if (journey?.id) {
        // EVO-1744: block turning a journey ON from the modal when its persisted
        // flow is invalid. flowData lives on the `journey` prop (the modal's own
        // state is metadata-only). Only gate the off→on transition.
        if (formData.isActive && !journey.isActive) {
          const result = validateJourney(
            (journey.flowData?.nodes ?? []) as unknown as Node[],
            (journey.flowData?.edges ?? []) as unknown as Edge[],
          );
          if (!result.isActivatable) {
            toast.error(
              t('messages.activationBlocked', {
                issues: result.errors
                  .map((i) => t(i.messageKey, i.params))
                  .join(' · '),
              }),
            );
            setLoading(false);
            return;
          }
        }
        // Metadata-only edit: never resend flowData/flowTriggers — the backend
        // replaces the stored flow wholesale, so a trigger-only payload would
        // wipe the flow built in the editor (EVO-1745).
        await journeyService.updateJourney(journey.id, basePayload);
        toast.success(t('modal.messages.updateSuccess'));
      } else {
        const createPayload = {
          ...basePayload,
          flowData: {
            nodes: [
              {
                id: 'journey-trigger-node',
                type: 'journey-trigger-node',
                position: { x: -100, y: 100 },
                data: {
                  label: t('modal.defaultTrigger.label'),
                  description: t('modal.defaultTrigger.description'),
                  triggerType: 'manual',
                  conditions: [],
                },
              },
            ],
            edges: [],
            variables: [],
          },
          flowTriggers: [
            {
              id: 'default-trigger',
              type: TriggerType.Manual,
              name: t('modal.defaultTrigger.name'),
              enabled: true,
            },
          ],
        };
        await journeyService.createJourney(createPayload);
        toast.success(t('modal.messages.createSuccess'));
      }

      onSave();
    } catch (error) {
      console.error('Erro ao salvar jornada:', error);
      toast.error(t('modal.messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={next => !next && onClose()}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle>{journey ? t('modal.edit.title') : t('modal.create.title')}</DialogTitle>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="name">
              {t('modal.fields.name.label')}
              <span className="text-destructive-foreground" aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              id="name"
              autoFocus
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              placeholder={t('modal.fields.name.placeholder')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">{t('modal.fields.description.label')}</FieldLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              placeholder={t('modal.fields.description.placeholder')}
              rows={3}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-3 font-medium text-sm">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={value => handleInputChange('isActive', value)}
            />
            {t('modal.fields.isActive')}
          </label>
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t('modal.actions.cancel')}</DialogClose>
          <Button onClick={handleSave} loading={loading}>
            {loading ? t('modal.actions.saving') : journey ? t('modal.edit.button') : t('modal.create.button')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
