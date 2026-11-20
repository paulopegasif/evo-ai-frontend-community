import { useState } from 'react';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
  readOnly?: boolean;
}

export const FormField = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  helpText,
  className,
  readOnly = false,
}: FormFieldProps) => {
  const { t } = useLanguage('channels');
  // Required fields only flag as invalid once the user has left them empty.
  const [touched, setTouched] = useState(false);
  const invalid = required && !readOnly && touched && !value?.trim();

  return (
    <Field className={cn('w-full', className)} invalid={invalid}>
      <FieldLabel>
        {label}
        {required && (
          <span className="text-destructive-foreground" aria-hidden="true">
            *
          </span>
        )}
      </FieldLabel>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        type={type}
        required={required}
        readOnly={readOnly}
        disabled={readOnly}
        aria-invalid={invalid || undefined}
        className={readOnly ? 'bg-muted/48' : undefined}
      />
      {invalid ? (
        <FieldError match>{t('newChannel.validation.required')}</FieldError>
      ) : (
        helpText && <FieldDescription>{helpText}</FieldDescription>
      )}
    </Field>
  );
};
