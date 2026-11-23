import React from 'react';

import {
  MessageSquareText,
  FileText,
  Image,
  StickyNote,
  CalendarClock,
  LayoutTemplate,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

import { useLanguage } from '@/hooks/useLanguage';

interface ComposerPlusMenuProps {
  disabled?: boolean;
  onOpenQuickReplies: () => void;
  onPickDocuments: () => void;
  onPickMedia: () => void;
  onOpenConversationNote: () => void;
  onSchedule: () => void;
  /** WhatsApp Cloud templates — sem equivalente no protótipo, mantido como 6º item quando disponível. */
  onOpenTemplates?: () => void;
}

const ITEM_ICON_BOX =
  'flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary';

/**
 * Composer "+" menu: opens upwards, each item with a tinted icon tile. Fixed
 * order: Quick replies, Documents, Photos and videos, Conversation note,
 * Schedule (+ WhatsApp Cloud templates when available).
 */
const ComposerPlusMenu: React.FC<ComposerPlusMenuProps> = ({
  disabled = false,
  onOpenQuickReplies,
  onPickDocuments,
  onPickMedia,
  onOpenConversationNote,
  onSchedule,
  onOpenTemplates,
}) => {
  const { t } = useLanguage('chat');
  const items = [
    {
      key: 'rapidas',
      label: t('messageInput.composerMenu.quickReplies'),
      icon: <MessageSquareText className="size-4" />,
      onClick: onOpenQuickReplies,
    },
    {
      key: 'docs',
      label: t('messageInput.composerMenu.documents'),
      icon: <FileText className="size-4" />,
      onClick: onPickDocuments,
    },
    {
      key: 'midia',
      label: t('messageInput.composerMenu.media'),
      icon: <Image className="size-4" />,
      onClick: onPickMedia,
    },
    {
      key: 'notas',
      label: t('messageInput.composerMenu.conversationNote'),
      icon: <StickyNote className="size-4" />,
      onClick: onOpenConversationNote,
    },
    {
      key: 'agendar',
      label: t('messageInput.composerMenu.schedule'),
      icon: <CalendarClock className="size-4" />,
      onClick: onSchedule,
    },
    ...(onOpenTemplates
      ? [
          {
            key: 'templates',
            label: t('messageTemplates.button.title'),
            icon: <LayoutTemplate className="size-4" />,
            onClick: onOpenTemplates,
          },
        ]
      : []),
  ];

  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              disabled={disabled}
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('messageInput.composerMenu.tooltip')}
                  className="flex-shrink-0 text-primary"
                />
              }
            />
          }
        >
          <Plus className="size-5" strokeWidth={2.2} />
        </TooltipTrigger>
        <TooltipPopup>{t('messageInput.composerMenu.tooltip')}</TooltipPopup>
      </Tooltip>
      <MenuPopup side="top" align="start" sideOffset={8} className="w-60">
        {items.map(item => (
          <MenuItem key={item.key} onClick={item.onClick} className="gap-2.5 py-1.5">
            <span className={ITEM_ICON_BOX}>{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
};

export default ComposerPlusMenu;
