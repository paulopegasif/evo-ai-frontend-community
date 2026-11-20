import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Download, Upload, Package } from 'lucide-react';
import EmptyState from '@/components/base/EmptyState';
import ExportWizard from './components/ExportWizard/ExportWizard';
import ImportModal from './components/ImportModal/ImportModal';

export default function Templates() {
  const { t } = useLanguage('templates');
  const { can } = usePermissions();

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const canExport = can('templates', 'export');
  const canImport = can('templates', 'import');

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-start sm:justify-between md:p-6">
        <div>
          <h1 className="font-semibold text-xl md:text-2xl">{t('page.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('page.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {canExport && (
            <Button onClick={() => setExportOpen(true)} variant="outline">
              <Download />
              {t('page.actions.export')}
            </Button>
          )}
          {canImport && (
            <Button onClick={() => setImportOpen(true)}>
              <Upload />
              {t('page.actions.import')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 p-4 md:p-6">
        <EmptyState
          icon={Package}
          title={t('page.title')}
          description={t('page.empty')}
        />
      </div>

      {exportOpen && <ExportWizard open={exportOpen} onClose={() => setExportOpen(false)} />}
      {importOpen && <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />}
    </div>
  );
}
