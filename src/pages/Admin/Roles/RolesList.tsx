import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import BaseHeader from '@/components/base/BaseHeader';
import BaseTable, { type TableColumn } from '@/components/base/BaseTable';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { rolesService, type Role } from '@/services/roles/rolesService';
import { permissionsService } from '@/services/permissions';
import { usePermissions } from '@/contexts/PermissionsContext';

export default function RolesList() {
  const { t } = useLanguage('roles');
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; role: Role | null; deleting: boolean }>({
    open: false,
    role: null,
    deleting: false,
  });

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rolesService.list();
      setRoles(data);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filtered = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const role = await rolesService.create({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
      });
      toast.success(t('messages.createSuccess'));
      setCreateOpen(false);
      setCreateForm({ name: '', description: '' });
      navigate(`/settings/roles/${role.id}`);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string; details?: Array<{ full_messages: string[] }> } } } })?.response?.data?.error;
      const message =
        apiErr?.message && apiErr.message !== 'Validation failed'
          ? apiErr.message
          : (apiErr?.details?.[0]?.full_messages?.[0] ?? t('messages.createError'));
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.role) return;
    setDeleteDialog(prev => ({ ...prev, deleting: true }));
    try {
      await rolesService.destroy(deleteDialog.role.id);
      permissionsService.clearPermissionsCache();
      toast.success(t('messages.deleteSuccess'));
      setRoles(prev => prev.filter(r => r.id !== deleteDialog.role?.id));
      setDeleteDialog({ open: false, role: null, deleting: false });
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.deleteError'));
      setDeleteDialog(prev => ({ ...prev, deleting: false }));
    }
  };

  const columns: TableColumn<Role>[] = [
    {
      key: 'name',
      label: t('table.name'),
      render: role => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{role.name}</span>
          {role.system && <Badge variant="secondary">{t('badges.system')}</Badge>}
        </div>
      ),
    },
    {
      key: 'description',
      label: t('table.description'),
      className: 'hidden md:table-cell max-w-xs',
      render: role => <span className="block truncate text-muted-foreground">{role.description || '—'}</span>,
    },
    {
      key: 'type',
      label: t('table.type'),
      className: 'hidden sm:table-cell',
      render: role => <Badge variant="outline">{t(`type.${role.type}`)}</Badge>,
    },
    {
      key: 'permissions_count',
      label: t('table.permissions'),
      align: 'right',
      className: 'hidden sm:table-cell',
      render: role => <span className="tabular-nums">{role.permissions_count}</span>,
    },
    {
      key: 'users_count',
      label: t('table.users'),
      align: 'right',
      className: 'hidden md:table-cell',
      render: role => <span className="tabular-nums">{role.users_count}</span>,
    },
  ];

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <BaseHeader
        title={t('title')}
        subtitle={t('header.subtitle', { count: roles.length })}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('header.searchPlaceholder')}
        primaryAction={
          can('roles', 'create')
            ? {
                label: t('addRole'),
                icon: <Plus className="h-4 w-4" />,
                onClick: () => setCreateOpen(true),
              }
            : undefined
        }
      />

      <div className="mt-6 flex-1 overflow-auto">
        <BaseTable<Role>
          data={filtered}
          columns={columns}
          loading={loading}
          getRowKey={role => role.id}
          getRowLabel={role => role.name}
          emptyIcon={ShieldCheck}
          emptyTitle={t('noRoles')}
          emptyDescription={t('noRolesDescription')}
          emptyAction={can('roles', 'create') ? { label: t('addRole'), onClick: () => setCreateOpen(true) } : undefined}
          actions={[
            {
              label: t('editRole'),
              icon: <Pencil className="h-4 w-4" />,
              onClick: role => navigate(`/settings/roles/${role.id}`),
              show: () => can('roles', 'update'),
            },
            {
              label: t('deleteRole'),
              icon: <Trash2 className="h-4 w-4" />,
              variant: 'destructive',
              onClick: role => setDeleteDialog({ open: true, role, deleting: false }),
              show: role => can('roles', 'delete') && !role.system,
            },
          ]}
        />
      </div>

      {/* Create Role Modal */}
      <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); if (!open) setCreateForm({ name: '', description: '' }); }}>
        <DialogPopup>
          <form
            className="flex min-h-0 flex-col"
            onSubmit={e => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('createModal.title')}</DialogTitle>
              <DialogDescription>{t('createModal.description')}</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-5">
              <Field>
                <FieldLabel htmlFor="role-name">{t('createModal.nameLabel')}</FieldLabel>
                <Input
                  id="role-name"
                  autoFocus
                  placeholder={t('createModal.namePlaceholder')}
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="role-description">{t('createModal.descriptionLabel')}</FieldLabel>
                <Textarea
                  id="role-description"
                  placeholder={t('createModal.descriptionPlaceholder')}
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </Field>
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="ghost" />} disabled={creating}>
                {t('createModal.cancel')}
              </DialogClose>
              <Button type="submit" disabled={!createForm.name.trim()} loading={creating}>
                {creating ? t('createModal.creating') : t('createModal.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>

      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={open => !open && setDeleteDialog({ open: false, role: null, deleting: false })}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description', { name: deleteDialog.role?.name ?? '' })}
        cancelLabel={t('deleteDialog.cancel')}
        confirmLabel={deleteDialog.deleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
        onConfirm={handleDeleteConfirm}
        loading={deleteDialog.deleting}
      />
    </div>
  );
}
