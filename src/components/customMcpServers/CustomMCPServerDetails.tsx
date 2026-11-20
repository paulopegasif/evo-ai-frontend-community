import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailField, DetailSection, KeyValueList } from '@/components/agents/resourceCard';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  Link2,
  Pencil,
  RotateCcw,
  Settings,
  Tags,
  TestTube,
  Wrench,
} from 'lucide-react';
import { CustomMcpServer } from '@/types/ai';

interface CustomMCPServerDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: CustomMcpServer | null;
  onEdit?: (server: CustomMcpServer) => void;
  onTest?: (server: CustomMcpServer) => void;
  isTestLoading?: boolean;
}

export default function CustomMCPServerDetails({
  open,
  onOpenChange,
  server,
  onEdit,
  onTest,
  isTestLoading = false,
}: CustomMCPServerDetailsProps) {
  const { t } = useLanguage('customMcpServers');

  if (!server) return null;

  type ServerTool = {
    id?: string;
    name: string;
    description?: string;
    inputModes?: string[];
    outputModes?: string[];
    tags?: string[];
  };
  const tools = (server.tools || []) as ServerTool[];
  const headerEntries = Object.entries(server.headers || {});
  const chips = (label: string, list: string[] | undefined, variant: 'secondary' | 'outline') =>
    list && list.length > 0 ? (
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground text-xs">{label}:</span>
        {list.map(item => (
          <Badge key={item} variant={variant} size="sm">
            {item}
          </Badge>
        ))}
      </div>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
            <TestTube className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle className="truncate">{server.name}</DialogTitle>
            {server.description && (
              <DialogDescription className="line-clamp-2">{server.description}</DialogDescription>
            )}
          </div>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-6">
          <DetailSection icon={Link2} title={t('details.sections.basicInfo')}>
            <dl className="grid grid-cols-3 gap-4">
              <div className="col-span-3">
                <DetailField label={t('details.labels.url')}>
                  <code className="block break-all rounded-md bg-muted/60 px-2 py-1.5 font-mono text-xs">
                    {server.url}
                  </code>
                </DetailField>
              </div>
              <DetailField label={t('details.labels.timeout')}>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-muted-foreground" />
                  {server.timeout}s
                </span>
              </DetailField>
              <DetailField label={t('details.labels.retries')}>
                <span className="flex items-center gap-1.5">
                  <RotateCcw className="size-3.5 text-muted-foreground" />
                  {server.retry_count}
                </span>
              </DetailField>
              <DetailField label={t('details.labels.createdAt')}>
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  {new Date(server.created_at).toLocaleDateString('pt-BR')}
                </span>
              </DetailField>
            </dl>
          </DetailSection>

          <DetailSection
            icon={Wrench}
            title={t('details.sections.tools')}
            count={tools.length}
            isEmpty={tools.length === 0}
            emptyLabel={`${t('details.tools.noTools')} ${t('details.tools.testPrompt')}`}
          >
            <div className="flex flex-col divide-y overflow-hidden rounded-lg border">
              {tools.map((tool, index) => (
                <div key={tool.id || index} className="flex flex-col gap-1.5 px-3 py-2.5">
                  <span className="font-medium font-mono text-xs">{tool.name}</span>
                  {tool.description && (
                    <p className="text-muted-foreground text-xs">{tool.description}</p>
                  )}
                  {chips(t('details.tools.inputModes'), tool.inputModes, 'secondary')}
                  {chips(t('details.tools.outputModes'), tool.outputModes, 'secondary')}
                  {chips(t('details.tools.tags'), tool.tags, 'outline')}
                </div>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            icon={Settings}
            title={t('details.sections.headers')}
            isEmpty={headerEntries.length === 0}
            emptyLabel={t('details.headers.noHeaders')}
          >
            <KeyValueList entries={headerEntries} />
          </DetailSection>

          {server.tags && server.tags.length > 0 && (
            <DetailSection
              icon={Tags}
              title={t('details.sections.tags')}
              count={server.tags.length}
            >
              <div className="flex flex-wrap gap-1.5">
                {server.tags.map(tag => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </DetailSection>
          )}
        </DialogPanel>

        {(onTest || onEdit) && (
          <DialogFooter>
            {onTest && (
              <Button variant="outline" onClick={() => onTest(server)} loading={isTestLoading}>
                {!isTestLoading && <TestTube />}
                {t('actions.test')}
              </Button>
            )}
            {onEdit && (
              <Button onClick={() => onEdit(server)}>
                <Pencil />
                {t('actions.edit')}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogPopup>
    </Dialog>
  );
}
