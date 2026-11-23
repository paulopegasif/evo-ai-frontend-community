import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { AlertCircle, AlertTriangle, Bell, ExternalLink, Hash, Power, RefreshCw, Users } from '@/components/icons';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import IntegrationPageHeader, { type IntegrationPageStatus } from '../../shared/IntegrationPageHeader';
import { Integration, SlackConfiguration } from '@/types/integrations';
import { integrationsService } from '@/services/integrations';

interface SlackIntegrationProps {
  integration: Integration;
  onBack: () => void;
}

export default function SlackIntegration({ integration, onBack }: SlackIntegrationProps) {
  const { t } = useLanguage('integrations');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [config, setConfig] = useState<SlackConfiguration | null>(null);
  const [formData, setFormData] = useState({
    webhook_url: '',
    reference_id: '',
    flag_reference_id: false,
    enable_notifications: true,
    selected_channels: [] as string[],
  });

  useEffect(() => {
    loadSlackConfiguration();
  }, []);

  const loadSlackConfiguration = async () => {
    setLoading(true);
    try {
      const config = await integrationsService.getSlackConfiguration();
      if (config) {
        setConfig(config);
        setFormData({
          webhook_url: config.webhook_url || '',
          reference_id: config.reference_id || '',
          flag_reference_id: config.flag_reference_id || false,
          enable_notifications: config.enable_notifications ?? true,
          selected_channels: config.selected_channels || [],
        });
      }
    } catch (error) {
      console.error('Error loading Slack configuration:', error);
      toast.error(t('slack.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await integrationsService.updateSlackConfiguration(formData);
      toast.success(t('slack.messages.saveSuccess'));
      await loadSlackConfiguration();
    } catch (error) {
      console.error('Error saving Slack configuration:', error);
      toast.error(t('slack.messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await integrationsService.deleteIntegration('slack');
      toast.success(t('slack.messages.disconnectSuccess'));
      onBack();
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      toast.error(t('slack.messages.disconnectError'));
    }
  };

  const getStatusType = () => {
    if (!integration.enabled) return 'disconnected';
    if (!config?.webhook_url) return 'pending';
    return 'connected';
  };


  const statusType = getStatusType();
  const status: IntegrationPageStatus =
    statusType === 'connected'
      ? { label: t('status.connected'), variant: 'success' }
      : statusType === 'pending'
        ? { label: t('status.pending'), variant: 'warning' }
        : { label: t('status.disconnected'), variant: 'outline' };
  const disabled = !integration.enabled;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        <IntegrationPageHeader
          brandId={integration.id}
          logoSrc={integration.logo || `/integrations/${integration.id}.png`}
          title={integration.name}
          description={t('slack.subtitle')}
          status={status}
          loading={loading}
          onBack={onBack}
          topActions={
            <Button variant="outline" size="sm" render={<a href="https://slack.com" target="_blank" rel="noreferrer" />}>
              {t('actions.visitOfficialSite')}
              <ExternalLink />
            </Button>
          }
          actions={
            integration.enabled && (
              <Button variant="destructive-outline" size="sm" onClick={() => setConfirmOpen(true)} loading={saving}>
                <Power />
                {t('actions.disconnect')}
              </Button>
            )
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('slack.configuration.title')}</CardTitle>
                </CardHeader>
                <CardPanel className="flex flex-col gap-5">
                  <Field>
                    <FieldLabel>{t('slack.configuration.webhookUrl.label')} *</FieldLabel>
                    <Input
                      id="webhook_url"
                      placeholder={t('slack.configuration.webhookUrl.placeholder')}
                      value={formData.webhook_url}
                      onChange={e => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
                      disabled={disabled}
                    />
                    <FieldDescription>{t('slack.configuration.webhookUrl.hint')}</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel>{t('slack.configuration.referenceId.label')}</FieldLabel>
                    <Input
                      id="reference_id"
                      placeholder={t('slack.configuration.referenceId.placeholder')}
                      value={formData.reference_id}
                      onChange={e => setFormData(prev => ({ ...prev, reference_id: e.target.value }))}
                      disabled={disabled}
                    />
                  </Field>

                  <div className="flex flex-col gap-2">
                    <ToggleRow
                      title={t('slack.configuration.flagReferenceId.label')}
                      description={t('slack.configuration.flagReferenceId.description')}
                      checked={formData.flag_reference_id}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, flag_reference_id: checked }))}
                      disabled={disabled}
                    />
                    <ToggleRow
                      title={t('slack.configuration.enableNotifications.label')}
                      description={t('slack.configuration.enableNotifications.description')}
                      checked={formData.enable_notifications}
                      onCheckedChange={checked => setFormData(prev => ({ ...prev, enable_notifications: checked }))}
                      disabled={disabled}
                    />
                  </div>
                </CardPanel>
                {integration.enabled && (
                  <CardFooter className="justify-end border-t">
                    <Button onClick={handleSave} disabled={!formData.webhook_url} loading={saving}>
                      {t('slack.configuration.saveButton')}
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {config && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('slack.channels.title')}</CardTitle>
                  </CardHeader>
                  <CardPanel className="flex flex-col gap-2">
                    {config.available_channels?.map(channel => (
                      <Label
                        key={channel.id}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3 has-data-checked:border-primary/48 has-data-checked:bg-primary/4"
                      >
                        <span className="flex items-center gap-3">
                          <Hash className="size-4 text-muted-foreground" />
                          <span className="flex flex-col">
                            <span className="font-medium text-sm">{channel.name}</span>
                            <span className="font-normal text-muted-foreground text-xs">
                              {channel.is_private ? t('slack.channels.private') : t('slack.channels.public')}
                            </span>
                          </span>
                        </span>
                        <Switch
                          checked={formData.selected_channels.includes(channel.id)}
                          onCheckedChange={checked => {
                            setFormData(prev => ({
                              ...prev,
                              selected_channels: checked
                                ? [...prev.selected_channels, channel.id]
                                : prev.selected_channels.filter(id => id !== channel.id),
                            }));
                          }}
                          disabled={disabled}
                        />
                      </Label>
                    ))}
                  </CardPanel>
                </Card>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('status.statusLabel')}</CardTitle>
                  <CardAction>
                    <Button variant="ghost" size="icon-sm" onClick={loadSlackConfiguration} aria-label={t('actions.refresh')}>
                      <RefreshCw />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardPanel className="flex flex-col gap-4">
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <InfoRow label="Workspace" value={config?.team_name} />
                    <InfoRow label={t('slack.stats.members')} value={config ? String(config.member_count || 0) : null} />
                    <InfoRow
                      label={t('slack.stats.channels')}
                      value={config ? String(config.available_channels?.length || 0) : null}
                    />
                  </dl>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Bell className="size-4" />
                      {t('slack.stats.notifications')}
                    </span>
                    <Badge variant={formData.enable_notifications ? 'success' : 'outline'}>
                      {formData.enable_notifications ? t('slack.stats.active') : t('slack.stats.inactive')}
                    </Badge>
                  </div>
                  {integration.enabled && !config?.webhook_url && (
                    <Alert variant="warning">
                      <AlertTriangle />
                      <AlertDescription>{t('slack.status.errorMessage')}</AlertDescription>
                    </Alert>
                  )}
                  {!integration.enabled && integration.action && (
                    <Button variant="outline" onClick={() => (window.location.href = integration.action || '')}>
                      <Users />
                      {t('actions.reconnect')}
                    </Button>
                  )}
                </CardPanel>
              </Card>

              <Alert variant="info">
                <AlertCircle />
                <AlertTitle>{t('slack.help.title')}</AlertTitle>
                <AlertDescription>
                  <p>{t('slack.help.step1')}</p>
                  <p>{t('slack.help.step2')}</p>
                  <p>{t('slack.help.step3')}</p>
                  <p>{t('slack.help.step4')}</p>
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDisconnect.title', { name: integration.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDisconnect.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>{t('confirmDisconnect.cancel')}</AlertDialogClose>
            <AlertDialogClose render={<Button variant="destructive" />} onClick={handleDisconnect}>
              {t('actions.disconnect')}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Label className="flex items-start justify-between gap-4 rounded-lg border p-3 has-disabled:opacity-64 has-data-checked:border-primary/48 has-data-checked:bg-primary/4">
      <span className="flex flex-col gap-1">
        <span className="font-medium text-sm">{title}</span>
        <span className="font-normal text-muted-foreground text-xs">{description}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </Label>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-end font-medium">{value || '—'}</dd>
    </div>
  );
}
