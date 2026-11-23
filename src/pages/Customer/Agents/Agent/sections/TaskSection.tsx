import { useCallback, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { ListChecks } from '@/components/icons';
import SectionHeader from './SectionHeader';
import TaskConfigForm, { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';

interface TaskSectionProps {
  data: TaskConfigData;
  onChange: (data: TaskConfigData) => void;
  editingAgentId?: string;
  folderId?: string;
}

const TaskSection = ({ data, onChange, editingAgentId, folderId }: TaskSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const [, setIsValid] = useState(false);
  const [, setErrors] = useState<string[]>([]);

  const handleValidationChange = useCallback((valid: boolean, validationErrors: string[]) => {
    setIsValid(valid);
    setErrors(validationErrors);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        icon={ListChecks}
        title={t('edit.task.title') || 'Configuração de Tarefa'}
        description={t('edit.task.subtitle') || 'Configure a tarefa que este agente irá executar'}
      />

      <TaskConfigForm
        mode="edit"
        data={data}
        onChange={onChange}
        onValidationChange={handleValidationChange}
        editingAgentId={editingAgentId}
        folderId={folderId}
      />
    </div>
  );
};

export default TaskSection;
