import React, { useState, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Users, Tag, X, Plus, Check } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import LabelModal from '@/components/labels/LabelModal';

export interface AssignmentOption {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  color?: string;
}

export type AssignmentType = 'agent' | 'team' | 'label';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => Promise<void>;
  type: AssignmentType;
  title: string;
  description: string;
  options: AssignmentOption[];
  currentSelection?: string[];
  multiSelect?: boolean;
  isLoading?: boolean;
  searchPlaceholder?: string;
  canCreateInline?: boolean;
  onCreateInline?: (data: { title: string; description?: string; color: string; show_on_sidebar?: boolean }) => Promise<AssignmentOption>;
}

const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  title,
  description,
  options,
  currentSelection = [],
  multiSelect = false,
  isLoading = false,
  searchPlaceholder,
  canCreateInline = false,
  onCreateInline,
}) => {
  const { t } = useLanguage('chat');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(currentSelection);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraOptions, setExtraOptions] = useState<AssignmentOption[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);

  const defaultSearchPlaceholder = searchPlaceholder || t('assignmentModal.searchPlaceholder');

  const hasSelectionChanged = useMemo(() => {
    const sorted = [...selectedIds].sort();
    const sortedCurrent = [...currentSelection].sort();
    return sorted.length !== sortedCurrent.length || sorted.some((id, i) => id !== sortedCurrent[i]);
  }, [selectedIds, currentSelection]);

  // Reset selection when modal opens/closes or currentSelection changes
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(currentSelection);
      setSearchTerm('');
      setExtraOptions([]);
    }
  }, [isOpen, currentSelection]);

  const allOptions = useMemo(() => [...options, ...extraOptions], [options, extraOptions]);

  // Filter options based on search term (trimmed to stay consistent with hasExactMatch).
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = allOptions.filter(
    option =>
      option.name.toLowerCase().includes(normalizedSearch) ||
      option.description?.toLowerCase().includes(normalizedSearch),
  );

  const hasExactMatch =
    searchTerm.trim().length > 0 &&
    allOptions.some(o => o.name.toLowerCase() === searchTerm.trim().toLowerCase());

  const showCreateOption = canCreateInline && !!onCreateInline && !hasExactMatch;

  const handleOpenLabelModal = () => {
    setIsLabelModalOpen(true);
  };

  const handleLabelModalSubmit = async (data: {
    title: string;
    description?: string;
    color: string;
    show_on_sidebar?: boolean;
  }) => {
    if (!onCreateInline) return;
    setIsCreating(true);
    try {
      const newOption = await onCreateInline(data);
      setExtraOptions(prev => [...prev, newOption]);
      setSelectedIds(prev => [...prev, newOption.id]);
      setSearchTerm('');
      setIsLabelModalOpen(false);
    } catch {
      // Caller is expected to surface a toast; we keep the LabelModal open so the user can retry
      // without losing the form state.
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleSelection = (optionId: string) => {
    if (multiSelect) {
      setSelectedIds(prev =>
        prev.includes(optionId) ? prev.filter(id => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedIds(prev => (prev.includes(optionId) ? [] : [optionId]));
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedIds);
      onClose();
    } catch (error) {
      console.error('Error in assignment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'agent':
        return <User className="h-5 w-5" />;
      case 'team':
        return <Users className="h-5 w-5" />;
      case 'label':
        return <Tag className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const renderOption = (option: AssignmentOption) => {
    const isSelected = selectedIds.includes(option.id);

    return (
      <div
        key={option.id}
        role="option"
        aria-selected={isSelected}
        tabIndex={0}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-primary/40 bg-primary/8' : 'border-transparent'}`}
        onClick={() => handleToggleSelection(option.id)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggleSelection(option.id);
          }
        }}
      >
        {multiSelect && (
          <Checkbox
            checked={isSelected}
            tabIndex={-1}
            aria-hidden="true"
            className="pointer-events-none"
          />
        )}

        {type === 'label' ? (
          <span
            aria-hidden="true"
            className="size-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: option.color || 'var(--muted-foreground)' }}
          />
        ) : (
          <Avatar className="size-8 flex-shrink-0">
            <AvatarImage src={option.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {option.name[0]?.toUpperCase() || getIcon()}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">{option.name}</p>
          {option.description && (
            <p className="truncate text-muted-foreground text-xs">{option.description}</p>
          )}
        </div>

        {!multiSelect && isSelected && (
          <Check aria-hidden="true" className="size-4 flex-shrink-0 text-primary" />
        )}
      </div>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-muted-foreground [&_svg]:size-4.5">{getIcon()}</span>
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogPanel className="space-y-3">
          <InputGroup>
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder={defaultSearchPlaceholder}
              aria-label={defaultSearchPlaceholder}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </InputGroup>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-xs">{t('assignmentModal.selected')}</span>
              {selectedIds.map(id => {
                const option = allOptions.find(opt => opt.id === id);
                if (!option) return null;

                return (
                  <Badge key={id} variant="secondary" className="gap-1 pe-0.5">
                    {option.name}
                    <button
                      type="button"
                      aria-label={`${t('a11y.remove', 'Remover')} ${option.name}`}
                      className="inline-flex size-4 items-center justify-center rounded-sm hover:bg-foreground/8 hover:text-destructive-foreground"
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleSelection(id);
                      }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}

          <div
            role="listbox"
            aria-multiselectable={multiSelect || undefined}
            aria-label={title}
            className="-mx-1 max-h-72 space-y-0.5 overflow-y-auto px-1"
          >
            {isLoading ? (
              <div aria-busy="true" aria-label={t('assignmentModal.loading')} className="space-y-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {filteredOptions.length === 0 && !showCreateOption && (
                  <p className="py-8 text-center text-muted-foreground text-sm">
                    {searchTerm ? t('assignmentModal.noResults') : t('assignmentModal.noOptions')}
                  </p>
                )}
                {filteredOptions.map(renderOption)}
                {showCreateOption && (
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg border border-primary/40 border-dashed px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={handleOpenLabelModal}
                  >
                    <Plus aria-hidden="true" className="size-4 flex-shrink-0 text-primary" />
                    <span className="font-medium text-primary text-sm">
                      {searchTerm.trim()
                        ? t('assignmentModal.createLabel', { name: searchTerm.trim() })
                        : t('assignmentModal.newLabel')}
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={isSubmitting} />}>
            {t('assignmentModal.cancel')}
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !hasSelectionChanged}
            loading={isSubmitting}
          >
            {isSubmitting ? t('assignmentModal.applying') : t('assignmentModal.apply')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>

    {canCreateInline && onCreateInline && (
      <LabelModal
        open={isLabelModalOpen}
        onOpenChange={setIsLabelModalOpen}
        isNew={true}
        loading={isCreating}
        initialTitle={searchTerm.trim()}
        onSubmit={handleLabelModalSubmit}
      />
    )}
  </>
  );
};

export default AssignmentModal;
