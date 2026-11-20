import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface FormSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
}

export function FormSwitch({ id, label, checked, onCheckedChange, description }: FormSwitchProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        <Label htmlFor={id}>{label}</Label>
      </div>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
  );
}
