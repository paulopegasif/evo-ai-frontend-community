import { ArrowLeft, MessageSquare, Save } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';

interface AgentEditHeaderProps {
  onBack: () => void;
  onSave: () => void;
  onTestAgent?: () => void;
  isDirty: boolean;
  isSaving: boolean;
  agentName?: string;
}

/** Sticky top bar of the agent editor: back, agent name, unsaved state, test and save. */
const AgentEditHeader = ({
  onBack,
  onSave,
  onTestAgent,
  isDirty,
  isSaving,
  agentName,
}: AgentEditHeaderProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background/88 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label={t('actions.back') || 'Voltar'} />
            }
          >
            <ArrowLeft />
          </TooltipTrigger>
          <TooltipPopup>{t('actions.backToList') || t('actions.back') || 'Voltar'}</TooltipPopup>
        </Tooltip>
        {agentName && <span className="truncate font-semibold text-sm md:text-base">{agentName}</span>}
        {isDirty && !isSaving && (
          <span className="hidden items-center gap-1.5 text-muted-foreground text-xs sm:inline-flex">
            <span className="size-1.5 rounded-full bg-warning" />
            {t('edit.unsavedChanges')}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onTestAgent && (
          <Button variant="outline" onClick={onTestAgent}>
            <MessageSquare />
            <span className="hidden sm:inline">{t('actions.testAgent') || 'Teste seu agente'}</span>
          </Button>
        )}
        <Button onClick={onSave} disabled={!isDirty} loading={isSaving}>
          {!isSaving && <Save />}
          {isSaving ? t('messages.saving') || 'Salvando...' : t('actions.save') || 'Salvar'}
        </Button>
      </div>
    </div>
  );
};

export default AgentEditHeader;
