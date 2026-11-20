import { useLanguage } from '@/hooks/useLanguage';
import { FormField } from '../../shared/FormField';
import { FormCheckbox } from '../../shared/FormCheckbox';
import { FormSection } from '../../shared/FormSection';
import { FormData } from '@/hooks/channels/useChannelForm';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { Field, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';

const PROXY_PROTOCOLS = [
  { label: 'HTTP', value: 'http' },
  { label: 'HTTPS', value: 'https' },
  { label: 'SOCKS4', value: 'socks4' },
  { label: 'SOCKS5', value: 'socks5' },
];

interface EvolutionFormProps {
  form: FormData;
  onFormChange: (key: string, value: string | boolean) => void;
  hasEvolutionConfig: boolean;
}

export const EvolutionForm = ({ form, onFormChange, hasEvolutionConfig }: EvolutionFormProps) => {
  const { t } = useLanguage('whatsapp');
  const getStr = (key: string, fallback = ''): string =>
    typeof form[key] === 'string' ? (form[key] as string) : fallback;

  return (
    <div className="space-y-6">
      {/* Basic Configuration - Only show API/Token if not auto-filled */}
      {!hasEvolutionConfig && (
        <>
          <FormField
            label={t('evolutionForm.fields.baseUrl.label')}
            value={getStr('api_url')}
            onChange={value => onFormChange('api_url', value)}
            placeholder={t('evolutionForm.fields.baseUrl.placeholder')}
            type="url"
            required
          />

          <FormField
            label={t('evolutionForm.fields.apiKey.label')}
            value={getStr('admin_token')}
            onChange={value => onFormChange('admin_token', value)}
            placeholder={t('evolutionForm.fields.apiKey.placeholder')}
            type="password"
            required
          />
        </>
      )}

      <div data-tour="whatsapp-credentials">
        <label className="mb-2 block font-medium text-sm">
          {t('twilioForm.fields.phoneNumber.label')} <span className="text-destructive-foreground">*</span>
        </label>
        <PhoneInput
          value={getStr('phone_number')}
          onChange={value => onFormChange('phone_number', value)}
          placeholder={t('twilioForm.fields.phoneNumber.placeholder')}
          defaultCountry="BR"
        />
      </div>

      {/* Proxy Configuration */}
      <FormSection
        title={t('evolutionForm.sections.proxy.title')}
      >
        <div className="mb-4">
          <FormCheckbox
            label={t('evolutionForm.sections.proxy.enableProxy')}
            checked={!!form.proxy_enabled}
            onChange={checked => onFormChange('proxy_enabled', checked)}
          />
        </div>

        {form.proxy_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label={t('evolutionForm.sections.proxy.host.label')}
              value={getStr('proxy_host')}
              onChange={value => onFormChange('proxy_host', value)}
              placeholder={t('evolutionForm.sections.proxy.host.placeholder')}
            />
            <FormField
              label={t('evolutionForm.sections.proxy.port.label')}
              value={getStr('proxy_port')}
              onChange={value => onFormChange('proxy_port', value)}
              placeholder={t('evolutionForm.sections.proxy.port.placeholder')}
            />
            <Field>
              <FieldLabel>{t('evolutionForm.sections.proxy.protocol')}</FieldLabel>
              <Select
                items={PROXY_PROTOCOLS}
                value={getStr('proxy_protocol', 'http')}
                onValueChange={value => onFormChange('proxy_protocol', String(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {PROXY_PROTOCOLS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>
            <FormField
              label={t('evolutionForm.sections.proxy.username.label')}
              value={getStr('proxy_username')}
              onChange={value => onFormChange('proxy_username', value)}
              placeholder={t('evolutionForm.sections.proxy.username.placeholder')}
            />
            <div className="md:col-span-2">
              <FormField
                label={t('evolutionForm.sections.proxy.password.label')}
                value={getStr('proxy_password')}
                onChange={value => onFormChange('proxy_password', value)}
                placeholder={t('evolutionForm.sections.proxy.password.placeholder')}
                type="password"
              />
            </div>
          </div>
        )}
      </FormSection>

      {/* Instance Settings */}
      <FormSection
        title={t('evolutionForm.sections.instance.title')}
        data-tour="whatsapp-help"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormCheckbox
            label={t('evolutionForm.sections.instance.rejectCalls')}
            checked={!!form.rejectCall}
            onChange={checked => onFormChange('rejectCall', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.alwaysOnline')}
            checked={!!form.alwaysOnline}
            onChange={checked => onFormChange('alwaysOnline', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.readMessages')}
            checked={!!form.readMessages}
            onChange={checked => onFormChange('readMessages', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.readStatus')}
            checked={!!form.readStatus}
            onChange={checked => onFormChange('readStatus', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.groupsIgnore')}
            checked={!!form.groupsIgnore}
            onChange={checked => onFormChange('groupsIgnore', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.enableSyncFeatures')}
            checked={!!form.enable_sync_features}
            onChange={checked => onFormChange('enable_sync_features', checked)}
          />
          <FormCheckbox
            label={t('evolutionForm.sections.instance.syncFullHistory')}
            checked={!!form.syncFullHistory}
            onChange={checked => onFormChange('syncFullHistory', checked)}
          />
        </div>

        <div className="mt-4">
          <FormField
            label={t('evolutionForm.sections.instance.msgCall.label')}
            value={getStr('msgCall')}
            onChange={value => onFormChange('msgCall', value)}
            placeholder={t('evolutionForm.sections.instance.msgCall.placeholder')}
          />
        </div>
      </FormSection>
    </div>
  );
};
