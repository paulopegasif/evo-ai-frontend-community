import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Group, GroupSeparator } from '@/components/ui/group';
import { Menu, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '@/components/ui/menu';
import { STATUS_META } from './statusMeta';

interface ConversationStatusButtonProps {
  status: string;
  onMarkAsOpen: () => void;
  onMarkAsResolved: () => void;
  onMarkAsPending: () => void;
  onMarkAsSnoozed: () => void;
}

/**
 * Split button: the main segment runs the next action for the current status
 * (Concluir when open, Abrir otherwise); the chevron opens the four fixed
 * status options, with the current one checked.
 */
const ConversationStatusButton = ({
  status,
  onMarkAsOpen,
  onMarkAsResolved,
  onMarkAsPending,
  onMarkAsSnoozed,
}: ConversationStatusButtonProps) => {
  const { t } = useLanguage('chat');

  const mainLabel =
    status === 'open'
      ? t('chatHeader.statusButton.complete', 'Concluir')
      : t('chatHeader.statusButton.open', 'Abrir');
  const mainAction = status === 'open' ? onMarkAsResolved : onMarkAsOpen;

  const options = [
    { key: 'open', label: t('chatHeader.statusButton.openFull', 'Abrir atendimento'), onClick: onMarkAsOpen },
    { key: 'pending', label: t('contexts.conversations.statusNames.pending', 'Pendente'), onClick: onMarkAsPending },
    { key: 'snoozed', label: t('chatHeader.statusButton.pause', 'Pausar Conversa'), onClick: onMarkAsSnoozed },
    { key: 'resolved', label: t('chatHeader.statusButton.complete', 'Concluir'), onClick: onMarkAsResolved },
  ];

  return (
    <Group>
      <Button size="sm" onClick={mainAction}>
        {mainLabel}
      </Button>
      <GroupSeparator className="bg-primary-foreground/24" />
      <Menu>
        <MenuTrigger
          render={
            <Button size="icon-sm" aria-label={t('chatHeader.statusButton.more', 'Mais opções de status')} />
          }
        >
          <ChevronDown />
        </MenuTrigger>
        <MenuPopup align="end" className="w-52">
          <MenuRadioGroup
            value={status}
            onValueChange={(value: unknown) => options.find(o => o.key === value)?.onClick()}
          >
            {options.map(o => (
              <MenuRadioItem key={o.key} value={o.key}>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 flex-none rounded-full"
                    style={{ background: STATUS_META[o.key].color }}
                  />
                  {o.label}
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuPopup>
      </Menu>
    </Group>
  );
};

export default ConversationStatusButton;
