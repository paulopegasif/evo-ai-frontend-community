import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

interface FormTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  description?: string;
  className?: string;
  required?: boolean;
}

export function FormTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  description,
  className,
  required = false,
}: FormTextareaProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id} className={className}>
        {label}
        {required && <span className="text-destructive-foreground">*</span>}
      </FieldLabel>
      <Textarea id={id} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={className} />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
