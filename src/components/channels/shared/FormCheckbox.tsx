import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export const FormCheckbox = ({ label, checked, onChange, className }: FormCheckboxProps) => {
  return (
    <Label className={cn('cursor-pointer select-none font-normal', className)}>
      <Checkbox checked={checked} onCheckedChange={value => onChange(value === true)} />
      <span>{label}</span>
    </Label>
  );
};
