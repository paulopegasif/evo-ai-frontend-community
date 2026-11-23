import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAccountUsers } from '@/hooks/useAccountUsers';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { initials } from '@/lib/initials';
import {
  Plus,
  Trash2,
  ChevronsUpDown,
  Check,
  X,
  FileText,
  Briefcase,
  Boxes,
  CheckSquare,
  Clock,
  Save,
} from '@/components/icons';
import { PipelineItem, PipelineStage, Pipeline, PipelineTask, CreateTaskData, UpdateTaskData, PipelineServiceDefinition } from '@/types/analytics';
import pipelineServiceDefinitionsService from '@/services/pipelines/pipelineServiceDefinitionsService';
import { cn } from '@/lib/utils';
import PipelineItemCustomAttributes from './PipelineItemCustomAttributes';
import PipelineTasksList, { PipelineTasksListRef } from './tasks/PipelineTasksList';
import CreateTaskModal from './tasks/CreateTaskModal';
import EditTaskModal from './tasks/EditTaskModal';

interface Service {
  name: string;
  value: string;
}

interface EditItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PipelineItem | null;
  stages: PipelineStage[];
  pipeline?: Pipeline | null;
  onSubmit: (data: {
    notes: string;
    stage_id: string;
    services: Service[];
    currency: string;
    custom_attributes?: Record<string, unknown>;
  }) => void;
  loading: boolean;
  /** Optional: opens the ScheduleActionModal for this item's contact (board wires it). */
  onSchedule?: (item: PipelineItem) => void;
}

type TabKey = 'details' | 'services' | 'attributes' | 'tasks';

