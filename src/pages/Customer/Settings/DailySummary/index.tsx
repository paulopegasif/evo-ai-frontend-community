import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { Plus, Send, Trash2 } from '@/components/icons';
import SettingsPageHeader from '@/components/dailyPanel/SettingsPageHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { dailySummaryService } from '@/services/dailyPanel/dailyPanelService';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import { fieldErrorsFrom } from '@/utils/dailyPanel/fieldErrors';
import { MAX_PHONES, normalizePhone, validateDailySummary, type DailySummaryFormErrors, type DailySummaryFormState } from './validation';
import type { DailySummarySettings, DailySummaryTestResult } from '@/types/dailyPanel';

const toForm = (s: DailySummarySettings): DailySummaryFormState => ({
  enabled: s.enabled,
  time: s.time || '19:00',
  inbox_id: s.inbox_id ? String(s.inbox_id) : '',
  phones: s.phones.length > 0 ? [...s.phones] : [''],
});

export default function DailySummary() {
  const { t, currentLanguage } = useLanguage('dailyPanel');
  const ids = useId();
  const [settings, setSettings] = useState<DailySummarySettings | null>(null);
  const [form, setForm] = useState<DailySummaryFormState | null>(null);
  const [errors, setErrors] = useState<DailySummaryFormErrors | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DailySummaryTestResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    dailySummaryService
      .get()
      .then(s => {
        if (cancelled) return;
        setSettings(s);
        setForm(toForm(s));
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
        <Alert variant="error">
          <AlertDescription>{t('summary.errors.load')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!settings || !form) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const noInboxes = settings.available_inboxes.length === 0;
  const savedForm = toForm(settings);
  const dirty = JSON.stringify(savedForm) !== JSON.stringify({ ...form, phones: form.phones.map(normalizePhone) });

  const update = (patch: Partial<DailySummaryFormState>) => {
    setForm(prev => (prev ? { ...prev, ...patch } : prev));
    setErrors(null);
    setServerErrors([]);
  };

  const setPhone = (index: number, value: string) =>
    update({ phones: form.phones.map((p, i) => (i === index ? value : p)) });

  const handleSave = async () => {
    const validation = validateDailySummary(form, t);
    if (validation) {
      setErrors(validation);
      return;
    }
    const phones = form.phones.map(normalizePhone).filter(Boolean);
    setSaving(true);
    try {
      const next = await dailySummaryService.update({
        enabled: form.enabled,
        time: form.time,
        inbox_id: form.inbox_id || null,
        phones,
      });
      setSettings(next);
      setForm(toForm(next));
      toast.success(t('summary.saved'));
    } catch (error) {
      // 422: show each `{ field, messages }` next to its field; anything else goes to the alert.
      const byField = fieldErrorsFrom(error);
      const { phones: phoneMsgs, inbox_id: inboxMsgs, time: timeMsgs, ...rest } = byField;
      if (phoneMsgs || inboxMsgs || timeMsgs) {
        setErrors({
          phones: form.phones.map(() => undefined),
          phonesGeneral: phoneMsgs?.join(' '),
          inbox: inboxMsgs?.join(' '),
          time: timeMsgs?.join(' '),
        });
      }
      const others = Object.values(rest).flat();
      if (others.length > 0) setServerErrors(others);
      else if (!phoneMsgs && !inboxMsgs && !timeMsgs)
        setServerErrors([getApiErrorMessage(error, t('summary.errors.save'))]);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await dailySummaryService.sendTest();
      setTestResult(result);
      if (result.failed.length === 0) toast.success(t('summary.test.sent', { count: result.sent }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('summary.test.error')));
    } finally {
      setTesting(false);
    }
  };

  const lastRun = settings.last_run;
  const lastRunVariant = lastRun?.status === 'sent' ? 'success' : lastRun?.status === 'partial' ? 'warning' : 'error';
  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(currentLanguage || 'pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
        <SettingsPageHeader title={t('summary.title')} subtitle={t('summary.subtitle')} />

        {noInboxes && (
          <Alert variant="warning">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              {t('summary.noInbox')}
              <Button size="sm" variant="outline" render={<Link to="/channels" />}>
                {t('summary.connectWhatsapp')}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('summary.settingsTitle')}</CardTitle>
            <CardDescription>{t('summary.timezone', { timezone: settings.timezone })}</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-6">
            <Label>
              <Switch
                checked={form.enabled}
                onCheckedChange={checked => update({ enabled: checked })}
                disabled={noInboxes && !form.enabled}
              />
              {t('summary.enabled')}
            </Label>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${ids}-time`}>{t('summary.time')}</FieldLabel>
                <Input
                  id={`${ids}-time`}
                  type="time"
                  step={60}
                  value={form.time}
                  onChange={e => update({ time: e.target.value })}
                  aria-invalid={!!errors?.time || undefined}
                />
                {errors?.time && (
                  <p role="alert" className="text-destructive-foreground text-xs">
                    {errors.time}
                  </p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor={`${ids}-inbox`}>{t('summary.inbox')}</FieldLabel>
                <OptionSelect
                  id={`${ids}-inbox`}
                  className="w-full"
                  value={form.inbox_id}
                  onValueChange={value => update({ inbox_id: value })}
                  placeholder={t('summary.inboxPlaceholder')}
                  disabled={noInboxes}
                  aria-invalid={!!errors?.inbox}
                  options={settings.available_inboxes.map(inbox => ({
                    value: String(inbox.id),
                    label: inbox.phone_number ? `${inbox.name} · ${inbox.phone_number}` : inbox.name,
                  }))}
                />
                {errors?.inbox && (
                  <p role="alert" className="text-destructive-foreground text-xs">
                    {errors.inbox}
                  </p>
                )}
              </Field>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 font-medium text-sm">{t('summary.phones')}</legend>
              <p className="text-muted-foreground text-xs">{t('summary.phonesHint', { count: MAX_PHONES })}</p>
              {form.phones.map((phone, index) => {
                const error = errors?.phones[index];
                const inputId = `${ids}-phone-${index}`;
                return (
                  <div key={index} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Input
                        id={inputId}
                        type="tel"
                        inputMode="tel"
                        autoComplete="off"
                        placeholder="+5562999990000"
                        aria-label={t('summary.phoneLabel', { index: index + 1 })}
                        aria-invalid={!!error || undefined}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        value={phone}
                        onChange={e => setPhone(index, e.target.value)}
                        onBlur={e => setPhone(index, normalizePhone(e.target.value))}
                      />
                      {form.phones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t('summary.removePhone', { index: index + 1 })}
                          onClick={() => update({ phones: form.phones.filter((_, i) => i !== index) })}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      )}
                    </div>
                    {error && (
                      <p id={`${inputId}-error`} role="alert" className="text-destructive-foreground text-xs">
                        {error}
                      </p>
                    )}
                  </div>
                );
              })}
              {errors?.phonesGeneral && (
                <p role="alert" className="text-destructive-foreground text-xs">
                  {errors.phonesGeneral}
                </p>
              )}
              {form.phones.length < MAX_PHONES && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => update({ phones: [...form.phones, ''] })}
                >
                  <Plus aria-hidden />
                  {t('summary.addPhone')}
                </Button>
              )}
            </fieldset>

            {serverErrors.length > 0 && (
              <Alert variant="error">
                <AlertDescription>
                  <ul className="list-disc ps-4">
                    {serverErrors.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardPanel>
          <CardFooter className="justify-end border-t">
            <Button onClick={() => void handleSave()} loading={saving} disabled={!dirty || saving}>
              {t('summary.save')}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('summary.lastRun.title')}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-4">
            {lastRun ? (
              <div className="flex flex-col gap-1 text-sm" data-testid="daily-summary-last-run">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant={lastRunVariant}>{t(`summary.lastRun.status.${lastRun.status}`)}</Badge>
                  <span className="text-muted-foreground">
                    {lastRun.sent_at ? formatDateTime(lastRun.sent_at) : lastRun.date}
                  </span>
                </span>
                {lastRun.error && <span className="text-destructive-foreground text-xs">{lastRun.error}</span>}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('summary.lastRun.never')}</p>
            )}

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => void handleTest()}
                  loading={testing}
                  disabled={testing || dirty || noInboxes || settings.phones.length === 0 || !settings.inbox_id}
                >
                  <Send aria-hidden />
                  {t('summary.test.button')}
                </Button>
                <span className="text-muted-foreground text-xs">{dirty ? t('summary.test.saveFirst') : t('summary.test.hint')}</span>
              </div>
              {testResult && (
                <div className="flex flex-col gap-1 text-sm" role="status" data-testid="daily-summary-test-result">
                  <span>{t('summary.test.sent', { count: testResult.sent })}</span>
                  {testResult.failed.map(f => (
                    <span key={f.phone} className="text-destructive-foreground text-xs">
                      {t('summary.test.failed', { phone: f.phone, error: f.error })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardPanel>
        </Card>
      </div>
    </div>
  );
}
