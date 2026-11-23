import { useState, useEffect, useId } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Monitor } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardApp, DashboardAppFormData } from '@/types/integrations';
import { AgentIntegrationDialog } from '../../agentConfig/AgentIntegrationDialog';
import IntegrationNotice from '../../shared/IntegrationNotice';

const SIDEBAR_MENUS = [
  'conversations',
  'contacts',
  'pipelines',
  'campaigns',
  'automation',
  'agents',
  'channels',
  'settings',
] as const;

interface DashboardAppModalProps {
  app?: DashboardApp | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DashboardAppFormData) => Promise<void>;
  isNew?: boolean;
  loading?: boolean;
}


export default function DashboardAppModal({
  app,
  open,
  onOpenChange,
  onSubmit,
  loading: submitting = false
}: DashboardAppModalProps) {
  const { t } = useLanguage('integrations');
  const formId = useId();

  const [formData, setFormData] = useState<DashboardAppFormData>({
    title: '',
    content: {
      type: 'frame',
      url: ''
    },
    display_type: 'conversation',
    sidebar_menu: 'conversations',
    sidebar_position: 'after'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (app) {
      setFormData({
        title: app.title || '',
        content: {
          type: 'frame',
          url: (Array.isArray(app.content) ? app.content[0]?.url : (app.content as { url?: string })?.url) || ''
        },
        display_type: app.display_type || 'conversation',
        sidebar_menu: app.sidebar_menu || 'conversations',
        sidebar_position: app.sidebar_position || 'after'
      });
    } else {
      setFormData({
        title: '',
        content: {
          type: 'frame',
          url: ''
        },
        display_type: 'conversation',
        sidebar_menu: 'conversations',
        sidebar_position: 'after'
      });
    }
    setErrors({});
  }, [app, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('dashboardApps.modal.fields.title.required');
    }

    if (!formData.content.url.trim()) {
      newErrors.url = t('dashboardApps.modal.fields.url.required');
    } else if (!isValidUrl(formData.content.url)) {
      newErrors.url = t('dashboardApps.modal.fields.url.invalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch {
      // Error is handled by parent component
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const displayTypes = [
    {
      value: 'conversation',
      label: t('dashboardApps.modal.fields.displayType.conversation'),
      description: t('dashboardApps.modal.fields.displayType.conversationDescription'),
    },
    {
      value: 'sidebar',
      label: t('dashboardApps.modal.fields.displayType.sidebar'),
      description: t('dashboardApps.modal.fields.displayType.sidebarDescription'),
    },
  ];
  const sidebarMenus = SIDEBAR_MENUS.map(value => ({
    value,
    label: t(`dashboardApps.modal.fields.sidebarMenu.${value}`),
  }));
  const sidebarPositions = [
    {
      value: 'before',
      label: t('dashboardApps.modal.fields.sidebarPosition.before'),
      description: t('dashboardApps.modal.fields.sidebarPosition.beforeDescription'),
    },
    {
      value: 'after',
      label: t('dashboardApps.modal.fields.sidebarPosition.after'),
      description: t('dashboardApps.modal.fields.sidebarPosition.afterDescription'),
    },
  ];

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={onOpenChange}
      icon={<Monitor className="text-muted-foreground" />}
      title={app ? t('dashboardApps.modal.updateTitle') : t('dashboardApps.modal.title')}
      footer={
        <>
          <DialogClose render={<Button type="button" variant="ghost" />} disabled={submitting}>
            {t('dashboardApps.modal.actions.cancel')}
          </DialogClose>
          <Button type="submit" form={formId} loading={submitting}>
            {submitting
              ? t('dashboardApps.modal.actions.saving')
              : app
                ? t('dashboardApps.modal.actions.update')
                : t('dashboardApps.modal.actions.create')}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Basic information */}
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('dashboardApps.modal.basicInfo')}</h3>

          <Field invalid={Boolean(errors.title)}>
            <FieldLabel htmlFor="dashboard-app-title">
              {t('dashboardApps.modal.fields.title.label')}{' '}
              <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="dashboard-app-title"
              placeholder={t('dashboardApps.modal.fields.title.placeholder')}
              value={formData.title}
              onChange={e => {
                setFormData(prev => ({ ...prev, title: e.target.value }));
                clearError('title');
              }}
              aria-invalid={errors.title ? true : undefined}
              autoFocus={!app}
            />
            {errors.title && <FieldError match>{errors.title}</FieldError>}
          </Field>

          <Field invalid={Boolean(errors.url)}>
            <FieldLabel htmlFor="dashboard-app-url">
              {t('dashboardApps.modal.fields.url.label')}{' '}
              <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Input
              id="dashboard-app-url"
              type="url"
              inputMode="url"
              placeholder={t('dashboardApps.modal.fields.url.placeholder')}
              value={formData.content.url}
              onChange={e => {
                setFormData(prev => ({ ...prev, content: { ...prev.content, url: e.target.value } }));
                clearError('url');
              }}
              aria-invalid={errors.url ? true : undefined}
            />
            {errors.url ? (
              <FieldError match>{errors.url}</FieldError>
            ) : (
              <FieldDescription>{t('dashboardApps.modal.fields.url.hint')}</FieldDescription>
            )}
          </Field>
        </section>

        {/* Display */}
        <section className="flex flex-col gap-4">
          <h3 className="font-medium text-sm">{t('dashboardApps.modal.displayConfig')}</h3>

          <Field>
            <FieldLabel htmlFor="dashboard-app-display-type">
              {t('dashboardApps.modal.fields.displayType.label')}{' '}
              <span className="text-destructive-foreground">*</span>
            </FieldLabel>
            <Select
              items={displayTypes}
              value={formData.display_type}
              onValueChange={value =>
                value && setFormData(prev => ({ ...prev, display_type: value as 'conversation' | 'sidebar' }))
              }
            >
              <SelectTrigger id="dashboard-app-display-type">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {displayTypes.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex flex-col py-0.5">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground text-xs">{item.description}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          {formData.display_type === 'sidebar' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="dashboard-app-sidebar-menu">
                  {t('dashboardApps.modal.fields.sidebarMenu.label')}
                </FieldLabel>
                <Select
                  items={sidebarMenus}
                  value={formData.sidebar_menu}
                  onValueChange={value =>
                    value &&
                    setFormData(prev => ({
                      ...prev,
                      sidebar_menu: value as DashboardAppFormData['sidebar_menu'],
                    }))
                  }
                >
                  <SelectTrigger id="dashboard-app-sidebar-menu">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {sidebarMenus.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="dashboard-app-sidebar-position">
                  {t('dashboardApps.modal.fields.sidebarPosition.label')}
                </FieldLabel>
                <Select
                  items={sidebarPositions}
                  value={formData.sidebar_position}
                  onValueChange={value =>
                    value && setFormData(prev => ({ ...prev, sidebar_position: value as 'before' | 'after' }))
                  }
                >
                  <SelectTrigger id="dashboard-app-sidebar-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {sidebarPositions.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        <span className="flex flex-col py-0.5">
                          <span className="font-medium">{item.label}</span>
                          <span className="text-muted-foreground text-xs">{item.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              </Field>
            </div>
          )}
        </section>

        <IntegrationNotice variant="info" title={t('dashboardApps.modal.info.title')}>
          {t('dashboardApps.modal.info.description')}
        </IntegrationNotice>
      </form>
    </AgentIntegrationDialog>
  );
}
