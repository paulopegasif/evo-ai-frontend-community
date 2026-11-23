import React, { useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useUnreadConversationsStore } from '@/store/unreadConversationsStore';
import { Link, useLocation } from 'react-router-dom';
import { X } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MenuItem from './MenuItem';
import { MenuItem as MenuItemType } from '../config/menuItems';
import { cn } from '@/utils/cn';
import { PluginSlot } from '@/plugin-host';
import { BRAND } from '@/brand';

interface SidebarProps {
  isCollapsed: boolean;
  menuItems: MenuItemType[];
  activeSubmenu: MenuItemType | null;
  activeMenu: string | null;
  isMenuWithSubItemsActive: (item: MenuItemType) => boolean;
  handleMenuClick: (item: MenuItemType, e: React.MouseEvent) => void;
  setActiveSubmenu: (item: MenuItemType | null) => void;
}

export default function Sidebar({
  isCollapsed,
  menuItems,
  activeSubmenu,
  activeMenu,
  isMenuWithSubItemsActive,
  handleMenuClick,
  setActiveSubmenu,
}: SidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const { t } = useLanguage('layout');
  const currentYear = new Date().getFullYear();
  const flyoutRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // Tracks previous activeSubmenu to distinguish "newly opened" from "switched between submenus"
  const prevActiveSubmenuRef = useRef<MenuItemType | null>(null);

  const companyName = t('sidebar.footer.brand');
  const supportUrl = BRAND.links.support;

  const totalUnread = useUnreadConversationsStore(state => state.totalUnread);

  const enrichedMenuItems = useMemo(
    () =>
      menuItems.map(item =>
        item.href === '/conversations' && totalUnread > 0 ? { ...item, badge: totalUnread } : item,
      ),
    [menuItems, totalUnread],
  );

  const mainMenuItems = enrichedMenuItems.filter(item => item.href !== '/tutorials');
  const tutorialsItem = BRAND.links.tutorialsEmbed
    ? enrichedMenuItems.find(item => item.href === '/tutorials')
    : undefined;

  // Dismiss collapsed flyout on Escape (WAI-ARIA requirement for popover-like elements)
  useEffect(() => {
    if (!activeSubmenu || !isCollapsed) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveSubmenu(null);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSubmenu, isCollapsed, setActiveSubmenu]);

  // Focus management: save trigger only on first open; restore on close; re-focus first element when switching
  useEffect(() => {
    if (activeSubmenu && isCollapsed) {
      // Only capture the trigger when flyout transitions from closed → open (not submenu A → submenu B)
      if (!prevActiveSubmenuRef.current) {
        previousFocusRef.current = document.activeElement as HTMLElement;
      }
      const firstFocusable = flyoutRef.current?.querySelector<HTMLElement>('nav a, nav button');
      firstFocusable?.focus();
    } else if (!activeSubmenu && isCollapsed && previousFocusRef.current) {
      if (document.contains(previousFocusRef.current)) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }
    prevActiveSubmenuRef.current = activeSubmenu;
  }, [activeSubmenu, isCollapsed]);

  // Keyboard trap: cycle focus within the flyout so Tab cannot escape to main content
  useEffect(() => {
    if (!activeSubmenu || !isCollapsed) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !flyoutRef.current) return;

      const focusable = flyoutRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [activeSubmenu, isCollapsed]);

  const submenuItems = (item: MenuItemType) =>
    item.subItems?.map(subItem => {
      const exactMatch = pathname === subItem.href;
      const startsWithMatch = pathname.startsWith(subItem.href + '/');
      const hasMoreSpecificMatch = item.subItems?.some(
        other =>
          other.href !== subItem.href &&
          (pathname === other.href || pathname.startsWith(other.href + '/')) &&
          other.href.length > subItem.href.length,
      );
      const isSubActive = exactMatch || (startsWithMatch && !hasMoreSpecificMatch);
      return (
        <Link
          key={subItem.href}
          to={subItem.href}
          aria-current={isSubActive ? 'page' : undefined}
          className={cn(
            'flex h-8 items-center gap-2.5 rounded-lg px-2.5 font-medium text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
            isSubActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/72 hover:bg-sidebar-accent/64 hover:text-sidebar-foreground',
          )}
        >
          <subItem.icon
            className={cn('size-4 shrink-0', isSubActive ? 'text-primary' : 'opacity-80')}
          />
          <span className="flex-1 truncate">{subItem.name}</span>
        </Link>
      );
    });

  const submenuHeader = (item: MenuItemType) => (
    <div className="flex h-12 items-center gap-2.5 px-4">
      <item.icon className="size-4.5 text-primary" />
      <div className="min-w-0 flex-1">
        <h3 id="flyout-title" className="truncate font-semibold text-sidebar-foreground text-sm">
          {item.name}
        </h3>
      </div>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              aria-label={t('sidebar.closeSubmenu')}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                setActiveSubmenu(null);
              }}
              className="size-7 p-0 text-sidebar-foreground/72 hover:text-sidebar-foreground"
            />
          }
        >
          <X className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>{t('sidebar.closeSubmenu')}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          'hidden md:flex bg-sidebar text-sidebar-foreground flex-col',
          isCollapsed ? 'w-16' : 'w-60',
        )}
      >
        <TooltipProvider delay={300}>
          {/* Navigation Menu */}
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
            {mainMenuItems.map(item => (
              <MenuItem
                key={item.id || item.href}
                item={item}
                isCollapsed={isCollapsed}
                isActive={isMenuWithSubItemsActive(item)}
                activeMenu={activeMenu}
                onClick={e => handleMenuClick(item, e)}
              />
            ))}
            <PluginSlot id="sidebar.afterMain" />
          </nav>

          {/* Tutorials - fixed at bottom */}
          {tutorialsItem && (
            <div className="px-2 pb-2">
              <MenuItem
                item={tutorialsItem}
                isCollapsed={isCollapsed}
                isActive={pathname === tutorialsItem.href}
                activeMenu={activeMenu}
                onClick={e => handleMenuClick(tutorialsItem, e)}
              />
            </div>
          )}

          {/* Sidebar Footer */}
          <div className="px-4 py-3">
            {isCollapsed ? (
              <div className="flex flex-col items-center">
                <div className="text-center text-muted-foreground text-xs">© {currentYear}</div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-[11px] text-muted-foreground leading-snug">
                <span className="font-medium text-sidebar-foreground/80 text-xs">{companyName}</span>
                <span className="line-clamp-2">{t('sidebar.footer.copyright', { year: currentYear })}</span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {BRAND.links.docs && (
                    <a href={BRAND.links.docs} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                      {t('sidebar.footer.documentation')}
                    </a>
                  )}
                  {supportUrl && (
                    <a href={supportUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-foreground">
                      {t('sidebar.footer.support')}
                    </a>
                  )}
                  {__APP_VERSION__ !== 'dev' && <span className="tabular-nums opacity-70">{__APP_VERSION__}</span>}
                </div>
              </div>
            )}
          </div>
        </TooltipProvider>
      </div>

      {/*
       * Collapsed flyout: always mounted when sidebar is collapsed so CSS transitions
       * (opacity + translate) animate correctly on show/hide — conditional rendering
       * would unmount the element and bypass the transition entirely.
       */}
      {isCollapsed && (
        <div
          ref={flyoutRef}
          role="dialog"
          aria-labelledby="flyout-title"
          aria-hidden={activeSubmenu ? undefined : 'true'}
          className={cn(
            'hidden md:flex bg-sidebar text-sidebar-foreground flex-col',
            'transition-all duration-150 ease-in-out overflow-hidden',
            activeSubmenu ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none',
          )}
        >
          {activeSubmenu && (
            <>
              {submenuHeader(activeSubmenu)}
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
                {submenuItems(activeSubmenu)}
              </nav>
            </>
          )}
        </div>
      )}

      {/* Expanded mode submenu panel — standard in-flow panel, no animation needed */}
      {!isCollapsed && activeSubmenu && (
        <div className="hidden md:flex w-64 bg-sidebar text-sidebar-foreground flex-col">
          {submenuHeader(activeSubmenu)}
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
            {submenuItems(activeSubmenu)}
          </nav>
        </div>
      )}
    </>
  );
}
