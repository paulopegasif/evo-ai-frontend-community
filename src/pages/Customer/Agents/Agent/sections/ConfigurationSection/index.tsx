import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { LLMConfigData } from '@/components/ai_agents/Forms/LLMConfigForm';
import { A2AConfigData } from '@/components/ai_agents/Forms/A2AConfigForm';
import { TaskConfigData } from '@/components/ai_agents/Forms/TaskConfigForm';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import SectionHeader from '../SectionHeader';
import { Agent, ApiKey } from '@/types/agents';
import { Settings, SlidersHorizontal, Timer } from 'lucide-react';
import { InactivityAction } from '../InactivityActions';
import { TransferRule } from '../TransferRules';
import { PipelineRule } from '../PipelineRules';
import { ContactEditConfig } from '../ContactEditRules';
import {
  GeneralTab,
  InactivityActionsTab,
  TransferRulesModal,
  PipelineRulesModal,
} from '@/components/agents/configuration';
import ContactEditModal from '@/components/agents/configuration/ContactEditModal';
import { BehaviorSettings } from '@/components/agents/configuration/types';
import { getAvailableTabs, supportsInactivityActions } from '@/utils/agents';

interface AdvancedSettingsData {
  planner: boolean;
}

interface ConfigurationSectionProps {
  agent: Agent;
  llmConfigData: LLMConfigData | null;
  a2aConfigData: A2AConfigData | null;
  taskConfigData: TaskConfigData | null;
  externalConfigData?: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  } | null;
  apiKeys: ApiKey[];
  outputSchema: Record<string, { type?: string; description?: string }>;
  advancedSettings: AdvancedSettingsData;
  behaviorSettings: BehaviorSettings;
  inactivityActions: InactivityAction[];
  transferRules: TransferRule[];
  pipelineRules: PipelineRule[];
  contactEditConfig: ContactEditConfig;
  availablePipelines?: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string }>;
  }>;
  availableUsers?: Array<{ id: string; name: string }>;
  availableTeams?: Array<{ id: string; name: string }>;
  onLLMConfigChange: (data: LLMConfigData) => void;
  onA2AConfigChange: (data: A2AConfigData) => void;
  onTaskConfigChange: (data: TaskConfigData) => void;
  onExternalConfigChange?: (data: {
    provider?: string;
    advanced_config?: {
      message_wait_time: number;
      message_signature: string;
      enable_text_segmentation: boolean;
      max_characters_per_segment: number;
      min_segment_size: number;
      character_delay_ms: number;
    };
  }) => void;
  onOutputSchemaChange: (schema: Record<string, { type?: string; description?: string }>) => void;
  onAdvancedSettingsChange: (settings: AdvancedSettingsData) => void;
  onBehaviorSettingsChange: (settings: BehaviorSettings) => void;
  onInactivityActionsChange: (actions: InactivityAction[]) => void;
  onTransferRulesChange: (rules: TransferRule[]) => void;
  onPipelineRulesChange: (rules: PipelineRule[]) => void;
  onContactEditConfigChange: (config: ContactEditConfig) => void;
  onInstructionSync?: (instruction: string) => void;
  onApiKeysReload: () => void;
}

