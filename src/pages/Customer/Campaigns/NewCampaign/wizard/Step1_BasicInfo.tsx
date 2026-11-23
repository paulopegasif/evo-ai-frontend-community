import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { CampaignType } from '@/types/campaigns';
import { CampaignTriggerConfig } from '../components/CampaignTriggerConfig';
import WizardStepLayout from './WizardStepLayout';

interface Step1Props {
  data: {
    name: string;
    description: string;
    type: CampaignType | '';
    triggerConfig?: CampaignTriggerConfig;
  };
  onChange: (data: Partial<Step1Props['data']>) => void;
  onNext: () => void;
}

const Step1_BasicInfo = ({ data, onChange, onNext }: Step1Props) => {
  const { t } = useLanguage('campaigns');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const newErrors: Record<string, string> = {};

    if (data.name && data.name.trim().length < 3) {
      newErrors.name = t('wizard.validation.nameMinLength');
    }

    setErrors(newErrors);
  }, [data.name, t]);

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!data.name || !data.name.trim()) {
      newErrors.name = t('wizard.validation.nameRequired');
    } else if (data.name.trim().length < 3) {
      newErrors.name = t('wizard.validation.nameMinLength');
    }

    if (!data.type) {
      newErrors.type = t('wizard.validation.typeRequired');
    }

    if (data.type === CampaignType.TRIGGER) {
      if (!data.triggerConfig || !data.triggerConfig.triggerType) {
        newErrors.triggerConfig = t('wizard.validation.triggerRequired');
      } else if (data.triggerConfig.triggerType === 'event' && (!data.triggerConfig.eventName || !data.triggerConfig.eventName.trim())) {
        newErrors.triggerConfig = t('wizard.validation.triggerEventRequired');
      } else if (data.triggerConfig.triggerType === 'segment' && !data.triggerConfig.segmentId) {
        newErrors.triggerConfig = t('wizard.validation.triggerSegmentRequired');
      } else if (data.triggerConfig.triggerType === 'label' && !data.triggerConfig.labelId) {
        newErrors.triggerConfig = t('wizard.validation.triggerLabelRequired');
      } else if (data.triggerConfig.triggerType === 'customAttribute' && !data.triggerConfig.customAttributeName) {
        newErrors.triggerConfig = t('wizard.validation.triggerAttributeRequired');
      } else if (data.triggerConfig.triggerType === 'webhook' && (!data.triggerConfig.webhookUrl || !data.triggerConfig.webhookUrl.trim())) {
        newErrors.triggerConfig = t('wizard.validation.triggerWebhookRequired');
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  };

  const isValid =
    data.name?.trim() &&
    data.type &&
    (data.type !== CampaignType.TRIGGER || (data.triggerConfig && data.triggerConfig.triggerType)) &&
    Object.keys(errors).length === 0;

  const typeItems = [
    { label: t('type.simple'), value: CampaignType.SIMPLE },
    { label: t('type.recurring'), value: CampaignType.RECURRING },
    { label: t('type.trigger'), value: CampaignType.TRIGGER },
  ];

  return (
    <WizardStepLayout
      footer={
        <Button onClick={handleNext} disabled={!isValid}>
          {t('wizard.actions.continue')}
          <ArrowRight />
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('wizard.step1.title')}</CardTitle>
          <CardDescription>{t('wizard.step1.subtitle')}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          <Field invalid={!!errors.name}>
            <FieldLabel>
              {t('wizard.step1.nameLabel')}
              <span className="text-destructive-foreground" aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              placeholder={t('wizard.step1.namePlaceholder')}
              value={data.name}
              onChange={e => onChange({ name: e.target.value })}
              aria-invalid={!!errors.name || undefined}
              autoFocus
            />
            {errors.name && <FieldError match>{errors.name}</FieldError>}
          </Field>

          <Field>
            <FieldLabel>{t('wizard.step1.descriptionLabel')}</FieldLabel>
            <Textarea
              placeholder={t('wizard.step1.descriptionPlaceholder')}
              value={data.description}
              onChange={e => onChange({ description: e.target.value })}
              className="min-h-24 resize-none"
              rows={4}
            />
            <FieldDescription>{t('wizard.step1.optional')}</FieldDescription>
          </Field>

          <Field invalid={!!errors.type}>
            <FieldLabel>
              {t('wizard.step1.typeLabel')}
              <span className="text-destructive-foreground" aria-hidden="true">*</span>
            </FieldLabel>
            <Select
              items={typeItems}
              value={data.type || null}
              onValueChange={value => onChange({ type: value as CampaignType })}
            >
              <SelectTrigger aria-invalid={!!errors.type || undefined}>
                <SelectValue placeholder={t('wizard.step1.typePlaceholder')} />
              </SelectTrigger>
              <SelectPopup>
                {typeItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
            {errors.type && <FieldError match>{errors.type}</FieldError>}
          </Field>
        </CardPanel>
      </Card>

      {data.type === CampaignType.TRIGGER && (
        <div className="flex flex-col gap-2">
          <CampaignTriggerConfig
            config={data.triggerConfig || { triggerType: 'event' }}
            onChange={config => onChange({ triggerConfig: config })}
          />
          {errors.triggerConfig && (
            <p className="text-destructive-foreground text-xs">{errors.triggerConfig}</p>
          )}
        </div>
      )}
    </WizardStepLayout>
  );
};

export default Step1_BasicInfo;
