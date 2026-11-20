import { useState } from 'react';
import { Button, Label } from '@/components/ui/compat';
import { ArrowLeft, Check, CheckCircle2, Megaphone, Users, MessageSquare, Settings2, Calendar, Zap, Clock } from 'lucide-react';
import WizardStepLayout from './WizardStepLayout';
import { Card } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';

interface Step5Props {
  data: {
    // Step 1: Geral
    name: string;
    description: string;
    type: string;
    channel_type: string;

    // Step 2: Audiência
    contact_selection: string;
    segment_ids?: string[];
    tag_ids?: string[];
    estimated_contacts?: number;

    // Step 3: Conteúdo
    inbox_id: string;
    template_ids: string[];

    // Configurações
    schedule_option: string;
    scheduled_date?: string;
    template_strategy?: string;
    template_weights?: Record<string, number>;
    use_business_hours?: boolean;
    business_hours_start?: string;
    business_hours_end?: string;
    allowed_weekdays?: number[];
    enable_rate_limit?: boolean;
    enable_retry?: boolean;
    spread_sending_hours?: number;

    // A/B Test Details
    ab_test_winner_criteria?: string;
    ab_test_schedule_option?: string;
    ab_test_scheduled_date?: string;
    ab_test_skip_winner?: boolean;
    ab_test_winner_scheduled_date?: string;
    ab_test_spread_sending_hours?: number;
    ab_test_percentage?: number;
  };
  availableTemplates?: { id: string; name: string }[];
  onBack: () => void;
  onCreate: () => Promise<void>;
  isEditMode?: boolean;
}

