import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Radio, RadioGroup } from '@/components/ui/radio-group';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { ExternalLink, CheckCircle2, Link2 } from 'lucide-react';
import { api } from '@/services/core';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { evolutionHubService, type HubChannel } from '@/services/integrations';

/**
 * Hub-relayed Inbox creation button.
 *
 * Rendered in place of the native Meta OAuth form whenever the Evo Hub
 * feature is active (see GlobalConfigContext.evolutionHubEnabled).
 *
 * Dois modos:
 *   - 'new'      → POST /inboxes com via_hub: true. Cria canal NOVO no Hub
 *                  e devolve public_link pra OAuth Meta. Fluxo padrão.
 *   - 'existing' → POST /inboxes com via_hub_existing + hub_channel_id.
 *                  Linka a um canal já conectado no Hub (sem OAuth novo).
 *                  Útil quando o canal foi criado pela UI do Hub ou por
 *                  outra integração e o operador só quer "consumir" no CRM.
 */
export interface HubConnectButtonProps {
  channelType: 'whatsapp_cloud' | 'facebook_page' | 'instagram';
  name: string;
  onCreated?: (payload: { inboxId: number; publicLink?: string }) => void;
}

interface InboxCreateResponse {
  data: {
    id: number;
    name: string;
    evolution_hub?: {
      public_link?: string;
      linked?: boolean;
      hub_channel_id?: string;
    };
  };
}

type Mode = 'new' | 'existing';

const HUB_TYPE_BY_CHANNEL: Record<HubConnectButtonProps['channelType'], HubChannel['type']> = {
  whatsapp_cloud: 'whatsapp',
  facebook_page: 'facebook',
  instagram: 'instagram',
};

