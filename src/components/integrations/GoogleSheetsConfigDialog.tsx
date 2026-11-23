import { useState, useEffect } from 'react';
import { CheckSquare, Edit3, FilePlus, Settings, Sheet } from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { AgentIntegrationDialog, SettingRow } from './agentConfig/AgentIntegrationDialog';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import GoogleSheetsService from '@/services/integrations/googleSheetsService';
import type { GoogleSheetsConfig, GoogleSheetsItem } from '@/types/integrations/googleSheets';

interface GoogleSheetsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: GoogleSheetsConfig) => void;
  onDisconnect?: () => void;
  initialConfig?: Partial<GoogleSheetsConfig>;
  agentId: string;
}

const GoogleSheetsConfigDialog = ({
  open,
  onOpenChange,
  onSave,
  onDisconnect,
  initialConfig,
  agentId,
}: GoogleSheetsConfigDialogProps) => {
  const { t } = useLanguage('aiAgents');

  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingSpreadsheets, setIsLoadingSpreadsheets] = useState(false);
  const [availableSpreadsheets, setAvailableSpreadsheets] = useState<GoogleSheetsItem[]>([]);

  const [config, setConfig] = useState<GoogleSheetsConfig>({
    provider: 'google_sheets',
    email: initialConfig?.email || '',
    connected: initialConfig?.connected || false,
    spreadsheets: initialConfig?.spreadsheets || [],
    settings: {
      selectedSpreadsheetId: initialConfig?.settings?.selectedSpreadsheetId || '',
      allowRead: initialConfig?.settings?.allowRead !== false, // default true
      allowWrite: initialConfig?.settings?.allowWrite !== false, // default true
      allowCreate: initialConfig?.settings?.allowCreate !== false, // default true
      autoSyncEnabled: initialConfig?.settings?.autoSyncEnabled || false,
    },
  });

  // Sync config when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        provider: 'google_sheets',
        email: initialConfig?.email || '',
        connected: initialConfig?.connected || false,
        spreadsheets: initialConfig?.spreadsheets || [],
        settings: {
          selectedSpreadsheetId: initialConfig?.settings?.selectedSpreadsheetId || '',
          allowRead: initialConfig?.settings?.allowRead !== false,
          allowWrite: initialConfig?.settings?.allowWrite !== false,
          allowCreate: initialConfig?.settings?.allowCreate !== false,
          autoSyncEnabled: initialConfig?.settings?.autoSyncEnabled || false,
        },
      });
    }
  }, [initialConfig]);

  // Load spreadsheets when connected
  useEffect(() => {
    if (config.connected && open) {
      loadSpreadsheets();
    }
  }, [config.connected, open]);

  const loadSpreadsheets = async () => {
    setIsLoadingSpreadsheets(true);
    try {
      const spreadsheets = await GoogleSheetsService.getSpreadsheets(agentId);
      setAvailableSpreadsheets(spreadsheets);
      setConfig((prev: GoogleSheetsConfig) => ({ ...prev, spreadsheets }));
    } catch (error) {
      console.error('Error loading spreadsheets:', error);
      toast.error(t('edit.integrations.toasts.loadSheetsError'));
    } finally {
      setIsLoadingSpreadsheets(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (!config.email) {
      toast.error(t('edit.integrations.toasts.emailRequired'));
      return;
    }

    setIsConnecting(true);
    try {
      const response = await GoogleSheetsService.generateAuthorization(agentId, config.email);

      if (response.url) {
        // Redirect to Google OAuth
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Error connecting to Google Sheets:', error);
      toast.error(t('edit.integrations.toasts.connectError', { name: 'Google Sheets' }));
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSave = async () => {
    if (!config.settings?.selectedSpreadsheetId) {
      toast.error(t('edit.integrations.toasts.selectSheet'));
      return;
    }

    try {
      // Save configuration to backend first
      await GoogleSheetsService.saveConfiguration(agentId, config);

      // Then update local state
      onSave(config);
      toast.success(t('edit.integrations.toasts.saveSuccess'));
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving Google Sheets configuration:', error);
      toast.error(t('edit.integrations.toasts.saveError'));
    }
  };

  const handleDisconnect = async () => {
    try {
      // Call backend to disconnect
      await GoogleSheetsService.disconnect(agentId);

      // Update local state
      if (onDisconnect) {
        onDisconnect();
      }

      toast.success(t('edit.integrations.toasts.disconnectSuccess', { name: 'Google Sheets' }));
      onOpenChange(false);
    } catch (error) {
      console.error('Error disconnecting Google Sheets:', error);
      toast.error(t('edit.integrations.toasts.disconnectError', { name: 'Google Sheets' }));
    }
  };

  const { t: tShared } = useLanguage('aiAgents');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const spreadsheetItems = availableSpreadsheets.map(sheet => ({
    value: sheet.id,
    label: sheet.name,
  }));
  const setSetting = (key: 'allowRead' | 'allowWrite' | 'allowCreate', checked: boolean) =>
    setConfig({ ...config, settings: { ...config.settings, [key]: checked } });

  const permissions = [
    {
      key: 'allowRead' as const,
      icon: <CheckSquare />,
      title: 'Permitir Leitura',
      description: 'Agente pode consultar dados da planilha',
    },
    {
      key: 'allowWrite' as const,
      icon: <Edit3 />,
      title: 'Permitir Escrita',
      description: 'Agente pode atualizar células da planilha',
    },
    {
      key: 'allowCreate' as const,
      icon: <FilePlus />,
      title: 'Permitir Criação',
      description: 'Agente pode criar novas linhas na planilha',
    },
  ];

  return (
    <>
      <AgentIntegrationDialog
        open={open}
        onOpenChange={onOpenChange}
        icon={<BrandIcon id="google-sheets" size={20} />}
        title={t('edit.integrations.googleSheets.configTitle') || 'Configurar Google Sheets'}
        description={
          t('edit.integrations.googleSheets.connectDescription') ||
          'Permita que o agente acesse, crie e gerencie planilhas do Google Sheets'
        }
        footerStart={
          onDisconnect && config.connected ? (
            <Button variant="destructive-outline" onClick={() => setConfirmDisconnect(true)}>
              {t('edit.integrations.googleSheets.disconnect') || 'Desconectar'}
            </Button>
          ) : undefined
        }
        footer={
          config.connected ? (
            <Button onClick={handleSave}>
              {t('edit.integrations.googleSheets.saveConfig') || 'APLICAR CONFIGURAÇÕES'}
            </Button>
          ) : (
            <Button
              onClick={handleConnectGoogle}
              loading={isConnecting}
              className="w-full sm:w-auto"
            >
              {!isConnecting && <Sheet />}
              {isConnecting
                ? t('edit.integrations.googleSheets.connecting') || 'Conectando...'
                : t('edit.integrations.googleSheets.connectButton') || 'Conectar com Google'}
            </Button>
          )
        }
      >
        {!config.connected ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-muted/40 px-6 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full border bg-card shadow-xs/5">
                <BrandIcon id="google-sheets" size={28} />
              </div>
              <h3 className="font-semibold text-base">
                {t('edit.integrations.googleSheets.connectTitle') || 'Conectar com Google Sheets'}
              </h3>
            </div>
            <Field>
              <FieldLabel>
                {t('edit.integrations.googleSheets.email') || 'E-mail do Google'}
              </FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@gmail.com"
                value={config.email}
                onChange={e => setConfig({ ...config, email: e.target.value })}
              />
            </Field>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <Field>
              <FieldLabel>
                {t('edit.integrations.googleSheets.selectSpreadsheet') || 'Planilha'}
              </FieldLabel>
              <Select
                items={spreadsheetItems}
                value={config.settings?.selectedSpreadsheetId || null}
                onValueChange={value =>
                  setConfig({
                    ...config,
                    settings: {
                      ...config.settings,
                      selectedSpreadsheetId: (value as string) || '',
                    },
                  })
                }
                disabled={isLoadingSpreadsheets}
              >
                <SelectTrigger>
                  {isLoadingSpreadsheets ? (
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Spinner className="size-4" />
                      Carregando planilhas...
                    </span>
                  ) : (
                    <SelectValue placeholder="Selecione uma planilha" />
                  )}
                </SelectTrigger>
                <SelectPopup>
                  {spreadsheetItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <FieldDescription>Escolha qual planilha o agente terá acesso</FieldDescription>
            </Field>

            <section className="flex flex-col gap-2">
              <h4 className="flex items-center gap-2 font-medium text-sm">
                <Settings className="size-4 text-muted-foreground" />
                Permissões
              </h4>
              {permissions.map(permission => (
                <SettingRow
                  key={permission.key}
                  icon={permission.icon}
                  title={permission.title}
                  description={permission.description}
                  control={
                    <Switch
                      checked={Boolean(config.settings?.[permission.key])}
                      onCheckedChange={checked => setSetting(permission.key, checked)}
                    />
                  }
                />
              ))}
            </section>
          </div>
        )}
      </AgentIntegrationDialog>

      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title={tShared('edit.integrations.disconnectConfirm.title', { name: 'Google Sheets' })}
        description={tShared('edit.integrations.disconnectConfirm.description', {
          name: 'Google Sheets',
        })}
        cancelLabel={tShared('edit.integrations.disconnectConfirm.cancel')}
        confirmLabel={t('edit.integrations.googleSheets.disconnect') || 'Desconectar'}
        onConfirm={async () => {
          await handleDisconnect();
          setConfirmDisconnect(false);
        }}
      />
    </>
  );
};

export default GoogleSheetsConfigDialog;