const Step5_Review = ({
  data,
  availableTemplates = [],
  onBack,
  onCreate,
  isEditMode = false,
}: Step5Props) => {
  const { t } = useLanguage('campaigns');
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await onCreate();
      setIsSuccess(true);
    } catch (error) {
      console.error('Erro ao criar campanha:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // SUCCESS STATE
  if (isSuccess) {
    return (
      <div className="flex h-full items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg">
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon" className="bg-success/8 text-success">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyTitle>{isEditMode ? t('wizard.success.updatedTitle') : t('wizard.success.createdTitle')}</EmptyTitle>
              <EmptyDescription>
                {isEditMode ? t('wizard.success.updatedDescription') : t('wizard.success.createdDescription')}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent className="max-w-sm">
              <ul className="flex w-full flex-col gap-2 rounded-xl border bg-muted/24 p-4 text-left text-sm">
                <li className="font-medium">{t('wizard.success.nextSteps')}</li>
                {(['track', 'monitor', 'pause'] as const).map(key => (
                  <li key={key} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" />
                    <span>{t(`wizard.success.steps.${key}`)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex w-full flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/campaigns')}>
                  {t('wizard.success.viewCampaigns')}
                </Button>
                <Button className="flex-1" onClick={() => window.location.reload()}>
                  {isEditMode ? t('wizard.success.keepEditing') : t('wizard.success.newCampaign')}
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </Card>
      </div>
    );
  }

  return (
    <WizardStepLayout
      footer={
        <>
          <Button variant="ghost" className="me-auto" onClick={onBack} disabled={isCreating}>
            <ArrowLeft />
            {t('wizard.actions.back')}
          </Button>
          <Button onClick={handleCreate} loading={isCreating}>
            {isEditMode ? t('wizard.actions.save') : t('wizard.actions.create')}
            {!isCreating && <Check />}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">

          {/* GERAL */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <Label className="text-lg font-bold">Informações Gerais</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-bold">{data.name}</span>
              </div>
              {data.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Descrição</span>
                  <p className="text-sm p-3 bg-muted/30 rounded-lg border border-border italic text-muted-foreground">
                    {data.description}
                  </p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Canal e Tipo:</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">{data.channel_type}</span>
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase">{data.type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AUDIÊNCIA */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-info-foreground" />
              </div>
              <Label className="text-lg font-bold">Audiência</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seleção:</span>
                <span className="font-bold capitalize">{data.contact_selection}</span>
              </div>
              {data.estimated_contacts && (
                <div className="flex justify-between items-center p-3 bg-info/5 rounded-lg border border-info/10">
                  <span className="text-muted-foreground font-medium">Contatos estimados</span>
                  <span className="text-lg font-bold text-info-foreground">{data.estimated_contacts.toLocaleString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>

          {/* CONTEÚDO */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-success-foreground" />
              </div>
              <Label className="text-lg font-bold">Conteúdo</Label>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Inbox:</span>
                <span className="font-bold">{data.inbox_id ? 'Inbox selecionado' : 'Nenhum selecionado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Templates:</span>
                <span className="font-bold text-primary">{data.template_ids.length} selecionado(s)</span>
              </div>
            </div>
          </div>

          {/* CONFIGURAÇÕES */}
          <div className="border border-border bg-card rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings2 className="h-5 w-5 text-primary" />
              </div>
              <Label className="text-xl font-bold">Configurações</Label>
            </div>

            <div className="space-y-4 text-sm">
              {data.template_strategy !== 'ab_test' ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Agendamento</span>
                    </div>
                    <span className="font-bold">
                      {data.schedule_option === 'now'
                        ? 'Envio Imediato'
                        : data.scheduled_date ? new Date(data.scheduled_date).toLocaleString('pt-BR') : 'N/A'}
                    </span>
                  </div>

                  {data.template_strategy && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                        <span className="text-muted-foreground">Estratégia de Distribuição</span>
                        <span className="font-bold uppercase text-primary">
                          {data.template_strategy === 'round_robin' ? 'sequencial' :
                            data.template_strategy === 'weighted' ? 'Split' :
                              data.template_strategy === 'random' ? 'Aleatorio' : 'Teste A/B'}
                        </span>
                      </div>

                      {data.template_strategy === 'weighted' && data.template_ids && (
                        <div className="bg-muted/10 rounded-xl p-4 border border-dashed border-border space-y-2">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Pesos por Template</Label>
                          {data.template_ids.map(id => {
                            const templateName = availableTemplates.find(t => t.id === id)?.name || `Template ${id}`;
                            return (
                              <div key={id} className="flex justify-between items-center">
                                <span className="text-muted-foreground truncate max-w-[150px]">{templateName}</span>
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary"
                                      style={{ width: `${data.template_weights?.[id] || 0}%` }}
                                    />
                                  </div>
                                  <span className="font-bold w-10 text-right">{data.template_weights?.[id] || 0}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground">Critério de vencedor</span>
                    <span className="font-bold text-primary">
                      {data.ab_test_winner_criteria === 'open_rate' ? 'Taxa de Abertura' : 'Taxa de Clique'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg border border-border">
                    <span className="text-muted-foreground">Tamanho da amostra</span>
                    <span className="font-bold">{data.ab_test_percentage}% dos contatos</span>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Fase de Teste</span>
                      </div>
                      <span className="font-bold">
                        {data.ab_test_schedule_option === 'now'
                          ? 'Imediato'
                          : data.ab_test_scheduled_date ? new Date(data.ab_test_scheduled_date).toLocaleString('pt-BR') : 'N/A'}
                      </span>
                    </div>

                    {!data.ab_test_skip_winner && (
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>Envio do Vencedor</span>
                        </div>
                        <span className="font-bold">
                          {data.ab_test_winner_scheduled_date
                            ? new Date(data.ab_test_winner_scheduled_date).toLocaleString('pt-BR') : 'Manual'}
                        </span>
                      </div>
                    )}

                    {data.ab_test_skip_winner && (
                      <div className="flex items-center gap-2 text-orange-600 text-xs font-medium">
                        <Settings2 className="h-3 w-3" />
                        <span>Vencedor não será enviado automaticamente</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-border mt-2">
                {data.spread_sending_hours !== undefined && data.spread_sending_hours > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-4 w-4 text-primary" />
                    <span>Intervalo de Envio: <b>{data.spread_sending_hours}h</b></span>
                  </div>
                )}

                {data.use_business_hours ? (
                  <div className="flex flex-col gap-1.5 p-3 bg-success/5 border border-success/20 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] font-bold text-success-foreground uppercase tracking-widest">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>Horário Permitido</span>
                      </div>
                      <span>{data.business_hours_start} - {data.business_hours_end}</span>
                    </div>
                    {data.allowed_weekdays && (
                      <div className="flex gap-1">
                        {[
                          { id: 1, label: 'S' },
                          { id: 2, label: 'T' },
                          { id: 3, label: 'Q' },
                          { id: 4, label: 'Q' },
                          { id: 5, label: 'S' },
                          { id: 6, label: 'S' },
                          { id: 0, label: 'D' },
                        ].map(day => (
                          <span
                            key={day.id}
                            className={`w-5 h-5 flex items-center justify-center text-[10px] rounded ${data.allowed_weekdays?.includes(day.id)
                                ? 'bg-success text-white font-bold'
                                : 'bg-muted text-muted-foreground'
                              }`}
                          >
                            {day.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Sem restrição de horário</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {data.enable_rate_limit && (
                    <span className="px-2 py-1 bg-info/12 text-info-foreground text-[10px] font-bold rounded uppercase tracking-wider">
                      Limite de Taxa
                    </span>
                  )}
                  {data.enable_retry && (
                    <span className="px-2 py-1 bg-info/8 text-info-foreground dark:bg-info/16 text-[10px] font-bold rounded uppercase tracking-wider">
                      Retentativas Ativas
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
      </div>
    </WizardStepLayout>
  );
};

export default Step5_Review;