export default function HubConnectButton({ channelType, name, onCreated }: HubConnectButtonProps) {
  // Flag genérica (default ON p/ community standalone): quando false (deploy
  // enterprise/SaaS), esconde "Usar canal existente do Hub". Motivo: a listagem
  // de canais existentes do Hub usa credenciais GLOBAIS e NÃO filtra por tenant
  // → vaza conexões de outras agências (vazamento cross-tenant). Só "Criar nova
  // conexão". Defesa em profundidade: o backend também 403a available_channels.
  const config = useGlobalConfig();
  const allowExistingHubChannels = config.hubAllowExistingChannels !== false;

  const [mode, setMode] = useState<Mode>('new');
  const [submitting, setSubmitting] = useState(false);
  const [publicLink, setPublicLink] = useState<string | null>(null);
  const [inboxId, setInboxId] = useState<number | null>(null);
  const [linkedDone, setLinkedDone] = useState(false);

  const [availableChannels, setAvailableChannels] = useState<HubChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedHubChannelId, setSelectedHubChannelId] = useState<string>('');

  // Carrega a lista de canais existentes só quando o operador escolhe
  // 'existing' — evita o roundtrip pro Hub quando não vai ser usado.
  useEffect(() => {
    if (mode !== 'existing') return;
    let cancelled = false;
    setLoadingChannels(true);
    setChannelsError(null);
    evolutionHubService
      .getAvailableChannels(HUB_TYPE_BY_CHANNEL[channelType])
      .then(channels => {
        if (cancelled) return;
        setAvailableChannels(channels);
        if (channels.length === 0) {
          setChannelsError(
            'Nenhum canal disponível no Hub para este tipo. Crie um novo ou linke um canal de outro tipo.',
          );
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          (err as { message?: string })?.message ??
          'Falha ao listar canais do Hub';
        setChannelsError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoadingChannels(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, channelType]);

  const handleCreateNew = async () => {
    setSubmitting(true);
    try {
      const response = await api.post<InboxCreateResponse>(`/inboxes`, {
        via_hub: true,
        inbox: { name: name.trim(), channel_type: channelType },
      });

      const inbox = response.data?.data;
      const link = inbox?.evolution_hub?.public_link ?? null;

      if (!link) {
        toast.error('Inbox criada, mas o Hub não retornou link público. Verifique a configuração.');
        return;
      }

      setInboxId(inbox.id);
      setPublicLink(link);
      window.open(link, '_blank', 'noopener,noreferrer');
      toast.success('Inbox criada. Conclua a conexão na aba que foi aberta.');
      onCreated?.({ inboxId: inbox.id, publicLink: link });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (error as { message?: string }).message ??
        'Falha ao criar inbox via Evo Hub';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedHubChannelId) {
      toast.error('Selecione um canal do Hub para vincular.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post<InboxCreateResponse>(`/inboxes`, {
        via_hub_existing: true,
        hub_channel_id: selectedHubChannelId,
        inbox: { name: name.trim(), channel_type: channelType },
      });

      const inbox = response.data?.data;
      setInboxId(inbox.id);
      setLinkedDone(true);
      toast.success('Inbox vinculada ao canal Evo Hub existente.');
      onCreated?.({ inboxId: inbox.id });
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (error as { message?: string }).message ??
        'Falha ao linkar inbox ao canal Hub existente';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Informe um nome para a inbox antes de continuar.');
      return;
    }
    if (mode === 'new') {
      handleCreateNew();
    } else {
      handleLinkExisting();
    }
  };

  // Estado pós-sucesso: 'criar novo' mostra link pra reabrir aba OAuth;
  // 'linkar existente' só mostra confirmação (canal já está conectado).
  if (publicLink && inboxId !== null) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border bg-muted/24 p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span>Inbox criada. Aguardando conexão Meta no Hub…</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Se a aba não abriu, clique no botão abaixo para reabrir.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink />
          Abrir link de conexão
        </Button>
      </div>
    );
  }

  if (linkedDone && inboxId !== null) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/24 p-4">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CheckCircle2 className="size-5 shrink-0 text-success" />
          <span>Inbox vinculada ao canal Evo Hub existente.</span>
        </div>
        <p className="text-xs text-muted-foreground">
          O canal já está ativo — mensagens chegarão pelo webhook do Hub.
        </p>
      </div>
    );
  }

  const channelItems = availableChannels.map(channel => ({
    value: channel.id,
    label: `${channel.name} (${channel.status})`,
  }));

  return (
    <div className="flex flex-col items-start gap-4">
      <div className="flex w-full flex-col gap-2">
        <Label id="hub-mode-label">Como conectar este canal no Evo Hub?</Label>
        <RadioGroup
          aria-labelledby="hub-mode-label"
          value={mode}
          onValueChange={value => setMode(String(value) as Mode)}
          className="gap-2"
        >
          <Label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 font-normal has-data-checked:border-primary/48 has-data-checked:bg-accent/48">
            <Radio value="new" className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">Criar nova conexão</span>
              <span className="text-xs text-muted-foreground">
                Cria um canal novo no Hub e abre o fluxo de OAuth Meta em outra aba.
              </span>
            </span>
          </Label>
          {allowExistingHubChannels && (
            <Label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 font-normal has-data-checked:border-primary/48 has-data-checked:bg-accent/48">
              <Radio value="existing" className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">Usar canal existente do Hub</span>
                <span className="text-xs text-muted-foreground">
                  Apenas configura o webhook deste CRM em um canal já conectado.
                </span>
              </span>
            </Label>
          )}
        </RadioGroup>
      </div>

      {mode === 'existing' && (
        <Field className="w-full">
          <FieldLabel htmlFor="hub-channel">Canal do Hub</FieldLabel>
          {loadingChannels ? (
            <div className="w-full" aria-busy="true">
              <span className="sr-only">Carregando canais disponíveis…</span>
              <Skeleton className="h-9 w-full rounded-lg sm:h-8" />
            </div>
          ) : (
            <Select
              items={channelItems}
              value={selectedHubChannelId || null}
              onValueChange={value => setSelectedHubChannelId(String(value ?? ''))}
              disabled={availableChannels.length === 0}
            >
              <SelectTrigger id="hub-channel">
                <SelectValue placeholder="— Selecione —" />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {channelItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          )}
          {channelsError && (
            <Alert variant="error">
              <AlertDescription>{channelsError}</AlertDescription>
            </Alert>
          )}
        </Field>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        loading={submitting}
        disabled={mode === 'existing' && !selectedHubChannelId}
      >
        {mode === 'new' ? <ExternalLink /> : <Link2 />}
        {mode === 'new' ? 'Conectar via Evo Hub' : 'Vincular canal existente'}
      </Button>
    </div>
  );
}
