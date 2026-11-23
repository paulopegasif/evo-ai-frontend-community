import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Power, Settings, type LucideIcon } from '@/components/icons';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';

import { integrationsService } from '@/services/integrations';
import { IntegrationHook } from '@/types/integrations';

import IntegrationPageHeader from '../shared/IntegrationPageHeader';

interface GenericIntegrationSettingsProps {
  appId: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  configComponent: React.ComponentType<{
    hook?: IntegrationHook;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    isNew?: boolean;
    loading?: boolean;
  }>;
  onBack?: () => void;
}

export default function GenericIntegrationSettings({
  appId,
  displayName,
  description,
  icon: Icon,
  configComponent: ConfigComponent,
  onBack,
}: GenericIntegrationSettingsProps) {
  const { t } = useLanguage('integrations');
  const [hook, setHook] = useState<IntegrationHook | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    create: false,
    update: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load integration hook
  const loadIntegrationHook = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const hookData = await integrationsService.getIntegrationHook(appId);
      setHook(hookData);
    } catch (error) {
      console.error(`Error loading ${appId} hook:`, error);
      toast.error(t('genericSettings.messages.loadError', { name: displayName }));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [appId, displayName, t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadIntegrationHook();
    }
  }, [loadIntegrationHook]);

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
        await integrationsService.updateIntegrationHook(hook.id, data);
        toast.success(t('genericSettings.messages.updateSuccess', { name: displayName }));
      } else {
        // Create new hook
        await integrationsService.createIntegrationHook(appId, data);
        toast.success(t('genericSettings.messages.createSuccess', { name: displayName }));
      }

      // Reload hook data
      await loadIntegrationHook();

      // Close modal
      setConfigModalOpen(false);
    } catch (error) {
      console.error(`Error saving ${appId} config:`, error);
      toast.error(
        hook
          ? t('genericSettings.messages.updateError', { name: displayName })
          : t('genericSettings.messages.createError', { name: displayName }),
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
      await integrationsService.deleteIntegrationHook(hook.id);
      toast.success(t('genericSettings.messages.deleteSuccess', { name: displayName }));

      // Clear hook state
      setHook(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error(`Error deleting ${appId} hook:`, error);
      toast.error(t('genericSettings.messages.deleteError', { name: displayName }));
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleConfigModalClose = (open: boolean) => {
    if (!open) {
      setConfigModalOpen(false);
    }
  };

  const connected = Boolean(hook);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        <IntegrationPageHeader
          brandId={appId}
          icon={Icon}
          title={t('genericSettings.title', { name: displayName })}
          description={description}
          loading={loading.get}
          status={
            connected
              ? { label: t('status.connected'), variant: 'success' }
              : { label: t('status.notConfigured'), variant: 'outline' }
          }
          onBack={onBack}
          actions={
            connected && (
              <>
                <Button variant="destructive-outline" size="sm" onClick={handleDeleteIntegration}>
                  <Power />
                  {t('genericSettings.disconnect')}
                </Button>
              </>
            )
          }
        />

        {loading.get ? (
          <Card className="p-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-3 h-4 w-80" />
          </Card>
        ) : connected ? (
          <Card>
            <CardPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-3">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-success" />
                <span className="text-sm">{t('status.connected')}</span>
              </span>

              <Button variant="outline" size="sm" onClick={handleConfigure}>
                <Settings />
                {t('genericSettings.configure')}
              </Button>
            </CardPanel>
          </Card>
        ) : (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon />
                </EmptyMedia>
                <EmptyTitle>{displayName}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleConfigure}>{t('genericSettings.connect')}</Button>
              </EmptyContent>
            </Empty>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('genericSettings.dialog.deleteTitle', { name: displayName })}
        description={t('genericSettings.dialog.deleteDescription', { name: displayName })}
        cancelLabel={t('genericSettings.dialog.cancel')}
        confirmLabel={t('genericSettings.dialog.remove')}
        onConfirm={confirmDelete}
        loading={loading.delete}
      />

      {/* Config Modal */}
      <ConfigComponent
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
