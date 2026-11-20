import { useState, useRef } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Upload, CheckCircle2, AlertTriangle, FileArchive } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { templatesService } from '@/services/templates/templatesService';
import type { ImportReport, TemplateCategory } from '@/types/templates';

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_BUNDLE_SIZE = 50 * 1024 * 1024;

export default function ImportModal({ open, onClose }: Props) {
  const { t } = useLanguage('templates');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    const ok =
      selected.name.endsWith('.zip') ||
      selected.name.endsWith('.evotpl.zip') ||
      selected.type === 'application/zip';
    if (!ok) {
      toast.error(t('import.errors.invalidType'));
      return;
    }
    if (selected.size > MAX_BUNDLE_SIZE) {
      toast.error(t('import.errors.fileTooLarge'));
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error(t('import.errors.missingFile'));
      return;
    }
    setImporting(true);
    try {
      const result = await templatesService.importTemplate(file);
      setReport(result);
      toast.success(t('page.actions.import'));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { code?: string } } } };
      const code = err?.response?.data?.error?.code;
      if (code === 'TEMPLATE_UNSUPPORTED_SCHEMA') toast.error(t('import.errors.unsupportedSchema'));
      else if (code === 'TEMPLATE_FILE_TOO_LARGE') toast.error(t('import.errors.fileTooLarge'));
      else toast.error(t('import.errors.invalidBundle'));
    } finally {
      setImporting(false);
    }
  };

  const closeAndReset = () => {
    setFile(null);
    setReport(null);
    onClose();
  };

  const counts = (report?.items ?? []).reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <Dialog open={open} onOpenChange={o => !o && closeAndReset()}>
      <DialogPopup className="sm:max-w-2xl">
        {!report && (
          <>
            <DialogHeader>
              <DialogTitle>{t('import.title')}</DialogTitle>
              <DialogDescription>{t('import.subtitle')}</DialogDescription>
            </DialogHeader>

            <DialogPanel>
              <input
                ref={inputRef}
                type="file"
                accept=".zip,.evotpl,application/zip"
                hidden
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring ${
                  file ? 'border-primary/48 bg-primary/4' : ''
                }`}
              >
                <span className="flex size-10 items-center justify-center rounded-lg border bg-background">
                  {file ? (
                    <FileArchive className="size-5 text-primary" />
                  ) : (
                    <Upload className="size-5 text-muted-foreground" />
                  )}
                </span>
                <span className="font-medium text-sm">{t('import.selectFile')}</span>
                {file && (
                  <span className="text-muted-foreground text-xs">
                    {t('import.fileSelected', {
                      name: file.name,
                      size: `${(file.size / 1024).toFixed(1)} KB`,
                    })}
                  </span>
                )}
              </button>
            </DialogPanel>

            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>{t('import.report.close')}</DialogClose>
              <Button onClick={handleSubmit} disabled={!file} loading={importing}>
                {importing ? t('import.importing') : t('import.submit')}
              </Button>
            </DialogFooter>
          </>
        )}

        {report && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success-foreground" />
                {t('import.report.title')}
              </DialogTitle>
              <DialogDescription>{t('import.report.subtitle')}</DialogDescription>
            </DialogHeader>

            <DialogPanel className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">{t('import.report.createdCount', { count: counts.created ?? 0 })}</Badge>
                <Badge variant="info">{t('import.report.renamedCount', { count: counts.renamed ?? 0 })}</Badge>
                {(counts.skipped ?? 0) > 0 && (
                  <Badge variant="secondary">{t('import.report.skippedCount', { count: counts.skipped })}</Badge>
                )}
              </div>

              {report.warnings.length > 0 && (
                <Alert variant="warning">
                  <AlertTriangle />
                  <AlertTitle>{t('import.report.warningsTitle')}</AlertTitle>
                  <AlertDescription>
                    <ul className="flex flex-col gap-1">
                      {report.warnings.map((w, idx) => (
                        <li key={idx}>
                          <span className="font-mono text-xs">
                            {t(`categories.${w.category as TemplateCategory}`)}
                          </span>
                          {' · '}
                          {w.new_name || w.slug}
                          {w.warning === 'configure_credentials' &&
                            ` — ${t('import.warnings.channelRequiresCredentials')}`}
                          {w.reason && ` — ${w.reason}`}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <details className="rounded-xl border text-sm">
                <summary className="cursor-pointer px-4 py-2.5 font-medium">
                  {t('import.report.title')} ({report.items.length})
                </summary>
                <ul className="flex max-h-60 flex-col divide-y overflow-y-auto border-t">
                  {report.items.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-3 px-4 py-2">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-muted-foreground text-xs">{item.category}</span> ·{' '}
                        {item.new_name || item.slug}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {item.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </details>
            </DialogPanel>

            <DialogFooter>
              <Button onClick={closeAndReset}>{t('import.report.close')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}
