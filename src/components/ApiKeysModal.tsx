import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Edit, Eye, EyeOff, Key, Plus, Trash2, X } from '@/components/icons';
import { toast } from 'sonner';
import { ApiKey, ApiKeyCreate, ApiKeyUpdate } from '@/types/agents';
import { createApiKey, listApiKeys, updateApiKey, deleteApiKey } from '@/services/agents';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApiKeysChange?: () => void;
}

const CUSTOM_OPENAI_PROVIDER = 'custom_openai_compatible';

// Providers disponíveis
const availableProviders = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'azure', label: 'Azure OpenAI' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral AI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'together_ai', label: 'Together AI' },
  { value: 'fireworks_ai', label: 'Fireworks AI' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'bedrock', label: 'AWS Bedrock' },
  { value: 'vertex_ai', label: 'Google Vertex AI' },
  { value: CUSTOM_OPENAI_PROVIDER, label: 'Custom (OpenAI-compatible)' },
];

export function ApiKeysModal({ open, onOpenChange, onApiKeysChange }: ApiKeysModalProps) {
  const { t } = useLanguage('apiKeys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [currentApiKey, setCurrentApiKey] = useState<
    Partial<ApiKey & { key_value?: string; base_url?: string }>
  >({});
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const getProviderLabel = (providerValue: string) => {
    return availableProviders.find(provider => provider.value === providerValue)?.label || providerValue;
  };

  const loadApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const keys = await listApiKeys();
      setApiKeys(keys);
    } catch (error) {
      console.error('Erro ao carregar chaves API:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      loadApiKeys();
    }
  }, [open, loadApiKeys]);

  const handleAddClick = () => {
    setCurrentApiKey({});
    setIsAddingKey(true);
    setIsEditingKey(false);
  };

  const handleEditClick = (apiKey: ApiKey) => {
    setCurrentApiKey({ ...apiKey, key_value: '' });
    setIsAddingKey(true);
    setIsEditingKey(true);
  };

  const handleDeleteClick = (apiKey: ApiKey) => {
    setKeyToDelete(apiKey);
    setShowDeleteDialog(true);
  };

  const handleSaveApiKey = async () => {
    const isCustomProvider = currentApiKey.provider === CUSTOM_OPENAI_PROVIDER;

    if (
      !currentApiKey.name ||
      !currentApiKey.provider ||
      (isCustomProvider && !currentApiKey.base_url?.trim()) ||
      (!isCustomProvider && !isEditingKey && !currentApiKey.key_value)
    ) {
      toast.error(t('messages.requiredFields'));
      return;
    }

    try {
      setLoading(true);

      if (currentApiKey.id) {
        const updateData: ApiKeyUpdate = {
          name: currentApiKey.name,
          provider: currentApiKey.provider,
          base_url: currentApiKey.base_url,
          is_active: currentApiKey.is_active !== false,
        };

        if (currentApiKey.key_value) {
          updateData.key_value = currentApiKey.key_value;
        }

        await updateApiKey(currentApiKey.id, updateData);
        toast.success(t('messages.updateSuccess'));
      } else {
        const createData: ApiKeyCreate = {
          name: currentApiKey.name,
          provider: currentApiKey.provider,
          key_value: currentApiKey.key_value,
          base_url: currentApiKey.base_url,
        };

        await createApiKey(createData);
        toast.success(t('messages.createSuccess'));
      }

      setCurrentApiKey({});
      setIsAddingKey(false);
      setIsEditingKey(false);
      loadApiKeys();

      // Notificar o componente pai que as chaves foram alteradas
      if (onApiKeysChange) {
        onApiKeysChange();
      }
    } catch (error) {
      console.error('Erro ao salvar chave API:', error);
      toast.error(t('messages.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) {
      return;
    }

    try {
      setLoading(true);
      await deleteApiKey(keyToDelete.id);
      toast.success(t('messages.deleteSuccess'));
      setKeyToDelete(null);
      setShowDeleteDialog(false);
      loadApiKeys();

      // Notificar o componente pai que as chaves foram alteradas
      if (onApiKeysChange) {
        onApiKeysChange();
      }
    } catch (error) {
      console.error('Erro ao deletar chave API:', error);
      toast.error(t('messages.deleteError'));
    } finally {
      setLoading(false);
    }
  };

  const closeForm = () => {
    setIsAddingKey(false);
    setIsEditingKey(false);
    setCurrentApiKey({});
  };

  const iconButton = (label: string, icon: ReactNode, onClick: () => void) => (
    <Tooltip>
      <TooltipTrigger
        render={<Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}
      >
        {icon}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPopup className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            {isAddingKey ? (
              <div className="flex flex-col gap-4 rounded-xl border bg-muted/24 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">
                    {isEditingKey ? t('form.title.edit') : t('form.title.new')}
                  </h3>
                  {iconButton(t('actions.cancel'), <X />, closeForm)}
                </div>

                <div className="flex flex-col gap-4">
                  <Field>
                    <FieldLabel htmlFor="name">{t('form.labels.name')}</FieldLabel>
                    <Input
                      id="name"
                      value={currentApiKey.name || ''}
                      onChange={e =>
                        setCurrentApiKey({
                          ...currentApiKey,
                          name: e.target.value,
                        })
                      }
                      placeholder={t('form.placeholders.name')}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="provider">{t('form.labels.provider')}</FieldLabel>
                    <Select
                      items={availableProviders}
                      value={currentApiKey.provider || null}
                      onValueChange={value => {
                        if (value == null) return;
                        const provider = String(value);
                        setCurrentApiKey({
                          ...currentApiKey,
                          provider,
                          ...(provider !== CUSTOM_OPENAI_PROVIDER ? { base_url: '' } : {}),
                        });
                      }}
                    >
                      <SelectTrigger id="provider">
                        <SelectValue placeholder={t('form.placeholders.provider')} />
                      </SelectTrigger>
                      <SelectPopup alignItemWithTrigger={false}>
                        {availableProviders.map(provider => (
                          <SelectItem key={provider.value} value={provider.value}>
                            {provider.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </Field>

                  {currentApiKey.provider === CUSTOM_OPENAI_PROVIDER && (
                    <Field>
                      <FieldLabel htmlFor="base_url">Base URL</FieldLabel>
                      <Input
                        id="base_url"
                        type="url"
                        value={currentApiKey.base_url || ''}
                        onChange={e =>
                          setCurrentApiKey({
                            ...currentApiKey,
                            base_url: e.target.value,
                          })
                        }
                        placeholder="https://api.example.com/v1"
                      />
                    </Field>
                  )}

                  <Field>
                    <FieldLabel htmlFor="key_value">
                      {t('form.labels.key')}
                      {currentApiKey.provider !== CUSTOM_OPENAI_PROVIDER && (
                        <span className="text-destructive-foreground" aria-hidden="true">*</span>
                      )}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="key_value"
                        value={currentApiKey.key_value || ''}
                        onChange={e =>
                          setCurrentApiKey({
                            ...currentApiKey,
                            key_value: e.target.value,
                          })
                        }
                        type={isKeyVisible ? 'text' : 'password'}
                        autoComplete="off"
                        placeholder={
                          isEditingKey
                            ? t('form.placeholders.keyEdit')
                            : t('form.placeholders.keyNew')
                        }
                      />
                      <InputGroupAddon align="inline-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label={isKeyVisible ? t('form.hideKey') : t('form.showKey')}
                          aria-pressed={isKeyVisible}
                          onClick={() => setIsKeyVisible(!isKeyVisible)}
                        >
                          {isKeyVisible ? <EyeOff /> : <Eye />}
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>

                  {isEditingKey && (
                    <div className="flex flex-col gap-2">
                      <Label>{t('form.labels.status')}</Label>
                      <Label className="flex items-center gap-2 font-normal">
                        <Checkbox
                          id="is_active"
                          checked={currentApiKey.is_active !== false}
                          onCheckedChange={checked =>
                            setCurrentApiKey({
                              ...currentApiKey,
                              is_active: !!checked,
                            })
                          }
                        />
                        {t('form.labels.active')}
                      </Label>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeForm}>
                    {t('actions.cancel')}
                  </Button>
                  <Button type="button" onClick={handleSaveApiKey} loading={loading}>
                    {isEditingKey ? t('actions.update') : t('actions.save')}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">{t('list.title')}</h3>
                  <Button type="button" onClick={handleAddClick}>
                    <Plus />
                    {t('actions.add')}
                  </Button>
                </div>

                {loading ? (
                  <div className="flex flex-col gap-3" aria-busy="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-[74px] w-full rounded-lg" />
                    ))}
                  </div>
                ) : apiKeys.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {apiKeys.map(apiKey => (
                      <div
                        key={apiKey.id}
                        className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{apiKey.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {apiKey.base_url && (
                              <span className="truncate text-sm text-muted-foreground">
                                {apiKey.base_url}
                              </span>
                            )}
                            <Badge variant="outline">{getProviderLabel(apiKey.provider)}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {t('list.createdAt')} {new Date(apiKey.created_at).toLocaleDateString('pt-BR')}
                            </span>
                            {!apiKey.is_active && <Badge variant="error">{t('list.inactive')}</Badge>}
                          </div>
                        </div>

                        <div className="flex shrink-0 gap-1">
                          {iconButton(t('actions.edit'), <Edit />, () => handleEditClick(apiKey))}
                          {iconButton(t('actions.delete'), <Trash2 />, () => handleDeleteClick(apiKey))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty className="rounded-lg border border-dashed">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Key />
                      </EmptyMedia>
                      <EmptyTitle>{t('empty.title')}</EmptyTitle>
                      <EmptyDescription>{t('empty.description')}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" onClick={handleAddClick}>
                        <Plus />
                        {t('actions.addFirst')}
                      </Button>
                    </EmptyContent>
                  </Empty>
                )}
              </div>
            )}
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t('actions.close')}
            </DialogClose>
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title={t('deleteDialog.title')}
        description={t('deleteDialog.description', { name: keyToDelete?.name })}
        cancelLabel={t('deleteDialog.cancel')}
        confirmLabel={t('deleteDialog.confirm')}
        onConfirm={handleDeleteConfirm}
        loading={loading}
        icon={<Trash2 />}
      />
    </>
  );
}
