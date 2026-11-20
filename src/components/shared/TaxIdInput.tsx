import React, { useMemo } from 'react';
import { IMaskInput } from 'react-imask';
import { Input } from '@/components/ui/input';
import { InputGroup } from '@/components/ui/input-group';

interface TaxIdInputProps {
  type: 'person' | 'company';
  value: string;
  onChange: (value: string) => void;
  country?: string; // ISO code: BR, US, AR, MX, etc.
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

/**
 * Tax ID Configuration by Country
 */
const TAX_ID_CONFIG: Record<
  string,
  {
    person: { mask?: string; placeholder: string };
    company: { mask?: string; placeholder: string };
  }
> = {
  BR: {
    person: {
      mask: '000.000.000-00',
      placeholder: '000.000.000-00',
    },
    company: {
      mask: '00.000.000/0000-00',
      placeholder: '00.000.000/0000-00',
    },
  },
  US: {
    person: {
      mask: '000-00-0000', // SSN
      placeholder: '000-00-0000',
    },
    company: {
      mask: '00-0000000', // EIN
      placeholder: '00-0000000',
    },
  },
  AR: {
    person: {
      mask: '00-00000000-0', // CUIT/CUIL
      placeholder: '00-00000000-0',
    },
    company: {
      mask: '00-00000000-0', // CUIT
      placeholder: '00-00000000-0',
    },
  },
  MX: {
    person: {
      mask: 'aaaa000000aaa', // RFC
      placeholder: 'AAAA000000AAA',
    },
    company: {
      mask: 'aaa000000aaa', // RFC
      placeholder: 'AAA000000AAA',
    },
  },
  // Default: no mask (free text)
  DEFAULT: {
    person: {
      placeholder: 'Tax ID / SSN',
    },
    company: {
      placeholder: 'Tax ID / EIN',
    },
  },
};

/**
 * TaxIdInput Component
 *
 * International Tax ID input with country-specific masks:
 * - BR: CPF (000.000.000-00) / CNPJ (00.000.000/0000-00)
 * - US: SSN (000-00-0000) / EIN (00-0000000)
 * - AR: CUIT/CUIL (00-00000000-0)
 * - MX: RFC (AAAA000000AAA / AAA000000AAA)
 * - Others: Free text input
 *
 * Always returns unformatted value (only numbers/letters)
 *
 * @example
 * <TaxIdInput
 *   type="person"
 *   country="BR" // from PhoneInput country
 *   value={taxId}
 *   onChange={setTaxId}
 *   error={!!errors.taxId}
 * />
 */
export const TaxIdInput: React.FC<TaxIdInputProps> = ({
  type,
  value,
  onChange,
  country = 'BR',
  disabled = false,
  error = false,
  placeholder,
  className,
  id,
}) => {
  const config = useMemo(() => {
    const countryConfig = TAX_ID_CONFIG[country] || TAX_ID_CONFIG.DEFAULT;
    return countryConfig[type];
  }, [country, type]);

  const hasMask = !!config.mask;

  // If country has mask, render IMaskInput inside the coss input frame
  // (InputGroup styles focus/invalid/disabled states of its native <input>).
  if (hasMask) {
    return (
      <InputGroup className={className}>
        <IMaskInput
          mask={config.mask!}
          value={value}
          unmask={true} // Return only numbers/letters
          onAccept={(value: string) => onChange(value)}
          disabled={disabled}
          placeholder={placeholder || config.placeholder}
          id={id}
          aria-invalid={error || undefined}
          data-slot="input"
          className="h-8.5 w-full min-w-0 rounded-[inherit] bg-transparent px-[calc(--spacing(3)-1px)] text-foreground leading-8.5 outline-none placeholder:text-muted-foreground/72 disabled:cursor-not-allowed sm:h-7.5 sm:leading-7.5"
        />
      </InputGroup>
    );
  }

  // Otherwise, use free text Input
  return (
    <Input
      id={id}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder || config.placeholder}
      aria-invalid={error || undefined}
      className={className}
    />
  );
};

export default TaxIdInput;
