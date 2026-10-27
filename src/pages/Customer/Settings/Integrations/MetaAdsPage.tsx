import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@evoapi/design-system';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@evoapi/design-system/alert-dialog';
import { AlertTriangle, ArrowRight, BarChart3, Clock, KeyRound, PlugZap, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import IntegrationBackButton from '@/components/integrations/shared/IntegrationBackButton';
import BrandIcon from '@/components/BrandIcon';
import { usePermissions } from '@/contexts/PermissionsContext';
import { metaAdsService } from '@/services/integrations/metaAdsService';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import type { MetaAdsConnectionStatus, MetaAdsIntegration } from '@/types/integrations';

const AD_ACCOUNT_PATTERN = /^(act_)?\d{5,25}$/;
const POLL_INTERVAL_MS = 5000;

const controlClassName = 'bg-sidebar border-sidebar-border text-sidebar-foreground';

const STATUS_BADGES: Record<MetaAdsConnectionStatus, { label: string; className: string }> = {
  connected: {
    label: 'Conectado',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  error: {
    label: 'Erro',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  token_invalid: {
    label: 'Token expirado ou revogado',
    className: 'bg-destructive/10 text-destructive border-destructive/30',
  },
  not_configured: {
    label: 'Não configurado',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : null;

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

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/leads')} className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Ver tracking de leads
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Button>
          <Button size="sm" onClick={handleSync} disabled={syncDisabled} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
        </div>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg border border-border bg-card flex items-center justify-center shrink-0">
                <BrandIcon id="meta_ads" className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Meta Ads</h1>
                  {!loading && (
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Importe campanhas e investimento da sua conta de anúncios para ver leads, agendamentos, receita, custo
                  por lead e ROAS de cada campanha.
                </p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
                  <Clock className="h-4 w-4" />
                  Última sincronização:{' '}
                  <span className="font-medium text-foreground">{lastSync || 'Nunca sincronizado'}</span>
                </div>
              </div>
            </div>

            {configured && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleTest} disabled={!canEdit || isTesting}>
                  <PlugZap className="h-4 w-4 mr-2" />
                  {isTesting ? 'Testando…' : 'Testar conexão'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDisconnect(true)}
                  disabled={!canDelete}
                  className="text-destructive hover:text-destructive"
                >
                  Desconectar
                </Button>
              </div>
            )}
          </div>

          {integration?.last_error && (
            <div className="mt-5 flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{integration.last_error.message}</p>
                <p className="text-muted-foreground mt-0.5">
                  {formatDateTime(integration.last_error.at)}
                  {status === 'token_invalid' &&
                    ' • Gere um novo token do System User no Business Manager e salve abaixo para retomar a sincronização.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Connection form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Credenciais
            </CardTitle>
            <CardDescription>
              Use um token de System User do Business Manager com as permissões <code>ads_read</code> e{' '}
              <code>business_management</code>, com acesso à conta de anúncios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta-ad-account">ID da conta de anúncios</Label>
              <Input
                id="meta-ad-account"
                value={adAccountId}
                onChange={e => setAdAccountId(e.target.value)}
                placeholder="act_1234567890"
                disabled={!canEdit || loading}
                className={controlClassName}
              />
              {adAccountId && !accountIdValid ? (
                <p className="text-xs text-destructive">Use o formato act_1234567890 ou apenas os números.</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Encontre em Gerenciador de Anúncios → Configurações da conta.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta-token">Token de acesso</Label>
              <Input
                id="meta-token"
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                placeholder={configured ? `Manter o token atual (${integration?.token_hint || '••••'})` : 'EAAB…'}
                disabled={!canEdit || loading}
                className={controlClassName}
              />
              <p className="text-xs text-muted-foreground">
                O token é validado na Meta antes de salvar e fica criptografado. Ele nunca é exibido novamente.
              </p>
            </div>

            <Button onClick={handleSave} disabled={!canEdit || isSaving || loading || !adAccountId}>
              {isSaving ? 'Validando…' : configured ? 'Salvar alterações' : 'Conectar conta'}
            </Button>
          </CardContent>
        </Card>

        {/* Account & totals */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conta conectada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {configured ? (
                <>
                  <InfoRow label="Nome" value={integration?.account_name} />
                  <InfoRow label="Conta" value={integration?.ad_account_id} />
                  <InfoRow label="Moeda" value={integration?.currency} />
                  <InfoRow label="Fuso horário" value={integration?.timezone_name} />
                  <InfoRow label="Token" value={integration?.token_hint} />
                  <InfoRow label="Graph API" value={integration?.graph_api_version} />
                </>
              ) : (
                <p className="text-muted-foreground">Nenhuma conta conectada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados sincronizados</CardTitle>
              <CardDescription>Campanhas pausadas e arquivadas também são importadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <CountTile label="Campanhas" value={integration?.counts?.campaigns ?? 0} />
                <CountTile label="Conjuntos" value={integration?.counts?.adsets ?? 0} />
                <CountTile label="Anúncios" value={integration?.counts?.ads ?? 0} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar Meta Ads?</AlertDialogTitle>
            <AlertDialogDescription>
              O token será apagado e as sincronizações automáticas param. As campanhas e métricas já importadas continuam
              disponíveis no tracking de leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value || '—'}</span>
    </div>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-sidebar-border bg-sidebar p-3 text-center">
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
