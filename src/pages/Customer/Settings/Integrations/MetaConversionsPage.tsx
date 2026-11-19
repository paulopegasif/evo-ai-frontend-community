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
  Switch,
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
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FlaskConical,
  KeyRound,
  ListChecks,
  PlugZap,
  Send,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import IntegrationBackButton from '@/components/integrations/shared/IntegrationBackButton';
import BrandIcon from '@/components/BrandIcon';
import { usePermissions } from '@/contexts/PermissionsContext';
import { metaConversionsService } from '@/services/integrations/metaConversionsService';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import type {
  MetaConversionsConnectionStatus,
  MetaConversionsEvent,
  MetaConversionsIntegration,
  MetaConversionsTestEventResult,
  MetaConversionsTokenSource,
} from '@/types/integrations';

const ID_PATTERN = /^\d{5,25}$/;
const EVENTS_MANAGER_URL = 'https://business.facebook.com/events_manager2';
const BUSINESS_SETTINGS_URL = 'https://business.facebook.com/settings';

const controlClassName = 'bg-sidebar border-sidebar-border text-sidebar-foreground';

const STATUS_BADGES: Record<MetaConversionsConnectionStatus, { label: string; className: string }> = {
  connected: {
    label: 'Conectado',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  },
  error: {
    label: 'Erro',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30',
  },
  not_configured: {
    label: 'Não configurado',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const EVENTS: { id: MetaConversionsEvent; label: string; when: string }[] = [
  { id: 'lead', label: 'Lead', when: 'quando um lead chega de um anúncio' },
  { id: 'qualified', label: 'Lead qualificado', when: 'quando o lead agenda ou entra numa etapa qualificada do funil' },
  { id: 'purchase', label: 'Venda', when: 'quando o atendimento é marcado como realizado, com o valor' },
];

const EMPTY_EVENT_NAMES: Record<MetaConversionsEvent, string> = { lead: '', qualified: '', purchase: '' };

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: pt }) : null;

