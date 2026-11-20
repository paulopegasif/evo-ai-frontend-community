import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Clock, PlugZap, Power, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
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
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import BrandIcon from '@/components/BrandIcon';
import { usePermissions } from '@/contexts/PermissionsContext';
import { metaAdsService } from '@/services/integrations/metaAdsService';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import type { MetaAdsConnectionStatus, MetaAdsIntegration } from '@/types/integrations';

const AD_ACCOUNT_PATTERN = /^(act_)?\d{5,25}$/;
const POLL_INTERVAL_MS = 5000;

const STATUS_BADGES: Record<
  MetaAdsConnectionStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'outline' }
> = {
  connected: { label: 'Conectado', variant: 'success' },
  error: { label: 'Erro', variant: 'warning' },
  token_invalid: { label: 'Token expirado ou revogado', variant: 'error' },
  not_configured: { label: 'Não configurado', variant: 'outline' },
};

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : null;

// History dates are calendar days (yyyy-MM-dd); parseISO keeps them in local time.
const historyLabel = (integration: MetaAdsIntegration | null) => {
  if (!integration?.history_synced_from) return 'Importação do histórico ainda não iniciada';
  const since = format(parseISO(integration.history_synced_from), 'dd/MM/yyyy');
  return integration.history_complete
    ? `Histórico completo desde ${since}`
    : `Preenchendo histórico (até 24 meses): completo desde ${since}`;
};

