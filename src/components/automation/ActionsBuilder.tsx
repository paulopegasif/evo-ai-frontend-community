import { useFieldArray, type Control } from 'react-hook-form';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from '@/components/ui/card';
import { Plus } from '@/components/icons';
import {
  type AutomationRuleFormData,
  getDefaultActionForName,
} from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';
import type { AutomationActionType } from '@/types/automation';
import ActionRow from './ActionRow';

interface Props {
  control: Control<AutomationRuleFormData>;
  formData: AutomationFormData;
}

export default function ActionsBuilder({ control, formData }: Props) {
  const { t } = useLanguage('automation');
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'actions',
  });

  const handleActionChange = (index: number, actionName: AutomationActionType) => {
    update(index, getDefaultActionForName(actionName));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('form.fields.actions.label')}
          <span className="text-destructive-foreground" aria-hidden="true">
            {' '}
            *
          </span>
        </CardTitle>
        <CardDescription>{t('form.sections.actions.description')}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t('form.fields.actions.addRow')}
            onClick={() => append(getDefaultActionForName('send_message'))}
          >
            <Plus />
            {t('form.fields.actions.addRow')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardPanel>
        {fields.length === 0 ? (
          <p className="rounded-lg border border-destructive/32 border-dashed px-4 py-6 text-center text-destructive-foreground text-sm">
            {t('form.fields.actions.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <ActionRow
                key={field.id}
                control={control}
                index={index}
                formData={formData}
                onRemove={() => remove(index)}
                onActionChange={handleActionChange}
              />
            ))}
          </div>
        )}
      </CardPanel>
    </Card>
  );
}
