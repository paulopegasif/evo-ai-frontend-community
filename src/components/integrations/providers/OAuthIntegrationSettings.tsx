import { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Power, Settings, type LucideIcon } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { Integration } from '@/types/integrations';

import IntegrationPageHeader from '../shared/IntegrationPageHeader';

interface OAuthIntegrationSettingsProps {
  integrationId: string;
  displayName: string;
  description: string;
  icon: LucideIcon;
  onBack?: () => void;
}

export default function OAuthIntegrationSettings({
  integrationId,
  displayName,
  description,
  icon: Icon,
  onBack,
}: OAuthIntegrationSettingsProps) {
  const { t } = useLanguage('integrations');
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [loading, setLoading] = useState({
    get: false,
    delete: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const hasLoaded = useRef(false);

  // Load integration
  const loadIntegration = useCallback(async () => {
    setLoading(prev => ({ ...prev, get: true }));

    try {
      const integration = await integrationsService.getIntegration(integrationId);
      setIntegration(integration);
    } catch (error) {
      console.error(`Error loading ${integrationId} integration:`, error);
      toast.error(t('oauthSettings.messages.loadError', { name: displayName }));
    } finally {
      setLoading(prev => ({ ...prev, get: false }));
    }
  }, [integrationId, displayName, t]);

  // Initial load
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      loadIntegration();
    }
  }, [loadIntegration]);

  // Handlers
  const handleConnect = () => {
    if (!integration?.action) return;

    // OAuth integrations use an action URL for connection
    window.location.href = integration.action;
  };

  const handleConfigure = () => {
    // For OAuth integrations, this typically redirects to a configuration page
    // or opens a modal with additional settings
    toast.info(t('oauthSettings.configInDev'));
  };

  const handleDisconnect = () => {
    setDeleteDialogOpen(true);
  };

  // Confirm disconnect
  const confirmDisconnect = async () => {
    if (!integration) return;

    setLoading(prev => ({ ...prev, delete: true }));

    try {
      await integrationsService.deleteIntegration(integrationId);
      toast.success(t('oauthSettings.messages.disconnectSuccess', { name: displayName }));

      // Reload integration state
      await loadIntegration();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error(`Error disconnecting ${integrationId}:`, error);
      toast.error(t('oauthSettings.messages.disconnectError', { name: displayName }));
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const integrationAction = integration?.enabled ? 'disconnect' : integration?.action;

  const connected = Boolean(integration?.enabled);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        <IntegrationPageHeader
          brandId={integrationId}
          icon={Icon}
          title={t('oauthSettings.title', { name: displayName })}
          description={integration?.description || description}
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
                <Button variant="destructive-outline" size="sm" onClick={handleDisconnect}>
                  <Power />
                  {t('oauthSettings.disconnect')}
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
              {integrationAction !== 'disconnect' && (
                <Button variant="outline" size="sm" onClick={handleConfigure}>
                  <Settings />
                  {t('oauthSettings.configure')}
                </Button>
              )}
            </CardPanel>
          </Card>
        ) : (
          <Card>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Icon />
                </EmptyMedia>
                <EmptyTitle>{integration?.name || displayName}</EmptyTitle>
                <EmptyDescription>{integration?.description || description}</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={handleConnect} disabled={!integration?.action}>
                  {t('oauthSettings.connect')}
                </Button>
              </EmptyContent>
            </Empty>
          </Card>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('oauthSettings.dialog.disconnectTitle', { name: displayName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('oauthSettings.dialog.disconnectDescription', { name: displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />} disabled={loading.delete}>
              {t('oauthSettings.dialog.cancel')}
            </AlertDialogClose>
            <Button variant="destructive" onClick={confirmDisconnect} loading={loading.delete}>
              {t('oauthSettings.dialog.disconnect')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
