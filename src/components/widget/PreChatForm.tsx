import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/hooks/useLanguage';
import { PhoneInput } from '@/components/shared/PhoneInput';
import '@/components/shared/PhoneInput.css';
import { getLabel, getPlaceHolder } from '@/components/channels/settings/helpers/preChatHelpers';
import type {
  PreChatField,
  PreChatFormData,
  PreChatSubmissionData,
  WidgetConfig,
  CurrentUser,
  Campaign,
} from '@/types/settings';

interface PreChatFormProps {
  config: WidgetConfig;
  currentUser?: CurrentUser;
  activeCampaign?: Campaign;
  widgetColor?: string;
  onSubmit: (data: PreChatSubmissionData) => void;
  isLoading?: boolean;
  serverErrors?: Record<string, string[]>;
}

const SERVER_TO_FORM_FIELD: Record<string, string> = {
  email: 'emailAddress',
  phone_number: 'phoneNumber',
  name: 'fullName',
};

// Validation schema factory
const createValidationSchema = (fields: PreChatField[], hasActiveCampaign: boolean, t: (key: string) => string) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};

  // Untouched fields are undefined, so give the type check the same translated message.
  const req = { required_error: t('preChatForm.validation.required') };

  fields.forEach(field => {
    let validator: z.ZodTypeAny;

    // Base validation based on type
    switch (field.type) {
      case 'email':
        validator = z.string(req).email(t('preChatForm.validation.invalidEmail'));
        break;
      case 'phone':
        validator = z
          .string(req)
          .refine(
            val => val.startsWith('+') && /^\+[1-9]\d{1,14}$/.test(val),
            t('preChatForm.validation.invalidPhone'),
          );
        break;
      case 'url':
        validator = z.string(req).url(t('preChatForm.validation.invalidUrl'));
        break;
      case 'number':
        validator = z
          .string(req)
          .refine(val => !isNaN(Number(val)), t('preChatForm.validation.invalidNumber'));
        break;
      case 'date':
        validator = z
          .string(req)
          .refine(val => !isNaN(Date.parse(val)), t('preChatForm.validation.invalidDate'));
        break;
      case 'checkbox':
        validator = z.boolean(req);
        break;
      default:
        validator = z.string(req);
    }

    // Apply regex pattern if provided
    if (field.regex_pattern && field.type !== 'checkbox') {
      const regex = new RegExp(field.regex_pattern);
      validator = (validator as z.ZodString).refine(
        val => regex.test(val),
        field.regex_cue || t('preChatForm.validation.invalidFormat'),
      );
    }

    // Apply required validation
    if (field.required) {
      if (field.type === 'checkbox') {
        validator = validator.refine(
          (val: boolean) => val === true,
          t('preChatForm.validation.required'),
        );
      } else {
        validator = (validator as z.ZodString).min(1, t('preChatForm.validation.required'));
      }
    } else {
      validator = validator.optional();
    }

    schemaFields[field.name] = validator;
  });

  // Add message field if no active campaign
  if (!hasActiveCampaign) {
    schemaFields.message = z
      .string({ required_error: t('preChatForm.validation.messageRequired') })
      .min(1, t('preChatForm.validation.messageRequired'));
  }

  return z.object(schemaFields);
};

// Phone input component removed - now using shared PhoneInput

// Stable default so the field memo below doesn't recompute (and loop) on every render.
const NO_USER: CurrentUser = {};

