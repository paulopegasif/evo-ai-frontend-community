import { useLanguage } from '@/hooks/useLanguage';
import {
  DetailField,
  DetailSection,
  HttpMethodBadge,
  KeyValueList,
} from '@/components/agents/resourceCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, FileText, Globe, Pencil, Settings, Tags, Wand } from '@/components/icons';
import { CustomTool } from '@/types/ai';

interface CustomToolDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tool?: CustomTool | null;
  onEdit?: (tool: CustomTool) => void;
  onTest?: (tool: CustomTool) => void;
  isTestLoading?: boolean;
}

export default function CustomToolDetails({
  open,
  onOpenChange,
  tool,
  onEdit,
  onTest,
  isTestLoading = false,
}: CustomToolDetailsProps) {
  const { t } = useLanguage('customTools');

  if (!tool) return null;

  const modes = (list?: string[]) =>
    list && list.length > 0 ? (
      <div className="flex flex-wrap gap-1">
        {list.map(mode => (
          <Badge key={mode} variant="outline" size="sm">
            {mode}
          </Badge>
        ))}
      </div>
    ) : (
      <span className="text-muted-foreground">{t('details.fields.notSpecified')}</span>
    );
  const headerEntries = Object.entries(tool.headers || {});
  const hasModes = !!(tool.input_modes?.length || tool.output_modes?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <Wand className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="truncate">{tool.name}</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {tool.description || t('details.title')}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-6">
          <DetailSection icon={Globe} title={t('details.sections.basicInfo')}>
            <dl className="grid grid-cols-2 gap-4">
              <DetailField label={t('details.fields.method')}>
                <HttpMethodBadge method={tool.method} />
              </DetailField>
              <DetailField label={t('details.fields.createdAt')}>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {new Date(tool.created_at).toLocaleDateString('pt-BR')}
                </span>
              </DetailField>
              <div className="col-span-2">
                <DetailField label={t('details.fields.endpoint')}>
                  <code className="block break-all rounded-md bg-muted/60 px-2 py-1.5 font-mono text-xs">
                    {tool.endpoint}
                  </code>
                </DetailField>
              </div>
            </dl>
          </DetailSection>

          <DetailSection
            icon={Tags}
            title={t('details.sections.tags')}
            count={tool.tags?.length || 0}
            isEmpty={!tool.tags?.length}
            emptyLabel={t('details.empty.tags')}
          >
            <div className="flex flex-wrap gap-1.5">
              {tool.tags?.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            icon={FileText}
            title={t('details.sections.examples')}
            count={tool.examples?.length || 0}
            isEmpty={!tool.examples?.length}
            emptyLabel={t('details.empty.examples')}
          >
            <div className="flex flex-col gap-2">
              {tool.examples?.map((example, index) => (
                <pre
                  key={index}
                  className="whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 text-xs"
                >
                  {example}
                </pre>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            icon={Settings}
            title={t('details.sections.headers')}
            isEmpty={headerEntries.length === 0}
            emptyLabel={t('details.empty.headers')}
          >
            <KeyValueList entries={headerEntries} />
          </DetailSection>

          {hasModes && (
            <DetailSection icon={Settings} title={t('details.sections.inputOutput')}>
              <dl className="grid grid-cols-2 gap-4">
                <DetailField label={t('details.fields.inputModes')}>
                  {modes(tool.input_modes)}
                </DetailField>
                <DetailField label={t('details.fields.outputModes')}>
                  {modes(tool.output_modes)}
                </DetailField>
              </dl>
            </DetailSection>
          )}
        </DialogPanel>

        {(onTest || onEdit) && (
          <DialogFooter>
            {onTest && (
              <Button variant="outline" onClick={() => onTest(tool)} loading={isTestLoading}>
                {!isTestLoading && <Wand />}
                {t('details.actions.test')}
              </Button>
            )}
            {onEdit && (
              <Button onClick={() => onEdit(tool)}>
                <Pencil />
                {t('details.actions.edit')}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}
