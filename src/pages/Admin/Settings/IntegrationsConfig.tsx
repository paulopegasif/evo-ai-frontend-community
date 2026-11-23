import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, ChevronRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { SecretField, SettingsHeader, TextField } from './components/SettingsUI';
import { useLanguage } from '@/hooks/useLanguage';
import { adminConfigService } from '@/services/admin/adminConfigService';
import { extractError } from '@/utils/apiHelpers';
import type { AdminConfigData } from '@/types/admin/adminConfig';
import BrandIcon, { getBrandIcon } from '@/components/BrandIcon';
import CopyCallbackUrl from '@/components/common/CopyCallbackUrl';
import { INTEGRATIONS, type IntegrationDef } from './integrationsCatalog';
import FrontendServicesSection from './FrontendServicesSection';

// --- Schema ---

const integrationSchema = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional().nullable(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

function isSecretMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('••••');
}

function isConfigured(data: AdminConfigData, def: IntegrationDef): boolean {
  const id = data[def.clientIdKey];
  return (typeof id === 'string' && id.length > 0) || isSecretMasked(data[def.clientSecretKey]);
}

function buildFormValues(data: AdminConfigData, def: IntegrationDef): IntegrationFormData {
  const secretValue = data[def.clientSecretKey];
  return {
    clientId: (data[def.clientIdKey] as string) ?? '',
    clientSecret: isSecretMasked(secretValue) ? '' : ((secretValue as string) ?? ''),
  };
}

function emptyData(def: IntegrationDef): AdminConfigData {
  return { [def.clientIdKey]: '', [def.clientSecretKey]: null };
}

// Brand accent per integration — drives the monogram tile (no logo assets shipped).
const ACCENT: Record<string, string> = {
  linear: 'bg-indigo-500',
  hubspot: 'bg-orange-500',
  shopify: 'bg-success',
  slack: 'bg-purple-600',
  github: 'bg-neutral-800',
  notion: 'bg-neutral-900',
  asana: 'bg-destructive',
  canva: 'bg-sky-500',
  google_calendar: 'bg-info',
  google_sheets: 'bg-success',
  monday: 'bg-destructive',
  paypal: 'bg-blue-700',
  atlassian: 'bg-info',
};

function accent(key: string): string {
  return ACCENT[key] ?? 'bg-primary';
}

function monogram(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return title.slice(0, 2).toUpperCase();
}

// Brand logo (simple-icons via BrandIcon) with a monogram-tile fallback for any
// integration that has no glyph in the brand set.
function IntegrationLogo({ integrationKey, title }: { integrationKey: string; title: string }) {
  const box = 'flex size-10 shrink-0 items-center justify-center rounded-xl';
  if (getBrandIcon(integrationKey)) {
    return (
      <span className={`${box} border bg-card shadow-xs/5`} aria-hidden="true">
        <BrandIcon id={integrationKey} size={22} />
      </span>
    );
  }
  return (
    <span className={`${box} text-sm font-semibold text-white ${accent(integrationKey)}`} aria-hidden="true">
      {monogram(title)}
    </span>
  );
}

// --- Configure dialog (mounted only for the open integration) ---

interface IntegrationDialogProps {
  def: IntegrationDef;
  initialData: AdminConfigData;
  onClose: () => void;
  onSaved: (updated: AdminConfigData) => void;
  t: (key: string) => string;
}

