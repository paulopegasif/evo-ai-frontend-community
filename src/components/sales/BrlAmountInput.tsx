import { forwardRef } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from '@/components/ui/input-group';
import { formatCents, parseMaskedToCents } from '@/utils/dailyPanel/format';

interface BrlAmountInputProps {
  id?: string;
  /** Value in cents. */
  cents: number;
  onCentsChange: (cents: number) => void;
  invalid?: boolean;
  describedBy?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  onEnter?: () => void;
}

/** BRL money input with a digits-only mask: typing 35000 shows `350,00`. */
const BrlAmountInput = forwardRef<HTMLInputElement, BrlAmountInputProps>(
  ({ id, cents, onCentsChange, invalid, describedBy, ariaLabel, className, disabled, onEnter }, ref) => (
    <InputGroup className={className}>
      <InputGroupAddon>
        <InputGroupText>R$</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        ref={ref}
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0,00"
        value={cents > 0 ? formatCents(cents) : ''}
        onChange={e => onCentsChange(parseMaskedToCents(e.target.value))}
        onKeyDown={e => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        disabled={disabled}
        className="tabular-nums"
      />
    </InputGroup>
  ),
);
BrlAmountInput.displayName = 'BrlAmountInput';

export default BrlAmountInput;
