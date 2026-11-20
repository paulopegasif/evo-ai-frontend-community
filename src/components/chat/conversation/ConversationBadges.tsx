import React from 'react';
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/compat';
import { Conversation } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import ConversationStatusIcon from './ConversationStatusIcon';
import { Label } from '@/types/settings';

interface ConversationBadgesProps {
  conversation: Conversation;
  maxLabels?: number;
  showOnlyPipeline?: boolean; // Nova prop para controlar exibição
  showStatus?: boolean; // Nova prop para exibir status da conversa
}

const PRIORITY_CONFIG: Record<string, { Icon: typeof AlertTriangle; bg: string; fg: string }> = {
  urgent: { Icon: AlertTriangle, bg: 'bg-destructive/12', fg: 'text-destructive-foreground' },
  high: { Icon: ArrowUp, bg: 'bg-orange-100', fg: 'text-orange-600' },
  medium: { Icon: Minus, bg: 'bg-info/12', fg: 'text-info-foreground' },
  low: { Icon: ArrowDown, bg: 'bg-muted', fg: 'text-muted-foreground' },
};

// Chip de contorno compacto — tokens semânticos (funciona em tema claro e escuro).
const CHIP_CLASS =
  'inline-flex items-center gap-1 h-[18px] px-1.5 rounded border border-border bg-background text-[11px] leading-none font-medium text-muted-foreground whitespace-nowrap';

