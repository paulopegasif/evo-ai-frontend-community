import React, { type ReactNode } from 'react';
import ProviderGrid, { Provider } from './ProviderGrid';
import ChannelBreadcrumb from './ChannelBreadcrumb';
import { useLanguage } from '@/hooks/useLanguage';
import { ChannelTypeId } from '@/types/channels/providers';

interface ProviderSelectionProps {
  channelName: string;
  channelType: ChannelTypeId;
  providers: Provider[];
  isDisabled?: (providerId: string) => boolean;
  disabledTooltip?: (providerId: string) => string | undefined;
  onProviderSelect: (provider: Provider) => void;
  onBack: () => void;
  onChannelListClick?: () => void;
  className?: string;
  /** Progress indicator rendered under the page title. */
  stepper?: ReactNode;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  channelName,
  channelType,
  providers,
  isDisabled,
  disabledTooltip,
  onProviderSelect,
  onBack,
  onChannelListClick,
  className = '',
  stepper,
}) => {
  const { t } = useLanguage('channels');

  return (
    <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`}>
      {/* Breadcrumb/Navigation */}
      <ChannelBreadcrumb
        items={[
          { label: t('navigation.channels'), onClick: onChannelListClick || onBack },
          { label: t('navigation.createChannel'), onClick: onBack },
          { label: channelName, active: true },
        ]}
        onBack={onBack}
      />

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="font-semibold text-xl md:text-2xl">
              {t('newChannel.providerSelection.channelOf', { channelName })}
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {t('newChannel.providerSelection.connectDescription', { channelName })}
            </p>
          </div>
          {stepper}
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-medium text-muted-foreground text-sm">
            {t('newChannel.providerSelection.apiProvider')}
          </h2>
          <div data-tour="provider-grid">
            <ProviderGrid
              channelType={channelType}
              providers={providers}
              isDisabled={isDisabled}
              disabledTooltip={disabledTooltip}
              onSelect={onProviderSelect}
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProviderSelection;
