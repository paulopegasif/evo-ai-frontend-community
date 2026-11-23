import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from '@/components/icons';
import { automationService } from '@/services/automation/automationService';
import {
  automationRuleSchema,
  type AutomationRuleFormData,
} from '@/pages/Customer/Automation/registries';
import {
  EventSelector,
  ConditionsBuilder,
  ActionsBuilder,
} from '@/components/automation';
import { useAutomationFormData } from '@/hooks/automation/useAutomationFormData';
import AutomationLogsPanel from './AutomationLogsPanel';

const DEFAULTS: AutomationRuleFormData = {
  name: '',
  description: '',
  event_name: 'conversation_created',
  active: true,
  mode: 'simple',
  conditions: [],
  actions: [{ action_name: 'send_message', action_params: [''] }],
};

interface Props {
  mode: 'create' | 'edit';
}

export default function AutomationForm({ mode }: Props) {
  const { t } = useLanguage('automation');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: formData, isLoading: formDataLoading } = useAutomationFormData();

  const [submitting, setSubmitting] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(mode === 'edit');

  const methods = useForm<AutomationRuleFormData>({
    resolver: zodResolver(automationRuleSchema),
    defaultValues: DEFAULTS,
    mode: 'onChange',
  });
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = methods;

  // Gate the submit button on whether the current values would actually pass
  // the schema. We derive this directly from `safeParse` instead of RHF's
  // `formState.isValid`, which is unreliable here: with nested `useFieldArray`
  // (conditions/actions) + Controllers, `isValid` does not consistently
  // recompute the aggregate, leaving the button stuck disabled even after the
  // form is fully and validly filled. This mirrors the exact onSubmit check.
  const canSubmit = automationRuleSchema.safeParse(watch()).success;

  useEffect(() => {
    if (mode !== 'edit' || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const rule = await automationService.getAutomation(id);
        if (!cancelled && rule) {
          reset({
            name: rule.name,
            description: rule.description ?? '',
            event_name: rule.event_name as AutomationRuleFormData['event_name'],
            active: rule.active ?? true,
            mode: 'simple',
            conditions: (rule.conditions ?? []) as AutomationRuleFormData['conditions'],
            actions: (rule.actions ?? DEFAULTS.actions) as AutomationRuleFormData['actions'],
          });
        }
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        const i18nKey = status === 404 ? 'messages.ruleNotFound' : 'messages.loadError';
        console.error('Error loading automation:', error);
        toast.error(t(i18nKey));
        navigate('/automation');
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, id, navigate, reset, t]);

  const onSubmit = handleSubmit(async (data) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payload = data as Parameters<typeof automationService.createAutomation>[0];
      if (mode === 'create') {
        await automationService.createAutomation(payload);
        toast.success(t('messages.createSuccess'));
      } else if (id) {
        await automationService.updateAutomation(id, { ...payload, id });
        toast.success(t('messages.updateSuccess'));
      }
      navigate('/automation');
    } catch (error) {
      console.error('Error saving automation:', error);
      toast.error(
        mode === 'create' ? t('messages.createError') : t('messages.updateError'),
      );
    } finally {
      setSubmitting(false);
    }
  });

  if (loadingExisting || formDataLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6" aria-busy="true" aria-label={t('page.loading')}>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardPanel className="flex flex-col gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            className="mt-0.5"
            onClick={() => navigate('/automation')}
            aria-label={t('form.buttons.cancel')}
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-semibold text-xl md:text-2xl">
            {mode === 'create' ? t('form.title.create') : t('form.title.edit')}
          </h1>
        </div>

        {mode === 'edit' && id ? (
          <Tabs defaultValue="settings" className="flex min-h-0 flex-1 flex-col gap-4">
            <TabsList>
              <TabsTab value="settings">{t('form.tabs.settings')}</TabsTab>
              <TabsTab value="logs">{t('form.tabs.logs')}</TabsTab>
            </TabsList>

            <TabsPanel value="settings">{renderForm()}</TabsPanel>

            <TabsPanel value="logs">
              <AutomationLogsPanel automationRuleId={id} />
            </TabsPanel>
          </Tabs>
        ) : (
          renderForm()
        )}
      </div>
    </FormProvider>
  );

  function renderForm() {
    return (
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('form.sections.details.title')}</CardTitle>
            <CardDescription>{t('form.sections.details.description')}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <Field invalid={!!errors.name}>
              <FieldLabel htmlFor="name">
                {t('form.fields.name')}
                <span className="text-destructive-foreground" aria-hidden="true">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="name"
                render={({ field }) => (
                  <Input
                    id="name"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('form.fields.namePlaceholder')}
                    disabled={submitting}
                    aria-invalid={!!errors.name || undefined}
                  />
                )}
              />
              {errors.name && <FieldError match>{errors.name.message}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="description">{t('form.fields.description')}</FieldLabel>
              <Controller
                control={control}
                name="description"
                render={({ field }) => (
                  <Textarea
                    id="description"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder={t('form.fields.descriptionPlaceholder')}
                    rows={2}
                    disabled={submitting}
                  />
                )}
              />
            </Field>

            <Controller
              control={control}
              name="active"
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-3 font-medium text-sm">
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={submitting} />
                  {t('form.fields.active')}
                </label>
              )}
            />
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('form.sections.trigger.title')}</CardTitle>
            <CardDescription>{t('form.sections.trigger.description')}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-2">
            <EventSelector control={control} disabled={submitting} />
            <p className="text-muted-foreground text-xs">{t('form.fields.event.hint')}</p>
          </CardPanel>
        </Card>

        <ConditionsBuilder control={control} formData={formData} />

        <ActionsBuilder control={control} formData={formData} />

        <div className="sticky bottom-0 -mx-4 mt-auto flex justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
          <Button type="button" variant="ghost" onClick={() => navigate('/automation')} disabled={submitting}>
            {t('form.buttons.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !canSubmit} loading={submitting}>
            {submitting
              ? t('form.buttons.saving')
              : mode === 'create'
                ? t('form.buttons.create')
                : t('form.buttons.update')}
          </Button>
        </div>
      </form>
    );
  }
}
