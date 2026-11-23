import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { openaiService } from '@/services/integrations/openaiService';
import { useLanguage } from '@/hooks/useLanguage';

interface PromptGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (prompt: string) => void;
  initialPrompt?: string;
}

interface PromptFormData {
  contexto: string;
  objetivo: string;
  estilo: string;
  tom: string;
  audiencia: string;
  formato: string;
  exemplo: string;
  regras: string;
  pontosCriticos: string;
  instrucoesExtras: string;
}

const PromptGeneratorModal = ({
  open,
  onOpenChange,
  onGenerated,
  initialPrompt,
}: PromptGeneratorModalProps) => {
  const { t } = useLanguage('aiAgents');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [formData, setFormData] = useState<PromptFormData>({
    contexto: '',
    objetivo: '',
    estilo: '',
    tom: '',
    audiencia: '',
    formato: '',
    exemplo: '',
    regras: '',
    pontosCriticos: '',
    instrucoesExtras: '',
  });

  const questions = [
    {
      key: 'contexto' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.contexto.label'),
      placeholder: t('wizard.promptGenerator.questions.contexto.placeholder'),
    },
    {
      key: 'objetivo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.objetivo.label'),
      placeholder: t('wizard.promptGenerator.questions.objetivo.placeholder'),
    },
    {
      key: 'estilo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.estilo.label'),
      placeholder: t('wizard.promptGenerator.questions.estilo.placeholder'),
    },
    {
      key: 'tom' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.tom.label'),
      placeholder: t('wizard.promptGenerator.questions.tom.placeholder'),
    },
    {
      key: 'audiencia' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.audiencia.label'),
      placeholder: t('wizard.promptGenerator.questions.audiencia.placeholder'),
    },
    {
      key: 'formato' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.formato.label'),
      placeholder: t('wizard.promptGenerator.questions.formato.placeholder'),
    },
    {
      key: 'exemplo' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.exemplo.label'),
      placeholder: t('wizard.promptGenerator.questions.exemplo.placeholder'),
    },
    {
      key: 'regras' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.regras.label'),
      placeholder: t('wizard.promptGenerator.questions.regras.placeholder'),
    },
    {
      key: 'pontosCriticos' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.pontosCriticos.label'),
      placeholder: t('wizard.promptGenerator.questions.pontosCriticos.placeholder'),
    },
    {
      key: 'instrucoesExtras' as keyof PromptFormData,
      label: t('wizard.promptGenerator.questions.instrucoesExtras.label'),
      placeholder: t('wizard.promptGenerator.questions.instrucoesExtras.placeholder'),
    },
  ];

  const buildPromptContent = (): string => {
    const parts: string[] = [];

    if (formData.contexto) {
      parts.push(`CONTEXTO:\n${formData.contexto}`);
    }
    if (formData.objetivo) {
      parts.push(`OBJETIVO:\n${formData.objetivo}`);
    }
    if (formData.estilo) {
      parts.push(`ESTILO:\n${formData.estilo}`);
    }
    if (formData.tom) {
      parts.push(`TOM:\n${formData.tom}`);
    }
    if (formData.audiencia) {
      parts.push(`AUDIÊNCIA:\n${formData.audiencia}`);
    }
    if (formData.formato) {
      parts.push(`FORMATO:\n${formData.formato}`);
    }
    if (formData.exemplo) {
      parts.push(`EXEMPLO DE REFERÊNCIA:\n${formData.exemplo}`);
    }
    if (formData.regras) {
      parts.push(`REGRAS ESPECÍFICAS:\n${formData.regras}`);
    }
    if (formData.pontosCriticos) {
      parts.push(`PONTOS CRÍTICOS:\n${formData.pontosCriticos}`);
    }
    if (formData.instrucoesExtras) {
      parts.push(`INSTRUÇÕES EXTRAS:\n${formData.instrucoesExtras}`);
    }

    return parts.join('\n\n');
  };

  const handleGenerate = async () => {
    const promptContent = buildPromptContent();
    if (!promptContent.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillAtLeastOne'));
      return;
    }

    setIsGenerating(true);
    try {
      const generatedPrompt = await openaiService.processEvent({
        type: 'generate_prompt',
        content: promptContent,
      });

      if (generatedPrompt) {
        onGenerated(generatedPrompt);
        toast.success(t('wizard.promptGenerator.messages.success'));
        onOpenChange(false);
        // Reset form
        setFormData({
          contexto: '',
          objetivo: '',
          estilo: '',
          tom: '',
          audiencia: '',
          formato: '',
          exemplo: '',
          regras: '',
          pontosCriticos: '',
          instrucoesExtras: '',
        });
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage =
        error instanceof Error ? error.message : t('wizard.promptGenerator.messages.error');
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (promptToReview: string) => {
    if (!promptToReview || !promptToReview.trim()) {
      toast.error(t('wizard.promptGenerator.messages.fillPromptToReview'));
      return;
    }

    setIsReviewing(true);
    try {
      const reviewedPrompt = await openaiService.processEvent({
        type: 'review_prompt',
        content: promptToReview,
      });

      if (reviewedPrompt) {
        onGenerated(reviewedPrompt);
        toast.success(t('wizard.promptGenerator.messages.reviewSuccess'));
        onOpenChange(false);
        // Reset form
        setFormData({
          contexto: '',
          objetivo: '',
          estilo: '',
          tom: '',
          audiencia: '',
          formato: '',
          exemplo: '',
          regras: '',
          pontosCriticos: '',
          instrucoesExtras: '',
        });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            {t('wizard.promptGenerator.title')}
          </DialogTitle>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-4">
          {questions.map(question => (
            <div key={question.key} className="space-y-2">
              <Label className="text-sm font-medium">{question.label}</Label>
              <Textarea
                value={formData[question.key]}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    [question.key]: e.target.value,
                  }))
                }
                placeholder={question.placeholder}
                disabled={isGenerating}
              />
            </div>
          ))}
        </DialogPanel>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating || isReviewing}
          >
            {t('wizard.promptGenerator.buttons.cancel')}
          </Button>
          {initialPrompt && initialPrompt.trim() && (
            <Button
              variant="outline"
              onClick={() => handleReview(initialPrompt)}
              disabled={isGenerating}
              loading={isReviewing}
            >
              {!isReviewing && <Wand2 />}
              {isReviewing
                ? t('wizard.promptGenerator.buttons.reviewing')
                : t('wizard.promptGenerator.buttons.review')}
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={isReviewing} loading={isGenerating}>
            {!isGenerating && <Sparkles />}
            {isGenerating
              ? t('wizard.promptGenerator.buttons.generating')
              : t('wizard.promptGenerator.buttons.generate')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default PromptGeneratorModal;
