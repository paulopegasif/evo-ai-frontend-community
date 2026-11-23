import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from '@/components/icons';
import type { AccessToken, AccessTokenFormData } from '@/types/auth';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  formatScopesForAPI, 
  generateNameSuggestion, 
  parseScopesFromAPI
} from '@/services/auth/accessTokensService';
import { permissionsService } from '@/services/permissions';

interface AccessTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: AccessToken;
  isNew: boolean;
  loading: boolean;
  onSubmit: (data: AccessTokenFormData) => void;
}

export default function AccessTokenModal({
  open,
  onOpenChange,
  token,
  isNew,
  loading,
  onSubmit,
}: AccessTokenModalProps) {
  const { can } = usePermissions();
  const { t } = useTranslation('accessTokens');
  const [formData, setFormData] = useState<AccessTokenFormData>({
    name: '',
    scopes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loadingScopes, setLoadingScopes] = useState(false);
  const [scopesError, setScopesError] = useState<string>('');
  const [scopeSearch, setScopeSearch] = useState('');
  const [categorizedPermissions, setCategorizedPermissions] = useState<Record<string, {
    name: string;
    description: string;
    permissions: Array<{
      key: string;
      name: string;
      description: string;
      action: string;
    }>;
  }>>({});

  // Load available resource actions
  const loadResourceActions = async () => {
    setLoadingScopes(true);
    setScopesError('');
    
    try {
      const resourceActionsResponse = await permissionsService.getResourceActions();
      const permissionsWithDetails = await permissionsService.getPermissionsWithDetails();

      // Categorize permissions by resource
      const categorized: Record<string, {
        name: string;
        description: string;
        permissions: Array<{
          key: string;
          name: string;
          description: string;
          action: string;
        }>;
      }> = {};
      
      Object.entries(resourceActionsResponse.data.resources).forEach(([resourceKey, resource]) => {
        categorized[resourceKey] = {
          name: resource.name,
          description: resource.description,
          permissions: permissionsWithDetails
            .filter(p => p.resource === resourceKey)
            .map(p => ({
              key: p.key,
              name: p.action_name,
              description: p.description,
              action: p.action
            }))
        };
      });
      
      setCategorizedPermissions(categorized);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setScopesError(t('permissions.loadError'));
      setCategorizedPermissions({});
    } finally {
      setLoadingScopes(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadResourceActions();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (token && !isNew) {
        setFormData({
          name: token.name,
          scopes: token.scopes,
        });
        setSelectedScopes(parseScopesFromAPI(token.scopes));
      } else {
        setFormData({
          name: generateNameSuggestion(),
          scopes: '',
        });
        setSelectedScopes([]);
      }
      setErrors({});
      setScopeSearch('');
    }
  }, [open, token, isNew]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('messages.validation.nameRequired');
    } else if (formData.name.length < 2) {
      newErrors.name = t('messages.validation.nameMinLength');
    }

    if (selectedScopes.length === 0) {
      newErrors.scopes = t('messages.validation.scopesRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const requiredPermission = isNew ? 'create' : 'update';
    if (!can('access_tokens', requiredPermission)) {
      return;
    }

    const submitData: AccessTokenFormData = {
      ...formData,
      scopes: formatScopesForAPI(selectedScopes),
    };

    onSubmit(submitData);
  };



  const handleScopeToggle = (scope: string, checked: boolean) => {
    if (checked) {
      setSelectedScopes(prev => [...prev, scope]);
    } else {
      setSelectedScopes(prev => prev.filter(s => s !== scope));
    }
  };

  const selectAllScopes = () => {
    const allPermissionKeys = Object.values(categorizedPermissions)
      .flatMap(category => category.permissions.map(p => p.key));
    setSelectedScopes(allPermissionKeys);
  };

  const deselectAllScopes = () => {
    setSelectedScopes([]);
  };

  const toggleResourceActions = (resource: string) => {
    const category = categorizedPermissions[resource];
    if (!category) return;

    const categoryPermissionKeys = category.permissions.map(p => p.key);
    const allSelected = categoryPermissionKeys.every(key => selectedScopes.includes(key));

    if (allSelected) {
      // Deselect all from this category
      setSelectedScopes(prev => prev.filter(key => !categoryPermissionKeys.includes(key)));
    } else {
      // Select all from this category
      setSelectedScopes(prev => {
        const newSelected = new Set(prev);
        categoryPermissionKeys.forEach(key => newSelected.add(key));
        return Array.from(newSelected);
      });
    }
  };

  const totalPermissions = Object.values(categorizedPermissions).flatMap(c => c.permissions).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('form.title.new') : t('form.title.edit')}
          </DialogTitle>
          <DialogDescription>
            {isNew
              ? t('description')
              : t('form.title.edit')
            }
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Name */}
            <Field invalid={!!errors.name}>
              <FieldLabel htmlFor="name">{t('form.labels.name')}</FieldLabel>
              <Input
                id="name"
                placeholder={t('form.placeholders.name')}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                aria-invalid={errors.name ? true : undefined}
              />
              <FieldError match={!!errors.name}>{errors.name}</FieldError>
              <FieldDescription>{t('form.descriptions.name')}</FieldDescription>
            </Field>

            {/* Scopes */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>{t('form.labels.scopes')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('form.descriptions.scopes')}
                </p>
              </div>

              {/* Search */}
              <InputGroup>
                <InputGroupAddon>
                  <Search aria-hidden="true" />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  placeholder={t('form.placeholders.searchPermissions')}
                  aria-label={t('form.placeholders.searchPermissions')}
                  value={scopeSearch}
                  onChange={(e) => setScopeSearch(e.target.value)}
                />
              </InputGroup>

              {/* Global actions */}
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-3 text-sm font-medium">
                  <Checkbox
                    id="select-all-resources"
                    checked={selectedScopes.length > 0 && selectedScopes.length === totalPermissions}
                    indeterminate={selectedScopes.length > 0 && selectedScopes.length < totalPermissions}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        selectAllScopes();
                      } else {
                        deselectAllScopes();
                      }
                    }}
                    disabled={loadingScopes}
                  />
                  {t('form.labels.selectAll')}
                </Label>
                <Badge variant="secondary">
                  {t('form.labels.selectedCount', { count: selectedScopes.length })}
                </Badge>
              </div>

              {/* Accordion with permissions */}
              {loadingScopes ? (
                <div className="flex flex-col gap-2" aria-busy="true">
                  <span className="sr-only">{t('permissions.loadingPermissions')}</span>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ) : scopesError ? (
                <Alert variant="error">
                  <AlertDescription>{scopesError}</AlertDescription>
                  <AlertAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => loadResourceActions()}
                    >
                      {t('permissions.retryLoad')}
                    </Button>
                  </AlertAction>
                </Alert>
              ) : Object.keys(categorizedPermissions).length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('permissions.noPermissionsAvailable')}</p>
                </div>
              ) : (
                <Accordion multiple className="w-full rounded-lg border">
                  {Object.entries(categorizedPermissions)
                    .filter(([resource, category]) => {
                      if (!scopeSearch) return true;
                      const searchLower = scopeSearch.toLowerCase();
                      return (
                        resource.toLowerCase().includes(searchLower) ||
                        category.name.toLowerCase().includes(searchLower) ||
                        category.description.toLowerCase().includes(searchLower) ||
                        category.permissions.some(p => 
                          p.name.toLowerCase().includes(searchLower) ||
                          p.key.toLowerCase().includes(searchLower) ||
                          p.description.toLowerCase().includes(searchLower)
                        )
                      );
                    })
                    .map(([resource, category]) => {
                      const selectedActionsForResource = selectedScopes.filter(scope => 
                        scope.startsWith(`${resource}.`)
                      );
                      const allResourceActionsSelected = selectedActionsForResource.length === category.permissions.length;
                      const someResourceActionsSelected = selectedActionsForResource.length > 0 && !allResourceActionsSelected;

                      return (
                        <AccordionItem key={resource} value={resource}>
                          <div className="flex items-center gap-3 px-4">
                            <Checkbox
                              id={`select-resource-${resource}`}
                              aria-label={category.name}
                              checked={allResourceActionsSelected}
                              indeterminate={someResourceActionsSelected}
                              onCheckedChange={() => toggleResourceActions(resource)}
                              disabled={loadingScopes}
                            />
                            <div className="min-w-0 flex-1">
                              <AccordionTrigger className="items-center py-3 hover:no-underline">
                                <span className="flex w-full items-center justify-between gap-3">
                                  <span className="font-medium text-left">{category.name}</span>
                                  <Badge variant="secondary">
                                    {selectedActionsForResource.length}/{category.permissions.length}
                                  </Badge>
                                </span>
                              </AccordionTrigger>
                            </div>
                          </div>
                          <AccordionContent className="px-4 pb-3 ps-11">
                            <div className="flex flex-col gap-2">
                              {category.permissions
                                .filter(permission => {
                                  if (!scopeSearch) return true;
                                  const searchLower = scopeSearch.toLowerCase();
                                  return (
                                    permission.name.toLowerCase().includes(searchLower) ||
                                    permission.key.toLowerCase().includes(searchLower) ||
                                    permission.description.toLowerCase().includes(searchLower)
                                  );
                                })
                                .map((permission) => {
                                  const fullActionKey = permission.key;
                                  return (
                                    <Label
                                      key={permission.key}
                                      className="flex cursor-pointer items-start gap-2 text-sm font-normal"
                                    >
                                      <Checkbox
                                        id={fullActionKey}
                                        checked={selectedScopes.includes(fullActionKey)}
                                        onCheckedChange={(checked) => handleScopeToggle(fullActionKey, checked)}
                                        disabled={loadingScopes}
                                        className="mt-0.5"
                                      />
                                      <span className="flex flex-1 flex-col">
                                        <span className="text-foreground">{permission.name}</span>
                                        {permission.description && (
                                          <span className="text-xs text-muted-foreground">
                                            {permission.description}
                                          </span>
                                        )}
                                      </span>
                                    </Label>
                                  );
                                })}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                </Accordion>
              )}
              
              {errors.scopes && (
                <p className="text-sm text-destructive-foreground" role="alert">{errors.scopes}</p>
              )}
            </div>
          </form>
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('actions.cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} loading={loading}>
            {isNew ? t('actions.create') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
