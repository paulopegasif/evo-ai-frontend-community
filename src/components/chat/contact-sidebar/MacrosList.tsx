import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Play, Zap } from '@/components/icons';
import { toast } from 'sonner';
import { macrosService } from '@/services/macros/macrosService';
import type { Macro } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';

interface MacrosListProps {
  conversationId: string;
  onMacroExecuted?: () => void;
}

const MacrosList: React.FC<MacrosListProps> = ({ conversationId, onMacroExecuted }) => {
  const { t } = useLanguage('chat');
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [executingMacro, setExecutingMacro] = useState<string | number | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);

  useEffect(() => {
    loadMacros();
  }, []);

  const loadMacros = async () => {
    try {
      setIsLoading(true);
      const response = await macrosService.getMacros();
      setMacros(response.data || []);
    } catch (error) {
      console.error('Error loading macros:', error);
      toast.error(t('contactSidebar.macros.loading'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMacroClick = (macro: Macro) => {
    setSelectedMacro(macro);
    setShowConfirmDialog(true);
  };

  const executeMacro = async () => {
    if (!selectedMacro) return;

    try {
      setExecutingMacro(selectedMacro.id);
      setShowConfirmDialog(false);
      const response = await macrosService.executeMacro({
        macroId: String(selectedMacro.id),
        conversationIds: [conversationId],
      });

      const executions = response?.data?.executions || (response as any)?.executions || [];
      const hasFailure = executions.some((exec: any) => exec.status === 'failed');
      const hasPending = executions.some((exec: any) => exec.status === 'pending');

      if (hasFailure) {
        const failedExec = executions.find((exec: any) => exec.status === 'failed');
        const failedActions = failedExec?.actions_result
          ?.filter((a: any) => a.status === 'failed')
          ?.map((a: any) => a.action)
          ?.join(', ');
        toast.error(
          t('contactSidebar.macros.executePartialError', { name: selectedMacro.name }) ||
          `Macro "${selectedMacro.name}" executada com falhas${failedActions ? `: ${failedActions}` : ''}`,
        );
      } else if (hasPending) {
        // Webhook actions are async — wait for macro.execution.completed
        // WebSocket event before confirming success/failure to the user.
        toast.info(t('contactSidebar.macros.executeQueued', { name: selectedMacro.name }));
      } else {
        toast.success(t('contactSidebar.macros.executeSuccess', { name: selectedMacro.name }));
      }
      onMacroExecuted?.();
    } catch (error) {
      console.error('Error executing macro:', error);
      toast.error(t('contactSidebar.macros.executeError', { name: selectedMacro.name }));
    } finally {
      setExecutingMacro(null);
      setSelectedMacro(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }

  if (macros.length === 0) {
    return (
      <Empty className="py-6">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Zap />
          </EmptyMedia>
          <EmptyDescription>{t('contactSidebar.macros.noMacros')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-1.5">
        {macros.map(macro => (
          <div
            key={macro.id}
            className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent/50"
          >
            <div className="min-w-0 flex-1">
              <h4 className="truncate font-medium text-sm">{macro.name}</h4>
              <p className="text-muted-foreground text-xs">
                {macro.actions.length}{' '}
                {macro.actions.length === 1
                  ? t('contactSidebar.macros.action')
                  : t('contactSidebar.macros.actions')}
              </p>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => handleMacroClick(macro)}
              disabled={executingMacro === macro.id}
              loading={executingMacro === macro.id}
              aria-label={`${t('contactSidebar.macros.dialog.execute')}: ${macro.name}`}
            >
              <Play />
            </Button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        variant="default"
        title={t('contactSidebar.macros.dialog.title')}
        description={t('contactSidebar.macros.dialog.description', {
          name: selectedMacro?.name || '',
          count: selectedMacro?.actions.length || 0,
          actionLabel:
            (selectedMacro?.actions.length || 0) === 1
              ? t('contactSidebar.macros.action')
              : t('contactSidebar.macros.actions'),
        })}
        cancelLabel={t('contactSidebar.macros.dialog.cancel')}
        confirmLabel={t('contactSidebar.macros.dialog.execute')}
        onConfirm={executeMacro}
      />
    </ScrollArea>
  );
};

export default MacrosList;
