import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  description?: string;
  required?: boolean;
}

export function FormSelect({ id, label, value, onChange, options, description, required = false }: FormSelectProps) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive-foreground">*</span>}
      </FieldLabel>
      <Select items={options} value={value} onValueChange={v => v != null && onChange(String(v))}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
