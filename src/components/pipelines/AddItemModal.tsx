import { useState, useEffect, useCallback } from 'react';
import { getContactColor } from '@/utils/avatar';
import { useLanguage } from '@/hooks/useLanguage';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Check, Mail, MessageSquare, Phone, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/initials';
import { ConversationForModal, PipelineStage } from '@/types/analytics';
import { pipelinesService } from '@/services/pipelines';
import { toast } from 'sonner';
import { Contact } from '@/types/contacts';

interface Item {
  id: string;
  display_id?: string;
  name?: string;
  status?: string;
  created_at?: string;
  last_activity_at?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  contact?: {
    id: string;
    name: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
  };
}

interface AddItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  stages: PipelineStage[];
  preselectedStage?: PipelineStage | null;
  onItemAdded: () => void;
}

export default function AddItemModal({
  open,
  onOpenChange,
  pipelineId,
  stages,
  preselectedStage,
  onItemAdded,
}: AddItemModalProps) {
  const { t } = useLanguage('pipelines');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemType, setItemType] = useState<'conversation' | 'contact'>('conversation');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [availableItems, setAvailableItems] = useState<Item[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Initialize modal
  useEffect(() => {
    if (open) {
      // Reset form
      setSelectedItem(null);
      setSearchQuery('');
      setNotes('');
      setItemType('conversation');

      // Pre-select stage
      if (preselectedStage) {
        setSelectedStage(preselectedStage);
      } else if (stages.length > 0) {
        setSelectedStage(stages[0]);
      }
    }
  }, [open, preselectedStage, stages]);

  // Load available items from API
  const loadAvailableItems = useCallback(async () => {
    setIsLoadingItems(true);
    setAvailableItems([]);
    try {
      let data: ConversationForModal[] | Contact[];

      if (itemType === 'conversation') {
        data = await pipelinesService.getAvailableConversations(pipelineId, {
          search: searchQuery,
        });
      } else {
        data = await pipelinesService.getAvailableContacts(pipelineId, { search: searchQuery }) as Contact[];
      }

      setAvailableItems(data as Item[]);
    } catch (error) {
      console.error('Error loading items:', error);
      toast.error(t('addItem.loadError'));
      setAvailableItems([]);
    } finally {
      setIsLoadingItems(false);
    }
  }, [pipelineId, searchQuery, itemType, t]);

  // Debounced search effect
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      loadAvailableItems();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, itemType, loadAvailableItems, open]);

  // Handle item selection
  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
  };

  // Handle adding item to pipeline
  const handleAddItem = async () => {
    if (!selectedStage || !selectedItem) return;

    setIsAdding(true);
    try {
      await pipelinesService.addItemToPipeline(pipelineId, {
        item_id: selectedItem.id,
        type: itemType,
        pipeline_stage_id: selectedStage.id,
        custom_fields: {},
        notes: notes,
      });

      // Remove from available items
      setAvailableItems(prev => prev.filter(item => item.id !== selectedItem.id));

      toast.success(t('addItem.success'));
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding item:', error);

      // Handle error messages
      let errorMessage = t('addItem.error');
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  // Get item display name
  const getItemDisplayName = (item: Item) => {
    if (itemType === 'conversation') {
      return item.contact?.name || t('addItem.unknownUser');
    }
    return item.name || t('addItem.unknownUser');
  };

  const canAddItem = selectedStage && selectedItem;
  const stageItems = stages.map(stage => ({ value: String(stage.id), label: stage.name }));
  const typeItems = [
    { value: 'conversation', label: t('addItem.itemTypes.conversation') },
    { value: 'contact', label: t('addItem.itemTypes.contact') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[85vh] max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('addItem.title')}</DialogTitle>
          <DialogDescription>{t('addItem.description')}</DialogDescription>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t('addItem.selectStage')}</FieldLabel>
              <Select
                items={stageItems}
                value={selectedStage ? String(selectedStage.id) : null}
                onValueChange={value => {
                  const stage = stages.find(s => String(s.id) === value);
                  setSelectedStage(stage || null);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('addItem.chooseStage')} />
                </SelectTrigger>
                <SelectPopup>
                  {stages.map(stage => (
                    <SelectItem key={stage.id} value={String(stage.id)}>
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>

            <Field>
              <FieldLabel>{t('addItem.itemType')}</FieldLabel>
              <Select
                items={typeItems}
                value={itemType}
                onValueChange={value => {
                  if (!value) return;
                  setAvailableItems([]);
                  setItemType(value as 'conversation' | 'contact');
                  setSelectedItem(null);
                  setSearchQuery('');
                  setNotes('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('addItem.chooseItemType')} />
                </SelectTrigger>
                <SelectPopup>
                  {typeItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel>{t('addItem.availableItems')}</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                aria-label={t('addItem.searchItems')}
                placeholder={t('addItem.searchPlaceholder')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </InputGroup>
            <div className="h-56 w-full overflow-y-auto rounded-lg border" role="listbox" aria-label={t('addItem.availableItems')}>
              {isLoadingItems ? (
                <div className="flex flex-col gap-1 p-1.5">
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="size-8 rounded-full" />
                      <div className="flex flex-1 flex-col gap-1.5">
                        <Skeleton className="h-3.5 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : availableItems.length === 0 ? (
                <Empty className="h-full p-4">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <MessageSquare />
                    </EmptyMedia>
                    <EmptyDescription>
                      {searchQuery ? t('addItem.noItemsFound') : t('addItem.noItemsAvailable')}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-0.5 p-1.5">
                  {availableItems.map(item => {
                    const name = getItemDisplayName(item);
                    const email = item.email || item.contact?.email;
                    const phone = item.phone_number || item.contact?.phone_number;
                    const selected = selectedItem?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleItemSelect(item)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                          selected && 'bg-primary/8 ring-1 ring-primary/32 hover:bg-primary/8',
                        )}
                      >
                        <Avatar className="size-8 text-xs">
                          <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: getContactColor(name) }}>
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-sm">{name}</span>
                            {item.display_id && (
                              <span className="shrink-0 text-muted-foreground text-xs tabular-nums">#{item.display_id}</span>
                            )}
                          </span>
                          {(email || phone) && (
                            <span className="mt-0.5 flex items-center gap-3 text-muted-foreground text-xs">
                              {email && (
                                <span className="flex min-w-0 items-center gap-1">
                                  <Mail className="size-3 shrink-0" />
                                  <span className="truncate">{email}</span>
                                </span>
                              )}
                              {phone && (
                                <span className="flex shrink-0 items-center gap-1 tabular-nums">
                                  <Phone className="size-3" />
                                  {phone}
                                </span>
                              )}
                            </span>
                          )}
                          {itemType === 'conversation' && item.last_message && (
                            <span className="mt-0.5 line-clamp-1 text-muted-foreground text-xs">{item.last_message.content}</span>
                          )}
                          {itemType === 'conversation' && item.assignee && (
                            <span className="mt-0.5 flex items-center gap-1 text-muted-foreground text-xs">
                              <User className="size-3" />
                              {item.assignee.name}
                            </span>
                          )}
                        </span>
                        {selected && <Check className="mt-1 size-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel>{t('addItem.notes')}</FieldLabel>
            <Textarea
              placeholder={t('addItem.notesPlaceholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
            />
          </Field>
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={isAdding} />}>{t('addItem.cancel')}</DialogClose>
          <Button onClick={handleAddItem} disabled={!canAddItem} loading={isAdding}>
            {t('addItem.add')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