export default function MetaAdsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canEdit = can('integrations', 'update');
  const canSync = can('integrations', 'execute');
  const canDelete = can('integrations', 'delete');

  const [integration, setIntegration] = useState<MetaAdsIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [adAccountId, setAdAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isRequestingSync, setIsRequestingSync] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const applyIntegration = (data: MetaAdsIntegration) => {
    setIntegration(data);
    setAdAccountId(data.ad_account_id || '');
  };

  const loadIntegration = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await metaAdsService.get();
      setIntegration(data);
      if (!silent) setAdAccountId(data.ad_account_id || '');
    } catch (err) {
      if (!silent) toast.error(getApiErrorMessage(err, 'Não foi possível carregar a integração Meta Ads.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  // Refresh status while a sync runs, so totals and "last sync" update by themselves.
  const syncing = Boolean(integration?.sync_in_progress);
  useEffect(() => {
    if (!syncing) return undefined;
    const timer = window.setInterval(() => loadIntegration(true), POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [syncing, loadIntegration]);

  const configured = Boolean(integration?.configured);
  const status: MetaAdsConnectionStatus = integration?.connection_status || 'not_configured';
  const badge = STATUS_BADGES[status];
  const accountIdValid = AD_ACCOUNT_PATTERN.test(adAccountId.trim());
  const lastSync = formatDateTime(integration?.last_synced_at);

  const handleSave = async () => {
    if (!accountIdValid) {
      toast.error('ID da conta de anúncios inválido. Use o formato act_1234567890.');
      return;
    }
    if (!configured && !accessToken.trim()) {
      toast.error('Informe o token de acesso.');
      return;
    }

    setIsSaving(true);
    try {
      const data = await metaAdsService.save({
        ad_account_id: adAccountId.trim(),
        access_token: accessToken.trim() || undefined,
      });
      applyIntegration(data);
      setAccessToken('');
      toast.success(configured ? 'Configuração atualizada.' : 'Conta Meta Ads conectada. A primeira sincronização foi iniciada.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível validar a conexão com a Meta.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      applyIntegration(await metaAdsService.test());
      toast.success('Conexão com a Meta funcionando.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Falha ao testar a conexão.'));
      loadIntegration(true);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    setIsRequestingSync(true);
    try {
      setIntegration(await metaAdsService.sync());
      toast.success('Sincronização iniciada.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível iniciar a sincronização.'));
    } finally {
      setIsRequestingSync(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      applyIntegration(await metaAdsService.disconnect());
      setAccessToken('');
      toast.success('Integração Meta Ads desconectada. O histórico importado foi mantido.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível desconectar a integração.'));
    } finally {
      setConfirmDisconnect(false);
    }
  };

  const syncDisabled = !configured || !canSync || syncing || isRequestingSync || status === 'token_invalid';
  const disabled = !canEdit || loading;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft />
            Integrações
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/tracking')}>
              <BarChart3 />
              Ver tracking de leads
              <ArrowRight className="text-muted-foreground" />
            </Button>
            <Button size="sm" onClick={handleSync} disabled={syncDisabled} loading={isRequestingSync}>
              <RefreshCw className={syncing ? 'animate-spin' : undefined} />
              {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
            </Button>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
              <BrandIcon id="meta_ads" className="size-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-xl tracking-tight">Meta Ads</h1>
                {loading ? <Skeleton className="h-5 w-24" /> : <Badge variant={badge.variant}>{badge.label}</Badge>}
              </div>
              <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
                Importe campanhas e investimento da sua conta de anúncios para ver leads, agendamentos, receita, custo
                por lead e ROAS de cada campanha.
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
                <Clock className="size-4" />
                Última sincronização:
                <span className="font-medium text-foreground">{lastSync || 'Nunca sincronizado'}</span>
              </p>
            </div>
          </div>
          {configured && (
            <div className="flex shrink-0 items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={!canEdit} loading={isTesting}>
                <PlugZap />
                Testar conexão
              </Button>
              <Button
                variant="destructive-outline"
                size="sm"
                onClick={() => setConfirmDisconnect(true)}
                disabled={!canDelete}
              >
                <Power />
                Desconectar
              </Button>
            </div>
          )}
        </div>

        {integration?.last_error && (
          <Alert variant="error">
            <AlertTriangle />
            <AlertTitle>{integration.last_error.message}</AlertTitle>
            <AlertDescription>
              {formatDateTime(integration.last_error.at)}
              {status === 'token_invalid' &&
                ' • Gere um novo token do System User no Business Manager e salve abaixo para retomar a sincronização.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Connection form */}
          <Card>
            <CardHeader>
              <CardTitle>Credenciais</CardTitle>
              <CardDescription>
                Use um token de System User do Business Manager com as permissões <code>ads_read</code> e{' '}
                <code>business_management</code>, com acesso à conta de anúncios.
              </CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <Field invalid={Boolean(adAccountId) && !accountIdValid}>
                <FieldLabel>ID da conta de anúncios</FieldLabel>
                <Input
                  id="meta-ad-account"
                  value={adAccountId}
                  onChange={e => setAdAccountId(e.target.value)}
                  placeholder="act_1234567890"
                  disabled={disabled}
                />
                {adAccountId && !accountIdValid ? (
                  <FieldError match>Use o formato act_1234567890 ou apenas os números.</FieldError>
                ) : (
                  <FieldDescription>Encontre em Gerenciador de Anúncios → Configurações da conta.</FieldDescription>
                )}
              </Field>

              <Field>
                <FieldLabel>Token de acesso</FieldLabel>
                <Input
                  id="meta-token"
                  type="password"
                  autoComplete="off"
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                  placeholder={configured ? `Manter o token atual (${integration?.token_hint || '••••'})` : 'EAAB…'}
                  disabled={disabled}
                />
                <FieldDescription>
                  O token é validado na Meta antes de salvar e fica criptografado. Ele nunca é exibido novamente.
                </FieldDescription>
              </Field>
            </CardPanel>
            <CardFooter className="justify-end border-t">
              <Button onClick={handleSave} disabled={disabled || !adAccountId} loading={isSaving}>
                {configured ? 'Salvar alterações' : 'Conectar conta'}
              </Button>
            </CardFooter>
          </Card>

          {/* Account & totals */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conta conectada</CardTitle>
              </CardHeader>
              <CardPanel>
                {configured ? (
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <InfoRow label="Nome" value={integration?.account_name} />
                    <InfoRow label="Conta" value={integration?.ad_account_id} mono />
                    <InfoRow label="Moeda" value={integration?.currency} />
                    <InfoRow label="Fuso horário" value={integration?.timezone_name} />
                    <InfoRow label="Token" value={integration?.token_hint} mono />
                    <InfoRow label="Graph API" value={integration?.graph_api_version} mono />
                  </dl>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma conta conectada.</p>
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dados sincronizados</CardTitle>
                <CardDescription>Campanhas pausadas e arquivadas também são importadas.</CardDescription>
              </CardHeader>
              <CardPanel className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  <CountTile label="Campanhas" value={integration?.counts?.campaigns ?? 0} />
                  <CountTile label="Conjuntos" value={integration?.counts?.adsets ?? 0} />
                  <CountTile label="Anúncios" value={integration?.counts?.ads ?? 0} />
                </div>
                {configured && (
                  <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Clock className="size-3.5 shrink-0" />
                    {historyLabel(integration)}
                  </p>
                )}
              </CardPanel>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Meta Ads?</AlertDialogTitle>
            <AlertDialogDescription>
              O token será apagado e as sincronizações automáticas param. As campanhas e métricas já importadas continuam
              disponíveis no tracking de leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancelar</AlertDialogClose>
            <Button variant="destructive" onClick={handleDisconnect}>
              Desconectar
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`truncate text-end font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</dd>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/32 p-3 text-center">
      <div className="font-semibold text-xl tabular-nums">{value}</div>
      <div className="mt-0.5 text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
