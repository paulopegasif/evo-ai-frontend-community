import type { ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Lock, LockOpen, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

export type SettingsStatusVariant = 'success' | 'warning' | 'error' | 'info' | 'outline' | 'secondary';

export interface SettingsStatus {
  label: string;
  variant: SettingsStatusVariant;
}

/** Title block used at the top of every admin settings section. */
export function SettingsHeader({
  title,
  description,
  status,
  actions,
  as: Heading = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  status?: SettingsStatus | null;
  actions?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Heading className={cn('font-semibold tracking-tight', Heading === 'h2' ? 'text-xl' : 'text-lg')}>
            {title}
          </Heading>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        {description && <p className="mt-1 max-w-2xl text-muted-foreground text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Loading state shaped like a settings form (header + cards with fields). */
export function SettingsSkeleton({ cards = 1, fields = 3 }: { cards?: number; fields?: number }) {
  return (
    <div className="flex max-w-3xl flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Spinner className="size-4 text-muted-foreground" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {Array.from({ length: cards }).map((_, c) => (
        <Card key={c}>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            {Array.from({ length: fields }).map((__, f) => (
              <div key={f} className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </CardPanel>
        </Card>
      ))}
    </div>
  );
}

/** Text input bound to react-hook-form, laid out as a coss Field. */
export function TextField({
  id,
  label,
  placeholder,
  registration,
  error,
  description,
  type,
  readOnly,
  required,
  className,
}: {
  id: string;
  label: ReactNode;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  error?: string;
  description?: ReactNode;
  type?: string;
  readOnly?: boolean;
  required?: boolean;
  className?: string;
}) {
  return (
    <Field invalid={Boolean(error)} className={className}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="-ms-1 text-destructive-foreground" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <Input
        id={id}
        placeholder={placeholder}
        type={type}
        readOnly={readOnly}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        className={readOnly ? 'bg-muted' : undefined}
        {...registration}
      />
      {error ? (
        <FieldError match>{error}</FieldError>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}

/**
 * Password-type input for stored secrets. Shows whether a value is already
 * configured and lets the admin clear it explicitly.
 */
export function SecretField({
  id,
  label,
  placeholder,
  registration,
  configured,
  modified,
  onClear,
  configuredLabel,
  notConfiguredLabel,
  clearLabel,
  required,
  error,
  description,
}: {
  id: string;
  label: ReactNode;
  placeholder?: string;
  registration: UseFormRegisterReturn;
  configured: boolean;
  modified: boolean;
  onClear: () => void;
  configuredLabel: string;
  notConfiguredLabel: string;
  clearLabel: string;
  required?: boolean;
  error?: string;
  description?: ReactNode;
}) {
  const canClear = configured && !modified;
  return (
    <Field invalid={Boolean(error)}>
      <div className="flex w-full items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>
          {label}
          {required && (
            <span className="-ms-1 text-destructive-foreground" aria-hidden="true">
              *
            </span>
          )}
        </FieldLabel>
        {!modified &&
          (configured ? (
            <Badge variant="success">
              <Lock />
              {configuredLabel}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              <LockOpen />
              {notConfiguredLabel}
            </Badge>
          ))}
      </div>
      <InputGroup>
        <InputGroupInput
          id={id}
          type="password"
          autoComplete="off"
          placeholder={placeholder}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          {...registration}
        />
        {canClear && (
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={onClear}
                    title={clearLabel}
                    aria-label={clearLabel}
                  />
                }
              >
                <X />
              </TooltipTrigger>
              <TooltipPopup>{clearLabel}</TooltipPopup>
            </Tooltip>
          </InputGroupAddon>
        )}
      </InputGroup>
      {error ? (
        <FieldError match>{error}</FieldError>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </Field>
  );
}

/** Label + optional description on the left, Switch on the right. */
export function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor={id}>{label}</Label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={next => onCheckedChange(next)} disabled={disabled} />
    </div>
  );
}

/** Bordered group for a list of ToggleRows. */
export function ToggleGroupBox({ children }: { children: ReactNode }) {
  return <div className="flex w-full flex-col divide-y rounded-xl border bg-muted/24">{children}</div>;
}

/**
 * Footer of a settings form. Sticks to the bottom of the scroll area, shows
 * an "unsaved changes" hint while the form is dirty and holds the actions.
 */
export function SettingsSaveBar({
  dirty,
  saving,
  disabled,
  saveLabel,
  savingLabel,
  onSave,
  children,
  sticky = true,
}: {
  dirty?: boolean;
  saving?: boolean;
  disabled?: boolean;
  saveLabel: string;
  savingLabel?: string;
  /** When set the button is type="button" and calls this; otherwise it submits the form. */
  onSave?: () => void;
  /** Extra actions shown left of the save button (test, clear, ...). */
  children?: ReactNode;
  sticky?: boolean;
}) {
  const { t } = useLanguage('adminSettings');
  return (
    <div
      className={cn(
        'z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/92 px-4 py-3 shadow-xs/5 backdrop-blur',
        sticky && 'sticky bottom-0',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {dirty ? (
          <>
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            <span className="text-muted-foreground">{t('common.unsavedChanges')}</span>
          </>
        ) : (
          <span className="text-muted-foreground/72">{t('common.noChanges')}</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button
          type={onSave ? 'button' : 'submit'}
          onClick={onSave}
          disabled={saving || disabled}
          loading={saving}
        >
          {saving && savingLabel ? savingLabel : saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** Convenience for "configured / not configured" status badges. */
export function useConfiguredStatus(configured: boolean): SettingsStatus {
  const { t } = useLanguage('adminSettings');
  return configured
    ? { label: t('common.configured'), variant: 'success' }
    : { label: t('common.notConfigured'), variant: 'outline' };
}

/** Labelled single-value Select. */
export function SelectField({
  id,
  label,
  items,
  value,
  onValueChange,
  description,
}: {
  id?: string;
  label?: ReactNode;
  items: { value: string; label: string }[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  description?: ReactNode;
}) {
  return (
    <Field>
      {label && <FieldLabel htmlFor={id}>{label}</FieldLabel>}
      <Select items={items} value={value ?? null} onValueChange={v => v != null && onValueChange(v as string)}>
        <SelectTrigger id={id} aria-label={typeof label === 'string' ? label : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