const ConfigurationSection = ({
  agent,
  llmConfigData,
  a2aConfigData,
  taskConfigData,
  externalConfigData,
  apiKeys,
  behaviorSettings,
  inactivityActions,
  transferRules,
  pipelineRules,
  contactEditConfig,
  availablePipelines = [],
  availableUsers = [],
  availableTeams = [],
  onLLMConfigChange,
  onA2AConfigChange,
  onTaskConfigChange,
  onExternalConfigChange,
  onBehaviorSettingsChange,
  onInactivityActionsChange,
  onTransferRulesChange,
  onPipelineRulesChange,
  onContactEditConfigChange,
  onInstructionSync,
  onApiKeysReload,
}: ConfigurationSectionProps) => {
  const { t } = useLanguage('aiAgents');

  // Estados para modais
  const [showTransferRulesModal, setShowTransferRulesModal] = useState(false);
  const [showPipelineRulesModal, setShowPipelineRulesModal] = useState(false);
  const [showContactEditModal, setShowContactEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Get available tabs based on agent type
  const availableTabs = getAvailableTabs(agent.type);

  return (
    <>
      <div className="flex flex-col gap-6">
        <SectionHeader
          icon={SlidersHorizontal}
          title={t('edit.configuration.title') || 'Configuração'}
          description={
            t('edit.configuration.subtitle') || 'Configure o modelo e as opções avançadas'
          }
        />
        <Tabs
          value={activeTab}
          onValueChange={value => setActiveTab(value as string)}
          className="flex flex-col gap-6"
        >
          {availableTabs.length > 1 && (
            <TabsList variant="underline" className="w-full justify-start border-b">
              {/* Aba Geral */}
              {availableTabs.includes('general') && (
                <TabsTab value="general">
                  <Settings />
                  <span>{t('edit.configuration.tabs.general') || 'Geral'}</span>
                </TabsTab>
              )}

              {/* Aba Ações de Inatividade */}
              {availableTabs.includes('inactivity') && supportsInactivityActions(agent.type) && (
                <TabsTab value="inactivity">
                  <Timer />
                  <span>
                    {t('edit.configuration.tabs.inactivityActions') || 'Ações de inatividade'}
                  </span>
                </TabsTab>
              )}
            </TabsList>
          )}

          {/* Conteúdo da Aba Geral */}
          {availableTabs.includes('general') && (
            <TabsPanel value="general">
              <GeneralTab
                agent={agent}
                llmConfigData={llmConfigData}
                a2aConfigData={a2aConfigData}
                taskConfigData={taskConfigData}
                externalConfigData={externalConfigData}
                apiKeys={apiKeys}
                behaviorSettings={behaviorSettings}
                onLLMConfigChange={onLLMConfigChange}
                onA2AConfigChange={onA2AConfigChange}
                onTaskConfigChange={onTaskConfigChange}
                onExternalConfigChange={onExternalConfigChange}
                onBehaviorSettingsChange={onBehaviorSettingsChange}
                onShowTransferRulesModal={() => setShowTransferRulesModal(true)}
                onShowPipelineRulesModal={() => setShowPipelineRulesModal(true)}
                onShowContactEditModal={() => setShowContactEditModal(true)}
                onInstructionSync={onInstructionSync}
                onApiKeysReload={onApiKeysReload}
              />
            </TabsPanel>
          )}

          {/* Conteúdo da Aba Ações de Inatividade */}
          {availableTabs.includes('inactivity') && supportsInactivityActions(agent.type) && (
            <TabsPanel value="inactivity">
              <InactivityActionsTab
                actions={inactivityActions}
                onChange={onInactivityActionsChange}
              />
            </TabsPanel>
          )}
        </Tabs>
      </div>

      {/* Modal de Regras de Transferência */}
      <TransferRulesModal
        open={showTransferRulesModal}
        onOpenChange={setShowTransferRulesModal}
        rules={transferRules}
        onChange={onTransferRulesChange}
        availableUsers={availableUsers}
        availableTeams={availableTeams}
      />

      {/* Modal de Regras de Pipeline */}
      <PipelineRulesModal
        open={showPipelineRulesModal}
        onOpenChange={setShowPipelineRulesModal}
        rules={pipelineRules}
        onChange={onPipelineRulesChange}
        availablePipelines={availablePipelines}
      />

      {/* Modal de Edição de Contatos */}
      <ContactEditModal
        open={showContactEditModal}
        onOpenChange={setShowContactEditModal}
        config={contactEditConfig}
        onChange={onContactEditConfigChange}
      />
    </>
  );
};

export default ConfigurationSection;
