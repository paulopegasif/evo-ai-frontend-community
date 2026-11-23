import { ReactNode } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChannelIcon } from '@/components/channels';
import { ChannelType, FormData } from '@/hooks/channels/useChannelForm';
import { Provider as ProviderType } from '@/components/channels/ProviderGrid';
import { FormField } from '@/components/channels/shared/FormField';
import { sanitizeInboxName } from '@/utils/sanitizeName';
import { useLanguage } from '@/hooks/useLanguage';

interface FormContainerProps {
  selectedChannel: ChannelType;
  selectedProvider?: ProviderType | null;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * When true (and `form`/`onFormChange` are provided), renders the
   * standardized Display Name + read-only auto Channel Name header. This is the
   * single source of truth for the auto-name (`sanitizeInboxName`) previously
   * duplicated across every provider form.
   */
  showNameFields?: boolean;
  form?: FormData;
  onFormChange?: (key: string, value: string | boolean) => void;
}

export const FormContainer = ({
  selectedChannel,
  selectedProvider,
  children,
  footer,
  showNameFields = false,
  form,
  onFormChange,
}: FormContainerProps) => {
  const { t } = useLanguage('channels');

  const getStr = (key: string): string =>
    form && typeof form[key] === 'string' ? (form[key] as string) : '';

  const handleDisplayNameChange = (value: string) => {
    onFormChange?.('display_name', value);
    onFormChange?.('name', sanitizeInboxName(value));
  };

  const renderNameFields = showNameFields && !!form && !!onFormChange;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <ChannelIcon channelType={selectedChannel?.type || 'web_widget'} size="md" brandTile />
          <div className="min-w-0">
            <CardTitle className="text-base">
              {selectedChannel?.name}
              {selectedProvider && <span className="text-muted-foreground"> · {selectedProvider.name}</span>}
            </CardTitle>
            <CardDescription>{selectedChannel?.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      {/* Standardized Display Name / Channel Name header */}
      {renderNameFields && (
        <div className="border-b px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t('newChannel.fields.displayName.label')}
              value={getStr('display_name')}
              onChange={handleDisplayNameChange}
              placeholder={t('newChannel.fields.displayName.placeholder')}
              helpText={t('newChannel.fields.displayName.helpText')}
              required
            />
            <FormField
              label={t('newChannel.fields.channelName.label')}
              value={getStr('name')}
              onChange={() => {}}
              placeholder={t('newChannel.fields.channelName.placeholder')}
              helpText={t('newChannel.fields.channelName.helpText')}
              required
              readOnly
            />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="p-6">{children}</div>

      {/* Footer */}
      {footer}
    </Card>
  );
};
