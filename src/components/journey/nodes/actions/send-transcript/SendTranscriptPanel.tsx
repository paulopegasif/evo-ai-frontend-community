import { useEffect, useMemo, useState } from 'react';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { FileText } from 'lucide-react';
import { SendTranscriptNodeData } from './SendTranscriptNode';
import { automationService } from '@/services/automation/automationService';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { useLanguage } from '@/hooks/useLanguage';

interface SendTranscriptPanelProps {
  nodeId: string;
  data: SendTranscriptNodeData;
  onUpdate: (nodeId: string, newData: SendTranscriptNodeData) => void;
  onClose: () => void;
}

export function SendTranscriptPanel({ nodeId, data, onUpdate, onClose }: SendTranscriptPanelProps) {
  const { t } = useLanguage('journey');
  const [email, setEmail] = useState<string>(data.email || '');
  const [subject, setSubject] = useState<string>(data.subject || '');
  const [originalSnapshot] = useState(() => ({
    email: data.email || '',
    subject: data.subject || '',
  }));
  const [formDataOptions, setFormDataOptions] = useState<{
    teams: any[];
    agents: any[];
  }>({
    teams: [],
    agents: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setLoading(true);
        const formData = await automationService.getFormData();
        setFormDataOptions({
          teams: formData.teams || [],
          agents: formData.agents || [],
        });
      } catch (error) {
        console.error(t('panels.sendTranscript.loadDataError'), error);
      } finally {
        setLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleSave = () => {
    const updatedData: SendTranscriptNodeData = {
      ...data,
      email: email.trim(),
      subject: subject.trim(),
      formDataOptions,
      action_params: [email.trim()],
    };

    onUpdate(nodeId, updatedData);
    onClose();
  };

  useEffect(() => {
    if (formDataOptions.teams.length > 0 || formDataOptions.agents.length > 0) {
      const updatedData: SendTranscriptNodeData = {
        ...data,
        formDataOptions,
      };
      onUpdate(nodeId, updatedData);
    }
  }, [formDataOptions, data, nodeId, onUpdate]);

  const getCharacterCount = (text: string) => text.length;

  const getCharacterCountColor = (text: string, max: number) => {
    const count = getCharacterCount(text);
    if (count > max) return 'text-flow-feedback-error-fg';
    if (count > max * 0.8) return 'text-flow-feedback-warn-fg';
    return 'text-muted-foreground';
  };

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const isValid =
    email.trim().length > 0 && isValidEmail(email) && getCharacterCount(subject) <= 100;
  const dirty = useMemo(
    () => email !== originalSnapshot.email || subject !== originalSnapshot.subject,
    [email, subject, originalSnapshot],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.sendTranscript.title')}
      icon={<FileText className="size-5 text-flow-node-action-message-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      loading={loading}
      saveLabel={t('panels.actions.save')}
      cancelLabel={t('panels.actions.cancel')}
    >
      <div className="space-y-4">
        <Field>
          <FieldLabel>
            {t('panels.sendTranscript.destinationEmail')}
          </FieldLabel>
          <Input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('panels.sendTranscript.emailPlaceholder')}
            disabled={loading}
            type="email"
          />

          {email && !isValidEmail(email) && (
            <FlowFeedbackBanner variant="error" className="w-full">
              <p className="text-xs">{t('panels.sendTranscript.invalidEmail')}</p>
            </FlowFeedbackBanner>
          )}

          <FieldDescription>{t('panels.sendTranscript.emailDescription')}</FieldDescription>
        </Field>

        <Field>
          <FieldLabel>
            {t('panels.sendTranscript.emailSubject')}
          </FieldLabel>
          <Input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={t('panels.sendTranscript.subjectPlaceholder')}
            disabled={loading}
          />

          <div className="flex w-full items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">
              {t('panels.sendTranscript.variablesHint')}
            </span>
            <span className={getCharacterCountColor(subject, 100)}>
              {t('panels.sendTranscript.characterCount', { count: getCharacterCount(subject) })}
            </span>
          </div>
        </Field>

        {email && isValidEmail(email) && (
          <FlowFeedbackBanner variant="info">
            <div className="font-medium mb-1">{t('panels.sendTranscript.previewTitle')}</div>
            <div className="space-y-1 text-xs">
              <div>
                <strong>{t('panels.sendTranscript.previewToLabel')}</strong> {email}
              </div>
              {subject && (
                <div>
                  <strong>{t('panels.sendTranscript.previewSubjectLabel')}</strong>{' '}
                  {subject || t('panels.sendTranscript.previewDefaultSubject')}
                </div>
              )}
            </div>
          </FlowFeedbackBanner>
        )}

        <FlowFeedbackBanner variant="info">
          <div className="font-medium mb-1">{t('panels.sendTranscript.transcriptInfo.title')}</div>
          <div className="space-y-1 text-xs">
            <div>• {t('panels.sendTranscript.transcriptInfo.includesMessages')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.includesMetadata')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.formatHTML')}</div>
            <div>• {t('panels.sendTranscript.transcriptInfo.processedOnExecution')}</div>
          </div>
        </FlowFeedbackBanner>
      </div>
    </NodeConfigModal>
  );
}
