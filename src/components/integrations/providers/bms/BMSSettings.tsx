import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Check, Power, Settings, MessageSquare } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmDialog from '@/components/base/ConfirmDialog';

import { integrationsService } from '@/services/integrations';
import { BMSHook } from '@/types/integrations';

import IntegrationPageHeader from '../../shared/IntegrationPageHeader';
import BMSModal from './BMSModal';

interface BMSSettingsProps {
  onBack?: () => void;
}

export default function BMSSettings({ onBack }: BMSSettingsProps = {}) {
  const { t } = useLanguage('integrations');
  const [hook, setHook] = useState<BMSHook | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    create: false,
    update: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load BMS hook
  const loadBMSHook = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const hookData = (await integrationsService.getIntegrationHook('bms')) as BMSHook | null;
      setHook(hookData);
    } catch (error) {
      console.error('Error loading BMS hook:', error);
      toast.error(t('bms.messages.loadError'));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadBMSHook();
    }
  }, [loadBMSHook]);

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
        await integrationsService.updateIntegrationHook(hook.id, data as Record<string, unknown>);
        toast.success(t('bms.messages.updateSuccess'));
      } else {
        // Create new hook
        await integrationsService.createIntegrationHook('bms', data as Record<string, unknown>);
        toast.success(t('bms.messages.createSuccess'));
      }

      // Reload hook data
      await loadBMSHook();

      // Close modal
      setConfigModalOpen(false);
    } catch (error) {
      console.error('Error saving BMS config:', error);
      toast.error(hook ? t('bms.messages.updateError') : t('bms.messages.createError'));
    } finally {
      setLoading(prev => ({ ...prev, create: false, update: false }));
    }
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!hook) return;

    setLoading(prev => ({ ...prev, delete: true }));

    try {
      await integrationsService.deleteIntegrationHook(hook.id);
      toast.success(t('bms.messages.deleteSuccess'));

      // Clear hook state
      setHook(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting BMS hook:', error);
      toast.error(t('bms.messages.deleteError'));
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
          icon={MessageSquare}
          title={t('bms.title')}
          description={t('bms.subtitle')}
          loading={loading.get}
          status={
            hook
              ? hook.status
                ? { label: t('bms.status.active'), variant: 'success' }
                : { label: t('bms.status.inactive'), variant: 'error' }
              : null
          }
          onBack={onBack}
          actions={
            hook && (
              <>
                <Button variant="outline" size="sm" onClick={handleConfigure}>
                  <Settings />
                  {t('bms.configuration.edit')}
                </Button>
                <Button variant="destructive-outline" size="sm" onClick={handleDeleteIntegration}>
                  <Power />
                  {t('bms.configuration.remove')}
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
                  <MessageSquare />
                </EmptyMedia>
                <EmptyTitle>{t('bms.notConfigured')}</EmptyTitle>
                <EmptyDescription>{t('bms.notConfiguredDescription')}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleConfigure}>{t('bms.configureBMS')}</Button>
              </EmptyContent>
            </Empty>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('bms.status.title')}</CardTitle>
                </CardHeader>
                <CardPanel>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label={t('bms.status.configuredAt')}>{formatDateTime(hook.created_at)}</DetailItem>
                    <DetailItem label={t('bms.status.lastUpdate')}>{formatDateTime(hook.updated_at)}</DetailItem>
                  </dl>
                </CardPanel>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t('bms.configuration.title')}</CardTitle>
                </CardHeader>
                <CardPanel className="flex flex-col gap-4">
                  <DetailItem label={t('bms.configuration.apiKey')}>
                    {hook.settings?.api_key ? (
                      <code className="rounded-md bg-muted px-2 py-1 font-mono text-sm">••••••••••••••••</code>
                    ) : (
                      <span className="text-muted-foreground">{t('bms.configuration.notConfigured')}</span>
                    )}
                  </DetailItem>
                  <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    {(
                      [
                        ['enable_contact_sync', 'bms.configuration.contactSync'],
                        ['enable_label_sync', 'bms.configuration.labelSync'],
                        ['enable_custom_attributes_sync', 'bms.configuration.customAttributes'],
                        ['enable_campaign_sync', 'bms.configuration.campaignSync'],
                      ] as const
                    ).map(([field, label]) => (
                      <DetailItem key={field} label={t(label)}>
                        {hook.settings?.[field] ? (
                          <Badge variant="success">{t('bms.configuration.enabled')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('bms.configuration.disabled')}</Badge>
                        )}
                      </DetailItem>
                    ))}
                  </dl>
                </CardPanel>
              </Card>
            </div>

            <Card className="self-start">
              <CardHeader>
                <CardTitle className="text-base">{t('bms.featuresCard.title')}</CardTitle>
              </CardHeader>
              <CardPanel>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {[
                  'bms.featuresCard.contactSync',
                  'bms.featuresCard.labelManagement',
                  'bms.featuresCard.customAttributes',
                  'bms.featuresCard.campaigns',
                  'bms.featuresCard.unifiedHistory',
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
        title={t('bms.deleteDialog.title')}
        description={t('bms.deleteDialog.description')}
        cancelLabel={t('bms.deleteDialog.cancel')}
        confirmLabel={t('bms.deleteDialog.remove')}
        onConfirm={confirmDelete}
        loading={loading.delete}
      />

      <BMSModal
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
