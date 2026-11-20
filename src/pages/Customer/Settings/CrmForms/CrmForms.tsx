import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, FileText, Inbox } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import ListSkeleton from '@/components/base/ListSkeleton';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import BaseHeader from '@/components/base/BaseHeader';
import BasePagination from '@/components/base/BasePagination';
import EmptyState from '@/components/base/EmptyState';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { crmFormsService } from '@/services/crmForms/crmFormsService';
import { pipelinesService } from '@/services/pipelines/pipelinesService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CrmForm, CrmFormPayload, FormLead, PaginationMeta } from '@/types/crmForms';
import type { Pipeline } from '@/types/analytics/pipelines';
import type { CustomAttributeDefinition } from '@/types/settings';
import CrmFormModal from '@/components/crmForms/CrmFormModal';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function CrmForms() {
  const { t } = useLanguage('crmForms');
  const { can, isReady } = usePermissions();
  const canCreate = can('crm_forms', 'create');
  const canUpdate = can('crm_forms', 'update');
  const canDelete = can('crm_forms', 'delete');

  const [forms, setForms] = useState<CrmForm[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [contactAttrs, setContactAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [dealAttrs, setDealAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrmForm | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmForm | null>(null);
  const [leadsForm, setLeadsForm] = useState<CrmForm | null>(null);
  const [leads, setLeads] = useState<FormLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [published, setPublished] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta>(EMPTY_PAGINATION);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await crmFormsService.list({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: search || undefined,
        published: published === 'all' ? undefined : published === 'true',
      });
      setForms(data);
      setPagination(meta.pagination ?? EMPTY_PAGINATION);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, published, t]);

  const loadContext = useCallback(async () => {
    try {
      const [pipes, cAttrs, dAttrs] = await Promise.all([
        pipelinesService.getPipelines(),
        customAttributesService.getCustomAttributes('contact_attribute'),
        customAttributesService.getCustomAttributes('pipeline_item_attribute'),
      ]);
      setPipelines(pipes.data);
      setContactAttrs(cAttrs.data);
      setDealAttrs(dAttrs.data);
    } catch {
      /* selectors degrade to standard targets only */
    }
  }, []);

  useEffect(() => {
    if (isReady) loadContext();
  }, [isReady, loadContext]);

  useEffect(() => {
    if (isReady) loadForms();
  }, [isReady, loadForms]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (form: CrmForm) => {
    setEditing(form);
    setModalOpen(true);
  };

  const handleSave = async (payload: CrmFormPayload) => {
    setSaving(true);
    try {
      if (editing) await crmFormsService.update(editing.id, payload);
      else await crmFormsService.create(payload);
      toast.success(t('messages.saved'));
      setModalOpen(false);
      loadForms();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
        ?.message;
      toast.error(msg || t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await crmFormsService.remove(deleteTarget.id);
      toast.success(t('messages.deleted'));
      setDeleteTarget(null);
      loadForms();
    } catch {
      toast.error(t('messages.deleteError'));
    }
  };

  const copyLink = (form: CrmForm) => {
    const url = `${window.location.origin}/f/${form.id}`;
    navigator.clipboard?.writeText(url);
    toast.success(t('actions.linkCopied'));
  };

  const openLeads = async (form: CrmForm) => {
    setLeadsForm(form);
    setLeads([]);
    setLeadsLoading(true);
    try {
      const { leads: list } = await crmFormsService.getLeads(form.id);
      setLeads(list);
    } catch {
      toast.error(t('messages.leadsError'));
    } finally {
      setLeadsLoading(false);
    }
  };

  const stageLabel = (lead: FormLead) => {
    const pipe = pipelines.find(p => p.id === lead.pipeline_id);
    const stage = pipe?.stages?.find(s => s.id === lead.pipeline_stage_id);
    return [pipe?.name, stage?.name].filter(Boolean).join(' › ') || '—';
  };

  const isFiltered = !!search || published !== 'all';

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <BaseHeader
        title={t('header.title')}
        subtitle={t('header.subtitle', { count: pagination.total })}
        searchPlaceholder={t('header.searchPlaceholder')}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        primaryAction={
          canCreate
            ? { label: t('header.newForm'), icon: <Plus className="h-4 w-4" />, onClick: openCreate }
            : undefined
        }
      />

      <div className="mt-4 flex items-center gap-2">
        <OptionSelect
          value={published}
          onValueChange={v => {
            setPublished(v as 'all' | 'true' | 'false');
            setPage(1);
          }}
          className="w-[180px]"
          aria-label={t('table.status')}
          options={[
            { value: 'all', label: t('filter.all') },
            { value: 'true', label: t('filter.published') },
            { value: 'false', label: t('filter.draft') },
          ]}
        />
      </div>

      <div className="mt-6 flex-1 overflow-auto">
        {loading ? (
          <ListSkeleton />
        ) : forms.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={isFiltered ? t('empty.titleFiltered') : t('empty.title')}
            description={isFiltered ? t('empty.descriptionFiltered') : t('empty.description')}
            action={canCreate && !isFiltered ? { label: t('empty.action'), onClick: openCreate } : undefined}
            className="h-full"
          />
        ) : (
          <Table variant="card">
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.publicLink')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('table.status')}</TableHead>
                <TableHead className="hidden text-end sm:table-cell">{t('table.leads')}</TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">{t('table.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map(form => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.title || form.name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Button variant="ghost" size="xs" onClick={() => copyLink(form)} className="font-mono text-muted-foreground">
                        <Copy />
                        /f/{form.id}
                      </Button>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={form.published ? 'success' : 'secondary'}>
                      {form.published ? t('status.published') : t('status.draft')}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-end sm:table-cell">
                    <Button variant="link" size="xs" className="tabular-nums" onClick={() => openLeads(form)}>
                      {form.leads_count ?? 0}
                    </Button>
                  </TableCell>
                  <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(form)} aria-label={t('actions.edit')} />
                              }
                            >
                              <Pencil />
                            </TooltipTrigger>
                            <TooltipPopup>{t('actions.edit')}</TooltipPopup>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget(form)}
                                  aria-label={t('actions.delete')}
                                  className="text-destructive-foreground hover:bg-destructive/8"
                                />
                              }
                            >
                              <Trash2 />
                            </TooltipTrigger>
                            <TooltipPopup>{t('actions.delete')}</TooltipPopup>
                          </Tooltip>
                        )}
                      </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination.total > 0 && (
        <BasePagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total}
          itemsPerPage={pagination.page_size}
          onPageChange={setPage}
        />
      )}

      <CrmFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        pipelines={pipelines}
        contactAttrs={contactAttrs}
        dealAttrs={dealAttrs}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: deleteTarget?.title || deleteTarget?.name })}
        cancelLabel={t('delete.cancel')}
        confirmLabel={t('delete.confirm')}
        onConfirm={handleDelete}
      />

      <Dialog open={!!leadsForm} onOpenChange={v => !v && setLeadsForm(null)}>
        <DialogPopup className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('leads.title', { name: leadsForm?.title || leadsForm?.name })}</DialogTitle>
          </DialogHeader>
          <DialogPanel>
            {leadsLoading ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                {[0, 1, 2].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : leads.length === 0 ? (
              <Empty className="py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Inbox />
                  </EmptyMedia>
                  <EmptyDescription>{t('leads.empty')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <Table variant="card">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('leads.contact')}</TableHead>
                    <TableHead>{t('leads.destination')}</TableHead>
                    <TableHead>{t('leads.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map(lead => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.contact?.name || '—'}</div>
                        <div className="text-muted-foreground text-xs">{lead.contact?.email}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{stageLabel(lead)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {lead.created_at ? new Date(lead.created_at).toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </div>
  );
}
