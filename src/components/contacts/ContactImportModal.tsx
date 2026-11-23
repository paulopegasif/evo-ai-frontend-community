import { useState, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Download, FileText, Info, Trash2, Upload } from 'lucide-react';

interface ContactImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => Promise<void>;
  loading?: boolean;
}

export default function ContactImportModal({
  open,
  onOpenChange,
  onImport,
  loading = false,
}: ContactImportModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const csvTemplateUrl = '/downloads/import-contacts-sample.csv';

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        alert(t('import.errors.invalidType'));
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert(t('import.errors.maxSize'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await onImport(selectedFile);
      handleRemoveFile();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing contacts:', error);
    } finally {
      setUploading(false);
    }
  };

  const processFileName = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = fileName.slice(lastDotIndex);
    const baseName = fileName.slice(0, lastDotIndex);

    return baseName.length > 20
      ? `${baseName.slice(0, 20)}...${extension}`
      : fileName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>
            {t('import.description')}{' '}
            <a
              href={csvTemplateUrl}
              download="import-contacts-sample.csv"
              className="inline-flex items-center gap-1 text-foreground underline underline-offset-4 hover:text-primary"
            >
              <Download className="h-3 w-3" />
              {t('import.downloadTemplate')}
            </a>
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">{t('import.fileLabel')}</Label>

              {!selectedFile ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading || uploading}
                    className="w-full justify-start"
                  >
                    <Upload />
                    {t('import.chooseFile')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/48 p-2.5 ps-3 dark:bg-muted/24">
                  <FileText className="size-5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {processFileName(selectedFile.name)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading || uploading}
                    >
                      {t('import.changeFile')}
                    </Button>
                    <div className="h-4 w-px bg-border" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={loading || uploading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
            </div>

            <Alert variant="info">
            <Info />
            <AlertTitle>{t('import.formatTitle')}</AlertTitle>
            <AlertDescription>{t('import.formatDescription')}</AlertDescription>
          </Alert>
          </div>
        </DialogPanel>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading || uploading}>
            {t('import.actions.cancel')}
          </Button>
          <Button onClick={handleImport} disabled={!selectedFile || loading} loading={uploading}>
            {t('import.actions.import')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