export const PreChatForm: React.FC<PreChatFormProps> = ({
  config,
  currentUser = NO_USER,
  activeCampaign,
  widgetColor = '#1f93ff',
  onSubmit,
  isLoading = false,
  serverErrors,
}) => {
  const { t, currentLanguage } = useLanguage('widget');
  const [formFields, setFormFields] = useState<PreChatField[]>([]);

  const hasActiveCampaign = !!activeCampaign?.id;
  const preChatFields = config.preChatFields || [];

  // Filter fields based on current user data (like Vue widget)
  const filteredPreChatFields = useMemo(() => {
    const isUserEmailAvailable = currentUser.has_email;
    const isUserPhoneNumberAvailable = currentUser.has_phone_number;
    const isUserIdentifierAvailable = !!currentUser.identifier;
    const isUserNameAvailable = !!(
      isUserIdentifierAvailable ||
      isUserEmailAvailable ||
      isUserPhoneNumberAvailable
    );

    return preChatFields.filter(field => {
      if (isUserEmailAvailable && field.name === 'emailAddress') {
        return false;
      }
      if (isUserPhoneNumberAvailable && field.name === 'phoneNumber') {
        return false;
      }
      if (isUserNameAvailable && field.name === 'fullName') {
        return false;
      }
      return field.enabled;
    });
  }, [preChatFields, currentUser]);

  // Create validation schema
  const validationSchema = useMemo(
    () => createValidationSchema(filteredPreChatFields, hasActiveCampaign, t),
    [filteredPreChatFields, hasActiveCampaign, t],
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PreChatFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (!serverErrors || Object.keys(serverErrors).length === 0) return;
    Object.entries(serverErrors).forEach(([field, messages]) => {
      const formField = SERVER_TO_FORM_FIELD[field] || field;
      setError(formField as any, { type: 'server', message: messages[0] });
    });
  }, [serverErrors, setError]);

  // Standard field names that should be translated
  const STANDARD_FIELD_NAMES = ['emailAddress', 'fullName', 'phoneNumber'];

  // Translate standard field labels and placeholders
  const translatedPreChatFields = useMemo(() => {
    return filteredPreChatFields.map(field => {
      // Hybrid approach: use field_type if correct, fallback to name check
      const isStandard = field.field_type === 'standard' || STANDARD_FIELD_NAMES.includes(field.name);
      if (isStandard) {
        const translatedLabel = getLabel({
          key: field.name,
          label: field.label,
          language: currentLanguage,
        });
        const translatedPlaceholder = getPlaceHolder({
          key: field.name,
          placeholder: field.placeholder || '',
          label: translatedLabel,
          language: currentLanguage,
        });
        return {
          ...field,
          label: translatedLabel,
          placeholder: translatedPlaceholder,
        };
      }
      return field;
    });
  }, [filteredPreChatFields, currentLanguage]);

  useEffect(() => {
    setFormFields(translatedPreChatFields);
  }, [translatedPreChatFields]);

  // Get field value
  const getValue = (field: PreChatField, formData: PreChatFormData) => {
    const value = formData[field.name];
    if (field.type === 'select' && field.values && value !== undefined) {
      return field.values[Number(value)] || value;
    }
    return value || null;
  };

  // Handle form submission
  const onFormSubmit = (data: PreChatFormData) => {
    // Separate contact and conversation attributes
    const conversationCustomAttributes: Record<string, any> = {};
    const contactCustomAttributes: Record<string, any> = {};

    formFields.forEach(field => {
      const value = getValue(field, data);
      if (value !== null && value !== undefined) {
        if (field.field_type === 'conversation_attribute') {
          conversationCustomAttributes[field.name] = value;
        } else if (field.field_type === 'contact_attribute') {
          contactCustomAttributes[field.name] = value;
        }
      }
    });

    const submissionData: PreChatSubmissionData = {
      fullName: data.fullName,
      emailAddress: data.emailAddress,
      phoneNumber: data.phoneNumber,
      message: data.message,
      activeCampaignId: hasActiveCampaign ? String(activeCampaign?.id) : undefined,
      conversationCustomAttributes,
      contactCustomAttributes,
    };

    onSubmit(submissionData);
  };

  const errorText = (message?: unknown) =>
    message ? <p className="text-destructive-foreground text-xs">{String(message)}</p> : null;

  const renderField = (field: PreChatField) => {
    const fieldError = errors[field.name];
    const hasError = !!fieldError;
    const id = `prechat-${field.name}`;

    switch (field.type) {
      case 'select': {
        const items = (field.values ?? []).map((value, index) => ({ value: String(index), label: value }));
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <Field invalid={hasError}>
                <FieldLabel>{field.label}</FieldLabel>
                <Select
                  items={items}
                  value={formField.value || null}
                  onValueChange={v => v != null && formField.onChange(String(v))}
                >
                  <SelectTrigger id={id} aria-invalid={hasError || undefined}>
                    <SelectValue placeholder={field.placeholder || t('preChatForm.selectOption')} />
                  </SelectTrigger>
                  <SelectPopup alignItemWithTrigger={false}>
                    {items.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {errorText(fieldError?.message)}
              </Field>
            )}
          />
        );
      }

      case 'checkbox':
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <div className="flex flex-col gap-1">
                <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-foreground text-sm">
                  <Checkbox
                    id={id}
                    checked={!!formField.value}
                    onCheckedChange={checked => formField.onChange(checked)}
                    aria-invalid={hasError || undefined}
                  />
                  {field.label}
                </label>
                {errorText(fieldError?.message)}
              </div>
            )}
          />
        );

      case 'phone':
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <Field invalid={hasError}>
                <FieldLabel>{field.label}</FieldLabel>
                <PhoneInput
                  value={formField.value || ''}
                  onChange={formField.onChange}
                  placeholder={field.placeholder}
                  error={hasError}
                  defaultCountry="BR"
                />
                {errorText(fieldError?.message)}
              </Field>
            )}
          />
        );

      default:
        return (
          <Controller
            key={field.name}
            name={field.name as any}
            control={control}
            render={({ field: formField }) => (
              <Field invalid={hasError}>
                <FieldLabel>{field.label}</FieldLabel>
                <Input
                  id={id}
                  type={
                    field.type === 'email'
                      ? 'email'
                      : field.type === 'date'
                        ? 'date'
                        : field.type === 'url'
                          ? 'url'
                          : 'text'
                  }
                  value={formField.value || ''}
                  onChange={e => formField.onChange(e.target.value)}
                  placeholder={field.placeholder}
                  aria-invalid={hasError || undefined}
                />
                {errorText(fieldError?.message)}
              </Field>
            )}
          />
        );
    }
  };

  const shouldShowHeaderMessage =
    hasActiveCampaign || (config.preChatFormEnabled && config.preChatMessage);
  const headerMessage = config.preChatFormEnabled
    ? config.preChatMessage
    : hasActiveCampaign
    ? t('preChatForm.provideDetails')
    : '';

  return (
    <div className="flex w-full flex-1 flex-col overflow-y-auto bg-background p-5">
      {shouldShowHeaderMessage && (
        <div
          className="mb-5 rounded-xl border bg-muted/40 p-3 text-foreground text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: headerMessage || '' }}
        />
      )}

      <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-1 flex-col gap-4">
        {formFields.map(renderField)}

        {!hasActiveCampaign && (
          <Controller
            name="message"
            control={control}
            render={({ field }) => (
              <Field invalid={!!errors.message}>
                <FieldLabel>{t('preChatForm.message')}</FieldLabel>
                <Textarea
                  id="prechat-message"
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value)}
                  placeholder={t('preChatForm.messagePlaceholder')}
                  aria-invalid={errors.message ? true : undefined}
                  rows={4}
                />
                {errorText(errors.message?.message)}
              </Field>
            )}
          />
        )}

        <Button
          type="submit"
          size="lg"
          loading={isLoading}
          className="mt-auto w-full text-white hover:opacity-90"
          style={{ backgroundColor: widgetColor, borderColor: widgetColor }}
        >
          {isLoading ? t('preChatForm.starting') : t('preChatForm.startConversation')}
        </Button>
      </form>
    </div>
  );
};