function IntegrationDialogContent({ def, initialData, onClose, onSaved, t }: IntegrationDialogProps) {
  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: buildFormValues(initialData, def),
  });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [secretModified, setSecretModified] = useState(false);
  const secretConfigured = isSecretMasked(initialData[def.clientSecretKey]);
  const configured = isConfigured(initialData, def);
  const title = t(`integrations.${def.key}.cardTitle`);

  const onSave = async (formData: IntegrationFormData) => {
    setSaving(true);
    try {
      const payload: AdminConfigData = { [def.clientIdKey]: formData.clientId ?? '' };
      payload[def.clientSecretKey] =
        !secretModified || formData.clientSecret === '' ? null : formData.clientSecret;

      const data = await adminConfigService.saveConfig(def.configType, payload);
      onSaved(data);
      toast.success(t(`integrations.${def.key}.saveSuccess`));
      onClose();
    } catch (error) {
      toast.error(t(`integrations.${def.key}.saveError`), {
        description: extractError(error).message,
      });
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setRemoving(true);
    try {
      await adminConfigService.clearConfig(def.configType);
      onSaved(emptyData(def));
      toast.success(t('integrations.removeSuccess'));
      onClose();
    } catch (error) {
      toast.error(t('integrations.removeError'), { description: extractError(error).message });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <DialogPopup>
      <form
        data-testid={`${def.key}-form`}
        onSubmit={form.handleSubmit(onSave)}
        autoComplete="off"
        className="flex min-h-0 flex-col"
      >
        {/* Decoy credential pair: absorbs the browser's autofill so the real
            Client ID / Secret fields are left untouched. Off-screen, not focusable. */}
        <input type="text" name="_decoy_user" autoComplete="username" tabIndex={-1} aria-hidden="true" className="absolute h-0 w-0 opacity-0" />
        <input type="password" name="_decoy_pass" autoComplete="new-password" tabIndex={-1} aria-hidden="true" className="absolute h-0 w-0 opacity-0" />

        <DialogHeader>
          <div className="flex items-center gap-3">
            <IntegrationLogo integrationKey={def.key} title={title} />
            <div className="flex flex-col gap-1.5 text-start">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>{t('integrations.dialogSubtitle')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-5">
          <TextField
            id={`${def.key}-clientId`}
            label={t(`integrations.${def.key}.fields.clientId`)}
            placeholder={t(`integrations.${def.key}.placeholders.clientId`)}
            registration={form.register('clientId')}
          />

          <SecretField
            id={`${def.key}-clientSecret`}
            label={t(`integrations.${def.key}.fields.clientSecret`)}
            placeholder={t(`integrations.${def.key}.placeholders.clientSecret`)}
            registration={form.register('clientSecret', {
              onChange: (e) => setSecretModified(e.target.value.length > 0),
            })}
            configured={secretConfigured}
            modified={secretModified}
            onClear={() => {
              form.setValue('clientSecret', '');
              setSecretModified(true);
            }}
            configuredLabel={t('integrations.secretConfigured')}
            notConfiguredLabel={t('integrations.secretNotConfigured')}
            clearLabel={t('integrations.clearSecret')}
          />

          {def.callbackPath && (
            <CopyCallbackUrl
              url={`${window.location.origin}${def.callbackPath}`}
              label={t('integrations.callbackUrl.label')}
              hint={t('integrations.callbackUrl.hint')}
              copyLabel={t('integrations.callbackUrl.copy')}
              copiedMessage={t('integrations.callbackUrl.copied')}
            />
          )}
        </DialogPanel>

        <DialogFooter className="sm:justify-between">
          {configured ? (
            <Button
              type="button"
              variant="destructive-outline"
              onClick={onRemove}
              disabled={saving}
              loading={removing}
            >
              <Trash2 />
              {removing ? t('integrations.removing') : t('integrations.remove')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <DialogClose render={<Button type="button" variant="ghost" />} disabled={saving || removing}>
              {t('integrations.cancel')}
            </DialogClose>
            <Button type="submit" disabled={removing} loading={saving}>
              {saving ? t('integrations.saving') : t('integrations.save')}
            </Button>
          </div>
        </DialogFooter>
      </form>
    </DialogPopup>
  );
}

// --- Main component ---

export default function IntegrationsConfig() {
  const { t } = useLanguage('adminSettings');
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<Record<string, AdminConfigData>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        INTEGRATIONS.map((def) => adminConfigService.getConfig(def.configType)),
      );
      const next: Record<string, AdminConfigData> = {};
      INTEGRATIONS.forEach((def, i) => {
        next[def.key] = results[i];
      });
      setConfigs(next);
    } catch {
      toast.error(t('integrations.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="flex max-w-5xl flex-col gap-6" aria-busy="true">
        <div className="flex items-center gap-2">
          <Spinner className="size-4 text-muted-foreground" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-18 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const configuredCount = INTEGRATIONS.filter((def) => configs[def.key] && isConfigured(configs[def.key], def)).length;
  const activeDef = activeKey ? INTEGRATIONS.find((d) => d.key === activeKey) ?? null : null;
  const activeData = activeDef ? configs[activeDef.key] : undefined;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <SettingsHeader
        title={t('integrations.title')}
        description={t('integrations.description')}
        status={{
          label: `${configuredCount}/${INTEGRATIONS.length} ${t('integrations.statusConfigured').toLowerCase()}`,
          variant: configuredCount > 0 ? 'success' : 'outline',
        }}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {INTEGRATIONS.map((def) => {
          const data = configs[def.key];
          if (!data) return null;
          const configured = isConfigured(data, def);
          const title = t(`integrations.${def.key}.cardTitle`);
          return (
            <button
              key={def.key}
              type="button"
              data-testid={`${def.key}-card`}
              onClick={() => setActiveKey(def.key)}
              className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-start shadow-xs/5 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IntegrationLogo integrationKey={def.key} title={title} />
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="w-full truncate font-medium text-sm">{title}</span>
                {configured ? (
                  <Badge variant="success">
                    <Check />
                    {t('integrations.statusConfigured')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    {t('integrations.statusNotConfigured')}
                  </Badge>
                )}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>

      <Dialog open={!!activeDef} onOpenChange={(open) => { if (!open) setActiveKey(null); }}>
        {activeDef && activeData && (
          <IntegrationDialogContent
            key={activeDef.key}
            def={activeDef}
            initialData={activeData}
            onClose={() => setActiveKey(null)}
            onSaved={(updated) => setConfigs((prev) => ({ ...prev, [activeDef.key]: updated }))}
            t={t}
          />
        )}
      </Dialog>

      {/* Non-OAuth front-end service keys (reCAPTCHA, Clarity) — own section, not
          part of the OAuth catalog above. Self-loads its own config. */}
      <FrontendServicesSection />
    </div>
  );
}