const ConversationBadges: React.FC<ConversationBadgesProps> = ({
  conversation,
  maxLabels = 2,
  showOnlyPipeline = false,
  showStatus = true,
}) => {
  const { t } = useLanguage('chat');

  // Badge de prioridade compacto (apenas ícone, detalhes no tooltip)
  const getPriorityIcon = (priority: string) => {
    const config = PRIORITY_CONFIG[priority];
    if (!config) return null;
    const { Icon } = config;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`inline-flex items-center justify-center w-4 h-4 flex-shrink-0 rounded-full cursor-help ${config.bg}`}
            >
              <Icon className={`w-2.5 h-2.5 ${config.fg}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="px-3 py-2 bg-popover border border-border shadow-lg rounded-lg"
          >
            <div className="text-center">
              <div className="text-sm font-semibold text-foreground">
                {t(`conversationBadges.priority.${priority}.label`)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t(`conversationBadges.priority.${priority}.description`)}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Buscar informações do pipeline
  const conversationPipelines = conversation.pipelines || [];
  
  const pipeline = conversationPipelines.length > 0
    ? conversationPipelines[0]
    : null;

  // Buscar informações das labels (limitadas)
  // Labels vêm como array de objetos Label completos {id, title, color} do backend
  // Fallback: se vier como string/ID, buscar na lista de labels passada como prop
  const allConversationLabels = React.useMemo(() => {
    const conversationLabelsArray = conversation.labels || [];

    return conversationLabelsArray
      .map((labelData: { id?: string; title?: string; name?: string; color?: string } | string) => {
        // Se já é um objeto Label completo com id, title e color, usar diretamente
        if (typeof labelData === 'object' && labelData !== null) {
          // Verificar se tem title (formato novo do backend)
          if ('title' in labelData) {
            return {
              id: String(labelData.id || labelData.title),
              title: String(labelData.title || ''),
              color: String(labelData.color || '#1f93ff'),
            };
          }
          // Verificar se tem name (formato antigo)
          if ('name' in labelData) {
            return {
              id: String(labelData.id || labelData.name),
              title: String(labelData.name || ''),
              color: String(labelData.color || '#1f93ff'),
            };
          }
        }
        // Se é string/ID (fallback para compatibilidade), buscar na lista de labels passada como prop
        if (typeof labelData === 'string') {
          const labelId = String(labelData);
          const foundLabel = conversation.labels.find((l: Label) => String(l.id) === labelId);
          if (foundLabel) {
            return {
              id: String(foundLabel.id),
              title: String(foundLabel.title),
              color: String(foundLabel.color || '#1f93ff'),
            };
          }
        }
        return null;
      })
      .filter((label): label is { id: string; title: string; color: string } => Boolean(label));
  }, [conversation.labels]);

  const conversationLabels = allConversationLabels.slice(0, maxLabels);
  const hiddenLabels = allConversationLabels.slice(maxLabels);

  const priorityIcon = conversation.priority ? getPriorityIcon(conversation.priority) : null;

  // Só não renderiza se a conversa não existir
  if (!conversation) return null;

  const getPipelineNameText = () => {
    const pipelineName = pipeline?.name;
    const pipelineStageName = pipeline?.stages[0]?.name;

    if (!pipelineStageName) return pipelineName;

    return `${pipelineName} • ${pipelineStageName}`;
  };

  const getDaysInCurrentStageText = () => {
    const daysInCurrentStage = pipeline?.stages[0]?.days_in_current_stage;

    if (daysInCurrentStage === undefined || daysInCurrentStage === null) return '';

    if (daysInCurrentStage === 1) return `1 ${t('conversationBadges.timeUnits.day')}`;
    if (daysInCurrentStage < 7) return `${daysInCurrentStage} ${t('conversationBadges.timeUnits.days')}`;
    if (daysInCurrentStage < 30) {
      const weeks = Math.floor(daysInCurrentStage / 7);
      return `${weeks} ${weeks === 1 ? t('conversationBadges.timeUnits.week') : t('conversationBadges.timeUnits.weeks')}`;
    }
    const months = Math.floor(daysInCurrentStage / 30);
    return `${months} ${months === 1 ? t('conversationBadges.timeUnits.month') : t('conversationBadges.timeUnits.months')}`;
  };

  const getPipelineStageColor = () => {
    return pipeline?.stages[0]?.color || 'var(--primary)';
  };

  const showPipeline = Boolean(pipeline) && !showOnlyPipeline;
  const pipelineFullText = getPipelineNameText();
  const pipelineChipText = pipeline?.stages[0]?.name || pipeline?.name;
  const daysInStageText = getDaysInCurrentStageText();

  const hasContent =
    showStatus || Boolean(priorityIcon) || showPipeline || allConversationLabels.length > 0;
  if (!hasContent) return null;

  // Uma única linha compacta: status, prioridade, pipeline/etapa e etiquetas como
  // chips de contorno (ponto colorido + texto truncado; nome completo no tooltip).
  return (
    <div className="flex items-center gap-1 mt-1 min-w-0 overflow-hidden">
      {showStatus && <ConversationStatusIcon status={conversation.status} size="xs" />}

      {priorityIcon}

      {showPipeline && (
        <span
          className={`${CHIP_CLASS} min-w-0 shrink`}
          title={daysInStageText ? `${pipelineFullText} · ${daysInStageText}` : pipelineFullText}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: getPipelineStageColor() }}
          />
          <span className="truncate text-foreground/80">{pipelineChipText}</span>
          {daysInStageText && (
            <span className="flex-shrink-0 text-muted-foreground/80">· {daysInStageText}</span>
          )}
        </span>
      )}

      {conversationLabels.map(label => (
        <span key={label.id} className={`${CHIP_CLASS} min-w-0 shrink max-w-24`} title={label.title}>
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: label.color }}
          />
          <span className="truncate">{label.title}</span>
        </span>
      ))}

      {/* Indicador de mais labels com tooltip */}
      {hiddenLabels.length > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${CHIP_CLASS} flex-shrink-0 cursor-help`}>+{hiddenLabels.length}</span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-xs p-3 bg-popover border border-border shadow-lg rounded-lg"
            >
              <div className="space-y-2">
                <div className="text-xs font-semibold text-foreground">
                  {t('conversationBadges.otherLabels')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenLabels.map(label => (
                    <span key={label.id} className={CHIP_CLASS}>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span>{label.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default ConversationBadges;
