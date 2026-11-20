import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import type { Role } from '@/types/auth/rbac';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/services/users/usersService', () => ({
  default: { createUser: vi.fn(), updateUser: vi.fn() },
}));

// useRoles is called twice: once with no args (all roles) and once with
// { type: 'account' }. Return roles based on the requested filter so the merge
// path is exercised.
const userRole: Role = {
  id: 'role-user-x',
  key: 'gerente',
  name: 'Gerente',
  description: '',
  system: false,
  type: 'user',
  created_at: '',
  updated_at: '',
};

const accountRole: Role = {
  id: 'role-account-converse',
  key: 'converse',
  name: 'Converse',
  description: '',
  system: false,
  type: 'account',
  created_at: '',
  updated_at: '',
};

vi.mock('@/hooks/useRoles', () => ({
  default: (options?: { type?: 'user' | 'account' }) => {
    if (options?.type === 'account') {
      return { roles: [accountRole], loading: false, error: null, refetch: vi.fn() };
    }
    // Default call (no type) — the "system" roles list. Include only a user
    // role here so we prove the account role comes from the dedicated fetch.
    return { roles: [userRole], loading: false, error: null, refetch: vi.fn() };
  },
}));

// Stub the coss Select so every SelectItem renders inline (Base UI only
// mounts items when the popup is open, which is unreliable in jsdom).
const { Passthrough } = vi.hoisted(() => ({
  Passthrough: ({ children }: { children?: React.ReactNode }) => React.createElement('div', null, children),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogPopup: Passthrough,
  DialogHeader: Passthrough,
  DialogPanel: Passthrough,
  DialogFooter: Passthrough,
  DialogTitle: Passthrough,
}));
vi.mock('@/components/ui/select', () => ({
  Select: Passthrough,
  SelectPopup: Passthrough,
  SelectItem: ({ children, value }: { children?: React.ReactNode; value?: string }) => (
    <div data-testid="select-item" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: Passthrough,
  SelectValue: Passthrough,
}));

import UserFormModal from './UserFormModal';

beforeEach(() => vi.clearAllMocks());

describe('UserFormModal — account roles in the create-agent modal (AC8)', () => {
  const renderModal = () =>
    render(
      <UserFormModal isOpen user={null} onClose={vi.fn()} onSuccess={vi.fn()} />,
    );

  it('shows a custom type:account role (Converse) in the role list', () => {
    renderModal();

    const items = screen.getAllByTestId('select-item');
    const values = items.map(el => el.getAttribute('data-value'));

    expect(values).toContain('converse');
    expect(screen.getByText('Converse')).toBeInTheDocument();
  });

  it('still includes the base roles and the type:user roles, deduped by key', () => {
    renderModal();

    const items = screen.getAllByTestId('select-item');
    const values = items.map(el => el.getAttribute('data-value'));

    // base roles always present
    expect(values).toContain('agent');
    expect(values).toContain('account_owner');
    // type:user system role merged in
    expect(values).toContain('gerente');
    // no duplicate keys
    expect(new Set(values).size).toBe(values.length);
  });
});
