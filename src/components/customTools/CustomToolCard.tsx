import { Globe, Pencil, Trash2, Wand } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { HttpMethodBadge, ResourceCard } from '@/components/agents/resourceCard';
import { useLanguage } from '@/hooks/useLanguage';
import { CustomTool } from '@/types/ai';

interface CustomToolCardProps {
  tool: CustomTool;
  onEdit: (tool: CustomTool) => void;
  onDelete: (tool: CustomTool) => void;
  onTest: (tool: CustomTool) => void;
  onClick: (tool: CustomTool) => void;
  isTestLoading?: boolean;
}

export default function CustomToolCard({
  tool,
  onEdit,
  onDelete,
  onTest,
  onClick,
  isTestLoading = false,
}: CustomToolCardProps) {
  const { t } = useLanguage('customTools');

  return (
    <ResourceCard
      icon={Wand}
      title={tool.name}
      openLabel={`${t('details.title')}: ${tool.name}`}
      onOpen={() => onClick(tool)}
      badges={<HttpMethodBadge method={tool.method} />}
      description={tool.description || t('card.noDescription')}
      location={{ icon: Globe, value: tool.endpoint }}
      tags={tool.tags}
      meta={
        <>
          {t('card.examples', { count: tool.examples?.length || 0 })} · {t('card.createdAt')}{' '}
          {new Date(tool.created_at).toLocaleDateString('pt-BR')}
        </>
      }
      actions={
        <>
          <Button variant="outline" size="xs" onClick={() => onTest(tool)} loading={isTestLoading}>
            {!isTestLoading && <Wand />}
            {t('card.actions.test')}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(tool)}
            aria-label={t('card.actions.edit')}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive-foreground hover:text-destructive-foreground"
            onClick={() => onDelete(tool)}
            aria-label={t('card.actions.delete')}
          >
            <Trash2 />
          </Button>
        </>
      }
    />
  );
}
