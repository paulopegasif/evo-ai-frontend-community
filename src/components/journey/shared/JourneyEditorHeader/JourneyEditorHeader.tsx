import { type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, ArrowLeft, Clock, Loader2, Save } from '@/components/icons';

export type JourneyEditorHeaderProps = {
  onBack: () => void;
  backLabel?: string;

  title: string;
  subtitle?: string;

  onViewSessions: () => void;
  viewSessionsLabel?: string;

  environmentSlot?: ReactNode;

  onSave: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  saveLabel?: string;
  savingLabel?: string;
  savedLabel?: string;
  lastSavedFormatter?: (date: Date) => string;
  unsavedChangesHint?: string;
};

export function JourneyEditorHeader({
  onBack,
  backLabel = 'Back',
  title,
  subtitle,
  onViewSessions,
  viewSessionsLabel = 'View sessions',
  environmentSlot,
  onSave,
  hasUnsavedChanges = false,
  isSaving = false,
  lastSaved = null,
  saveLabel = 'Save',
  savingLabel = 'Saving…',
  savedLabel = 'Saved',
  lastSavedFormatter,
  unsavedChangesHint,
}: JourneyEditorHeaderProps) {
  const computedSaveLabel = isSaving
    ? savingLabel
    : hasUnsavedChanges
      ? saveLabel
      : savedLabel;

  const saveDisabled = !hasUnsavedChanges || isSaving;
  const showUnsavedHint = Boolean(lastSaved && hasUnsavedChanges && unsavedChangesHint);

  return (
    <header
      className="flex items-center gap-4 bg-flow-panel-header-bg border-b border-flow-panel-divider px-4 py-3"
      role="banner"
    >
      <div data-zone="navigation" className="flex items-center">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
          {backLabel}
        </Button>
      </div>

      <div
        data-zone="identity"
        className="flex-1 min-w-0 border-l border-flow-panel-divider pl-4"
      >
        <h1
          className="truncate font-semibold text-base leading-tight sm:text-lg"
          title={title}
        >
          {title}
        </h1>
        {subtitle ? (
          <p className="truncate text-muted-foreground text-xs sm:text-sm" title={subtitle}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div data-zone="actions" className="flex items-center gap-2">
        <div className="flex items-center border-l border-flow-panel-divider pl-2">
          <Button variant="ghost" size="sm" onClick={onViewSessions} className="hidden md:inline-flex">
            <Activity aria-hidden="true" />
            {viewSessionsLabel}
          </Button>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onViewSessions}
                  aria-label={viewSessionsLabel}
                  className="md:hidden"
                />
              }
            >
              <Activity aria-hidden="true" />
            </TooltipTrigger>
            <TooltipPopup>{viewSessionsLabel}</TooltipPopup>
          </Tooltip>
        </div>

        {environmentSlot ? (
          <div className="flex items-center border-l border-flow-panel-divider pl-2">
            {environmentSlot}
          </div>
        ) : null}

        <div
          data-cluster="persist"
          className="flex items-center gap-3 border-l border-flow-panel-divider pl-2"
        >
          {lastSaved ? (
            <div className="hidden items-center gap-1.5 text-muted-foreground text-xs md:flex">
              <Clock className="size-3" aria-hidden="true" />
              <span>
                {lastSavedFormatter ? lastSavedFormatter(lastSaved) : lastSaved.toLocaleTimeString()}
                {showUnsavedHint ? ` • ${unsavedChangesHint}` : null}
              </span>
            </div>
          ) : null}

          {/* aria-live wrapper announces Save → Saving… → Saved state transitions to SR users. */}
          <div aria-live="polite" aria-atomic="true">
            {/* Fixed min-width avoids button reflow as the label cycles Save → Saving… → Saved. */}
            <Button
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={saveDisabled}
              className="min-w-[100px]"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Save aria-hidden="true" />
              )}
              {computedSaveLabel}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

JourneyEditorHeader.displayName = 'JourneyEditorHeader';
