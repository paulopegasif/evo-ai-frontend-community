import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Check, Power, Settings, Brain } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/base/ConfirmDialog';

import { integrationsService } from '@/services/integrations';
import { OpenAIConfig, OpenAIHook } from '@/types/integrations';

import IntegrationPageHeader from '../../shared/IntegrationPageHeader';
import OpenAIModal from './OpenAIModal';

interface OpenAISettingsProps {
  onBack?: () => void;
}

export default function OpenAISettings({ onBack }: OpenAISettingsProps = {}) {
  const { t } = useLanguage('integrations');
  const [hook, setHook] = useState<OpenAIHook | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    create: false,
    update: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load OpenAI hook
  const loadOpenAIHook = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const hookData = await integrationsService.getOpenAIHook();
      setHook(hookData);
    } catch (error) {
      console.error('Error loading OpenAI hook:', error);
      toast.error(t('openai.settings.messages.loadError'));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadOpenAIHook();
    }
  }, [loadOpenAIHook]);

  // Handlers
  const handleConfigure = () => {
    setConfigModalOpen(true);
  };

  const handleDeleteIntegration = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfigFormSubmit = async (data: Record<string, unknown>) => {
    setLoading(prev => ({ ...prev, [hook ? 'update' : 'create']: true }));

    try {
      if (hook) {
        // Update existing hook
        await integrationsService.updateOpenAIHook(hook.id, data as unknown as OpenAIConfig);
        toast.success(t('openai.settings.messages.updateSuccess'));
      } else {
        // Create new hook
        await integrationsService.createOpenAIHook(data as unknown as OpenAIConfig);
        toast.success(t('openai.settings.messages.createSuccess'));
      }

      // Reload hook data
      await loadOpenAIHook();

      // Close modal
      setConfigModalOpen(false);
    } catch (error) {
      console.error('Error saving OpenAI config:', error);
      toast.error(
        hook
          ? t('openai.settings.messages.updateError')
          : t('openai.settings.messages.createError'),
      );
    } finally {
      setLoading(prev => ({ ...prev, create: false, update: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!hook) return;

    setLoading(prev => ({ ...prev, delete: true }));

    try {
      await integrationsService.deleteOpenAIHook(hook.id);
      toast.success(t('openai.settings.messages.deleteSuccess'));

      // Clear hook state
      setHook(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting OpenAI hook:', error);
      toast.error(t('openai.settings.messages.deleteError'));
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleConfigModalClose = (open: boolean) => {
    if (!open) {
      setConfigModalOpen(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        <IntegrationPageHeader
          icon={Brain}
          title={t('openai.header.title')}
          description={t('openai.header.subtitle')}
          loading={loading.get}
          status={
            hook
              ? hook.status
                ? { label: t('openai.settings.status.active'), variant: 'success' }
                : { label: t('openai.settings.status.inactive'), variant: 'error' }
              : null
          }
          onBack={onBack}
          actions={
            hook && (
              <>
                <Button variant="outline" size="sm" onClick={handleConfigure}>
                  <Settings />
                  {t('openai.settings.configuration.actions.edit')}
                </Button>
                <Button variant="destructive-outline" size="sm" onClick={handleDeleteIntegration}>
                  <Power />
                  {t('openai.settings.configuration.actions.remove')}
                </Button>
              </>
            )
          }
        />

        {loading.get ? (
          <SettingsSkeleton />
        ) : !hook ? (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Brain />
                </EmptyMedia>
                <EmptyTitle>{t('openai.settings.notConfigured.title')}</EmptyTitle>
                <EmptyDescription>{t('openai.settings.notConfigured.description')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleConfigure}>{t('openai.settings.notConfigured.action')}</Button>
              </EmptyContent>
            </Empty>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('openai.settings.status.title')}</CardTitle>
                </CardHeader>
                <CardPanel>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label={t('openai.settings.status.configuredAt')}>{formatDateTime(hook.created_at)}</DetailItem>
                    <DetailItem label={t('openai.settings.status.lastUpdate')}>{formatDateTime(hook.updated_at)}</DetailItem>
                  </dl>
                </CardPanel>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('openai.settings.configuration.title')}</CardTitle>
                </CardHeader>
                <CardPanel className="flex flex-col gap-4">
                  <DetailItem label={t('openai.settings.configuration.apiKey')}>
                    {hook.settings?.api_key ? (
                      <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">••••••••••••••••</code>
                    ) : (
                      <span className="text-muted-foreground">{t('openai.settings.configuration.notConfigured')}</span>
                    )}
                  </DetailItem>
                  <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-3.5 py-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-medium text-sm">
                        {t('openai.modal.fields.enableAudioTranscription.label')}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {t('openai.modal.fields.enableAudioTranscription.description')}
                      </span>
                    </div>
                    {hook.settings?.enable_audio_transcription ? (
                      <Badge variant="success">{t('openai.settings.status.active')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('openai.settings.status.inactive')}</Badge>
                    )}
                  </div>
                </CardPanel>
              </Card>
            </div>

            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-base">{t('openai.settings.features.title')}</CardTitle>
              </CardHeader>
              <CardPanel>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {[
                  'openai.settings.features.suggestions',
                  'openai.settings.features.summaries',
                  'openai.settings.features.improvement',
                  'openai.settings.features.correction',
                  'openai.settings.features.labels',
                  ].map(key => (
                    <li key={key} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      <CardDescription className="text-foreground">{t(key)}</CardDescription>
                    </li>
                  ))}
                </ul>
              </CardPanel>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('openai.settings.deleteDialog.title')}
        description={t('openai.settings.deleteDialog.description')}
        cancelLabel={t('openai.settings.deleteDialog.cancel')}
        confirmLabel={t('openai.settings.deleteDialog.confirm')}
        onConfirm={confirmDelete}
        loading={loading.delete}
      />

      <OpenAIModal
        hook={hook || undefined}
        open={configModalOpen}
        onOpenChange={handleConfigModalClose}
        onSubmit={handleConfigFormSubmit}
        isNew={!hook}
        loading={loading.create || loading.update}
      />
    </div>
  );
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium text-sm">{children}</dd>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
      <Card className="lg:col-span-2">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardPanel className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardPanel>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardPanel className="flex flex-col gap-2.5">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </CardPanel>
      </Card>
    </div>
  );
}
