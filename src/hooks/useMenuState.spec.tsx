import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Contact, Cog, PieChart } from 'lucide-react';
import { useMenuState } from './useMenuState';
import type { MenuItem } from '@/components/layout/config/menuItems';

const contacts: MenuItem = {
  name: 'Contatos',
  href: '/contacts',
  icon: Contact,
  subItems: [
    { name: 'Lista', href: '/contacts', icon: Contact },
    { name: 'Ações agendadas', href: '/contacts/scheduled-actions', icon: Contact },
  ],
};
const settings: MenuItem = {
  name: 'Configurações',
  href: '#',
  icon: Cog,
  subItems: [{ name: 'Etiquetas', href: '/settings/labels', icon: Cog }],
};
const dashboard: MenuItem = { name: 'Dashboard', href: '/dashboard', icon: PieChart };

const at = (path: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  );
  return renderHook(() => useMenuState([dashboard, contacts, settings]), { wrapper }).result.current;
};

describe('useMenuState.isMenuWithSubItemsActive', () => {
  it('highlights a parent while one of its subpages is open', () => {
    expect(at('/contacts').isMenuWithSubItemsActive(contacts)).toBe(true);
    expect(at('/contacts/scheduled-actions').isMenuWithSubItemsActive(contacts)).toBe(true);
    expect(at('/settings/labels').isMenuWithSubItemsActive(settings)).toBe(true);
  });

  it('does not highlight unrelated items', () => {
    const state = at('/settings/labels');
    expect(state.isMenuWithSubItemsActive(contacts)).toBe(false);
    expect(state.isMenuWithSubItemsActive(dashboard)).toBe(false);
    expect(at('/dashboard').isMenuWithSubItemsActive(dashboard)).toBe(true);
  });
});