export default function EditItemModal({
  open,
  onOpenChange,
  item,
  stages,
  pipeline,
  onSubmit,
  loading,
  onSchedule,
}: EditItemModalProps) {
  const { t } = useLanguage('pipelines');
  const { users } = useAccountUsers();
  const [notes, setNotes] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [catalogServices, setCatalogServices] = useState<PipelineServiceDefinition[]>([]);
  const [openServicePopover, setOpenServicePopover] = useState<number | null>(null);

  // Task modals state
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<PipelineTask | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<PipelineTask | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  const tasksListRef = useRef<PipelineTasksListRef>(null);

  // Update counts when ref changes
  useEffect(() => {
    const updateCounts = () => {
      if (tasksListRef.current) {
        setPendingCount(tasksListRef.current.pendingCount);
        setOverdueCount(tasksListRef.current.overdueCount);
      }
    };
    updateCounts();
    const handleCountChange = () => updateCounts();
    window.addEventListener('tasksCountChanged', handleCountChange);
    return () => window.removeEventListener('tasksCountChanged', handleCountChange);
  }, []);

  // Initialize form when modal opens or item changes
  useEffect(() => {
    let cancelled = false;
    if (open && item) {
      setNotes(item.notes || '');
      setSelectedStageId(item.stage_id);
      setServices(item.custom_fields?.services || []);
      setCurrency(item.custom_fields?.currency || 'BRL');
      setActiveTab('details');

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { services: _services, currency: _currency, ...customAttrs } = item.custom_fields || {};
      setCustomAttributes(customAttrs);

      pipelineServiceDefinitionsService
        .getServiceDefinitions(item.pipeline_id)
        .then(data => {
          if (!cancelled) setCatalogServices(data);
        })
        .catch(() => {
          if (!cancelled) setCatalogServices([]);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, item]);

  const handleSubmit = () => {
    if (!selectedStageId) return;
    onSubmit({ notes, stage_id: selectedStageId, services, currency, custom_attributes: customAttributes });
  };

  const addService = () => setServices([...services, { name: '', value: '' }]);
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: 'name' | 'value', value: string) => {
    const updated = [...services];
    updated[index][field] = value;
    setServices(updated);
  };
  const selectCatalogService = (index: number, catalogService: PipelineServiceDefinition) => {
    const updated = [...services];
    updated[index] = { name: catalogService.name, value: catalogService.default_value.toString() };
    setServices(updated);
    setOpenServicePopover(null);
  };
  const calculateTotalValue = () =>
    services.reduce((total, service) => total + (parseFloat(service.value) || 0), 0);
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const canSubmit = selectedStageId !== null;

  // Task handlers
  const handleCreateTask = async (data: CreateTaskData) => {
    if (!tasksListRef.current) return;
    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.createTask(data);
      if (result) setShowCreateTaskModal(false);
    } finally {
      setTaskLoading(false);
    }
  };
  const handleEditTask = async (taskId: string, data: UpdateTaskData) => {
    if (!tasksListRef.current) return;
    setTaskLoading(true);
    try {
      const result = await tasksListRef.current.updateTask(taskId, data);
      if (result) {
        setShowEditTaskModal(false);
        setTaskToEdit(null);
      }
    } finally {
      setTaskLoading(false);
    }
  };
  const handleEditTaskClick = (task: PipelineTask) => {
    setTaskToEdit(task);
    setShowEditTaskModal(true);
  };
  const handleAddSubtaskClick = (parentTask: PipelineTask) => {
    setParentTaskForSubtask(parentTask);
    setShowCreateTaskModal(true);
  };
  const handleCreateTaskModalClose = () => {
    setShowCreateTaskModal(false);
    setParentTaskForSubtask(null);
  };

  if (!item) return null;

  const getItemDisplayName = () => {
    if (item.type === 'contact' || !item.conversation) {
      return item.contact?.name || t('editItem.unknownUser');
    }
    return item.conversation?.contact?.name || t('editItem.unknownUser');
  };
  const getItemDisplayId = () => {
    if (item.type === 'conversation' && item.conversation) return item.conversation.display_id;
    return item.id;
  };

  const displayName = getItemDisplayName();
  const currentStage = stages.find(s => String(s.id) === String(selectedStageId));

  const currencyItems = [
    { value: 'BRL', label: t('editItem.currencies.brl') },
    { value: 'USD', label: t('editItem.currencies.usd') },
    { value: 'EUR', label: t('editItem.currencies.eur') },
  ];
  const stageItems = stages.map(stage => ({ value: String(stage.id), label: stage.name }));
  const taskBadgeCount = pendingCount + overdueCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-h-[92vh] max-w-2xl" showCloseButton={false}>
        {/* Header: contact identity + current stage */}
        <DialogHeader className="flex-row items-start gap-3 border-b pb-4">
          <Avatar className="size-11 text-base">
            <AvatarFallback className="bg-muted font-semibold text-foreground/80">
              {initials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <DialogTitle className="truncate">{displayName}</DialogTitle>
              <span className="shrink-0 text-muted-foreground text-sm tabular-nums">#{getItemDisplayId()}</span>
            </div>
            <DialogDescription className="mt-1 flex items-center gap-1.5">
              {currentStage ? (
                <>
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: currentStage.color }} />
                  <span className="truncate">
                    {t('editItem.stageLabel')} {currentStage.name}
                  </span>
                </>
              ) : (
                t('editItem.title')
              )}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onSchedule && (
              <Button variant="outline" size="sm" onClick={() => onSchedule(item)}>
                <Clock />
                {t('editItem.scheduleAction')}
              </Button>
            )}
            <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label={t('editItem.cancel')} />}>
              <X />
            </DialogClose>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)} className="min-h-0 flex-1 gap-0">
          <div className="px-6 pt-4">
            <TabsList className="w-full">
              <TabsTab value="details">
                <FileText />
                {t('editItem.tabs.details')}
              </TabsTab>
              <TabsTab value="services">
                <Briefcase />
                {t('editItem.tabs.services')}
              </TabsTab>
              <TabsTab value="attributes">
                <Boxes />
                {t('editItem.tabs.attributes')}
              </TabsTab>
              <TabsTab value="tasks">
                <CheckSquare />
                {t('editItem.tabs.tasks')}
                {taskBadgeCount > 0 && (
                  <Badge variant={overdueCount > 0 ? 'error' : 'secondary'} size="sm" className="tabular-nums">
                    {taskBadgeCount}
                  </Badge>
                )}
              </TabsTab>
            </TabsList>
          </div>

          {/* Fixed-height body keeps the dialog a stable size across tabs */}
          <div className="h-[460px] max-h-[60vh] overflow-y-auto px-6 py-4">
            <TabsPanel value="details" className="flex flex-col gap-5">
              <Field>
                <FieldLabel>{t('editItem.currentStage')}</FieldLabel>
                <Select
                  items={stageItems}
                  value={selectedStageId != null ? String(selectedStageId) : null}
                  onValueChange={value => value && setSelectedStageId(String(value))}
                >
                  <SelectTrigger className="w-full sm:max-w-72">
                    <SelectValue placeholder={t('editItem.chooseStage')} />
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
                <FieldLabel>{t('editItem.currency')}</FieldLabel>
                <Select items={currencyItems} value={currency} onValueChange={v => v && setCurrency(String(v))}>
                  <SelectTrigger className="w-full sm:max-w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {currencyItems.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <Field>
                <FieldLabel>{t('editItem.notes')}</FieldLabel>
                <Textarea
                  placeholder={t('editItem.notesPlaceholder')}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-28"
                />
              </Field>
            </TabsPanel>

            <TabsPanel value="services" className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{t('editItem.services')}</h3>
                <Button type="button" size="sm" variant="outline" onClick={addService}>
                  <Plus />
                  {t('editItem.addService')}
                </Button>
              </div>

              {services.length === 0 ? (
                <Empty className="rounded-xl border border-dashed py-10">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Briefcase />
                    </EmptyMedia>
                    <EmptyDescription>{t('editItem.noServices')}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="flex flex-col gap-2">
                  {services.map((service, index) => (
                    <div key={index} className="flex items-center gap-2 rounded-lg border bg-muted/24 p-2">
                      <Popover
                        open={openServicePopover === index}
                        onOpenChange={isOpen => setOpenServicePopover(isOpen ? index : null)}
                      >
                        <PopoverTrigger
                          render={
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={openServicePopover === index}
                              className="min-w-0 flex-1 justify-between font-normal"
                            />
                          }
                        >
                          <span className={cn('truncate', !service.name && 'text-muted-foreground')}>
                            {service.name || t('editItem.serviceName')}
                          </span>
                          <ChevronsUpDown className="opacity-64" />
                        </PopoverTrigger>
                        <PopoverPopup className="w-[300px] [--viewport-inline-padding:0] **:data-[slot=popover-viewport]:py-0" align="start">
                          <Command
                            // The list is filtered here; picking an item must not write its value into the field.
                            filter={null}
                            value={service.name}
                            onValueChange={(value, details) => {
                              if (details.reason === 'item-press') return;
                              updateService(index, 'name', value);
                            }}
                          >
                            <CommandInput placeholder={t('editItem.searchService') || 'Buscar ou digitar serviço...'} />
                            {(() => {
                              const query = service.name.trim().toLowerCase();
                              const matches = catalogServices.filter(cs => cs.name.toLowerCase().includes(query));
                              if (matches.length === 0) {
                                return (
                                  <div className="border-t p-1.5 text-sm">
                                    {service.name ? (
                                      <button
                                        type="button"
                                        className="w-full cursor-pointer rounded-md px-2 py-1.5 text-left hover:bg-accent"
                                        onClick={() => setOpenServicePopover(null)}
                                      >
                                        {t('editItem.useCustomService', { name: service.name })}
                                      </button>
                                    ) : (
                                      <p className="px-2 py-4 text-center text-muted-foreground">
                                        {t('editItem.noServicesFound') || 'Nenhum serviço encontrado'}
                                      </p>
                                    )}
                                  </div>
                                );
                              }
                              return (
                                <CommandList className="max-h-64 border-t">
                                  <CommandGroup>
                                    <CommandGroupLabel>{t('editItem.catalogServices') || 'Catálogo de serviços'}</CommandGroupLabel>
                                    {matches.map(cs => (
                                      <CommandItem key={cs.id} value={cs.id} onClick={() => selectCatalogService(index, cs)}>
                                        <Check className={cn('size-4', service.name === cs.name ? 'opacity-100' : 'opacity-0')} />
                                        <div className="flex flex-col">
                                          <span>{cs.name}</span>
                                          <span className="text-muted-foreground text-xs tabular-nums">
                                            {cs.currency} {cs.formatted_default_value}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              );
                            })()}
                          </Command>
                        </PopoverPopup>
                      </Popover>
                      <InputGroup className="w-40 shrink-0">
                        <InputGroupAddon>
                          <InputGroupText>{currency}</InputGroupText>
                        </InputGroupAddon>
                        <InputGroupInput
                          type="number"
                          aria-label={t('editItem.serviceValue')}
                          placeholder={t('editItem.serviceValue')}
                          value={service.value}
                          onChange={e => updateService(index, 'value', e.target.value)}
                          step="0.01"
                          min="0"
                          className="tabular-nums"
                        />
                      </InputGroup>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeService(index)}
                        aria-label={t('editItem.removeService')}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}

                  <div className="mt-1 flex items-center justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">{t('editItem.totalValue')}</span>
                    <span className="font-semibold text-base tabular-nums">
                      {currency} {formatCurrency(calculateTotalValue())}
                    </span>
                  </div>
                </div>
              )}
            </TabsPanel>

            <TabsPanel value="attributes">
              <h3 className="mb-4 font-semibold text-sm">{t('editItem.customAttributes')}</h3>
              <PipelineItemCustomAttributes
                attributes={customAttributes}
                onAttributesChange={setCustomAttributes}
                disabled={loading}
                pipelineId={item.pipeline_id}
                stageId={item.stage_id}
                itemId={item.id}
                pipelineCustomFields={pipeline?.custom_fields}
                stageCustomFields={stages.find(s => s.id === item.stage_id)?.custom_fields}
              />
            </TabsPanel>

            <TabsPanel value="tasks">
              <PipelineTasksList
                ref={tasksListRef}
                pipelineId={item.pipeline_id}
                pipelineItemId={item.id}
                onCreateClick={() => setShowCreateTaskModal(true)}
                onEditClick={handleEditTaskClick}
                onAddSubtask={handleAddSubtaskClick}
              />
            </TabsPanel>
          </div>
        </Tabs>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" disabled={loading} />}>{t('editItem.cancel')}</DialogClose>
          <Button onClick={handleSubmit} disabled={!canSubmit} loading={loading}>
            <Save />
            {t('editItem.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>

      {/* Task Modals */}
      <CreateTaskModal
        open={showCreateTaskModal}
        onOpenChange={handleCreateTaskModalClose}
        onSubmit={handleCreateTask}
        loading={taskLoading}
        availableUsers={users}
        parentTask={parentTaskForSubtask}
      />
      <EditTaskModal
        open={showEditTaskModal}
        onOpenChange={setShowEditTaskModal}
        task={taskToEdit}
        onSubmit={handleEditTask}
        loading={taskLoading}
        availableUsers={users}
      />
    </Dialog>
  );
}