export default function MetaConversionsPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canEdit = can('integrations', 'update');
  const canDelete = can('integrations', 'delete');

  const [integration, setIntegration] = useState<MetaConversionsIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [wabaId, setWabaId] = useState('');
  const [pageId, setPageId] = useState('');
  const [tokenSource, setTokenSource] = useState<MetaConversionsTokenSource>('own');
  const [accessToken, setAccessToken] = useState('');
  const [testEventCode, setTestEventCode] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [eventNames, setEventNames] = useState(EMPTY_EVENT_NAMES);
  const [showEventNames, setShowEventNames] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEvent, setTestEvent] = useState<MetaConversionsEvent>('lead');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<MetaConversionsTestEventResult | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const applyIntegration = (data: MetaConversionsIntegration) => {
    setIntegration(data);
    setWabaId(data.waba_id || '');
    setPageId(data.page_id || '');
    setTestEventCode(data.test_event_code || '');
    setEnabled(data.enabled);
    setTokenSource(data.configured ? data.token_source : data.meta_ads_token_available ? 'meta_ads' : 'own');
    // Only names that differ from Meta's standard ones are shown in the fields.
    const custom = { ...EMPTY_EVENT_NAMES };
    (Object.keys(custom) as MetaConversionsEvent[]).forEach(event => {
      const name = data.event_names?.[event];
      if (name && name !== data.default_event_names?.[event]) custom[event] = name;
    });
    setEventNames(custom);
    if (!data.configured) setShowGuide(true);
  };

  const loadIntegration = useCallback(async () => {
    setLoading(true);
    try {
      applyIntegration(await metaConversionsService.get());
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível carregar a integração.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const configured = Boolean(integration?.configured);
  const status: MetaConversionsConnectionStatus = integration?.connection_status || 'not_configured';
  const badge = STATUS_BADGES[status];
  const wabaValid = ID_PATTERN.test(wabaId.trim());
  const pageValid = !pageId.trim() || ID_PATTERN.test(pageId.trim());
  const metaAdsTokenAvailable = Boolean(integration?.meta_ads_token_available);
  const needsToken = tokenSource === 'own' && (!configured || integration?.token_source !== 'own');
  const stats = integration?.stats;

  const handleSave = async () => {
    if (!wabaValid) {
      toast.error('ID da conta do WhatsApp Business inválido (só números).');
      return;
    }
    if (!pageValid) {
      toast.error('ID da Página inválido (só números).');
      return;
    }
    if (needsToken && !accessToken.trim()) {
      toast.error('Informe o token de acesso.');
      return;
    }

    setIsSaving(true);
    try {
      const data = await metaConversionsService.save({
        waba_id: wabaId.trim(),
        page_id: pageId.trim() || undefined,
        token_source: tokenSource,
        access_token: tokenSource === 'own' ? accessToken.trim() || undefined : undefined,
        test_event_code: testEventCode.trim() || undefined,
        enabled,
        event_names: eventNames,
      });
      applyIntegration(data);
      setAccessToken('');
      toast.success(
        data.enabled
          ? 'Configuração salva. As conversões estão sendo enviadas para a Meta.'
          : 'Configuração salva. O envio está desligado.',
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível validar a conexão com a Meta.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      setIntegration(await metaConversionsService.test());
      toast.success('Conexão com a Meta funcionando.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Falha ao testar a conexão.'));
      loadIntegration();
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEvent = async () => {
    setIsSendingTest(true);
    setTestResult(null);
    try {
      setTestResult(await metaConversionsService.sendTestEvent(testEvent));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível enviar o evento de teste.'));
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      applyIntegration(await metaConversionsService.disconnect());
      setAccessToken('');
      setTestResult(null);
      toast.success('Conversões da Meta desconectadas. O envio foi interrompido.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível desconectar a integração.'));
    } finally {
      setConfirmDisconnect(false);
    }
  };

  const savedTestCode = integration?.test_event_code;

  return (
    <div className="h-full flex flex-col gap-4 p-3 sm:p-4 overflow-y-auto">
      <div className="flex items-center justify-between gap-3">
        <IntegrationBackButton onBack={() => navigate('/settings/integrations')} />
        <Button variant="outline" size="sm" asChild className="gap-2">
          <a href={EVENTS_MANAGER_URL} target="_blank" rel="noreferrer">
            Gerenciador de Eventos
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </Button>
      </div>

      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-lg border border-border bg-card flex items-center justify-center shrink-0">
                <BrandIcon id="meta_conversions" className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Conversões da Meta</h1>
                  {!loading && (
                    <Badge variant="outline" className={badge.className}>
                      {badge.label}
                    </Badge>
                  )}
                  {!loading && configured && (
                    <Badge
                      variant="outline"
                      className={
                        integration?.enabled
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted text-muted-foreground border-border'
                      }
                    >
                      {integration?.enabled ? 'Envio ativo' : 'Envio desligado'}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Informa à Meta quais leads dos anúncios de clique para o WhatsApp viraram leads qualificados e vendas. Com
                  isso, as campanhas aprendem a buscar pessoas parecidas com quem realmente vira cliente.
                </p>
                {configured && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
                    <Clock className="h-4 w-4" />
                    Último envio:{' '}
                    <span className="font-medium text-foreground">
                      {formatDateTime(stats?.last_sent_at) || 'Nenhum evento enviado ainda'}
                    </span>
                  </div>
                )}
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
                <p className="text-muted-foreground mt-0.5">{formatDateTime(integration.last_error.at)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup guide */}
      <Card>
        <button
          type="button"
          onClick={() => setShowGuide(open => !open)}
          className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
        >
          <span className="flex items-center gap-2 font-semibold text-base">
            <ListChecks className="h-4 w-4 text-primary" />
            Como conseguir os dados na Meta
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`} />
        </button>
        {showGuide && (
          <CardContent className="pt-0 text-sm text-muted-foreground">
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Abra as{' '}
                <a href={BUSINESS_SETTINGS_URL} target="_blank" rel="noreferrer" className="text-primary underline">
                  configurações do Business Manager
                </a>{' '}
                da empresa, com um administrador.
              </li>
              <li>
                Em <strong>Contas → Contas do WhatsApp</strong>, escolha a conta do número dos anúncios e copie o{' '}
                <strong>ID da conta do WhatsApp Business</strong>.
              </li>
              <li>
                Em <strong>Usuários → Usuários do sistema</strong>, crie (ou escolha) um usuário Admin. Em{' '}
                <strong>Atribuir ativos</strong>, dê a ele a conta do WhatsApp com controle total.
              </li>
              <li>
                Clique em <strong>Gerar token</strong>, escolha o app, validade <strong>Nunca</strong> e marque{' '}
                <code>whatsapp_business_management</code>, <code>whatsapp_business_manage_events</code> e{' '}
                <code>business_management</code>. Se marcar também <code>ads_read</code>, o mesmo token serve para a
                integração Meta Ads.
              </li>
              <li>
                Opcional: em <strong>Contas → Páginas</strong>, copie o <strong>ID da Página</strong> do Facebook. Ele
                permite enviar conversões de leads que chegaram sem o identificador do clique no anúncio.
              </li>
              <li>
                Cole os dados abaixo e salve. O CRM valida o token e cria o conjunto de dados (dataset) da conta
                automaticamente.
              </li>
            </ol>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Configuration form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-primary" />
              Configuração
            </CardTitle>
            <CardDescription>
              O token precisa das permissões <code>whatsapp_business_management</code> e{' '}
              <code>whatsapp_business_manage_events</code> na conta do WhatsApp Business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capi-waba">ID da conta do WhatsApp Business</Label>
                <Input
                  id="capi-waba"
                  value={wabaId}
                  onChange={e => setWabaId(e.target.value)}
                  placeholder="102290129340398"
                  inputMode="numeric"
                  disabled={!canEdit || loading}
                  className={controlClassName}
                />
                {wabaId && !wabaValid && <p className="text-xs text-destructive">Use apenas os números do ID.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="capi-page">
                  ID da Página <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                <Input
                  id="capi-page"
                  value={pageId}
                  onChange={e => setPageId(e.target.value)}
                  placeholder="123456789012345"
                  inputMode="numeric"
                  disabled={!canEdit || loading}
                  className={controlClassName}
                />
                {pageValid ? (
                  <p className="text-xs text-muted-foreground">Para leads sem o identificador do clique no anúncio.</p>
                ) : (
                  <p className="text-xs text-destructive">Use apenas os números do ID.</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Token de acesso</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <TokenOption
                  selected={tokenSource === 'meta_ads'}
                  disabled={!canEdit || loading || !metaAdsTokenAvailable}
                  onSelect={() => setTokenSource('meta_ads')}
                  title="Usar o token da integração Meta Ads"
                  description={
                    metaAdsTokenAvailable
                      ? 'O token precisa ter também as permissões do WhatsApp.'
                      : 'Conecte a integração Meta Ads para usar esta opção.'
                  }
                />
                <TokenOption
                  selected={tokenSource === 'own'}
                  disabled={!canEdit || loading}
                  onSelect={() => setTokenSource('own')}
                  title="Usar outro token"
                  description="Um token só para as conversões."
                />
              </div>
              {tokenSource === 'own' && (
                <>
                  <Input
                    id="capi-token"
                    type="password"
                    autoComplete="off"
                    value={accessToken}
                    onChange={e => setAccessToken(e.target.value)}
                    placeholder={
                      configured && integration?.token_source === 'own'
                        ? `Manter o token atual (${integration?.token_hint || '••••'})`
                        : 'EAAB…'
                    }
                    disabled={!canEdit || loading}
                    className={controlClassName}
                  />
                  <p className="text-xs text-muted-foreground">
                    O token é validado na Meta antes de salvar e fica criptografado. Ele nunca é exibido novamente.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capi-test-code">
                Código de teste <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Input
                id="capi-test-code"
                value={testEventCode}
                onChange={e => setTestEventCode(e.target.value)}
                placeholder="TEST12345"
                disabled={!canEdit || loading}
                className={controlClassName}
              />
              <p className="text-xs text-muted-foreground">
                Pegue em Gerenciador de Eventos → seu conjunto de dados → Eventos de teste. Enquanto estiver preenchido,
                todos os eventos vão só para a aba de teste e não contam nos anúncios. Apague quando terminar de testar.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowEventNames(open => !open)}
                className="flex items-center gap-1.5 text-sm font-medium text-foreground"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showEventNames ? 'rotate-180' : ''}`} />
                Nomes dos eventos
              </button>
              {showEventNames && (
                <div className="mt-3 space-y-3">
                  {EVENTS.map(event => (
                    <div key={event.id} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-2">
                      <div>
                        <Label htmlFor={`capi-event-${event.id}`}>{event.label}</Label>
                        <p className="text-xs text-muted-foreground">{event.when}</p>
                      </div>
                      <Input
                        id={`capi-event-${event.id}`}
                        value={eventNames[event.id]}
                        onChange={e => setEventNames(names => ({ ...names, [event.id]: e.target.value }))}
                        placeholder={integration?.default_event_names?.[event.id] || ''}
                        disabled={!canEdit || loading}
                        className={controlClassName}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para usar o nome padrão. Confira com um evento de teste se a Meta aceita o nome.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-sidebar-border bg-sidebar p-4">
              <div>
                <Label htmlFor="capi-enabled" className="text-sm font-medium">
                  Enviar conversões para a Meta
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Cada lead, lead qualificado e venda dos últimos 7 dias é enviado uma única vez, alguns segundos depois
                  de acontecer no CRM.
                </p>
              </div>
              <Switch id="capi-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={!canEdit || loading} />
            </div>

            <Button onClick={handleSave} disabled={!canEdit || isSaving || loading || !wabaId}>
              {isSaving ? 'Validando…' : configured ? 'Salvar alterações' : 'Conectar'}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conta conectada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {configured ? (
                <>
                  <InfoRow label="WhatsApp" value={integration?.waba_name} />
                  <InfoRow label="ID da conta" value={integration?.waba_id} />
                  <InfoRow label="Conjunto de dados" value={integration?.dataset_id} />
                  <InfoRow label="Página" value={integration?.page_id} />
                  <InfoRow
                    label="Token"
                    value={
                      integration?.token_source === 'meta_ads'
                        ? `Meta Ads (${integration?.token_hint || '••••'})`
                        : integration?.token_hint
                    }
                  />
                </>
              ) : (
                <p className="text-muted-foreground">Nenhuma conta conectada.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Envios</CardTitle>
              <CardDescription>Últimos {stats?.window_days ?? 30} dias</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <CountTile label="Enviados" value={stats?.sent ?? 0} />
                <CountTile label="Recusados" value={stats?.failed ?? 0} tone={stats?.failed ? 'danger' : undefined} />
              </div>
              {stats && Object.keys(stats.by_event).length > 0 && (
                <div className="space-y-1 text-sm">
                  {Object.entries(stats.by_event).map(([name, counts]) => (
                    <div key={name} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground truncate">{name}</span>
                      <span className="font-medium">
                        {counts.sent}
                        {counts.failed > 0 && <span className="text-destructive"> · {counts.failed} recusado(s)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {stats?.last_failure && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
                  <p className="font-medium text-foreground">
                    Última recusa{stats.last_failure.event ? ` (${stats.last_failure.event})` : ''}
                  </p>
                  <p className="text-muted-foreground mt-0.5 break-words">{stats.last_failure.error}</p>
                  <p className="text-muted-foreground mt-0.5">{formatDateTime(stats.last_failure.at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Evento de teste
              </CardTitle>
              <CardDescription>
                Envia um evento fictício que aparece só em Eventos de teste, no Gerenciador de Eventos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5">
                {EVENTS.map(event => (
                  <Button
                    key={event.id}
                    type="button"
                    size="sm"
                    variant={testEvent === event.id ? 'default' : 'outline'}
                    onClick={() => setTestEvent(event.id)}
                    className="text-xs px-2"
                  >
                    {event.label}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleSendTestEvent}
                disabled={!canEdit || !configured || !savedTestCode || isSendingTest}
              >
                <Send className="h-4 w-4" />
                {isSendingTest ? 'Enviando…' : 'Enviar evento de teste'}
              </Button>
              {configured && !savedTestCode && (
                <p className="text-xs text-muted-foreground">Salve um código de teste para habilitar.</p>
              )}
              {testResult && (
                <div
                  className={`rounded-md border p-2.5 text-xs ${
                    testResult.success ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <p className="flex items-center gap-1.5 font-medium text-foreground">
                    {testResult.success ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    )}
                    {testResult.success
                      ? `${testResult.event_name} recebido pela Meta`
                      : `${testResult.event_name} recusado`}
                  </p>
                  {testResult.message && <p className="text-muted-foreground mt-1 break-words">{testResult.message}</p>}
                  {testResult.success && (
                    <p className="text-muted-foreground mt-1">Confira em Gerenciador de Eventos → Eventos de teste.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar as conversões da Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              O token será apagado e nenhum evento novo será enviado. O conjunto de dados continua na conta da Meta, e o
              histórico de envios de cada contato é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-white hover:bg-destructive/90">
              Desconectar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TokenOption({
  selected,
  disabled,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`rounded-md border p-3 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected ? 'border-primary bg-primary/5' : 'border-sidebar-border bg-sidebar hover:border-primary/40'
      }`}
    >
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground mt-0.5">{description}</span>
    </button>
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

function CountTile({ label, value, tone }: { label: string; value: number; tone?: 'danger' }) {
  return (
    <div className="rounded-md border border-sidebar-border bg-sidebar p-3 text-center">
      <div className={`text-xl font-semibold ${tone === 'danger' ? 'text-destructive' : ''}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
