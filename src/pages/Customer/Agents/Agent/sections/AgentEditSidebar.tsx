import { User, Wrench, Plug, Server, Users, ListChecks, Settings, Package } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { AgentAvatar } from '@/components/agents/AgentCard';
import { cn } from '@/lib/utils';
import { Agent } from '@/types/agents';

type SidebarMenu =
  | 'profile'
  | 'task'
  | 'subAgents'
  | 'configuration'
  | 'knowledge'
  | 'tools'
  | 'integrations'
  | 'mcpServers'
  | 'channels'
  | 'products'
  | 'settings';

interface AgentEditSidebarProps {
  agent: Agent;
  agentName: string;
  activeMenu: SidebarMenu;
  onMenuChange: (menu: SidebarMenu) => void;
  onTestAI?: () => void;
}

const getAgentTypeLabel = (type: string, t: (key: string) => string): string => {
  const typeLabels: Record<string, string> = {
    llm: t('basicInfo.types.llm') || 'LLM',
    a2a: t('basicInfo.types.a2a') || 'A2A',
    sequential: t('basicInfo.types.sequential') || 'Sequencial',
    parallel: t('basicInfo.types.parallel') || 'Paralelo',
    loop: t('basicInfo.types.loop') || 'Loop',
    workflow: t('basicInfo.types.workflow') || 'Workflow',
    task: t('basicInfo.types.task') || 'Task',
    external: t('basicInfo.types.external') || 'Integração Externa',
  };
  return typeLabels[type] || type;
};

const AgentEditSidebar = ({
  agent,
  agentName,
  activeMenu,
  onMenuChange,
  onTestAI,
}: AgentEditSidebarProps) => {
  const { t } = useLanguage('aiAgents');

  // Tipos orquestradores (que usam sub-agentes ou tarefas, não tem role/goal/behavior)
  const isOrchestratorType = ['sequential', 'parallel', 'loop', 'task'].includes(agent.type || '');
  const isTaskType = agent.type === 'task';
  const isSubAgentType = ['llm', 'sequential', 'parallel', 'loop'].includes(agent.type || '');
  const isExternalType = agent.type === 'external';

  // Construir menu dinamicamente baseado no tipo
  const allMenuItems: Array<{ id: SidebarMenu; label: string; icon: typeof User; show: boolean }> =
    [
      { id: 'profile', label: t('edit.menu.profile') || 'Perfil', icon: User, show: true },
      { id: 'task', label: t('edit.menu.task') || 'Tarefa', icon: ListChecks, show: isTaskType },
      {
        id: 'subAgents',
        label: t('edit.menu.subAgents') || 'Sub Agentes',
        icon: Users,
        show: isSubAgentType,
      },
      {
        id: 'tools',
        label: t('edit.menu.tools') || 'Ferramentas',
        icon: Wrench,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'integrations',
        label: t('edit.menu.integrations') || 'Integrações',
        icon: Plug,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'mcpServers',
        label: t('edit.menu.mcpServers') || 'Servidores MCP',
        icon: Server,
        show: !isOrchestratorType && !isExternalType,
      },
      {
        id: 'products',
        label: t('edit.menu.products') || 'Produtos',
        icon: Package,
        show: !isOrchestratorType,
      },
      {
        id: 'configuration',
        label: t('edit.menu.configuration') || 'Configuração',
        icon: Settings,
        show: true,
      },
    ];

  // Filtrar apenas os itens que devem ser mostrados
  const menuItems = allMenuItems.filter(item => item.show);

  const agentTypeLabel = getAgentTypeLabel(agent.type || 'llm', t);

  return (
    <aside className="flex shrink-0 flex-col border-b bg-sidebar text-sidebar-foreground md:w-60 md:border-e md:border-b-0">
      <div className="hidden items-center gap-3 border-b p-4 md:flex">
        <AgentAvatar agent={{ name: agentName, type: agent.type }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-sm">{agentName}</p>
          <p className="truncate text-muted-foreground text-xs">{agentTypeLabel}</p>
        </div>
      </div>

      <nav
        aria-label={agentName}
        className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-1 md:flex-col md:overflow-y-auto md:py-3"
      >
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onMenuChange(item.id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-sidebar-foreground/72 hover:bg-sidebar-accent hover:text-sidebar-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {onTestAI && (
        <div className="hidden border-t p-4 md:block">
          <Button className="w-full" onClick={onTestAI}>
            {t('edit.testAI') || 'Teste sua IA'}
          </Button>
        </div>
      )}
    </aside>
  );
};

export default AgentEditSidebar;
