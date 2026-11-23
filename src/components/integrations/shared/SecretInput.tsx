import { useState } from 'react';
import { Eye, EyeOff } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import type { InputProps } from '@/components/ui/input';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

type SecretInputProps = Omit<InputProps, 'type' | 'className'> & { className?: string };

/** Password-style input with a show/hide toggle, for API keys and secrets. */
export default function SecretInput({ className, ...props }: SecretInputProps) {
  const { t } = useLanguage('integrations');
  const [visible, setVisible] = useState(false);
  const label = visible ? t('actions.hideSecret') : t('actions.showSecret');

  return (
    <InputGroup className={className}>
      <InputGroupInput
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        className="font-mono placeholder:font-sans"
        {...props}
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={label}
                aria-pressed={visible}
                onClick={() => setVisible(v => !v)}
              />
            }
          >
            {visible ? <EyeOff /> : <Eye />}
          </TooltipTrigger>
          <TooltipPopup>{label}</TooltipPopup>
        </Tooltip>
      </InputGroupAddon>
    </InputGroup>
  );
}
