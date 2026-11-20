import { useState } from 'react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Settings, Plus, Edit, Trash2, Copy, Search, Lock, SlidersHorizontal, User, Zap, Globe, Target, CircleAlert, X } from 'lucide-react';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useJourneyVariables } from '@/hooks/useJourneyVariables';
import { useLanguage } from '@/hooks/useLanguage';

export interface JourneyVariable {
  id: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
  defaultValue?: string;
  description?: string;
}

interface EnvironmentManagerProps {
  journeyId?: string;
}

export interface VariableOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

export const getSystemVariables = (t: any): VariableOption[] => [
  // Contato
  {
    value: '{{contact.name}}',
    label: t('environmentManager.systemVariables.contact.name'),
    description: t('environmentManager.systemVariables.contact.nameDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.email}}',
    label: t('environmentManager.systemVariables.contact.email'),
    description: t('environmentManager.systemVariables.contact.emailDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.phone}}',
    label: t('environmentManager.systemVariables.contact.phone'),
    description: t('environmentManager.systemVariables.contact.phoneDescription'),
    category: t('environmentManager.categories.contact'),
  },
  {
    value: '{{contact.identifier}}',
    label: t('environmentManager.systemVariables.contact.identifier'),
    description: t('environmentManager.systemVariables.contact.identifierDescription'),
    category: t('environmentManager.categories.contact'),
  },

  // Evento
  {
    value: '{{event.name}}',
    label: t('environmentManager.systemVariables.event.name'),
    description: t('environmentManager.systemVariables.event.nameDescription'),
    category: t('environmentManager.categories.event'),
  },
  {
    value: '{{event.value}}',
    label: t('environmentManager.systemVariables.event.value'),
    description: t('environmentManager.systemVariables.event.valueDescription'),
    category: t('environmentManager.categories.event'),
  },
  {
    value: '{{event.timestamp}}',
    label: t('environmentManager.systemVariables.event.timestamp'),
    description: t('environmentManager.systemVariables.event.timestampDescription'),
    category: t('environmentManager.categories.event'),
  },

  // Webhook
  {
    value: '{{webhook.response}}',
    label: t('environmentManager.systemVariables.webhook.response'),
    description: t('environmentManager.systemVariables.webhook.responseDescription'),
    category: t('environmentManager.categories.webhook'),
  },
  {
    value: '{{webhook.status}}',
    label: t('environmentManager.systemVariables.webhook.status'),
    description: t('environmentManager.systemVariables.webhook.statusDescription'),
    category: t('environmentManager.categories.webhook'),
  },
  {
    value: '{{webhook.data}}',
    label: t('environmentManager.systemVariables.webhook.data'),
    description: t('environmentManager.systemVariables.webhook.dataDescription'),
    category: t('environmentManager.categories.webhook'),
  },

  // Jornada
  {
    value: '{{journey.start_date}}',
    label: t('environmentManager.systemVariables.journey.startDate'),
    description: t('environmentManager.systemVariables.journey.startDateDescription'),
    category: t('environmentManager.categories.journey'),
  },
  {
    value: '{{journey.current_step}}',
    label: t('environmentManager.systemVariables.journey.currentStep'),
    description: t('environmentManager.systemVariables.journey.currentStepDescription'),
    category: t('environmentManager.categories.journey'),
  },

  // Conversa
  {
    value: '{{conversation.pipeline_stage_id}}',
    label: t('environmentManager.systemVariables.conversation.pipelineStageId'),
    description: t(
      'environmentManager.systemVariables.conversation.pipelineStageIdDescription',
    ),
    category: t('environmentManager.categories.conversation'),
  },
];

export function EnvironmentManager({
  journeyId,
}: EnvironmentManagerProps) {
  const { t } = useLanguage('journey');
  const { variables, loading, error, addVariable, updateVariable, deleteVariable } =
    useJourneyVariables(journeyId);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVariable, setEditingVariable] = useState<JourneyVariable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<JourneyVariable | null>(null);
  const [newVariable, setNewVariable] = useState<Omit<JourneyVariable, 'id'>>({
    name: '',
    type: 'text',
    defaultValue: '',
    description: '',
  });

  const handleCreateVariable = async () => {
    if (!newVariable.name.trim()) {
      alert(t('environmentManager.form.fields.name.required'));
      return;
    }

    // Validar nome (sem espaços, apenas letras, números e underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newVariable.name)) {
      alert(t('environmentManager.form.fields.name.invalid'));
      return;
    }

    // Verificar se já existe
    if (variables.some(v => v.name === newVariable.name)) {
      alert(t('environmentManager.form.fields.name.exists'));
      return;
    }

    try {
      await addVariable(newVariable);

      setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
      setShowCreateForm(false);
    } catch (err) {
      alert(t('environmentManager.form.messages.createError'));
    }
  };

  const handleEditVariable = (variable: JourneyVariable) => {
    setEditingVariable(variable);
    setNewVariable({
      name: variable.name,
      type: variable.type,
      defaultValue: variable.defaultValue || '',
      description: variable.description || '',
    });
    setShowCreateForm(true);
  };

  const handleUpdateVariable = async () => {
    if (!editingVariable) return;

    if (!newVariable.name.trim()) {
      alert(t('environmentManager.form.fields.name.required'));
      return;
    }

    // Validar nome (sem espaços, apenas letras, números e underscore)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newVariable.name)) {
      alert(t('environmentManager.form.fields.name.invalid'));
      return;
    }

    // Verificar se já existe (exceto a própria variável)
    if (variables.some(v => v.name === newVariable.name && v.id !== editingVariable.id)) {
      alert(t('environmentManager.form.fields.name.exists'));
      return;
    }

    try {
      await updateVariable(editingVariable.id, newVariable);

      setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
      setShowCreateForm(false);
      setEditingVariable(null);
    } catch (err) {
      alert(t('environmentManager.form.messages.updateError'));
    }
  };

  const handleDeleteVariable = (variable: JourneyVariable) => {
    setDeletingVariable(variable);
  };

  const confirmDelete = async () => {
    if (!deletingVariable) return;

    try {
      await deleteVariable(deletingVariable.id);
      setDeletingVariable(null);
    } catch (err) {
      alert(t('environmentManager.form.messages.deleteError'));
    }
  };

  const copyToClipboard = (variableName: string) => {
    navigator.clipboard.writeText(`{${variableName}}`);
    // TODO: Adicionar toast de sucesso
  };

  // Agrupar SYSTEM_VARIABLES por categoria para exibição
  const SYSTEM_VARIABLES = getSystemVariables(t);
  const systemVariablesByCategory = SYSTEM_VARIABLES.reduce((acc, variable) => {
    const category = variable.category || t('environmentManager.categories.others');
    if (!acc[category]) {
      acc[category] = { category, variables: [] };
    }

    // Aplicar filtro de busca
    const matchesSearch =
      searchQuery === '' ||
      variable.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (variable.description &&
        variable.description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (matchesSearch) {
      acc[category].variables.push({
        name: variable.value.replace(/[{}]/g, ''), // Remove {{}} para mostrar só o nome
        description: variable.description || '',
        example: variable.label, // Usar label como exemplo
      });
    }

    return acc;
  }, {} as Record<string, { category: string; variables: { name: string; description: string; example: string }[] }>);

  const filteredSystemVariables = Object.values(systemVariablesByCategory).filter(
    cat => cat.variables.length > 0,
  );

  const variableTypeItems: { value: JourneyVariable['type']; label: string }[] = [
    { value: 'text', label: `📝 ${t('environmentManager.form.fields.type.text')}` },
    { value: 'number', label: `🔢 ${t('environmentManager.form.fields.type.number')}` },
    { value: 'boolean', label: `☑️ ${t('environmentManager.form.fields.type.boolean')}` },
    { value: 'date', label: `📅 ${t('environmentManager.form.fields.type.date')}` },
  ];

  const resetForm = () => {
    setShowCreateForm(false);
    setEditingVariable(null);
    setNewVariable({ name: '', type: 'text', defaultValue: '', description: '' });
  };

  const filteredCustomVariables = variables.filter(
    v =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Settings />
        ENV
      </DialogTrigger>
      <DialogPopup className="max-h-[85vh] max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="size-4 text-primary" aria-hidden="true" />
            </div>
            {t('environmentManager.title')}
          </DialogTitle>
          <DialogDescription>{t('environmentManager.description')}</DialogDescription>
        </DialogHeader>

        {/* Barra de busca */}
        <div className="px-6 pb-4">
          <InputGroup className="max-w-md">
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              placeholder={t('environmentManager.searchPlaceholder')}
              aria-label={t('environmentManager.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>

        <DialogPanel>
          {/* Loading indicator */}
          {loading && (
            <div className="flex flex-col gap-2 py-4" aria-busy="true" aria-label={t('environmentManager.loading')}>
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {/* Error indicator */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/32 bg-destructive/4 p-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <p className="text-destructive-foreground text-sm">
                ⚠️ {t('environmentManager.errorTitle')} {error}
              </p>
            </div>
          )}

          {/* Formulário de Criar/Editar - No topo quando ativo */}
          {showCreateForm && (
            <div className="mb-6 rounded-xl border bg-muted/24 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-lg">
                  {editingVariable ? `✏️ ${t('environmentManager.form.edit.title')}` : `➕ ${t('environmentManager.form.create.title')}`}
                </h3>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={resetForm}
                  aria-label={t('environmentManager.form.actions.cancel')}
                >
                  <X />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>{t('environmentManager.form.fields.name.label')}</FieldLabel>
                  <Input
                    placeholder={t('environmentManager.form.fields.name.placeholder')}
                    value={newVariable.name}
                    onChange={e => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <FieldDescription>{t('environmentManager.form.fields.name.help')}</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>{t('environmentManager.form.fields.type.label')}</FieldLabel>
                  <Select
                    items={variableTypeItems}
                    value={newVariable.type}
                    onValueChange={value =>
                      value != null &&
                      setNewVariable(prev => ({ ...prev, type: value as JourneyVariable['type'] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup alignItemWithTrigger={false}>
                      {variableTypeItems.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel>{t('environmentManager.form.fields.description.label')}</FieldLabel>
                  <Input
                    placeholder={t('environmentManager.form.fields.description.placeholder')}
                    value={newVariable.description}
                    onChange={e =>
                      setNewVariable(prev => ({ ...prev, description: e.target.value }))
                    }
                  />
                </Field>

                <Field>
                  <FieldLabel>{t('environmentManager.form.fields.defaultValue.label')}</FieldLabel>
                  <Input
                    placeholder={t('environmentManager.form.fields.defaultValue.placeholder')}
                    value={newVariable.defaultValue}
                    onChange={e =>
                      setNewVariable(prev => ({ ...prev, defaultValue: e.target.value }))
                    }
                  />
                </Field>
              </div>

              <div className="mt-4 flex gap-3">
                <Button variant="outline" onClick={resetForm}>
                  {t('environmentManager.form.actions.cancel')}
                </Button>
                <Button onClick={editingVariable ? handleUpdateVariable : handleCreateVariable}>
                  {editingVariable ? t('environmentManager.form.edit.button') : t('environmentManager.form.create.button')}
                </Button>
              </div>
            </div>
          )}

          <Tabs defaultValue="system" className="w-full">
            <TabsList className="w-full">
              <TabsTab value="system" className="flex items-center gap-2">
                <Lock className="size-3.5" aria-hidden="true" />
                {t('environmentManager.tabs.system')}
              </TabsTab>
              <TabsTab value="custom" className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                {t('environmentManager.tabs.custom', { count: filteredCustomVariables.length })}
              </TabsTab>
            </TabsList>

            <TabsPanel value="system" className="mt-4 space-y-4">
              <div className="space-y-3">
                {filteredSystemVariables.map(category => (
                  <div key={category.category}>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <span className="text-muted-foreground [&_svg]:size-3.5" aria-hidden="true">
                        {category.category === t('environmentManager.categories.contact') && <User />}
                        {category.category === t('environmentManager.categories.event') && <Zap />}
                        {category.category === t('environmentManager.categories.webhook') && <Globe />}
                        {category.category === t('environmentManager.categories.journey') && <Target />}
                      </span>
                      {category.category}
                    </h4>
                    <div className="space-y-1">
                      {category.variables.map(variable => (
                        <div
                          key={variable.name}
                          className="group p-3 rounded-lg bg-muted/40 border border-border/64 hover:bg-accent hover:border-border transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                  {'{' + variable.name + '}'}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => copyToClipboard(variable.name)}
                                  className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                                  aria-label={t('environmentManager.customVariables.actions.copy')}
                                  title={t('environmentManager.customVariables.actions.copy')}
                                >
                                  <Copy />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {variable.description}
                              </p>
                              <div className="inline-block rounded bg-success/8 px-2 py-1 font-mono text-success-foreground text-xs">
                                {t('environmentManager.examples.prefix', { example: variable.example })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsPanel>

            <TabsPanel value="custom" className="mt-4 space-y-4">
              {/* Header com botão de nova variável */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {filteredCustomVariables.length === 0
                      ? t('environmentManager.customVariables.empty.title')
                      : t('environmentManager.customVariables.empty.count', { count: filteredCustomVariables.length })}
                  </h3>
                </div>
                <Button size="sm" onClick={() => setShowCreateForm(true)}>
                  <Plus />
                  {t('environmentManager.customVariables.actions.new')}
                </Button>
              </div>

              <div className="space-y-2">
                {filteredCustomVariables.length === 0 && !showCreateForm && (
                  <Empty className="py-8 md:py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SlidersHorizontal />
                      </EmptyMedia>
                      <EmptyDescription>
                        {t('environmentManager.customVariables.empty.subtitle')}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}

                {filteredCustomVariables.map(variable => (
                  <div
                    key={variable.id}
                    className="group p-3 rounded-lg bg-muted/40 border border-border/64 hover:bg-accent hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                            {'{' + variable.name + '}'}
                          </code>
                          <span className="text-xs bg-muted/48 px-2 py-1 rounded border border-border/64">
                            {variable.type === 'text' && '📝'}
                            {variable.type === 'number' && '🔢'}
                            {variable.type === 'boolean' && '☑️'}
                            {variable.type === 'date' && '📅'}
                            {variable.type}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => copyToClipboard(variable.name)}
                            className="opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                            aria-label={t('environmentManager.customVariables.actions.copy')}
                            title={t('environmentManager.customVariables.actions.copy')}
                          >
                            <Copy />
                          </Button>
                        </div>
                        {variable.description && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {variable.description}
                          </p>
                        )}
                        {variable.defaultValue && (
                          <div className="inline-block rounded bg-success/8 px-2 py-1 font-mono text-success-foreground text-xs">
                            {t('environmentManager.customVariables.actions.default', { value: variable.defaultValue })}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleEditVariable(variable)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={t('environmentManager.customVariables.actions.edit')}
                          title={t('environmentManager.customVariables.actions.edit')}
                        >
                          <Edit />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDeleteVariable(variable)}
                          className="text-muted-foreground hover:bg-destructive/8 hover:text-destructive-foreground"
                          aria-label={t('environmentManager.customVariables.actions.delete')}
                          title={t('environmentManager.customVariables.actions.delete')}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsPanel>
          </Tabs>
        </DialogPanel>

        <DialogFooter className="sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">{t('environmentManager.footer.tip')}</p>
          <DialogClose render={<Button variant="outline" />}>
            {t('environmentManager.form.actions.close')}
          </DialogClose>
        </DialogFooter>
      </DialogPopup>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={!!deletingVariable}
        onOpenChange={open => !open && setDeletingVariable(null)}
        title={t('environmentManager.deleteDialog.title')}
        description={t('environmentManager.deleteDialog.description', { name: deletingVariable?.name })}
        cancelLabel={t('environmentManager.deleteDialog.cancel')}
        confirmLabel={t('environmentManager.deleteDialog.confirm')}
        onConfirm={confirmDelete}
      />
    </Dialog>
  );
}
