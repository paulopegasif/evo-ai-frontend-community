import { useState } from 'react';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Copy, Eye, EyeOff, Key } from 'lucide-react';
import type { AccessToken } from '@/types/auth';
import { useTranslation } from '@/hooks/useTranslation';
import { parseScopesFromAPI } from '@/services/auth/accessTokensService';

interface ViewTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: AccessToken | null;
  onCopy: (text: string, label: string) => void;
}

export default function ViewTokenModal({
  open,
  onOpenChange,
  token,
  onCopy,
}: ViewTokenModalProps) {
  const [showToken, setShowToken] = useState(false);
  const { t } = useTranslation('accessTokens');

  if (!token) return null;

  const handleCopy = (text: string, label: string) => {
    onCopy(text, label);
  };

  const copyButton = (text: string, label: string) => {
    const copyLabel = t('viewModal.copyValue', { label });
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={copyLabel}
              onClick={() => handleCopy(text, label)}
            />
          }
        >
          <Copy />
        </TooltipTrigger>
        <TooltipPopup>{copyLabel}</TooltipPopup>
      </Tooltip>
    );
  };

  const maskedToken = token.token ? '•'.repeat(Math.min(token.token.length, 40)) : '';
  const scopes = parseScopesFromAPI(token.scopes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="size-5" />
            {t('viewModal.title')} - {token.name}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <div className="flex flex-col gap-6">
          {/* Token Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border bg-muted/24">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.name')}</p>
              <p className="font-medium">{token.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.owner')}</p>
              <div className="flex gap-2">
                <Badge variant="default">
                  {token.owner_type}
                </Badge>
                {token.owner_name && (
                  <span className="text-sm">{token.owner_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Token ID */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Token ID</p>
            <div className="flex gap-2">
              <Input
                value={token.id}
                readOnly
                aria-label="Token ID"
                className="font-mono"
              />
              {copyButton(token.id, 'Token ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique identifier for this access token
            </p>
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('viewModal.labels.token')}</p>
            <div className="flex gap-2">
              <InputGroup className="flex-1">
                <InputGroupInput
                  value={showToken ? token.token : maskedToken}
                  readOnly
                  className="font-mono"
                  type={showToken ? 'text' : 'password'}
                  aria-label={t('viewModal.labels.token')}
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={showToken ? t('viewModal.hideToken') : t('viewModal.showToken')}
                    aria-pressed={showToken}
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff /> : <Eye />}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              {copyButton(token.token, t('viewModal.copyToken'))}
            </div>
            <p className="text-xs text-muted-foreground">
              Use this token in the Authorization header: <code>Authorization: Bearer {token.token.substring(0, 20)}...</code>
            </p>
          </div>

          {/* Scopes */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('viewModal.labels.scopes')}</p>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg border bg-muted/24 min-h-[2.5rem]">
              {scopes.length > 0 ? (
                scopes.map((scope) => (
                  <Badge key={scope} variant="outline" className="text-xs font-mono">
                    {scope}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No scopes configured</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Permissions that this token has access to
            </p>
          </div>

          {/* Token Details */}
          <div className="space-y-4 p-4 rounded-xl border bg-muted/24">
            <h4 className="font-medium">Token Details</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('viewModal.labels.createdAt')}</p>
                <p className="text-sm">{new Date(token.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{new Date(token.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Owner ID</p>
              <p className="text-sm font-mono">{token.owner_id}</p>
            </div>
          </div>

          {/* API Usage Example */}
          <div className="space-y-4 p-4 rounded-xl border bg-muted/24">
            <h4 className="font-medium">API Usage Example</h4>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">cURL Example</p>
              <div className="flex gap-2">
                <Input
                  value={`curl -H "api_access_token: ${token.token}" https://api.example.com/v1/endpoint`}
                  readOnly
                  className="font-mono"
                />
                {copyButton(`curl -H "api_access_token: ${token.token}" https://api.example.com/v1/endpoint`, 'cURL Example')}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">JavaScript Example</p>
              <div className="flex gap-2">
                <Input
                  value={`fetch('https://api.example.com/v1/endpoint', { headers: { 'Authorization': 'Bearer ${token.token}' } })`}
                  readOnly
                  className="font-mono"
                />
                {copyButton(`fetch('https://api.example.com/v1/endpoint', { headers: { 'Authorization': 'Bearer ${token.token}' } })`, 'JavaScript Example')}
              </div>
            </div>
          </div>

          {/* Security Warning */}
          <Alert variant="warning">
            <Key />
            <AlertTitle>Important - Security</AlertTitle>
            <AlertDescription>
              <ul className="flex flex-col gap-1">
                <li>• Never expose the access token in client-side code or public repositories</li>
                <li>• Use HTTPS in production for all API communications</li>
                <li>• Regenerate the token if you suspect it has been compromised</li>
                <li>• Monitor token usage regularly</li>
                <li>• Store tokens securely using environment variables or secure vaults</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}
