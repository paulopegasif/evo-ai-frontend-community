import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Copy, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import ListSkeleton from '@/components/base/ListSkeleton';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import BaseHeader from '@/components/base/BaseHeader';
import BasePagination from '@/components/base/BasePagination';
import EmptyState from '@/components/base/EmptyState';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { chatPagesService } from '@/services/chatPages/chatPagesService';
import type { ChatPage, ChatPagePayload, PaginationMeta, WebWidgetOption } from '@/types/chatPages';
import ChatPageModal from '@/components/chatPages/ChatPageModal';

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  page_size: DEFAULT_PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

export default function ChatPages() {
  const { t } = useLanguage('chatPages');
  const { can, isReady } = usePermissions();
  const canCreate = can('chat_pages', 'create');
  const canUpdate = can('chat_pages', 'update');
  const canDelete = can('chat_pages', 'delete');

  const [pages, setPages] = useState<ChatPage[]>([]);
  const [widgets, setWidgets] = useState<WebWidgetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChatPage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChatPage | null>(null);

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

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const { data, meta } = await chatPagesService.list({
        page,
        pageSize: DEFAULT_PAGE_SIZE,
        search: search || undefined,
        published: published === 'all' ? undefined : published === 'true',
      });
      setPages(data);
      setPagination(meta.pagination ?? EMPTY_PAGINATION);
    } catch {
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [page, search, published, t]);

  const loadWidgets = useCallback(async () => {
    try {
      setWidgets(await chatPagesService.listWebWidgets());
    } catch {
      /* widget select degrades to the page's existing token */
    }
  }, []);

  useEffect(() => {
    if (isReady) loadWidgets();
  }, [isReady, loadWidgets]);

  useEffect(() => {
    if (isReady) loadPages();
  }, [isReady, loadPages]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (chatPage: ChatPage) => {
    setEditing(chatPage);
    setModalOpen(true);
  };

  const handleSave = async (payload: ChatPagePayload) => {
    setSaving(true);
    try {
      if (editing) await chatPagesService.update(editing.id, payload);
      else await chatPagesService.create(payload);
      toast.success(t('messages.saved'));
      setModalOpen(false);
      loadPages();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      toast.error(msg || t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await chatPagesService.remove(deleteTarget.id);
      toast.success(t('messages.deleted'));
      setDeleteTarget(null);
      loadPages();
    } catch {
      toast.error(t('messages.deleteError'));
    }
  };

  const copyLink = (chatPage: ChatPage) => {
    const url = `${window.location.origin}/chat/${chatPage.slug}`;
    navigator.clipboard?.writeText(url);
    toast.success(t('actions.linkCopied'));
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
            ? { label: t('header.newPage'), icon: <Plus className="h-4 w-4" />, onClick: openCreate }
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
        ) : pages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
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
                <TableHead className="hidden md:table-cell">{t('table.widget')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('table.status')}</TableHead>
                <TableHead className="text-end">
                  <span className="sr-only">{t('table.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pages.map(chatPage => (
                <TableRow key={chatPage.id}>
                  <TableCell className="font-medium">
                    {chatPage.title || chatPage.display_title || chatPage.slug}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Button variant="ghost" size="xs" onClick={() => copyLink(chatPage)} className="font-mono text-muted-foreground">
                        <Copy />
                        /chat/{chatPage.slug}
                      </Button>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {chatPage.widget_inbox_name || '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={chatPage.published ? 'success' : 'secondary'}>
                      {chatPage.published ? t('status.published') : t('status.draft')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(chatPage)} aria-label={t('actions.edit')} />
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
                                  onClick={() => setDeleteTarget(chatPage)}
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

      <ChatPageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        widgets={widgets}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={v => !v && setDeleteTarget(null)}
        title={t('delete.title')}
        description={t('delete.description', { name: deleteTarget?.title || deleteTarget?.slug })}
        cancelLabel={t('delete.cancel')}
        confirmLabel={t('delete.confirm')}
        onConfirm={handleDelete}
      />
    </div>
  );
}
