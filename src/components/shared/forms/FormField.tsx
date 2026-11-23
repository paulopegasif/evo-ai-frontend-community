import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'email' | 'url';
  description?: string;
  required?: boolean;
  readOnly?: boolean;
}

export function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  description,
  required = false,
  readOnly = false,
}: FormFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive-foreground">*</span>}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={cn(readOnly && 'cursor-not-allowed bg-muted')}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
