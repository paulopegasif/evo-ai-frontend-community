import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from '@/components/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MenuItem as MenuItemType } from '../config/menuItems';
import { UnreadBadge } from '@/components/shared';
import { cn } from '@/utils/cn';

interface MenuItemProps {
  item: MenuItemType;
  mobile?: boolean;
  isCollapsed?: boolean;
  isActive: boolean;
  activeMenu: string | null;
  onClick: (e: React.MouseEvent) => void;
}

export default function MenuItem({
  item,
  mobile = false,
  isCollapsed = false,
  isActive,
  onClick,
}: MenuItemProps) {
  const { t } = useTranslation('chat');
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const badgeAriaLabel =
    item.badge && item.badge > 0
      ? t('unreadBadge.menuAriaLabel', { count: item.badge })
      : undefined;

  const menuItem = (
    <Link
      to={hasSubItems && !mobile && item.href === '#' ? '#' : item.href}
      onClick={onClick}
      aria-current={isActive && !hasSubItems ? 'page' : undefined}
      className={cn(
        'group relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
        mobile ? 'w-full' : isCollapsed ? 'w-9 justify-center px-0 mx-auto' : '',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/64 hover:text-sidebar-foreground',
      )}
    >
      <item.icon className={cn('size-4.5 shrink-0', isActive ? 'text-primary' : 'opacity-80')} />
      {(!isCollapsed || mobile) && (
        <>
          <span className="flex-1 truncate">{item.name}</span>
          {item.badge ? (
            <UnreadBadge count={item.badge} ariaLabel={badgeAriaLabel} className="ml-auto" />
          ) : hasSubItems && !mobile ? (
            <ChevronRight className="ms-auto size-4 opacity-48" />
          ) : null}
        </>
      )}
      {isCollapsed && !mobile && item.badge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[10px] text-primary-foreground leading-none ring-2 ring-sidebar"
        >
          {item.badge < 100 ? item.badge : '99+'}
        </span>
      ) : null}
    </Link>
  );

  if (!mobile && isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={menuItem} />
        <TooltipContent side="right">
          <p className="font-medium">{item.name}</p>
          {badgeAriaLabel ? (
            <p className="text-xs text-muted-foreground">{badgeAriaLabel}</p>
          ) : null}
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuItem;
}
