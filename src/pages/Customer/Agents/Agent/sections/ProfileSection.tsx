import { useState } from 'react';
import { Sparkles, UserRound, Wand2 } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SectionHeader from './SectionHeader';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { openaiService } from '@/services/integrations/openaiService';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';
import { toast } from 'sonner';
import PromptGeneratorModal from '@/components/agents/wizard/PromptGeneratorModal';

interface ProfileSectionProps {
  formData: {
    name: string;
    description: string;
    role: string;
    goal: string;
    instruction: string;
  };
  onFormDataChange: (field: string, value: string) => void;
  agentType?: string;
}

const ProfileSection = ({ formData, onFormDataChange, agentType }: ProfileSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const { can, isReady } = usePermissions();
  const config = useGlobalConfig();
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  // Orchestrator types and external don't have role, goal, or instruction
  const isOrchestratorType = ['sequential', 'parallel', 'loop', 'task', 'external'].includes(agentType || '');

  // AI actions call the CRM integrations processor, so they demand both the
  // configured provider and the integrations.execute grant.
  const showAIActions = config.openaiConfigured === true && isReady && can('integrations', 'execute');

  const handleReview = async () => {
    if (!formData.instruction || !formData.instruction.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillPromptToReview'));
      return;
    }

    setIsReviewing(true);
    try {
      const reviewedPrompt = await openaiService.processEvent({
        type: 'review_prompt',
        content: formData.instruction,
      });

      if (reviewedPrompt) {
        onFormDataChange('instruction', reviewedPrompt);
        toast.success(t('wizard.promptGenerator.messages.reviewSuccess'));
      }
    } catch (error) {
      console.error('Error reviewing prompt:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('wizard.promptGenerator.messages.reviewError');
      toast.error(errorMessage);
    } finally {
      setIsReviewing(false);
    }
  };

  const requiredMark = <span className="text-destructive-foreground">*</span>;

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          icon={UserRound}
          title={t('edit.profile.title') || 'Informações pessoais'}
          description={t('edit.profile.subtitle') || 'Configure as informações básicas do seu agente'}
        />

        <Card>
          <CardPanel className="flex flex-col gap-5">
            <Field>
              <FieldLabel>
                {t('edit.profile.name') || 'Nome do agente'} {requiredMark}
              </FieldLabel>
              <Input
                value={formData.name}
                onChange={e => onFormDataChange('name', e.target.value)}
                placeholder={t('edit.profile.namePlaceholder') || 'Digite o nome do agente'}
                className="max-w-md"
              />
            </Field>

            {!isOrchestratorType && (
              <div className="grid gap-5 md:grid-cols-2">
                <Field>
                  <FieldLabel>{t('edit.profile.role') || 'Papel'}</FieldLabel>
                  <Input
                    value={formData.role}
                    onChange={e => onFormDataChange('role', e.target.value)}
                    placeholder={
                      t('edit.profile.rolePlaceholder') || 'Ex: Especialista em suporte técnico'
                    }
                  />
                  <FieldDescription>
                    {t('edit.profile.roleHelp') || 'O papel que o agente desempenha na conversa'}
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel>{t('edit.profile.goal') || 'Objetivo'}</FieldLabel>
                  <Input
                    value={formData.goal}
                    onChange={e => onFormDataChange('goal', e.target.value)}
                    placeholder={
                      t('edit.profile.goalPlaceholder') || 'Ex: Ajudar usuários com dúvidas técnicas'
                    }
                  />
                  <FieldDescription>
                    {t('edit.profile.goalHelp') || 'O objetivo principal do agente'}
                  </FieldDescription>
                </Field>
              </div>
            )}
          </CardPanel>
        </Card>

        {!isOrchestratorType && (
          <Card>
            <CardHeader>
              <CardTitle>{t('edit.profile.instructions') || 'Comportamento'}</CardTitle>
              <CardDescription>
                {t('edit.profile.instructionsHelp') ||
                  'Ex. Seja extrovertido, na primeira interação procure saber o nome do usuário.'}
              </CardDescription>
              {showAIActions && (
                <CardAction className="flex gap-2">
                  {formData.instruction && formData.instruction.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleReview}
                      loading={isReviewing}
                    >
                      {!isReviewing && <Wand2 />}
                      {isReviewing
                        ? t('wizard.promptGenerator.buttons.reviewing')
                        : t('wizard.promptGenerator.buttons.review')}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPromptModal(true)}
                  >
                    <Sparkles className="text-primary" />
                    {t('wizard.step5.generateWithAI')}
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardPanel className="flex flex-col gap-2">
              <Textarea
                aria-label={t('edit.profile.instructions') || 'Comportamento'}
                value={formData.instruction}
                onChange={e => onFormDataChange('instruction', e.target.value)}
                placeholder={
                  t('edit.profile.instructionsPlaceholder') ||
                  'Descreva como o agente deve se comportar durante a conversa...'
                }
                className="min-h-[280px] font-mono text-sm leading-relaxed"
              />
              <span
                className={
                  formData.instruction.length > 3000
                    ? 'self-end text-destructive-foreground text-xs tabular-nums'
                    : 'self-end text-muted-foreground text-xs tabular-nums'
                }
              >
                {formData.instruction.length}/3000
              </span>
            </CardPanel>
          </Card>
        )}
      </div>

      {/* Prompt Generator Modal */}
      <PromptGeneratorModal
        open={showPromptModal}
        onOpenChange={setShowPromptModal}
        onGenerated={prompt => {
          onFormDataChange('instruction', prompt);
        }}
        initialPrompt={formData.instruction}
      />
    </>
  );
};

export default ProfileSection;
