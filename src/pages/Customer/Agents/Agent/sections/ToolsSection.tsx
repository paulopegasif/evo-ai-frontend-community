import AgentToolsSection from '@/components/ai_agents/AgentToolsSection';
import CustomToolsSection from '@/components/ai_agents/CustomToolsSection';
import { CustomTool } from '@/types/ai';
import { useLanguage } from '@/hooks/useLanguage';
import { Users, Code } from 'lucide-react';
import { Agent } from '@/types';
import { Separator } from '@/components/ui/separator';
import SectionHeader from './SectionHeader';

interface ToolsSectionProps {
  agentTools: string[];
  agentToolsData?: Agent[];
  customTools: {
    http_tools: CustomTool[];
  };
  onAgentToolsChange: (agentTools: string[], agentToolsData?: Agent[]) => void;
  onCustomToolsChange: (customTools: { http_tools: CustomTool[] }) => void;
  editingAgentId?: string;
  folderId?: string;
}

const ToolsSection = ({
  agentTools,
  agentToolsData,
  customTools,
  onAgentToolsChange,
  onCustomToolsChange,
  editingAgentId,
  folderId,
}: ToolsSectionProps) => {
  const { t } = useLanguage('aiAgents');

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <SectionHeader
          icon={Users}
          title={t('tools.agentTools.title') || 'Agentes como Ferramentas'}
          description={
            t('tools.agentTools.subtitle') ||
            'Use outros agentes como ferramentas para expandir as capacidades deste agente'
          }
        />
        <AgentToolsSection
          agentTools={agentTools}
          agentToolsData={agentToolsData}
          onAgentToolsChange={onAgentToolsChange}
          clientId="default"
          folderId={folderId}
          editingAgentId={editingAgentId}
          isReadOnly={false}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <SectionHeader
          icon={Code}
          title={t('tools.customTools.title') || 'Ferramentas Customizadas'}
          description={
            t('tools.customTools.subtitle') ||
            'Configure ferramentas HTTP personalizadas para integrar com APIs externas'
          }
        />
        <CustomToolsSection
          customTools={customTools}
          onCustomToolsChange={onCustomToolsChange}
          isReadOnly={false}
        />
      </section>
    </div>
  );
};

export default ToolsSection;
