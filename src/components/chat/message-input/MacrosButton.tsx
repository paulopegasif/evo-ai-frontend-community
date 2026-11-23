import React, { useState, useEffect, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Zap, Play } from '@/components/icons';
import { toast } from 'sonner';

import { macrosService } from '@/services/macros/macrosService';
import type { Macro } from '@/types/automation';
import { useLanguage } from '@/hooks/useLanguage';

interface MacrosButtonProps {
  conversationId: string;
  disabled?: boolean;
  onMacroExecuted?: () => void;
}

const ITEM_ICON_BOX =
  'flex size-7 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary';

const MacrosButton: React.FC<MacrosButtonProps> = ({
  conversationId,
  disabled = false,
  onMacroExecuted,
}) => {
  const { t } = useLanguage('chat');
  const [open, setOpen] = useState(false);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executingMacroId, setExecutingMacroId] = useState<string | number | null>(null);
  const [selectedMacro, setSelectedMacro] = useState<Macro | null>(null);

  useEffect(() => {
    if (!open || macros.length > 0) return;

    (async () => {
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
    })();
  }, [open, macros.length, t]);

  const executeMacro = useCallback(async () => {
    if (!selectedMacro) return;

    try {
      setExecutingMacroId(selectedMacro.id);
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
      setExecutingMacroId(null);
      setSelectedMacro(null);
    }
  }, [selectedMacro, conversationId, onMacroExecuted, t]);

  return (
    <>
      <Menu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <MenuTrigger
                disabled={disabled}
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('messageInput.macros.tooltip')}
                    className="flex-shrink-0 text-primary"
                  />
                }
              />
            }
          >
            <Zap />
          </TooltipTrigger>
          <TooltipPopup>{t('messageInput.macros.tooltip')}</TooltipPopup>
        </Tooltip>
        <MenuPopup side="top" align="start" sideOffset={8} className="w-64">
          <MenuGroup>
            <MenuGroupLabel className="flex flex-col gap-0.5 pb-2">
              <span className="font-semibold text-foreground text-sm">{t('messageInput.macros.tooltip')}</span>
              <span className="font-normal">{t('messageInput.macros.subtitle')}</span>
            </MenuGroupLabel>

            {isLoading && (
              <div className="flex items-center justify-center py-6" role="status">
                <Spinner className="size-4 text-muted-foreground" />
              </div>
            )}

            {!isLoading && macros.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-md bg-muted/72 px-3 py-5 text-center">
                <Zap className="size-5 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">{t('contactSidebar.macros.noMacros')}</span>
              </div>
            )}

            {!isLoading &&
              macros.map(macro => (
                <MenuItem
                  key={macro.id}
                  disabled={executingMacroId === macro.id}
                  onClick={() => setSelectedMacro(macro)}
                  className="gap-2.5 py-1.5"
                >
                  <span className={ITEM_ICON_BOX}>
                    {executingMacroId === macro.id ? <Spinner className="size-4" /> : <Play className="size-4" />}
                  </span>
                  <span className="min-w-0 truncate font-medium">{macro.name}</span>
                </MenuItem>
              ))}
          </MenuGroup>
        </MenuPopup>
      </Menu>

      <ConfirmDialog
        open={!!selectedMacro}
        onOpenChange={openState => {
          if (!openState) setSelectedMacro(null);
        }}
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
        loading={executingMacroId != null}
      />
    </>
  );
};

export default MacrosButton;
