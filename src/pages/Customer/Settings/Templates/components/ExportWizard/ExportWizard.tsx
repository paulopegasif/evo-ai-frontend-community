import { useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { templatesService } from '@/services/templates/templatesService';
import type {
  ExportableInventory,
  ExportSelection,
  TemplateCategory,
} from '@/types/templates';
import { TEMPLATE_CATEGORIES } from '@/types/templates';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export default function ExportWizard({ open, onClose }: Props) {
  const { t } = useLanguage('templates');

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [inventory, setInventory] = useState<ExportableInventory | null>(null);
  const [selection, setSelection] = useState<ExportSelection>({});
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open || step !== 2 || inventory) return;
    setLoadingInventory(true);
    templatesService
      .getExportableInventory()
      .then(setInventory)
      .catch(() => toast.error(t('export.errors.failed')))
      .finally(() => setLoadingInventory(false));
  }, [open, step, inventory, t]);

  const totalSelected = useMemo(() => {
    return Object.values(selection).reduce((sum, entry) => {
      if (!entry) return sum;
      if (entry.all) return sum + 1; // "all" counts as one bulk pick; refined on backend
      return sum + (entry.ids?.length ?? 0);
    }, 0);
  }, [selection]);

  const selectedCategoryCount = useMemo(() => {
    return Object.values(selection).filter((entry) => entry && (entry.all || (entry.ids?.length ?? 0) > 0)).length;
  }, [selection]);

  const toggleAll = (category: TemplateCategory, all: boolean) => {
    setSelection((prev) => ({
      ...prev,
      [category]: all ? { all: true } : {},
    }));
  };

  const toggleItem = (category: TemplateCategory, id: string) => {
    setSelection((prev) => {
      const current = prev[category] ?? {};
      const ids = new Set(current.ids ?? []);
      if (ids.has(id)) ids.delete(id);
      else ids.add(id);
      return { ...prev, [category]: { ids: Array.from(ids) } };
    });
  };

  const handleDownload = async () => {
    if (totalSelected === 0) {
      toast.error(t('export.errors.noSelection'));
      return;
    }
    setDownloading(true);
    try {
      const blob = await templatesService.exportTemplates(
        { template_name: name, description, author },
        selection,
      );
      const slug =
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || 'template';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}.evotpl.zip`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success(t('export.success'));
      onClose();
    } catch {
      toast.error(t('export.errors.failed'));
    } finally {
      setDownloading(false);
    }
  };

  const STEP_LABELS: Record<Step, string> = {
    1: t('export.step1.shortTitle'),
    2: t('export.step2.shortTitle'),
    3: t('export.step3.shortTitle'),
  };

  const renderStepper = () => (
    <ol className="flex items-center justify-center gap-2">
      {([1, 2, 3] as Step[]).map((s, idx) => {
        const isActive = s === step;
        const isDone = s < step;
        return (
          <li key={s} className="flex items-center gap-2" aria-current={isActive ? 'step' : undefined}>
            <span
              className={`flex items-center gap-2 rounded-full border px-2.5 py-1 text-sm transition-colors ${
                isActive
                  ? 'border-primary/48 bg-primary/4 font-medium text-foreground'
                  : isDone
                    ? 'border-success/24 bg-success/8 text-success-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              <span
                className={`flex size-5 items-center justify-center rounded-full text-xs ${
                  isActive ? 'bg-primary text-primary-foreground' : isDone ? 'bg-success/16' : 'bg-muted'
                }`}
              >
                {isDone ? <Check className="size-3" /> : s}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
            </span>
            {idx < 2 && <span aria-hidden="true" className={`h-px w-6 ${s < step ? 'bg-success/48' : 'bg-border'}`} />}
          </li>
        );
      })}
    </ol>
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('export.title')}</DialogTitle>
          <div className="mt-3 flex flex-col items-center gap-2">
            {renderStepper()}
            <div className="text-center">
              <p className="font-medium text-sm">{t(`export.step${step}.title`)}</p>
              <p className="text-muted-foreground text-xs">
                {t('export.stepProgress', { current: step, total: 3 })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogPanel>
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <Field>
                <FieldLabel htmlFor="tpl-name">{t('export.step1.name')}</FieldLabel>
                <Input
                  id="tpl-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('export.step1.namePlaceholder')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-desc">{t('export.step1.description')}</FieldLabel>
                <Textarea
                  id="tpl-desc"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={t('export.step1.descriptionPlaceholder')}
                  rows={3}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="tpl-author">{t('export.step1.author')}</FieldLabel>
                <Input id="tpl-author" value={author} onChange={e => setAuthor(e.target.value)} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">{t('export.step2.subtitle')}</p>
              {loadingInventory && (
                <div className="flex flex-col gap-2" aria-busy="true">
                  {[0, 1, 2].map(i => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              )}
              {!loadingInventory &&
                inventory &&
                TEMPLATE_CATEGORIES.map(cat => {
                  const items = inventory[cat] ?? [];
                  const entry = selection[cat] ?? {};
                  const allChecked = !!entry.all;
                  const pickedCount = entry.ids?.length ?? 0;
                  return (
                    <div key={cat} className="rounded-xl border">
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="flex items-center gap-2 font-medium text-sm">
                          {t(`categories.${cat}`)}
                          <Badge variant="secondary" className="tabular-nums">
                            {allChecked || pickedCount === 0 ? items.length : `${pickedCount}/${items.length}`}
                          </Badge>
                        </span>
                        <Label className="font-normal">
                          <Checkbox
                            checked={allChecked}
                            indeterminate={!allChecked && pickedCount > 0}
                            onCheckedChange={v => toggleAll(cat, v === true)}
                            disabled={items.length === 0}
                          />
                          {t('export.step2.selectAll')}
                        </Label>
                      </div>
                      {!allChecked && items.length > 0 && (
                        <div className="flex max-h-40 flex-col gap-2 overflow-y-auto border-t bg-muted/24 px-4 py-3">
                          {items.map(item => (
                            <Label key={item.id} className="font-normal">
                              <Checkbox
                                checked={(entry.ids ?? []).includes(item.id)}
                                onCheckedChange={() => toggleItem(cat, item.id)}
                              />
                              {item.name}
                            </Label>
                          ))}
                        </div>
                      )}
                      {items.length === 0 && (
                        <p className="border-t px-4 py-2 text-muted-foreground text-xs">{t('export.step2.noItems')}</p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-sm">
                {t('export.step3.summary', { count: totalSelected, categoryCount: selectedCategoryCount })}
              </p>
              <Alert variant="warning">
                <AlertTriangle />
                <AlertDescription>{t('export.step3.credentialsWarning')}</AlertDescription>
              </Alert>
            </div>
          )}
        </DialogPanel>

        <DialogFooter className="sm:items-center">
          {step < 3 && (
            <p className="text-muted-foreground text-xs sm:me-auto">
              {t('export.stepHint', {
                nextStep: STEP_LABELS[(step + 1) as Step],
                remaining: 3 - step,
              })}
            </p>
          )}
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((step - 1) as Step)}>
              {t('export.step2.back')}
            </Button>
          )}
          {step < 3 && (
            <Button onClick={() => setStep((step + 1) as Step)} disabled={step === 1 && !name.trim()}>
              {t('export.step1.next')}
              <ArrowRight />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleDownload} disabled={totalSelected === 0} loading={downloading}>
              {downloading ? t('export.step3.downloading') : t('export.step3.download')}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
