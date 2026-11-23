import type { ReactElement } from 'react';
import { Copy, Edit, Trash2 } from '@/components/icons';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Agent } from '@/types/agents';
import { usePermissions } from '@/contexts/PermissionsContext';

interface AgentActionsDropdownProps {
  agent: Agent;
  trigger: ReactElement;
  onEdit: (agent: Agent) => void;
  onMoveToFolder?: (agent: Agent) => void;
  onExportAsJSON?: (agent: Agent) => void;
  onShare?: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  align?: 'start' | 'center' | 'end';
}

export default function AgentActionsDropdown({
  agent,
  trigger,
  onEdit,
  onDelete,
  align = 'end',
}: AgentActionsDropdownProps) {
  const { t } = useLanguage('agents');
  const { can, isReady } = usePermissions();
  return (
    <Menu>
      <MenuTrigger render={trigger} />
      <MenuPopup align={align} className="min-w-48">
        {isReady && can('ai_agents', 'update') && (
          <MenuItem onClick={() => onEdit(agent)}>
            <Edit />
            {t('dropdown.edit')}
          </MenuItem>
        )}
        <MenuItem
          onClick={async () => {
            await navigator.clipboard.writeText(agent.id);
            toast.success(t('dropdown.idCopied'));
          }}
        >
          <Copy />
          {t('dropdown.copyId')}
        </MenuItem>
        {isReady && can('ai_agents', 'delete') && (
          <>
            <MenuSeparator />
            <MenuItem variant="destructive" onClick={() => onDelete(agent)}>
              <Trash2 />
              {t('dropdown.delete')}
            </MenuItem>
          </>
        )}
      </MenuPopup>
    </Menu>
  );
}
