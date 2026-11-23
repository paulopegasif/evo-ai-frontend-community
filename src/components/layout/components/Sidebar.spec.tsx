import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings, Cog } from '@/components/icons';
import Sidebar from './Sidebar';
import type { MenuItem as MenuItemType } from '../config/menuItems';

type MockProps = { children?: React.ReactNode; render?: React.ReactElement };

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button type="button" onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: MockProps) => <>{children}</>,
  Tooltip: ({ children }: MockProps) => <>{children}</>,
  // Base UI triggers render their `render` element; keep that so the real button shows up.
  TooltipTrigger: ({ children, render }: MockProps) =>
    render ? React.cloneElement(render, {}, children ?? render.props.children) : <>{children}</>,
  TooltipContent: ({ children }: MockProps) => <>{children}</>,
  TooltipPopup: ({ children }: MockProps) => <>{children}</>,
}));

vi.mock('./MenuItem', () => ({
  default: ({ item, onClick }: any) => (
    <button type="button" data-testid={`menu-item-${item.id || item.href}`} onClick={onClick}>
      {item.name}
    </button>
  ),
}));

const settingsItem: MenuItemType = {
  id: 'settings',
  name: 'Settings',
  href: '#',
  icon: Settings,
  subItems: [
    { name: 'General', href: '/settings/general', icon: Cog },
    { name: 'Security', href: '/settings/security', icon: Cog },
  ],
};

const contactsItem: MenuItemType = {
  id: 'contacts',
  name: 'Contacts',
  href: '/contacts',
  icon: Cog,
};

function makeProps(overrides = {}) {
  return {
    isCollapsed: true,
    menuItems: [settingsItem, contactsItem],
    activeSubmenu: null as MenuItemType | null,
    activeMenu: null,
    isMenuWithSubItemsActive: () => false,
    handleMenuClick: vi.fn(),
    setActiveSubmenu: vi.fn(),
    ...overrides,
  };
}

function renderSidebar(overrides = {}) {
  return render(
    <MemoryRouter>
      <Sidebar {...makeProps(overrides)} />
    </MemoryRouter>,
  );
}

