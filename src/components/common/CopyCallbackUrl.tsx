import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CopyCallbackUrlProps {
  /** Fully-built callback URL to display and copy (e.g. `${window.location.origin}/google/callback`). */
  url: string;
  /** Field label (already translated). */
  label: string;
  /** Optional helper text under the field (already translated). */
  hint?: string;
  /** Toast shown after a successful copy (already translated). */
  copiedMessage: string;
  /** Accessible label / tooltip for the copy button (already translated). */
  copyLabel: string;
}

/**
 * Read-only callback URL with a copy-to-clipboard button.
 *
 * The URL is derived by the caller from `window.location.origin`, so it always
 * matches the deployment host (localhost / staging / prod) — this is the exact
 * value the operator must register as the OAuth redirect URI in the provider
 * console. i18n-agnostic on purpose: all user-facing strings arrive as props.
 */
export default function CopyCallbackUrl({ url, label, hint, copiedMessage, copyLabel }: CopyCallbackUrlProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API unavailable (non-secure context); the value stays visible/selectable.
    }
    setCopied(true);
    toast.success(copiedMessage);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput
          readOnly
          value={url}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <InputGroupAddon align="inline-end">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleCopy}
            aria-label={copyLabel}
            title={copyLabel}
          >
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {hint && <FieldDescription>{hint}</FieldDescription>}
    </Field>
  );
}
