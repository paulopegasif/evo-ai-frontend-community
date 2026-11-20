import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { ArrowLeft, ChevronDown, Lock, Pencil, Save, Search, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { TooltipInfo } from '@/components/base/TooltipInfo';
import { rolesService, type Role } from '@/services/roles/rolesService';
import { permissionsService } from '@/services/permissions';
import { usePermissions } from '@/contexts/PermissionsContext';
import type { ResourceActionsData } from '@/types/auth/permissions';
import {
  groupResourcesByDomain,
  groupsFor,
  isHiddenAction,
  isStandaloneAction,
  expandCoarseKeys,
  type ActionGroup,
  RESOURCE_NESTING,
} from '@/config/permissionDomains';

// Nested resource -> i18n key for its sub-label inside the parent card (AC6).
const NESTED_LABEL_KEYS: Record<string, string> = {
  pipeline_stages: 'detail.nested.pipelineStages',
  working_hours: 'detail.nested.workingHours',
};

export default function RoleDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage('roles');
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [role, setRole] = useState<Role | null>(null);
  const [resourceActions, setResourceActions] = useState<ResourceActionsData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Snapshot of the persisted selection, to tell the admin when there are unsaved edits.
  const [savedSelection, setSavedSelection] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  // Collapsed domains. Sections start open; a search forces them open anyway.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaForm, setMetaForm] = useState({ name: '', description: '' });
  const [savingMeta, setSavingMeta] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [roleData, actionsData] = await Promise.all([
        rolesService.get(id),
        permissionsService.getResourceActions(),
      ]);
      setRole(roleData);
      setResourceActions(actionsData.data);

      const initialSelected = new Set<string>();
      Object.entries(roleData.permissions_by_resource).forEach(([resource, actions]) => {
        (actions as string[]).forEach(action => initialSelected.add(`${resource}.${action}`));
      });
      setSelected(initialSelected);
      setSavedSelection(new Set(initialSelected));
    } catch {
      toast.error(t('messages.loadError'));
      navigate('/settings/roles');
    } finally {
      setLoading(false);
    }
  }, [id, t, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // A permission is locked (held regardless of the role, so not a manageable
  // checkbox) when it is either basic (every user holds it) or operationally
  // implied by a grant THIS role actually holds. `implied_by` is global catalog
  // metadata, so the implication only applies when the source permission is in
  // the role's own selection — otherwise the implied permission is a normal,
  // editable grant. The decision therefore consults the selection and updates
  // reactively as the source permission is toggled.
  const isKeyLocked = useCallback(
    (key: string, sel: Set<string>): boolean => {
      const [resource, action] = key.split('.');
      const cfg = resourceActions?.resources[resource]?.actions?.[action];
      if (!cfg) return false;
      if (cfg.basic === true) return true;
      if (cfg.implied_by) return sel.has(cfg.implied_by);
      return false;
    },
    [resourceActions],
  );

  // A locked permission is never toggled — it is not a real role grant, so we
  // neither add it to nor remove it from the selection.
  const togglePermission = (key: string) => {
    setSelected(prev => {
      if (isKeyLocked(key, prev)) return prev;
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleResource = (resource: string) => {
    if (!resourceActions) return;
    setSelected(prev => {
      const actions = resourceActions.resources[resource]?.actions ?? {};
      const keys = Object.keys(actions)
        // System actions are never editable and must not leak into the payload via
        // "select all" (AC3 / NFR1); hidden ones render nothing either. Grouped
        // actions are ordinary grants — select-all covers them like any other.
        .filter(a => actions[a].system !== true && !isHiddenAction(resource, a))
        .map(a => `${resource}.${a}`)
        .filter(k => !isKeyLocked(k, prev));
      const allSelected = keys.length > 0 && keys.every(k => prev.has(k));
      const next = new Set(prev);
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // Nested children render inside their parent's row but are separate resources, so
  // a "select all" that skipped them would leave half the screen untouched.
  const childrenOf = (resourceKey: string): string[] =>
    Object.entries(RESOURCE_NESTING)
      .filter(([, parent]) => parent === resourceKey)
      .map(([child]) => child)
      .filter(child => resourceActions?.resources[child]);

  // Every key a bulk toggle owns: not system, not hidden. Lock is deliberately NOT
  // consulted here. A lock can flip mid-operation — granting conversations.read locks
  // users.read — and a set computed against the old selection would skip the key on
  // the way back, stranding it. Granting or revoking a locked key is harmless anyway:
  // `handleSave` never persists one.
  const bulkKeysOf = (resourceKey: string): string[] => {
    const cfg = resourceActions?.resources[resourceKey];
    if (!cfg) return [];
    return Object.keys(cfg.actions)
      .filter(a => cfg.actions[a].system !== true && !isHiddenAction(resourceKey, a))
      .map(a => `${resourceKey}.${a}`);
  };

  const keysOfResources = (resourceKeys: string[]): string[] =>
    resourceKeys.flatMap(r => [r, ...childrenOf(r)]).flatMap(bulkKeysOf);

  const toggleKeys = (keys: string[]) => {
    if (keys.length === 0) return;
    setSelected(prev => {
      const allSelected = keys.every(k => prev.has(k));
      const next = new Set(prev);
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // The checkbox reflects only what the admin can actually decide, so a basic or
  // implied key never leaves it stuck as indeterminate.
  const bulkState = (keys: string[]) => {
    const decidable = keys.filter(k => !isKeyLocked(k, selected));
    return {
      all: decidable.length > 0 && decidable.every(k => selected.has(k)),
      some: decidable.some(k => selected.has(k)),
    };
  };

  const toggleDomain = (domainKey: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(domainKey) ? next.delete(domainKey) : next.add(domainKey);
      return next;
    });
  };

  const handleSave = async () => {
    if (!role || !resourceActions) return;
    setSaving(true);
    try {
      const knownKeys = Array.from(selected).filter(key => {
        const [resource, action] = key.split('.');
        const cfg = resourceActions.resources[resource]?.actions?.[action];
        // Persist only real grants: skip unknown keys and locked ones. A basic
        // permission is always locked; an implied one is locked only while its
        // source grant is selected — otherwise it is a genuine, persistable grant.
        //
        // System keys ARE re-sent when the role already holds them. The endpoint
        // replaces the whole permission set, so omitting a held key deletes it:
        // filtering them out here would silently strip every system grant on the
        // first save — and ai_agent_processor.execute gates the chat WebSocket.
        // Re-sending is safe because a system key can never enter `selected` by
        // user action: it renders no checkbox and `toggleResource` skips it, so it
        // is only ever there because the role already had it.
        return cfg !== undefined && !isKeyLocked(key, selected);
      });
      // EVO-2127: also persist the coarse read/write/delete groups the editor
      // shows — additively (granular stays) and guarded against the live catalog
      // so a backend without `<resource>.write` never triggers a 422.
      const payload = expandCoarseKeys(
        knownKeys,
        (resource, action) => resourceActions.resources[resource]?.actions?.[action] !== undefined,
      );
      const updated = await rolesService.bulkUpdatePermissions(role.id, payload);
      setRole(updated);
      setSavedSelection(new Set(selected));
      permissionsService.clearPermissionsCache();
      toast.success(t('messages.permissionsSuccess'));
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.permissionsError'));
    } finally {
      setSaving(false);
    }
  };

  const startEditMeta = () => {
    if (!role) return;
    setMetaForm({ name: role.name, description: role.description ?? '' });
    setEditingMeta(true);
  };

  const cancelEditMeta = () => {
    setEditingMeta(false);
  };

  const handleSaveMeta = async () => {
    if (!role || !metaForm.name.trim()) return;
    setSavingMeta(true);
    try {
      const updated = await rolesService.update(role.id, {
        name: metaForm.name.trim(),
        description: metaForm.description.trim() || undefined,
      });
      setRole(updated);
      toast.success(t('messages.updateSuccess'));
      setEditingMeta(false);
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
      toast.error(apiErr?.message ?? t('messages.updateError'));
    } finally {
      setSavingMeta(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-6 p-4 md:p-6" aria-busy="true">
        <div className="flex items-center gap-2">
          <Spinner className="size-4 text-muted-foreground" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-4 w-96 max-w-full" />
        {[0, 1].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardPanel className="flex flex-col gap-3">
              {[0, 1, 2, 3].map(j => (
                <Skeleton key={j} className="h-6 w-full" />
              ))}
            </CardPanel>
          </Card>
        ))}
      </div>
    );
  }

  if (!role || !resourceActions) return null;

  const canEdit = can('roles', 'bulk_update_permissions');
  const canUpdate = can('roles', 'update');
  const resources = resourceActions.resources;

  const term = filter.trim().toLowerCase();
  const domains = groupResourcesByDomain(Object.keys(resources));

  // Case-insensitive match over the resource name + action name + description
  // (AC4). Runs AFTER the system filter, so hidden actions never match.
  const passesFilter = (resourceName: string, actionName: string, description: string): boolean => {
    if (!term) return true;
    return (
      resourceName.toLowerCase().includes(term) ||
      actionName.toLowerCase().includes(term) ||
      description.toLowerCase().includes(term)
    );
  };

  // Visible action keys for a resource, restricted to `actionKeys`: drop system
  // actions (AC3) and grouped ones (they render inside their group), then apply the
  // text filter (AC4). Order is preserved.
  const visibleActionKeys = (resourceKey: string, actionKeys: string[]): string[] => {
    const resourceConfig = resources[resourceKey];
    if (!resourceConfig) return [];
    return actionKeys.filter(a => {
      const cfg = resourceConfig.actions[a];
      if (!cfg || cfg.system === true || isHiddenAction(resourceKey, a)) return false;
      // Only standalone actions keep a row of their own. Everything else lives in a
      // group. Locked actions (basic, or implied by a grant this role holds) render
      // nothing at all: the role holds them regardless, so there is no decision to
      // offer — `groupKeys` drops them from the group and `handleSave` never sends
      // them. Giving them a row would put a second, unactionable "View" next to the
      // Read group that already covers them.
      if (!isStandaloneAction(resourceKey, a)) return false;
      return passesFilter(resourceConfig.name, cfg.name, cfg.description ?? '');
    });
  };

  // The real catalog keys a group stands for, restricted to the ones this catalog
  // actually declares and that are editable (not system, not locked).
  const groupKeys = (resourceKey: string, actions: string[]): string[] =>
    actions
      .filter(a => {
        const cfg = resources[resourceKey]?.actions?.[a];
        return cfg !== undefined && cfg.system !== true;
      })
      .map(a => `${resourceKey}.${a}`)
      .filter(k => !isKeyLocked(k, selected));

  // One checkbox, several grants. Toggling on adds every key it stands for; off
  // removes them. A role that holds only some of them shows indeterminate and keeps
  // exactly what it has until the admin actually toggles — hiding the granularity
  // must not silently rewrite a role nobody touched.
  const toggleGroup = (resourceKey: string, actions: string[]) => {
    const keys = groupKeys(resourceKey, actions);
    if (keys.length === 0) return;
    setSelected(prev => {
      const next = new Set(prev);
      const allSelected = keys.every(k => prev.has(k));
      allSelected ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  // nome | Read | Write | Delete | extras. Shared by the header and every row so the
  // columns line up even when a resource has no key of a given kind.
  const ROW_GRID =
    'grid grid-cols-[minmax(9rem,18rem)_4.5rem_4.5rem_4.5rem_minmax(0,1fr)] items-center gap-x-2';

  const renderGroupCell = (resourceKey: string, group: ActionGroup | undefined) => {
    if (!group) {
      // The resource has no key of this kind — an empty cell, not a missing column.
      return <span className="text-center text-muted-foreground/40">–</span>;
    }
    const keys = groupKeys(resourceKey, group.actions);
    const id = `group-${resourceKey}-${group.key}`;
    const allChecked = keys.every(k => selected.has(k));
    const someChecked = !allChecked && keys.some(k => selected.has(k));
    return (
      <div className="flex justify-center">
        <Checkbox
          id={id}
          aria-label={t(group.labelKey)}
          checked={allChecked}
          indeterminate={someChecked}
          onCheckedChange={canEdit ? () => toggleGroup(resourceKey, group.actions) : undefined}
          disabled={!canEdit}
        />
      </div>
    );
  };

  // Groups of a resource that survive the text filter and still have editable keys.
  const visibleGroupsFor = (resourceKey: string, actionKeys: string[]): ActionGroup[] =>
    groupsFor(resourceKey, actionKeys).filter(
      g =>
        groupKeys(resourceKey, g.actions).length > 0 &&
        passesFilter(
          resources[resourceKey]?.name ?? '',
          t(g.labelKey),
          t(`${g.labelKey}Description`),
        ),
    );

  const renderActionRow = (resourceKey: string, actionKey: string) => {
    const actionConfig = resources[resourceKey].actions[actionKey];
    const key = `${resourceKey}.${actionKey}`;
    const locked = isKeyLocked(key, selected);
    const lockLabel = locked
      ? actionConfig.basic
        ? t('detail.lock.basic')
        : t('detail.lock.impliedBy', { source: actionConfig.implied_by ?? '' })
      : undefined;
    return (
      <div key={key} className="flex items-center gap-1.5">
        <Checkbox
          id={key}
          // Locked perms are always effectively granted, so render them checked
          // and never editable.
          checked={locked || selected.has(key)}
          onCheckedChange={canEdit && !locked ? () => togglePermission(key) : undefined}
          disabled={!canEdit || locked}
        />
        <Label
          htmlFor={key}
          className={`font-normal text-foreground/80 text-sm ${canEdit && !locked ? 'cursor-pointer' : ''}`}
        >
          {actionConfig.name}
        </Label>
        {locked && (
          <Badge variant="secondary" size="sm" title={lockLabel}>
            <Lock />
            {actionConfig.basic ? t('detail.lock.basicBadge') : t('detail.lock.impliedBadge')}
          </Badge>
        )}
      </div>
    );
  };

  const renderResourceCard = (resourceKey: string) => {
    const resourceConfig = resources[resourceKey];
    if (!resourceConfig) return null;

    const nonSystemKeys = Object.keys(resourceConfig.actions).filter(
      a => resourceConfig.actions[a].system !== true,
    );

    // Card "select all" governs only this resource's own manageable (non-system,
    // non-locked) actions — independent of the text filter.
    const manageableKeys = nonSystemKeys
      .filter(a => !isKeyLocked(`${resourceKey}.${a}`, selected))
      .map(a => `${resourceKey}.${a}`);
    const allChecked = manageableKeys.length > 0 && manageableKeys.every(k => selected.has(k));
    const someChecked = manageableKeys.some(k => selected.has(k));

    // Child resources nested inside this card (pipeline_stages, working_hours).
    const nestedChildren = Object.entries(RESOURCE_NESTING)
      .filter(([, parent]) => parent === resourceKey)
      .map(([child]) => child)
      .filter(child => resources[child]);

    // One checkbox per group; standalone actions keep their own row.
    const ownActions = Object.keys(resourceConfig.actions);
    const visibleGroups = visibleGroupsFor(resourceKey, ownActions);
    const visibleStandalone = visibleActionKeys(resourceKey, ownActions);

    const visibleNested = nestedChildren
      .map(child => {
        const childActions = Object.keys(resources[child].actions);
        return {
          child,
          groups: visibleGroupsFor(child, childActions),
          standalone: visibleActionKeys(child, childActions),
        };
      })
      .filter(n => n.groups.length > 0 || n.standalone.length > 0);

    // No visible rows at all (all system/hidden, or filtered out) → no card.
    if (visibleGroups.length === 0 && visibleStandalone.length === 0 && visibleNested.length === 0) {
      return null;
    }

    const groupBy = (k: ActionGroup['key']) => visibleGroups.find(g => g.key === k);

    return (
      <div key={resourceKey} className="border-b px-4 transition-colors last:border-0 hover:bg-accent/32">
        <div className={`${ROW_GRID} min-h-10 py-1.5`}>
          <div className="flex items-center gap-2">
            {canEdit && manageableKeys.length > 0 && (
              <Checkbox
                id={`resource-${resourceKey}`}
                checked={allChecked}
                indeterminate={!allChecked && someChecked}
                onCheckedChange={() => toggleResource(resourceKey)}
                aria-label={resourceConfig.name}
                className="shrink-0"
              />
            )}
            <span className="truncate font-medium text-sm">{resourceConfig.name}</span>
          </div>
          {renderGroupCell(resourceKey, groupBy('read'))}
          {renderGroupCell(resourceKey, groupBy('write'))}
          {renderGroupCell(resourceKey, groupBy('delete'))}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {visibleStandalone.map(a => renderActionRow(resourceKey, a))}
          </div>
        </div>
        {visibleNested.map(({ child, groups, standalone }) => {
          const childBy = (k: ActionGroup['key']) => groups.find(g => g.key === k);
          return (
            <div key={child} className={`${ROW_GRID} pb-1.5`}>
              <span className="truncate ps-6 text-muted-foreground text-xs">
                {t(NESTED_LABEL_KEYS[child])}
              </span>
              {renderGroupCell(child, childBy('read'))}
              {renderGroupCell(child, childBy('write'))}
              {renderGroupCell(child, childBy('delete'))}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {standalone.map(a => renderActionRow(child, a))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render each domain's rows once, so the section and global "select all" own
  // exactly the resources on screen — a search must not let them toggle rows the
  // admin cannot see.
  const renderedDomains = domains
    .map(domain => {
      const items = domain.resources
        .map(resourceKey => ({ resourceKey, node: renderResourceCard(resourceKey) }))
        .filter(item => item.node !== null);
      return { domain, items };
    })
    .filter(({ items }) => items.length > 0);

  const allVisibleKeys = keysOfResources(
    renderedDomains.flatMap(({ items }) => items.map(i => i.resourceKey)),
  );

  const dirtyCount =
    [...selected].filter(k => !savedSelection.has(k)).length +
    [...savedSelection].filter(k => !selected.has(k)).length;
  const globalState = bulkState(allVisibleKeys);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings/roles')}>
            <ArrowLeft />
            {t('backToList')}
          </Button>
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border bg-card shadow-xs/5">
              <ShieldCheck className="size-6 text-primary" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-semibold text-xl tracking-tight md:text-2xl">{role.name}</h1>
                {role.system && <Badge variant="secondary">{t('badges.system')}</Badge>}
                <Badge variant="outline">{t(`type.${role.type}`)}</Badge>
              </div>
              {role.description && (
                <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{role.description}</p>
              )}
              <p className="mt-2 text-muted-foreground text-sm">
                <span className="font-medium text-foreground tabular-nums">{selected.size}</span>{' '}
                {t('detail.permissionsSelected')}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canUpdate && !role.system && !editingMeta && (
              <Button variant="outline" onClick={startEditMeta}>
                <Pencil />
                {t('editRole')}
              </Button>
            )}
            {canEdit && (
              <Button onClick={handleSave} loading={saving}>
                <Save />
                {saving ? t('saving') : t('savePermissions')}
              </Button>
            )}
          </div>
        </div>

        {editingMeta && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('editRole')}</CardTitle>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <Field>
                <FieldLabel htmlFor="meta-name">{t('createModal.nameLabel')}</FieldLabel>
                <Input
                  id="meta-name"
                  value={metaForm.name}
                  onChange={e => setMetaForm(prev => ({ ...prev, name: e.target.value }))}
                  disabled={savingMeta}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="meta-description">{t('createModal.descriptionLabel')}</FieldLabel>
                <Textarea
                  id="meta-description"
                  value={metaForm.description}
                  onChange={e => setMetaForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  disabled={savingMeta}
                />
              </Field>
            </CardPanel>
            <CardFooter className="justify-end gap-2 border-t">
              <Button variant="ghost" onClick={cancelEditMeta} disabled={savingMeta}>
                {t('createModal.cancel')}
              </Button>
              <Button onClick={handleSaveMeta} disabled={!metaForm.name.trim()} loading={savingMeta}>
                {t('saveChanges')}
              </Button>
            </CardFooter>
          </Card>
        )}

        {Object.keys(resources).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('detail.noPermissions')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Toolbar: search + global select-all; sticks while scrolling the matrix */}
            <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-3 bg-background/92 px-1 py-2 backdrop-blur">
              <InputGroup className="max-w-sm">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder={t('detail.filterPlaceholder')}
                />
              </InputGroup>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-everything"
                    checked={globalState.all}
                    indeterminate={!globalState.all && globalState.some}
                    onCheckedChange={() => toggleKeys(allVisibleKeys)}
                  />
                  <Label htmlFor="select-all-everything" className="cursor-pointer font-normal text-sm">
                    {globalState.all ? t('detail.deselectAll') : t('detail.selectAll')}
                  </Label>
                </div>
              )}
              {canEdit && dirtyCount > 0 && (
                <span className="ms-auto flex items-center gap-2 text-muted-foreground text-sm">
                  <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
                  {t('detail.unsavedChanges', { count: dirtyCount })}
                </span>
              )}
            </div>

            {renderedDomains.map(({ domain, items }) => {
              const cards = items.map(i => i.node);
              // A search must never hide its own results behind a collapsed section.
              const open = term ? true : !collapsed.has(domain.key);
              const domainKeys = keysOfResources(items.map(i => i.resourceKey));
              const domainState = bulkState(domainKeys);
              return (
                <Card key={domain.key} className="overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    {canEdit && domainKeys.length > 0 && (
                      <Checkbox
                        id={`select-all-${domain.key}`}
                        aria-label={t('detail.selectAll')}
                        checked={domainState.all}
                        indeterminate={!domainState.all && domainState.some}
                        onCheckedChange={() => toggleKeys(domainKeys)}
                        className="shrink-0"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDomain(domain.key)}
                      aria-expanded={open}
                      className="flex flex-1 items-center gap-2 rounded-md text-start font-semibold text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t(domain.labelKey)}
                      <Badge variant="secondary">{cards.length}</Badge>
                      <ChevronDown
                        className={`ms-auto size-4 shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
                      />
                    </button>
                  </div>
                  {open && (
                    <div className="overflow-x-auto border-t">
                      <div className="min-w-[40rem]">
                        {/* Column labels and their tooltips live here, once per section,
                            instead of being repeated on every row. */}
                        <div
                          className={`${ROW_GRID} border-b bg-muted/40 px-4 py-2 font-medium text-[11px] text-muted-foreground uppercase tracking-wide`}
                        >
                          <span />
                          {(['read', 'write', 'delete'] as const).map(key => (
                            <div key={key} className="flex items-center justify-center gap-1">
                              <span>{t(`detail.actionGroups.${key}`)}</span>
                              <TooltipInfo
                                title={t(`detail.actionGroups.${key}`)}
                                content={t(`detail.actionGroups.${key}Description`)}
                              />
                            </div>
                          ))}
                          <span />
                        </div>
                        {cards}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
