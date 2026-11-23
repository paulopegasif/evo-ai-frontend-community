import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  ListChecks,
  PlugZap,
  Power,
  Send,
  XCircle,
} from '@/components/icons';
import { format } from 'date-fns';
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
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SecretInput } from '@/components/integrations/shared';
import { Label } from '@/components/ui/label';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

const STATUS_BADGES: Record<
  MetaConversionsConnectionStatus,
  { label: string; variant: 'success' | 'warning' | 'outline' }
> = {
  connected: { label: 'Conectado', variant: 'success' },
  error: { label: 'Erro', variant: 'warning' },
  not_configured: { label: 'Não configurado', variant: 'outline' },
};

const EVENTS: { id: MetaConversionsEvent; label: string; short: string; when: string }[] = [
  { id: 'lead', label: 'Lead', short: 'Lead', when: 'Quando um lead chega de um anúncio.' },
  { id: 'qualified', label: 'Lead qualificado', short: 'Qualificado', when: 'Quando o lead agenda ou entra numa etapa qualificada do funil.' },
  { id: 'purchase', label: 'Venda', short: 'Venda', when: 'Quando o atendimento é marcado como realizado, com o valor.' },
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
  const savedTestCode = integration?.test_event_code;
  const disabled = !canEdit || loading;

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/integrations')}>
            <ArrowLeft />
            Integrações
          </Button>
          <Button variant="outline" size="sm" render={<a href={EVENTS_MANAGER_URL} target="_blank" rel="noreferrer" />}>
            Gerenciador de Eventos
            <ExternalLink />
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
              <BrandIcon id="meta_conversions" className="size-7" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-xl tracking-tight">Conversões da Meta</h1>
                {loading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    {configured && (
                      <Badge variant={integration?.enabled ? 'info' : 'outline'}>
                        {integration?.enabled ? 'Envio ativo' : 'Envio desligado'}
                      </Badge>
                    )}
                  </>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
                Informa à Meta quais leads dos anúncios de clique para o WhatsApp viraram leads qualificados e vendas.
                Assim as campanhas aprendem a buscar pessoas parecidas com quem realmente vira cliente.
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
            <AlertDescription>{formatDateTime(integration.last_error.at)}</AlertDescription>
          </Alert>
        )}

        {integration?.enabled && savedTestCode && (
          <Alert variant="warning">
            <FlaskConical />
            <AlertTitle>Modo de teste ativo</AlertTitle>
            <AlertDescription>
              Com o código de teste salvo, os eventos vão só para a aba Eventos de teste e não contam nos anúncios. Apague
              o código quando terminar de testar.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup guide */}
        <Collapsible open={showGuide} onOpenChange={setShowGuide}>
          <Card className="gap-0">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-6 py-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[inherit]">
              <span className="flex items-center gap-2 font-medium text-sm">
                <ListChecks className="size-4 text-muted-foreground" />
                Como conseguir os dados na Meta
              </span>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <ol className="list-decimal space-y-2 px-6 pb-5 ps-11 text-muted-foreground text-sm">
                <li>
                  Abra as{' '}
                  <a
                    href={BUSINESS_SETTINGS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline underline-offset-4"
                  >
                    configurações do Business Manager
                  </a>{' '}
                  da empresa, com um administrador.
                </li>
                <li>
                  Em <strong className="text-foreground">Contas → Contas do WhatsApp</strong>, escolha a conta do número
                  dos anúncios e copie o <strong className="text-foreground">ID da conta do WhatsApp Business</strong>.
                </li>
                <li>
                  Em <strong className="text-foreground">Usuários → Usuários do sistema</strong>, crie (ou escolha) um
                  usuário Admin. Em <strong className="text-foreground">Atribuir ativos</strong>, dê a ele a conta do
                  WhatsApp com controle total. O usuário também precisa ter função no app que vai gerar o token.
                </li>
                <li>
                  Clique em <strong className="text-foreground">Gerar token</strong>, escolha o app, validade{' '}
                  <strong className="text-foreground">Nunca</strong> e marque <code>whatsapp_business_management</code> e{' '}
                  <code>whatsapp_business_manage_events</code>. O app precisa ter o caso de uso do WhatsApp para essas
                  permissões aparecerem.
                </li>
                <li>
                  Opcional: em <strong className="text-foreground">Contas → Páginas</strong>, copie o{' '}
                  <strong className="text-foreground">ID da Página</strong> do Facebook. Ele permite enviar conversões
                  de leads que chegaram sem o identificador do clique no anúncio.
                </li>
                <li>
                  Cole os dados abaixo e salve. O CRM valida o token e cria o conjunto de dados da conta. Para vê-lo no
                  Gerenciador de Eventos, atribua uma pessoa a ele em Fontes de dados → Conjuntos de dados.
                </li>
              </ol>
            </CollapsiblePanel>
          </Card>
        </Collapsible>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Configuration form */}
          <Card>
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <CardDescription>Conta do WhatsApp Business que recebe os leads dos anúncios.</CardDescription>
            </CardHeader>
            <CardPanel className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field invalid={Boolean(wabaId) && !wabaValid}>
                  <FieldLabel>ID da conta do WhatsApp Business</FieldLabel>
                  <Input
                    value={wabaId}
                    onChange={e => setWabaId(e.target.value)}
                    placeholder="102290129340398"
                    inputMode="numeric"
                    disabled={disabled}
                  />
                  {wabaId && !wabaValid && <FieldError match>Use apenas os números do ID.</FieldError>}
                </Field>
                <Field invalid={!pageValid}>
                  <FieldLabel>
                    ID da Página <span className="font-normal text-muted-foreground">(opcional)</span>
                  </FieldLabel>
                  <Input
                    value={pageId}
                    onChange={e => setPageId(e.target.value)}
                    placeholder="123456789012345"
                    inputMode="numeric"
                    disabled={disabled}
                  />
                  {pageValid ? (
                    <FieldDescription>Para leads sem o identificador do clique no anúncio.</FieldDescription>
                  ) : (
                    <FieldError match>Use apenas os números do ID.</FieldError>
                  )}
                </Field>
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <div>
                  <p className="font-medium text-sm">Token de acesso</p>
                  <p className="text-muted-foreground text-xs">
                    Precisa das permissões <code>whatsapp_business_management</code> e{' '}
                    <code>whatsapp_business_manage_events</code>.
                  </p>
                </div>
                <RadioGroup
                  value={tokenSource}
                  onValueChange={value => setTokenSource(value as MetaConversionsTokenSource)}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  disabled={disabled}
                >
                  <TokenOption
                    value="meta_ads"
                    disabled={!metaAdsTokenAvailable}
                    title="Token da integração Meta Ads"
                    description={
                      metaAdsTokenAvailable
                        ? 'O token precisa ter também as permissões do WhatsApp.'
                        : 'Conecte a integração Meta Ads para usar esta opção.'
                    }
                  />
                  <TokenOption value="own" title="Outro token" description="Um token só para as conversões." />
                </RadioGroup>
                {tokenSource === 'own' && (
                  <Field>
                    <SecretInput
                      aria-label="Token de acesso"
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                      placeholder={
                        configured && integration?.token_source === 'own'
                          ? `Manter o token atual (${integration?.token_hint || '••••'})`
                          : 'EAAB…'
                      }
                      disabled={disabled}
                    />
                    <FieldDescription>
                      Validado na Meta antes de salvar e guardado criptografado. Ele nunca é exibido de novo.
                    </FieldDescription>
                  </Field>
                )}
              </div>

              <Separator />

              <Field>
                <FieldLabel>
                  Código de teste <span className="font-normal text-muted-foreground">(opcional)</span>
                </FieldLabel>
                <Input
                  value={testEventCode}
                  onChange={e => setTestEventCode(e.target.value)}
                  placeholder="TEST12345"
                  disabled={disabled}
                />
                <FieldDescription>
                  Em Gerenciador de Eventos → seu conjunto de dados → Eventos de teste → Mensagem → WhatsApp. Enquanto
                  estiver preenchido, os eventos não contam nos anúncios.
                </FieldDescription>
              </Field>

              <Collapsible open={showEventNames} onOpenChange={setShowEventNames}>
                <CollapsibleTrigger className="flex items-center gap-1.5 font-medium text-sm outline-none focus-visible:underline">
                  <ChevronDown className={`size-4 transition-transform ${showEventNames ? 'rotate-180' : ''}`} />
                  Nomes dos eventos
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <div className="mt-4 flex flex-col gap-4">
                    {EVENTS.map(event => (
                      <Field key={event.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[200px_1fr]">
                        <div>
                          <FieldLabel>{event.label}</FieldLabel>
                          <FieldDescription>{event.when}</FieldDescription>
                        </div>
                        <Input
                          value={eventNames[event.id]}
                          onChange={e => setEventNames(names => ({ ...names, [event.id]: e.target.value }))}
                          placeholder={integration?.default_event_names?.[event.id] || ''}
                          disabled={disabled}
                        />
                      </Field>
                    ))}
                    <p className="text-muted-foreground text-xs">
                      Deixe em branco para usar o nome padrão. Confira com um evento de teste se a Meta aceita o nome.
                    </p>
                  </div>
                </CollapsiblePanel>
              </Collapsible>

              <Label className="flex items-start justify-between gap-4 rounded-lg border p-4 has-data-checked:border-primary/48 has-data-checked:bg-primary/4">
                <span className="flex flex-col gap-1">
                  <span className="font-medium text-sm">Enviar conversões para a Meta</span>
                  <span className="font-normal text-muted-foreground text-xs">
                    Cada lead, lead qualificado e venda dos últimos 7 dias é enviado uma única vez, alguns segundos
                    depois de acontecer no CRM.
                  </span>
                </span>
                <Switch checked={enabled} onCheckedChange={setEnabled} disabled={disabled} />
              </Label>
            </CardPanel>
            <CardFooter className="justify-between gap-3 border-t">
              <p className="text-muted-foreground text-xs">
                {configured && stats?.last_sent_at
                  ? `Último envio em ${formatDateTime(stats.last_sent_at)}`
                  : configured
                    ? 'Nenhum evento enviado ainda.'
                    : 'O CRM valida o token antes de salvar.'}
              </p>
              <Button onClick={handleSave} disabled={!canEdit || loading || !wabaId} loading={isSaving}>
                {configured ? 'Salvar alterações' : 'Conectar'}
              </Button>
            </CardFooter>
          </Card>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conta conectada</CardTitle>
              </CardHeader>
              <CardPanel>
                {configured ? (
                  <dl className="flex flex-col gap-2.5 text-sm">
                    <InfoRow label="WhatsApp" value={integration?.waba_name} />
                    <InfoRow label="ID da conta" value={integration?.waba_id} mono />
                    <InfoRow label="Conjunto de dados" value={integration?.dataset_id} mono />
                    <InfoRow label="Página" value={integration?.page_id} mono />
                    <InfoRow
                      label="Token"
                      mono
                      value={
                        integration?.token_source === 'meta_ads'
                          ? `Meta Ads (${integration?.token_hint || '••••'})`
                          : integration?.token_hint
                      }
                    />
                  </dl>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma conta conectada.</p>
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Envios</CardTitle>
                <CardDescription>Últimos {stats?.window_days ?? 30} dias</CardDescription>
              </CardHeader>
              <CardPanel className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2">
                  <CountTile label="Enviados" value={stats?.sent ?? 0} />
                  <CountTile label="Recusados" value={stats?.failed ?? 0} danger={Boolean(stats?.failed)} />
                </div>
                {stats && Object.keys(stats.by_event).length > 0 && (
                  <dl className="flex flex-col gap-1.5 text-sm">
                    {Object.entries(stats.by_event).map(([name, counts]) => (
                      <div key={name} className="flex items-center justify-between gap-3">
                        <dt className="truncate text-muted-foreground">{name}</dt>
                        <dd className="font-medium tabular-nums">
                          {counts.sent}
                          {counts.failed > 0 && (
                            <span className="text-destructive-foreground"> · {counts.failed} recusado(s)</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {stats?.last_failure && (
                  <Alert variant="error">
                    <XCircle />
                    <AlertTitle>
                      Última recusa{stats.last_failure.event ? ` (${stats.last_failure.event})` : ''}
                    </AlertTitle>
                    <AlertDescription>
                      <p className="break-words">{stats.last_failure.error}</p>
                      <p>{formatDateTime(stats.last_failure.at)}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </CardPanel>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evento de teste</CardTitle>
                <CardDescription>Aparece só em Eventos de teste, no Gerenciador de Eventos.</CardDescription>
              </CardHeader>
              <CardPanel className="flex flex-col gap-3">
                <ToggleGroup
                  variant="outline"
                  className="w-full"
                  value={[testEvent]}
                  onValueChange={value => value[0] && setTestEvent(value[0] as MetaConversionsEvent)}
                >
                  {EVENTS.map(event => (
                    <ToggleGroupItem key={event.id} value={event.id} className="flex-1 text-xs" aria-label={event.label}>
                      {event.short}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSendTestEvent}
                  disabled={!canEdit || !configured || !savedTestCode}
                  loading={isSendingTest}
                >
                  <Send />
                  Enviar evento de teste
                </Button>
                {configured && !savedTestCode && (
                  <p className="text-muted-foreground text-xs">Salve um código de teste para habilitar.</p>
                )}
                {testResult && (
                  <Alert variant={testResult.success ? 'success' : 'error'}>
                    {testResult.success ? <CheckCircle2 /> : <XCircle />}
                    <AlertTitle>
                      {testResult.success
                        ? `${testResult.event_name} recebido pela Meta`
                        : `${testResult.event_name} recusado`}
                    </AlertTitle>
                    <AlertDescription>
                      {testResult.message ||
                        (testResult.success ? 'Confira em Gerenciador de Eventos → Eventos de teste.' : null)}
                    </AlertDescription>
                  </Alert>
                )}
              </CardPanel>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar as conversões da Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              O token será apagado e nenhum evento novo será enviado. O conjunto de dados continua na conta da Meta, e o
              histórico de envios de cada contato é mantido.
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

function TokenOption({
  value,
  title,
  description,
  disabled,
}: {
  value: MetaConversionsTokenSource;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <Label className="flex items-start gap-3 rounded-lg border p-3 has-disabled:opacity-64 has-data-checked:border-primary/48 has-data-checked:bg-primary/4">
      <Radio value={value} disabled={disabled} className="mt-0.5" />
      <span className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{title}</span>
        <span className="font-normal text-muted-foreground text-xs">{description}</span>
      </span>
    </Label>
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

function CountTile({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/32 p-3 text-center">
      <div className={`font-semibold text-xl tabular-nums ${danger ? 'text-destructive-foreground' : ''}`}>{value}</div>
      <div className="mt-0.5 text-muted-foreground text-xs">{label}</div>
    </div>
  );
}
