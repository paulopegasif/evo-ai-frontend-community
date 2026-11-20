import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle, PlugZap, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { SettingsHeader, SettingsSaveBar, SettingsSkeleton, ToggleGroupBox, ToggleRow } from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { extractError } from '@/utils/apiHelpers';
import {
  evolutionHubService,
  type HubPlan,
  type MetaAppOptions,
  type HubChannel,
} from '@/services/integrations';

const CONFIG_TYPE = 'evolution_hub';
const MASKED = '••••';

function errorMessage(e: unknown, fallback: string): string {
  const info = extractError(e);
  return info?.message || fallback;
}

function generateSecret(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// EVOLUTION_HUB_URL é hardcoded no backend (lib/meta_base_url.rb) —
// não é mais editável pelo admin porque o Hub é um serviço único da
// Evolution Foundation, não muda por instalação.
const schema = z.object({
  EVOLUTION_HUB_ENABLED: z.union([z.string(), z.boolean()]).optional(),
  EVOLUTION_HUB_API_KEY: z.string().optional().nullable(),
  EVOLUTION_HUB_WEBHOOK_SECRET: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

const DEFAULTS: FormData = {
  EVOLUTION_HUB_ENABLED: 'false',
  EVOLUTION_HUB_API_KEY: null,
  EVOLUTION_HUB_WEBHOOK_SECRET: null,
};

function isMasked(v: unknown): boolean {
  return typeof v === 'string' && v.includes(MASKED);
}

export default function EvolutionHubConfig() {
  const { t } = useLanguage('adminSettings');
  const { refresh } = useGlobalConfig() as unknown as { refresh?: () => Promise<void> };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [apiKeyTouched, setApiKeyTouched] = useState(false);
  const [secretTouched, setSecretTouched] = useState(false);

  // "Configuração detectada no Hub": preview de plano + Meta Apps +
  // canais que o admin tem no Evo Hub. Carregado on-demand
  // (clique no botão "Atualizar") porque envolve 3 chamadas serial-ish
  // que podem demorar se o Hub estiver lento, e a tela já abre rápida.
  const [hubPreview, setHubPreview] = useState<{
    plan: HubPlan | null;
    options: MetaAppOptions | null;
    channels: HubChannel[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  });

  const enabledValue = watch('EVOLUTION_HUB_ENABLED');
  const enabledBool =
    enabledValue === true || enabledValue === 'true';

  useEffect(() => {
    (async () => {
      try {
        const data = await adminConfigService.getConfig(CONFIG_TYPE);
        const cfg = (data ?? {}) as Record<string, unknown>;
        setApiKeyConfigured(isMasked(cfg.EVOLUTION_HUB_API_KEY));
        setWebhookSecretConfigured(isMasked(cfg.EVOLUTION_HUB_WEBHOOK_SECRET));
        reset({
          EVOLUTION_HUB_ENABLED: String(cfg.EVOLUTION_HUB_ENABLED ?? 'false'),
          EVOLUTION_HUB_API_KEY: null,
          EVOLUTION_HUB_WEBHOOK_SECRET: null,
        });
      } catch (e) {
        toast.error(errorMessage(e, t('evolutionHub.messages.loadError')));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: FormData) => {
    setSaving(true);
    try {
      const payload: AdminConfigData = {
        EVOLUTION_HUB_ENABLED: String(values.EVOLUTION_HUB_ENABLED),
      };
      // Preserve existing secrets when the field wasn't touched.
      if (apiKeyTouched) {
        payload.EVOLUTION_HUB_API_KEY = values.EVOLUTION_HUB_API_KEY ?? '';
      }
      if (secretTouched) {
        payload.EVOLUTION_HUB_WEBHOOK_SECRET = values.EVOLUTION_HUB_WEBHOOK_SECRET ?? '';
      }
      await adminConfigService.saveConfig(CONFIG_TYPE, payload);
      toast.success(t('evolutionHub.messages.saved'));
      if (refresh) await refresh();
      setApiKeyTouched(false);
      setSecretTouched(false);
      if (payload.EVOLUTION_HUB_API_KEY) setApiKeyConfigured(true);
      if (payload.EVOLUTION_HUB_WEBHOOK_SECRET) setWebhookSecretConfigured(true);
    } catch (e) {
      toast.error(errorMessage(e, t('evolutionHub.messages.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await adminConfigService.testConnection(CONFIG_TYPE);
      setTestResult({
        ok: Boolean(result?.success),
        message: String(result?.message ?? t('evolutionHub.messages.testUnknown')),
      });
    } catch (e) {
      setTestResult({ ok: false, message: errorMessage(e, t('evolutionHub.messages.testError')) });
    } finally {
      setTesting(false);
    }
  };

  // Carrega "configuração detectada" (plano + Meta Apps + canais) do Hub.
  // Promise.allSettled pra que uma falha (ex.: endpoint de channels)
  // não impeça mostrar plano/options. UI mostra o que conseguiu obter
  // e error inline pra que faltou.
  const loadHubPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const [planRes, optionsRes, channelsRes] = await Promise.allSettled([
        evolutionHubService.getPlan(),
        evolutionHubService.getMetaAppOptions(),
        evolutionHubService.listChannels(),
      ]);
      setHubPreview({
        plan: planRes.status === 'fulfilled' ? planRes.value : null,
        options: optionsRes.status === 'fulfilled' ? optionsRes.value : null,
        channels: channelsRes.status === 'fulfilled' ? channelsRes.value : [],
      });
      const fails = [planRes, optionsRes, channelsRes].filter((r) => r.status === 'rejected');
      if (fails.length === 3) {
        setPreviewError(
          errorMessage((fails[0] as PromiseRejectedResult).reason, 'Falha ao consultar Evo Hub'),
        );
      } else if (fails.length > 0) {
        setPreviewError(
          `Algumas informações não puderam ser carregadas (${fails.length} de 3). Verifique a API URL e o token.`,
        );
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  // Auto-load do preview quando a integração já está configurada e ativa.
  // Carrega só uma vez na entrada da tela — admin clica "Atualizar"
  // pra refetch depois.
  useEffect(() => {
    if (!loading && enabledBool && apiKeyConfigured && !hubPreview && !previewLoading) {
      loadHubPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, enabledBool, apiKeyConfigured]);

  if (loading) {
    return <SettingsSkeleton cards={1} fields={3} />;
  }

  const setBadge = (configured: boolean, touched: boolean) =>
    configured && !touched ? <Badge variant="success">{t('evolutionHub.fields.secretSet')}</Badge> : null;
  const loadingText = (fallback: string) => (
    <p className="text-muted-foreground text-sm">{previewLoading ? 'Carregando…' : fallback}</p>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <SettingsHeader
        title={t('evolutionHub.title')}
        description={t('evolutionHub.description')}
        status={
          enabledBool
            ? { label: t('evolutionHub.fields.enabled'), variant: apiKeyConfigured ? 'success' : 'warning' }
            : null
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('evolutionHub.sections.connection')}</CardTitle>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <ToggleGroupBox>
              <ToggleRow
                id="enabled"
                label={t('evolutionHub.fields.enabled')}
                description={t('evolutionHub.fields.enabledHelp')}
                checked={enabledBool}
                onCheckedChange={(next) => {
                  setValue('EVOLUTION_HUB_ENABLED', next ? 'true' : 'false', { shouldDirty: true });
                  if (next && !webhookSecretConfigured && !secretTouched) {
                    setValue('EVOLUTION_HUB_WEBHOOK_SECRET', generateSecret());
                    setSecretTouched(true);
                  }
                }}
              />
            </ToggleGroupBox>

            <Field>
              <div className="flex w-full items-center justify-between gap-2">
                <FieldLabel htmlFor="apiKey">{t('evolutionHub.fields.apiKey')}</FieldLabel>
                {setBadge(apiKeyConfigured, apiKeyTouched)}
              </div>
              <Input
                id="apiKey"
                type="password"
                placeholder={apiKeyConfigured ? MASKED.repeat(4) : 'evh_pk_...'}
                {...register('EVOLUTION_HUB_API_KEY', {
                  onChange: () => setApiKeyTouched(true),
                })}
              />
            </Field>

            <Field>
              <div className="flex w-full items-center justify-between gap-2">
                <FieldLabel htmlFor="webhookSecret">{t('evolutionHub.fields.webhookSecret')}</FieldLabel>
                {setBadge(webhookSecretConfigured, secretTouched)}
              </div>
              <InputGroup>
                <InputGroupInput
                  id="webhookSecret"
                  type="password"
                  placeholder={webhookSecretConfigured ? MASKED.repeat(4) : t('evolutionHub.fields.webhookSecretPlaceholder')}
                  {...register('EVOLUTION_HUB_WEBHOOK_SECRET', {
                    onChange: () => setSecretTouched(true),
                  })}
                />
                <InputGroupAddon align="inline-end">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={t('evolutionHub.actions.generateSecret')}
                          onClick={() => {
                            setValue('EVOLUTION_HUB_WEBHOOK_SECRET', generateSecret());
                            setSecretTouched(true);
                          }}
                        />
                      }
                    >
                      <RefreshCw />
                    </TooltipTrigger>
                    <TooltipPopup>{t('evolutionHub.actions.generateSecret')}</TooltipPopup>
                  </Tooltip>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>{t('evolutionHub.fields.webhookSecretHelp')}</FieldDescription>
            </Field>

            {testResult && (
              <Alert variant={testResult.ok ? 'success' : 'error'}>
                {testResult.ok ? <CheckCircle2 /> : <AlertTriangle />}
                <AlertDescription className="text-foreground">{testResult.message}</AlertDescription>
              </Alert>
            )}
          </CardPanel>
        </Card>

        <SettingsSaveBar
          dirty={isDirty || apiKeyTouched || secretTouched}
          saving={saving}
          saveLabel={t('evolutionHub.actions.save')}
        >
          {/* Test só faz sentido depois que API Key foi salva pelo menos
              uma vez — sem credencial persistida o backend retorna
              "EVOLUTION_HUB_URL not configured" mesmo com URL no form. */}
          {apiKeyConfigured && (
            <Button type="button" variant="outline" onClick={onTest} loading={testing}>
              <PlugZap />
              {t('evolutionHub.actions.test')}
            </Button>
          )}
        </SettingsSaveBar>
      </form>

      {/* Configuração detectada no Hub — só renderiza quando integração
          está habilitada E API key salva. */}
      {enabledBool && apiKeyConfigured && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuração detectada no Evo Hub</CardTitle>
            <CardAction>
              <Button type="button" variant="outline" size="sm" onClick={loadHubPreview} disabled={previewLoading}>
                <RefreshCw className={previewLoading ? 'animate-spin' : undefined} />
                Atualizar
              </Button>
            </CardAction>
          </CardHeader>
          <CardPanel className="flex flex-col gap-6">
            {previewError && (
              <Alert variant="error">
                <AlertTriangle />
                <AlertDescription className="text-foreground">{previewError}</AlertDescription>
              </Alert>
            )}

            <section className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Plano atual</h3>
              {hubPreview?.plan ? (
                <div className="flex flex-col gap-2 rounded-xl border bg-muted/24 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{hubPreview.plan.name}</span>
                    <Badge variant="outline" className="font-mono">{hubPreview.plan.slug}</Badge>
                  </div>
                  {hubPreview.plan.description && (
                    <p className="text-muted-foreground text-xs">{hubPreview.plan.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant={hubPreview.plan.allow_shared_meta_app ? 'success' : 'secondary'}>
                      Meta App compartilhada: {hubPreview.plan.allow_shared_meta_app ? 'sim' : 'não'}
                    </Badge>
                    <Badge variant={hubPreview.plan.allow_own_meta_app ? 'success' : 'secondary'}>
                      Meta App própria (BYO): {hubPreview.plan.allow_own_meta_app ? 'sim' : 'não'}
                    </Badge>
                    <Badge variant="info">
                      Total de canais: {hubPreview.plan.max_channels_total ?? 'ilimitado'}
                    </Badge>
                  </div>
                </div>
              ) : previewLoading ? (
                <Skeleton className="h-20 rounded-xl" />
              ) : (
                loadingText('Sem dados.')
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Meta Apps disponíveis</h3>
              {hubPreview?.options ? (
                <ul className="flex flex-col divide-y rounded-xl border">
                  {hubPreview.options.allowed_modes.includes('shared') && (
                    <li className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="font-medium">Meta App da Evolution (Cloud)</span>
                      <Badge variant="secondary">compartilhada</Badge>
                    </li>
                  )}
                  {hubPreview.options.byo_credentials.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground text-xs">própria (BYO) · <span className="font-mono">{c.app_id}</span></span>
                    </li>
                  ))}
                  {hubPreview.options.allowed_modes.length === 0 && (
                    <li className="px-4 py-3 text-muted-foreground text-sm">
                      Nenhuma Meta App disponível. Cadastre uma no Evo Hub para começar a criar canais.
                    </li>
                  )}
                </ul>
              ) : previewLoading ? (
                <Skeleton className="h-12 rounded-xl" />
              ) : (
                loadingText('Sem dados.')
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Canais já criados no Hub {hubPreview && <span className="normal-case">({hubPreview.channels.length})</span>}
              </h3>
              {hubPreview && hubPreview.channels.length > 0 ? (
                <ul className="flex flex-col divide-y rounded-xl border">
                  {hubPreview.channels.slice(0, 10).map((ch) => (
                    <li key={ch.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="outline" className="font-mono uppercase">{ch.type}</Badge>
                        <span className="truncate font-medium">{ch.name}</span>
                      </div>
                      <Badge variant={ch.status === 'active' || ch.status === 'connected' ? 'success' : 'secondary'}>
                        {ch.status}
                      </Badge>
                    </li>
                  ))}
                  {hubPreview.channels.length > 10 && (
                    <li className="px-4 py-2 text-center text-muted-foreground text-xs">
                      + {hubPreview.channels.length - 10} canais
                    </li>
                  )}
                </ul>
              ) : previewLoading ? (
                <Skeleton className="h-12 rounded-xl" />
              ) : (
                loadingText('Nenhum canal criado ainda.')
              )}
            </section>
          </CardPanel>
        </Card>
      )}
    </div>
  );
}
