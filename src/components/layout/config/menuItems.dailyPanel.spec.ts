import { describe, expect, it } from 'vitest';
import { filterMenuItemsByPermissions, getCustomerMenuItems } from './menuItems';

const t = (key: string) => key;
const allow = () => true;

const settingsHrefs = (roleKey?: string) =>
  filterMenuItemsByPermissions(getCustomerMenuItems(t), allow, allow, allow, roleKey)
    .find(item => item.id === 'customer-settings')
    ?.subItems?.map(sub => sub.href) ?? [];

describe('menuItems — Painel do Dia', () => {
  it('puts the daily panel first at "/" and keeps Dashboard at /dashboard', () => {
    const items = getCustomerMenuItems(t);
    expect(items[0]).toMatchObject({ href: '/', name: 'menu.customer.dailyPanel' });
    expect(items.find(i => i.href === '/dashboard')?.name).toBe('menu.customer.dashboard');
  });

  it('shows Metas and Resumo diário to administrators only', () => {
    for (const role of ['administrator', 'account_owner', 'super_admin']) {
      expect(settingsHrefs(role)).toEqual(expect.arrayContaining(['/settings/sales-goals', '/settings/daily-summary']));
    }
    expect(settingsHrefs('agent')).not.toContain('/settings/sales-goals');
    expect(settingsHrefs('agent')).not.toContain('/settings/daily-summary');
    expect(settingsHrefs(undefined)).not.toContain('/settings/sales-goals');
  });
});
