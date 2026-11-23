import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Copy, Edit, ExternalLink, FileText, Plus, Trash2 } from '@/components/icons';
import { ConfirmDialog } from '@/components/base';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { crmFormsService } from '@/services/crmForms/crmFormsService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import type { CrmForm, CrmFormPayload } from '@/types/crmForms';
import type { CustomAttributeDefinition } from '@/types/settings';
import type { Pipeline, PipelineStage } from '@/types/analytics';
import CrmFormModal from '@/components/crmForms/CrmFormModal';

interface PipelineCaptureFormsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline | null;
  stages: PipelineStage[];
  allPipelines: Pipeline[];
}

/**
 * "Formulários de Captura" for a single pipeline — opened from the board's ⋮ menu.
 * Lists the forms whose default destination is THIS pipeline and lets you
 * create/edit/delete + copy the public link, reusing the real CrmForm machinery
 * (crmFormsService + CrmFormModal builder). New forms preselect this pipeline.
 */
export default function PipelineCaptureFormsModal({
  open,
  onOpenChange,
  pipeline,
  allPipelines,
}: PipelineCaptureFormsModalProps) {
  const { t } = useLanguage('pipelines');
  const { t: tc } = useLanguage('common');

  const [forms, setForms] = useState<CrmForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactAttrs, setContactAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [dealAttrs, setDealAttrs] = useState<CustomAttributeDefinition[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<CrmForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    if (!pipeline?.id) return;
    setLoading(true);
    try {
      const { data } = await crmFormsService.list({ pipelineId: pipeline.id });
      setForms(data);
    } catch {
      toast.error(t('captureForms.loadError'));
    } finally {
      setLoading(false);
    }
  }, [pipeline?.id, t]);

  // Load the builder's target selectors once (contact/deal custom attributes).
  const loadContext = useCallback(async () => {
    try {
      const [cAttrs, dAttrs] = await Promise.all([
        customAttributesService.getCustomAttributes('contact_attribute'),
        customAttributesService.getCustomAttributes('pipeline_item_attribute'),
      ]);
      setContactAttrs(cAttrs.data);
      setDealAttrs(dAttrs.data);
    } catch {
      /* selectors degrade to standard targets only */
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadForms();
      loadContext();
    }
  }, [open, loadForms, loadContext]);

  const openCreate = () => {
    setEditing(null);
    setBuilderOpen(true);
  };
  const openEdit = (form: CrmForm) => {
    setEditing(form);
    setBuilderOpen(true);
  };

  const handleSave = async (payload: CrmFormPayload) => {
    setSaving(true);
    try {
      if (editing) await crmFormsService.update(editing.id, payload);
      else await crmFormsService.create(payload);
      toast.success(t('captureForms.saved'));
      setBuilderOpen(false);
      loadForms();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      toast.error(msg || t('captureForms.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Deletion confirms through ConfirmDialog (was window.confirm).
  const [formToDelete, setFormToDelete] = useState<CrmForm | null>(null);
  const handleDelete = (form: CrmForm) => setFormToDelete(form);

  const confirmDelete = async () => {
    const form = formToDelete;
    if (!form) return;
    setDeletingId(form.id);
    try {
      await crmFormsService.remove(form.id);
      toast.success(t('captureForms.deleted'));
      loadForms();
    } catch {
      toast.error(t('captureForms.deleteError'));
    } finally {
      setDeletingId(null);
      setFormToDelete(null);
    }
  };

  const copyLink = (form: CrmForm) => {
    const url = `${window.location.origin}/f/${form.id}`;
    navigator.clipboard?.writeText(url);
    toast.success(t('captureForms.linkCopied'));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pe-9">
              <div className="flex flex-col gap-1">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="size-5 text-muted-foreground" />
                  {t('captureForms.title')}
                </DialogTitle>
                <DialogDescription>{t('captureForms.subtitle', { pipeline: pipeline?.name ?? '' })}</DialogDescription>
              </div>
              {forms.length > 0 && (
                <Button size="sm" onClick={openCreate} className="shrink-0">
                  <Plus />
                  {t('captureForms.newForm')}
                </Button>
              )}
            </div>
          </DialogHeader>

          <DialogPanel>
            {loading ? (
              <div className="flex flex-col gap-2" aria-busy="true">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border p-3">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-7 w-28" />
                  </div>
                ))}
              </div>
            ) : forms.length === 0 ? (
              <Empty className="rounded-xl border border-dashed py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyDescription>{t('captureForms.empty')}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={openCreate}>
                    <Plus />
                    {t('captureForms.newForm')}
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {forms.map(form => (
                  <li
                    key={form.id}
                    className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-ring/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{form.name}</span>
                        <Badge variant={form.published ? 'success' : 'secondary'} size="sm">
                          {form.published ? t('captureForms.published') : t('captureForms.draft')}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-muted-foreground text-xs">
                        <span className="tabular-nums">{t('captureForms.leadsCount', { count: form.leads_count ?? 0 })}</span>
                        {' · '}
                        {form.slug}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              onClick={() => copyLink(form)}
                              aria-label={t('captureForms.copyLink')}
                            />
                          }
                        >
                          <Copy />
                        </TooltipTrigger>
                        <TooltipPopup>{t('captureForms.copyLink')}</TooltipPopup>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              onClick={() => window.open(`/f/${form.id}`, '_blank')}
                              aria-label={t('captureForms.openLink')}
                            />
                          }
                        >
                          <ExternalLink />
                        </TooltipTrigger>
                        <TooltipPopup>{t('captureForms.openLink')}</TooltipPopup>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              onClick={() => openEdit(form)}
                              aria-label={t('captureForms.edit')}
                            />
                          }
                        >
                          <Edit />
                        </TooltipTrigger>
                        <TooltipPopup>{t('captureForms.edit')}</TooltipPopup>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground"
                              onClick={() => handleDelete(form)}
                              aria-label={t('captureForms.delete')}
                              disabled={deletingId === form.id}
                            />
                          }
                        >
                          <Trash2 />
                        </TooltipTrigger>
                        <TooltipPopup>{t('captureForms.delete')}</TooltipPopup>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DialogPanel>
        </DialogPopup>
      </Dialog>

      <ConfirmDialog
        open={formToDelete !== null}
        onOpenChange={next => !next && !deletingId && setFormToDelete(null)}
        title={t('captureForms.delete')}
        description={formToDelete ? t('captureForms.deleteConfirm', { name: formToDelete.name }) : undefined}
        cancelLabel={tc('cancel')}
        confirmLabel={t('captureForms.delete')}
        onConfirm={confirmDelete}
        loading={Boolean(deletingId)}
        variant="destructive"
      />

      {/* Reuse the real form builder. presetPipelineId preselects this pipeline on create. */}
      <CrmFormModal
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSave}
        saving={saving}
        initial={editing}
        pipelines={allPipelines}
        contactAttrs={contactAttrs}
        dealAttrs={dealAttrs}
        presetPipelineId={pipeline?.id}
      />
    </>
  );
}
