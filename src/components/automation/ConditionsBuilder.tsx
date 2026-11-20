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
import { Plus } from 'lucide-react';
import type { AutomationRuleFormData } from '@/pages/Customer/Automation/registries';
import type { AutomationFormData } from '@/hooks/automation/useAutomationFormData';
import ConditionRow from './ConditionRow';

interface Props {
  control: Control<AutomationRuleFormData>;
  formData: AutomationFormData;
}

export default function ConditionsBuilder({ control, formData }: Props) {
  const { t } = useLanguage('automation');
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'conditions',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('form.fields.conditions.label')}
          <span className="font-normal text-muted-foreground text-xs">
            ({t('form.fields.conditions.optional')})
          </span>
        </CardTitle>
        <CardDescription>{t('form.sections.conditions.description')}</CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={t('form.fields.conditions.addRow')}
            onClick={() =>
              append({
                attribute_key: '',
                filter_operator: 'equal_to',
                query_operator: 'AND',
                values: [],
              })
            }
          >
            <Plus />
            {t('form.fields.conditions.addRow')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardPanel>
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
            {t('form.fields.conditions.empty')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <ConditionRow
                key={field.id}
                control={control}
                index={index}
                formData={formData}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        )}
      </CardPanel>
    </Card>
  );
}