describe('Sidebar — collapsed + activeSubmenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render flyout sub-items when activeSubmenu is null', () => {
    renderSidebar({ activeSubmenu: null });
    expect(screen.queryByText('General')).not.toBeInTheDocument();
    expect(screen.queryByText('Security')).not.toBeInTheDocument();
  });

  it('renders flyout sub-items when isCollapsed and activeSubmenu is set', () => {
    renderSidebar({ activeSubmenu: settingsItem });
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('flyout container is always mounted when collapsed (for CSS transitions)', () => {
    const { container } = renderSidebar({ activeSubmenu: null });
    // The flyout container must exist in DOM even when inactive so transitions work
    const flyout = container.querySelector('.absolute.left-16');
    expect(flyout).toBeInTheDocument();
    expect(flyout?.className).toMatch(/opacity-0/);
    expect(flyout?.className).toMatch(/pointer-events-none/);
  });

  it('flyout container shows with opacity-100 when activeSubmenu is set', () => {
    const { container } = renderSidebar({ activeSubmenu: settingsItem });
    const flyout = container.querySelector('.absolute.left-16');
    expect(flyout?.className).toMatch(/opacity-100/);
    expect(flyout?.className).not.toMatch(/pointer-events-none/);
  });

  it('does not render collapsed flyout container when sidebar is expanded', () => {
    const { container } = renderSidebar({ isCollapsed: false, activeSubmenu: settingsItem });
    expect(container.querySelector('.absolute.left-16')).not.toBeInTheDocument();
  });

  it('calls setActiveSubmenu(null) when Escape is pressed with flyout open', () => {
    const setActiveSubmenu = vi.fn();
    renderSidebar({ activeSubmenu: settingsItem, setActiveSubmenu });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(setActiveSubmenu).toHaveBeenCalledWith(null);
  });

  it('does not call setActiveSubmenu on Escape when sidebar is expanded', () => {
    const setActiveSubmenu = vi.fn();
    renderSidebar({ isCollapsed: false, activeSubmenu: settingsItem, setActiveSubmenu });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(setActiveSubmenu).not.toHaveBeenCalled();
  });

  it('calls setActiveSubmenu(null) when close button is clicked', () => {
    const setActiveSubmenu = vi.fn();
    renderSidebar({ activeSubmenu: settingsItem, setActiveSubmenu });
    const closeBtn = screen.getByRole('button', { name: 'sidebar.closeSubmenu' });
    fireEvent.click(closeBtn);
    expect(setActiveSubmenu).toHaveBeenCalledWith(null);
  });

  it('close button has accessible aria-label', () => {
    renderSidebar({ activeSubmenu: settingsItem });
    const closeBtn = screen.getByRole('button', { name: 'sidebar.closeSubmenu' });
    expect(closeBtn).toBeInTheDocument();
  });

  it('Tab key cycles focus within flyout and does not escape to main content', () => {
    renderSidebar({ activeSubmenu: settingsItem });
    const focusable = screen.getAllByRole('link');
    const lastLink = focusable[focusable.length - 1];
    lastLink.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // Tab from last link wraps to first focusable in DOM order (close button)
    const closeBtn = screen.getByRole('button', { name: 'sidebar.closeSubmenu' });
    expect(document.activeElement).toBe(closeBtn);
  });

  it('switching between submenus: handleMenuClick is called for each icon', () => {
    const handleMenuClick = vi.fn();
    renderSidebar({ activeSubmenu: settingsItem, handleMenuClick });
    const contactsBtn = screen.getByTestId('menu-item-contacts');
    fireEvent.click(contactsBtn);
    expect(handleMenuClick).toHaveBeenCalledTimes(1);
  });

  it('switching submenus moves focus to first nav item of new submenu without restoring trigger', () => {
    const agentsItem: MenuItemType = {
      id: 'agents',
      name: 'Agents',
      href: '/agents',
      icon: Cog,
      subItems: [{ name: 'AI Agent', href: '/agents/ai', icon: Cog }],
    };
    const setActiveSubmenu = vi.fn();

    const { rerender } = render(
      <MemoryRouter>
        <Sidebar {...makeProps({ activeSubmenu: settingsItem, setActiveSubmenu })} />
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <Sidebar {...makeProps({ activeSubmenu: agentsItem, setActiveSubmenu })} />
      </MemoryRouter>,
    );

    // Focus moves to first nav link of new submenu
    const agentLink = screen.getByRole('link', { name: /AI Agent/i });
    expect(document.activeElement).toBe(agentLink);
    // previousFocusRef was NOT restored (no null call) — switching does not close flyout
    expect(setActiveSubmenu).not.toHaveBeenCalledWith(null);
  });

  it('flyout has role="dialog" when active and is not aria-hidden', () => {
    const { container } = renderSidebar({ activeSubmenu: settingsItem });
    const flyout = container.querySelector('.absolute.left-16');
    expect(flyout).toHaveAttribute('role', 'dialog');
    expect(flyout).not.toHaveAttribute('aria-hidden');
  });

  it('flyout is aria-hidden when activeSubmenu is null (prevents broken aria-labelledby reference)', () => {
    const { container } = renderSidebar({ activeSubmenu: null });
    const flyout = container.querySelector('.absolute.left-16');
    expect(flyout).toHaveAttribute('aria-hidden', 'true');
  });

  it('flyout aria-labelledby points to the submenu title heading', () => {
    renderSidebar({ activeSubmenu: settingsItem });
    const flyout = document.querySelector('[role="dialog"]');
    const labelledById = flyout?.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const title = document.getElementById(labelledById!);
    expect(title?.textContent).toBe('Settings');
  });

  it('expanded mode renders inline submenu panel without flyout (AC #3)', () => {
    const { container } = renderSidebar({ isCollapsed: false, activeSubmenu: settingsItem });
    expect(container.querySelector('.absolute.left-16')).not.toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });
});
