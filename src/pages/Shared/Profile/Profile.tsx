import { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, BellRing, Check, Keyboard, Mail, Play, Volume2, X } from 'lucide-react';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import RadioCardGroup from '@/components/base/RadioCard';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useLanguage } from '@/hooks/useLanguage';
import {
  profileService,
  type ProfileUpdateData,
  type PasswordChangeData,
} from '@/services/profile/profileService';
import { extractError } from '@/utils/apiHelpers';
import notificationSettingsService from '@/services/notifications/NotificationSettingsService';
import { getAudioSettings, playNotificationSoundPreview } from '@/utils/audioNotificationUtils';
import { getModifierKey } from '@/utils/platform';
import { normalizeAvatarUrl } from '@/utils/avatarUrl';
import { ProfilePhotoUploader, TwoFactorSetup } from '@/components/shared/profile';

const SECTION_TO_TAB: Record<string, string> = {
  'personal-data': 'dados',
  'interface': 'interface',
  'notifications': 'notificacoes',
  'security': 'seguranca',
};

const TAB_TO_SECTION: Record<string, string> = {
  'dados': 'personal-data',
  'interface': 'interface',
  'notificacoes': 'notifications',
  'seguranca': 'security',
};

const Profile = () => {
  const { user, refreshUser, logout } = useAuth();
  const { t } = useLanguage('profile');
  const normalizedUserAvatar = normalizeAvatarUrl(user?.avatar_url);
  const modifierKey = getModifierKey(); // 'Cmd' on Mac, 'Ctrl' on others
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const initialTab = (section && SECTION_TO_TAB[section]) || 'dados';
  const [activeTab, setActiveTab] = useState(initialTab);

  // H1: sync tab when browser back/forward changes the section param without remount
  useEffect(() => {
    const tab = (section && SECTION_TO_TAB[section]) || 'dados';
    setActiveTab(tab);
  }, [section]);

  // M1: canonicalize the URL — /profile → /profile/personal-data; invalid sections → same
  useEffect(() => {
    if (!section || !SECTION_TO_TAB[section]) {
      navigate('/profile/personal-data', { replace: true });
    }
  }, []);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    navigate(`/profile/${TAB_TO_SECTION[tab]}`, { replace: true });
  }, [navigate]);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Dados pessoais - inicializados com dados reais do usuário
  const [userData, setUserData] = useState({
    name: '',
    display_name: '',
    email: '',
    unconfirmed_email: null as string | null,
    message_signature: '',
    avatar: null as File | null,
    avatar_url: '',
    // api_access_token: '',
  });

  // Senha
  const [passwords, setPasswords] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  // Configurações de interface
  const [uiSettings, setUiSettings] = useState({
    font_size: 'medium' as 'small' | 'medium' | 'large',
    editor_message_key: 'enter' as 'enter' | 'cmd_enter',
  });

  // Configurações de notificação - agora dinâmico baseado no backend
  const [notificationSettings, setNotificationSettings] = useState<{
    email_notifications: Record<string, boolean>;
    push_notifications: Record<string, boolean>;
    browser_push_enabled: boolean;
    available_types: string[]; // Tipos disponíveis do backend
  }>({
    email_notifications: {},
    push_notifications: {},
    browser_push_enabled: false,
    available_types: [],
  });

  // Configurações de áudio
  const [audioSettings, setAudioSettings] = useState(() => {
    // Load from localStorage on mount
    try {
      return getAudioSettings();
    } catch {
      return {
        enable_audio_alerts: false,
        notification_tone: 'ding' as const,
        always_play_audio_alert: false,
        alert_if_unread_assigned_conversation_exist: false,
      };
    }
  });

  // Helper function to extract notification type from flag (remove prefix)
  const extractNotificationType = (flag: string): string => {
    return flag.replace(/^(email_|push_)/, '');
  };

  // Helper function to convert backend flags to frontend format
  const flagsToSettings = useCallback(
    (selectedFlags: string[], availableFlags: string[]): Record<string, boolean> => {
      const settings: Record<string, boolean> = {};

      // Inicializar todos os tipos disponíveis como false
      availableFlags.forEach(flag => {
        const type = extractNotificationType(flag);
        settings[type] = false;
      });

      // Marcar os selecionados como true
      selectedFlags.forEach(flag => {
        const type = extractNotificationType(flag);
        if (type in settings) {
          settings[type] = true;
        }
      });

      return settings;
    },
    [],
  );

  // Helper function to convert frontend format to backend flags
  const settingsToFlags = (
    settings: Record<string, boolean>,
    prefix: 'email' | 'push',
  ): string[] => {
    return Object.entries(settings)
      .filter(([, enabled]) => enabled)
      .map(([key]) => `${prefix}_${key}`);
  };

  // Buscar dados completos do perfil quando o componente carrega
  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          // Fazer chamada para /profile para buscar dados completos
          const response = await profileService.getProfile();
          const profileUser = response.user;

          setUserData(prev => ({
            ...prev,
            name: profileUser.name || '',
            display_name: profileUser.display_name || '',
            email: profileUser.email || '',
            unconfirmed_email: profileUser.unconfirmed_email || null,
            message_signature: profileUser.message_signature || '',
            avatar_url: normalizeAvatarUrl(profileUser.avatar_url),
            // api_access_token: profileUser.api_access_token || '',
          }));

          // Carregar configurações de UI
          if (profileUser.ui_settings) {
            setUiSettings(prev => ({
              ...prev,
              font_size: profileUser.ui_settings?.font_size || 'medium',
              editor_message_key: profileUser.ui_settings?.editor_message_key || 'enter',
            }));
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Fallback para dados do contexto se a API falhar
          setUserData(prev => ({
            ...prev,
            name: user.name || '',
            display_name: user.display_name || '',
            email: user.email || '',
            message_signature: user.message_signature || '',
            avatar_url: normalizedUserAvatar,
            // api_access_token: user.api_access_token || '',
          }));
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Carregar preferências de notificação quando o componente carrega
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const settings = await notificationSettingsService.getSettings();

        // Extrair tipos únicos disponíveis (de all_email_flags ou all_push_flags)
        const availableEmailFlags = settings.all_email_flags || [];
        const availablePushFlags = settings.all_push_flags || [];
        const allAvailableFlags = [...new Set([...availableEmailFlags, ...availablePushFlags])];
        const availableTypes = allAvailableFlags.map(flag => extractNotificationType(flag));

        console.log('📧 [Profile] Notification settings loaded:', {
          all_email_flags: settings.all_email_flags,
          all_push_flags: settings.all_push_flags,
          selected_email_flags: settings.selected_email_flags,
          selected_push_flags: settings.selected_push_flags,
          availableTypes,
        });

        // Converter flags do backend para formato do frontend usando os tipos disponíveis
        setNotificationSettings(prev => ({
          ...prev,
          email_notifications: flagsToSettings(
            settings.selected_email_flags || [],
            availableEmailFlags,
          ),
          push_notifications: flagsToSettings(
            settings.selected_push_flags || [],
            availablePushFlags,
          ),
          available_types: availableTypes,
        }));
      } catch (error) {
        console.error('Error fetching notification settings:', error);
        // Manter valores padrão se houver erro
      }
    };

    fetchNotificationSettings();

    // Check browser notification permission status on mount
    if ('Notification' in window) {
      const permission = Notification.permission;
      setNotificationSettings(prev => ({
        ...prev,
        browser_push_enabled: permission === 'granted',
      }));
    }
  }, [flagsToSettings]);

  // Limpar email de confirmação quando dialog fechar
  useEffect(() => {
    if (!deleteDialogOpen) {
      setDeleteConfirmEmail('');
    }
  }, [deleteDialogOpen]);

  // Manipuladores de eventos
  const handleUserDataChange = (field: string, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    handleUserDataChange(field, e.target.value);
  };

  const handlePasswordInputChange = (field: string) => (e: ChangeEvent<HTMLInputElement>) => {
    handlePasswordChange(field, e.target.value);
  };

  const handlePhotoChange = (file: File, url: string) => {
    setUserData(prev => ({
      ...prev,
      avatar: file,
      avatar_url: normalizeAvatarUrl(url),
    }));
  };


  const handleResendConfirmation = async () => {
    setIsResending(true);
    try {
      await profileService.resendEmailConfirmation();
      toast.success(t('personalData.emailConfirmation.resendSuccess'));
    } catch {
      toast.error(t('personalData.emailConfirmation.resendError'));
    } finally {
      setIsResending(false);
    }
  };

  const handleCancelEmailChange = async () => {
    setIsCancelling(true);
    try {
      const updatedProfile = await profileService.cancelEmailChange();
      toast.success(t('personalData.emailConfirmation.cancelSuccess'));
      setUserData(prev => ({
        ...prev,
        email: updatedProfile.email || prev.email,
        unconfirmed_email: updatedProfile.unconfirmed_email || null,
      }));
      if (user) {
        useAuthStore.getState().setUser({ ...user, ...updatedProfile });
      }
    } catch {
      toast.error(t('personalData.emailConfirmation.cancelError'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmEmail !== user.email) {
      return;
    }

    setIsDeleting(true);
    try {
      // TODO: Implementar chamada real para API de exclusão de conta
      // await deleteAccount({ email: user.email });

      // Simulação de exclusão
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fazer logout e redirecionar
      await logout();

      // Mostrar mensagem de sucesso antes do redirect (opcional)
      toast.success(t('notifications.accountDeleted'));
    } catch {
      toast.error(t('notifications.accountDeleteError'));
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const updateData: ProfileUpdateData = {
        name: userData.name,
        display_name: userData.display_name,
        email: userData.email,
        message_signature: userData.message_signature,
      };

      // Add avatar if changed
      if (userData.avatar) {
        updateData.avatar = userData.avatar;
      }

      await profileService.updateProfile(updateData);

      // Buscar dados atualizados do perfil para garantir que temos os dados mais recentes
      const profileResponse = await profileService.getProfile();
      const updatedUser = profileResponse.user;

      // Atualizar dados do usuário no store DIRETAMENTE para refletir mudanças imediatamente
      if (user) {
        const mergedUser = {
          ...user,
          ...updatedUser,
          avatar_url: normalizeAvatarUrl(updatedUser.avatar_url) || user.avatar_url,
        };

        useAuthStore.getState().setUser(mergedUser);
      }

      // Atualizar estado local com os dados mais recentes
      setUserData(prev => ({
        ...prev,
        name: updatedUser.name || '',
        display_name: updatedUser.display_name || '',
        email: updatedUser.email || '',
        unconfirmed_email: updatedUser.unconfirmed_email || null,
        message_signature: updatedUser.message_signature || '',
        avatar: null, // Clear file after upload
        avatar_url: normalizeAvatarUrl(updatedUser.avatar_url) || prev.avatar_url,
      }));

      if (updatedUser.unconfirmed_email) {
        toast.success(t('personalData.emailConfirmation.emailUpdatedPending', { email: updatedUser.unconfirmed_email }));
      } else {
        toast.success(t('notifications.profileUpdated'));
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(t('notifications.profileUpdateError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current_password || !passwords.password || !passwords.password_confirmation) {
      toast.error(t('password.validation.allFields'));
      return;
    }

    if (passwords.password !== passwords.password_confirmation) {
      toast.error(t('password.validation.mismatch'));
      return;
    }

    if (passwords.password.length < 8) {
      toast.error(t('password.validation.minLength'));
      return;
    }

    setIsLoading(true);
    try {
      const passwordData: PasswordChangeData = {
        current_password: passwords.current_password,
        password: passwords.password,
        password_confirmation: passwords.password_confirmation,
      };

      await profileService.changePassword(passwordData);
      toast.success(t('notifications.passwordChanged'));

      setPasswords({
        current_password: '',
        password: '',
        password_confirmation: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      const errorInfo = extractError(error);
      if (errorInfo.code === 'VALIDATION_ERROR' && Array.isArray(errorInfo.details)) {
        const passwordDetail = errorInfo.details.find((d: { field: string; codes?: string[] }) => d.field === 'password');
        if (passwordDetail?.codes?.length) {
          passwordDetail.codes.forEach((code: string) => {
            const key = `password.errors.${code.replace('password.', '')}`;
            toast.error(t(key));
          });
        } else {
          toast.error(t('notifications.passwordChangeError'));
        }
      } else {
        toast.error(t('notifications.passwordChangeError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const requiredMark = (
    <span className="text-destructive-foreground" aria-hidden="true">
      *
    </span>
  );

  const renderDadosPessoais = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('personalData.title')}</CardTitle>
        <CardDescription>{t('personalData.description')}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-6">
        <div className="rounded-xl border bg-muted/24 p-4">
          <ProfilePhotoUploader
            initialPhoto={userData.avatar_url}
            userName={userData.name || user?.email || t('personalData.defaultUser')}
            onPhotoChange={handlePhotoChange}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="name">
              {t('personalData.fields.fullName')} {requiredMark}
            </FieldLabel>
            <Input
              id="name"
              type="text"
              value={userData.name}
              onChange={handleInputChange('name')}
              placeholder={t('personalData.fields.fullNamePlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="display_name">{t('personalData.fields.displayName')}</FieldLabel>
            <Input
              id="display_name"
              type="text"
              value={userData.display_name}
              onChange={handleInputChange('display_name')}
              placeholder={t('personalData.fields.displayNamePlaceholder')}
            />
          </Field>

          <Field className="md:col-span-2">
            <FieldLabel htmlFor="email">
              {t('personalData.fields.email')} {requiredMark}
            </FieldLabel>
            <Input
              id="email"
              type="email"
              value={userData.email}
              onChange={handleInputChange('email')}
              placeholder={t('personalData.fields.emailPlaceholder')}
              disabled={!!userData.unconfirmed_email}
            />
          </Field>
        </div>

        {userData.unconfirmed_email && (
          <Alert variant="info">
            <Mail />
            <AlertDescription className="text-foreground">
              {t('personalData.emailConfirmation.pendingChange', { email: userData.unconfirmed_email })}
            </AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={handleResendConfirmation} loading={isResending}>
                {t('personalData.emailConfirmation.resend')}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancelEmailChange} loading={isCancelling}>
                {t('personalData.emailConfirmation.cancel')}
              </Button>
            </AlertAction>
          </Alert>
        )}
      </CardPanel>
      <CardFooter className="justify-end border-t">
        <Button onClick={handleSaveProfile} loading={isLoading}>
          {isLoading ? t('personalData.actions.saving') : t('personalData.actions.saveChanges')}
        </Button>
      </CardFooter>
    </Card>
  );

  const renderSenha = () => {
    const newPassword = passwords.password;
    const complexityRules = [
      { key: 'minLength', met: newPassword.length >= 8 },
      { key: 'uppercase', met: /[A-Z]/.test(newPassword) },
      { key: 'lowercase', met: /[a-z]/.test(newPassword) },
      { key: 'number', met: /\d/.test(newPassword) },
      { key: 'specialChar', met: /[^A-Za-z0-9]/.test(newPassword) },
    ];
    const mismatch =
      passwords.password_confirmation.length > 0 && passwords.password !== passwords.password_confirmation;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('password.title')}</CardTitle>
          <CardDescription>{t('password.description')}</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <Field>
                <FieldLabel htmlFor="senha-atual">
                  {t('password.fields.currentPassword')} {requiredMark}
                </FieldLabel>
                <Input
                  id="senha-atual"
                  type="password"
                  autoComplete="current-password"
                  value={passwords.current_password}
                  onChange={handlePasswordInputChange('current_password')}
                  placeholder={t('password.fields.currentPlaceholder')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="nova-senha">
                  {t('password.fields.newPassword')} {requiredMark}
                </FieldLabel>
                <Input
                  id="nova-senha"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.password}
                  onChange={handlePasswordInputChange('password')}
                  placeholder={t('password.fields.newPlaceholder')}
                />
              </Field>
              <Field invalid={mismatch}>
                <FieldLabel htmlFor="confirmar-senha">
                  {t('password.fields.confirmPassword')} {requiredMark}
                </FieldLabel>
                <Input
                  id="confirmar-senha"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={mismatch || undefined}
                  value={passwords.password_confirmation}
                  onChange={handlePasswordInputChange('password_confirmation')}
                  placeholder={t('password.fields.confirmPlaceholder')}
                />
                {mismatch && <FieldError match>{t('password.validation.mismatch')}</FieldError>}
              </Field>
            </div>
            <ul className="flex h-fit flex-col gap-2 rounded-xl border bg-muted/24 p-4">
              {complexityRules.map(({ key, met }) => (
                <li
                  key={key}
                  className={`flex items-center gap-2 text-sm ${met ? 'text-success-foreground' : 'text-muted-foreground'}`}
                >
                  <span
                    className={`flex size-4 items-center justify-center rounded-full ${met ? 'bg-success/16' : 'bg-muted'}`}
                  >
                    {met ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  {t(`password.rules.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </CardPanel>
        <CardFooter className="justify-end border-t">
          <Button onClick={handleChangePassword} loading={isLoading}>
            {isLoading ? t('password.actions.changing') : t('password.actions.changePassword')}
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // const handleCopyToken = async () => {
  //   // Primeiro tenta buscar do perfil carregado, depois do contexto
  //   const token = userData.api_access_token || user?.api_access_token;
  //   if (token) {
  //     try {
  //       await navigator.clipboard.writeText(token);
  //       toast.success(t('accessToken.notifications.copied'));
  //     } catch {
  //       toast.error(t('accessToken.notifications.copyError'));
  //     }
  //   }
  // };

  const handleUISettingsChange = async (settings: Partial<typeof uiSettings>) => {
    try {
      setUiSettings(prev => ({ ...prev, ...settings }));
      await profileService.updateUISettings(settings);

      // Atualizar contexto do usuário para que as mudanças sejam aplicadas globalmente
      await refreshUser();

      toast.success(t('notifications.settingsUpdated'));
    } catch {
      toast.error(t('notifications.settingsUpdateError'));
    }
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    handleUISettingsChange({ font_size: fontSize });
  };

  const handleHotKeyChange = (key: 'enter' | 'cmd_enter') => {
    handleUISettingsChange({ editor_message_key: key });
  };

  const handleNotificationChange = async (
    type: 'email' | 'push',
    setting: string,
    value: boolean,
  ) => {
    // Verificar se o tipo está disponível
    if (!notificationSettings.available_types.includes(setting)) {
      console.warn(`Notification type "${setting}" is not available`);
      return;
    }

    // Auto-request browser permission on first push enable.
    // If the user denies the prompt, abort: saving push=true while permission is
    // 'denied' would silently store an unreachable subscription on the backend.
    if (type === 'push' && value && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await requestNotificationPermission();
      }
      if (Notification.permission !== 'granted') {
        toast.error(t('notifications.browserPermission.denied'));
        return;
      }
    }

    // Atualizar estado local primeiro (otimistic update)
    const notificationType = `${type}_notifications` as keyof typeof notificationSettings;
    const currentNotifications = notificationSettings[notificationType] as Record<string, boolean> | undefined;
    const previousValue = currentNotifications?.[setting];

    setNotificationSettings(prev => {
      const notificationType = `${type}_notifications` as keyof typeof prev;
      const currentNotifications = prev[notificationType] as Record<string, boolean>;

      return {
        ...prev,
        [notificationType]: {
          ...currentNotifications,
          [setting]: value,
        },
      };
    });

    try {
      const updatedSettings = {
        ...notificationSettings,
        [`${type}_notifications`]: {
          ...(notificationSettings[
            `${type}_notifications` as keyof typeof notificationSettings
          ] as Record<string, boolean>),
          [setting]: value,
        },
      };

      const emailFlags = settingsToFlags(updatedSettings.email_notifications, 'email');
      const pushFlags = settingsToFlags(updatedSettings.push_notifications, 'push');

      await notificationSettingsService.updateSettings({
        selected_email_flags: emailFlags,
        selected_push_flags: pushFlags,
      });

      toast.success(t('notifications.updated'));
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error(t('notifications.settingsUpdateError'));

      // Reverter mudança em caso de erro
      setNotificationSettings(prev => {
        const notificationType = `${type}_notifications` as keyof typeof prev;
        const currentNotifications = prev[notificationType] as Record<string, boolean>;

        return {
          ...prev,
          [notificationType]: {
            ...currentNotifications,
            [setting]: previousValue ?? false, // Reverter para valor anterior
          },
        };
      });
    }
  };

  const handleAudioSettingsChange = async (settings: Partial<typeof audioSettings>) => {
    const updatedSettings = { ...audioSettings, ...settings };
    setAudioSettings(updatedSettings);

    // Save to localStorage (audio settings are client-side only)
    try {
      const { saveAudioSettings } = await import('@/utils/audioNotificationUtils');
      saveAudioSettings(updatedSettings);
      toast.success(t('audio.updated'));
    } catch (error) {
      console.error('Error saving audio settings:', error);
      toast.error(t('audio.saveError'));
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error(t('notifications.browserPermission.notSupported'));
      return;
    }

    // Check current permission status
    let permission = Notification.permission;

    // If permission is default, request it
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    // Update state based on permission
    const isGranted = permission === 'granted';
    setNotificationSettings(prev => ({
      ...prev,
      browser_push_enabled: isGranted,
    }));

    if (isGranted) {
      toast.success(t('notifications.browserPermission.granted'));
    } else if (permission === 'denied') {
      toast.error(t('notifications.browserPermission.denied'));
    }
  };

  // Check browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      const permission = Notification.permission;
      setNotificationSettings(prev => ({
        ...prev,
        browser_push_enabled: permission === 'granted',
      }));
    }
  }, []);

  const hotkeyKeys = (keys: string[]) => (
    <KbdGroup className="pt-1">
      <Keyboard className="size-4 text-muted-foreground" />
      {keys.map((k, i) => (
        <Kbd key={i}>{k}</Kbd>
      ))}
    </KbdGroup>
  );

  const renderInterfaceSettings = () => {
    const fontItems = [
      { value: 'small', label: t('interface.fontSize.options.small') },
      { value: 'medium', label: t('interface.fontSize.options.default') },
      { value: 'large', label: t('interface.fontSize.options.large') },
    ];
    return (
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('interface.title')}</CardTitle>
            <CardDescription>{t('interface.description')}</CardDescription>
          </CardHeader>
          <CardPanel>
            <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">{t('interface.fontSize.title')}</span>
                <span className="text-muted-foreground text-sm">{t('interface.fontSize.description')}</span>
              </div>
              <Select
                items={fontItems}
                value={uiSettings.font_size}
                onValueChange={v => v && handleFontSizeChange(v as 'small' | 'medium' | 'large')}
              >
                <SelectTrigger className="sm:w-40" aria-label={t('interface.fontSize.title')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {fontItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('interface.hotkeys.title')}</CardTitle>
            <CardDescription>{t('interface.hotkeys.description')}</CardDescription>
          </CardHeader>
          <CardPanel>
            <RadioCardGroup
              aria-label={t('interface.hotkeys.title')}
              value={uiSettings.editor_message_key}
              onValueChange={handleHotKeyChange}
              options={[
                {
                  value: 'enter',
                  title: t('interface.hotkeys.enter.title'),
                  description: t('interface.hotkeys.enter.description'),
                  extra: hotkeyKeys(['Enter']),
                },
                {
                  value: 'cmd_enter',
                  title: `${modifierKey} + Enter (${modifierKey === 'Cmd' ? '⌘' : 'Ctrl'} + ↵)`,
                  description: t('interface.hotkeys.cmdEnter.description'),
                  extra: hotkeyKeys([modifierKey, 'Enter']),
                },
              ]}
            />
          </CardPanel>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('interface.messageSignature.title')}</CardTitle>
            <CardDescription>{t('interface.messageSignature.description')}</CardDescription>
          </CardHeader>
          <CardPanel>
            <Field>
              <FieldLabel htmlFor="message-signature">{t('interface.messageSignature.label')}</FieldLabel>
              <Textarea
                id="message-signature"
                value={userData.message_signature || ''}
                onChange={e => setUserData(prev => ({ ...prev, message_signature: e.target.value }))}
                placeholder={t('interface.messageSignature.placeholder')}
                rows={4}
              />
            </Field>
          </CardPanel>
          <CardFooter className="justify-end border-t">
            <Button onClick={handleSaveProfile} loading={isLoading}>
              {isLoading ? t('personalData.actions.saving') : t('personalData.actions.saveChanges')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderNotificationSettings = () => {
    const types = [...new Set(notificationSettings.available_types)].filter(
      key => key in notificationSettings.email_notifications || key in notificationSettings.push_notifications,
    );
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('notifications.title')}</CardTitle>
          <CardDescription>{t('notifications.description')}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-5">
          <div
            className={`flex items-center justify-between gap-4 rounded-xl border p-4 ${
              notificationSettings.browser_push_enabled ? '' : 'border-warning/32 bg-warning/4'
            }`}
          >
            <div className="flex items-start gap-3">
              {notificationSettings.browser_push_enabled ? (
                <BellRing className="mt-0.5 size-4.5 shrink-0 text-success" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-warning" />
              )}
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="browser-push">{t('notifications.browserPermission.title')}</Label>
                <p className="text-muted-foreground text-sm">{t('notifications.browserPermission.description')}</p>
              </div>
            </div>
            <Switch
              id="browser-push"
              checked={notificationSettings.browser_push_enabled}
              onCheckedChange={requestNotificationPermission}
            />
          </div>

          {notificationSettings.available_types.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-sm">
                {t('notifications.loading') || 'Loading notification preferences...'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground text-xs">
                    <th className="px-4 py-2.5 text-start font-medium" />
                    <th className="w-28 px-2 py-2.5 text-center font-medium">{t('notifications.email.title')}</th>
                    <th className="w-28 px-2 py-2.5 text-center font-medium">{t('notifications.push.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(key => (
                    <tr key={key} className="border-b last:border-0 hover:bg-accent/32">
                      <td className="px-4 py-2.5">{getNotificationLabel(key)}</td>
                      {(['email', 'push'] as const).map(kind => {
                        const map = notificationSettings[`${kind}_notifications`];
                        return (
                          <td key={kind} className="px-2 py-2.5">
                            <div className="flex justify-center">
                              {key in map ? (
                                <Checkbox
                                  id={`${kind}-${key}`}
                                  aria-label={`${getNotificationLabel(key)}: ${t(`notifications.${kind}.title`)}`}
                                  checked={map[key]}
                                  onCheckedChange={checked => handleNotificationChange(kind, key, checked === true)}
                                />
                              ) : (
                                <span className="text-muted-foreground/40">–</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardPanel>
      </Card>
    );
  };

  const renderAudioSettings = () => {
    const toneItems = (['ding', 'chime', 'bell', 'notification', 'magic'] as const).map(value => ({
      value,
      label: t(`audio.tone.options.${value}`) || value,
    }));
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Volume2 className="size-4.5 text-muted-foreground" />
            {t('audio.title')}
          </CardTitle>
          <CardDescription>{t('audio.description')}</CardDescription>
        </CardHeader>
        <CardPanel>
          <div className="flex flex-col divide-y rounded-xl border">
            <div className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="enable-audio">{t('audio.enable.title')}</Label>
                <p className="text-muted-foreground text-sm">{t('audio.enable.description')}</p>
              </div>
              <Switch
                id="enable-audio"
                checked={audioSettings.enable_audio_alerts}
                onCheckedChange={checked => handleAudioSettingsChange({ enable_audio_alerts: checked })}
              />
            </div>

            {audioSettings.enable_audio_alerts && (
              <>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-medium text-sm">{t('audio.tone.title')}</span>
                  <div className="flex items-center gap-2">
                    <Select
                      items={toneItems}
                      value={audioSettings.notification_tone}
                      onValueChange={value =>
                        value &&
                        handleAudioSettingsChange({
                          notification_tone: value as 'ding' | 'chime' | 'bell' | 'notification' | 'magic',
                        })
                      }
                    >
                      <SelectTrigger className="w-44" aria-label={t('audio.tone.title')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {toneItems.map(item => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label={t('audio.tone.preview') || 'Preview sound'}
                            onClick={() => playNotificationSoundPreview(audioSettings.notification_tone)}
                          />
                        }
                      >
                        <Play />
                      </TooltipTrigger>
                      <TooltipPopup>{t('audio.tone.preview') || 'Preview sound'}</TooltipPopup>
                    </Tooltip>
                  </div>
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <span className="font-medium text-sm">{t('audio.conditions.title')}</span>
                  <Label htmlFor="play-when-inactive" className="font-normal">
                    <Checkbox
                      id="play-when-inactive"
                      checked={!audioSettings.always_play_audio_alert}
                      onCheckedChange={checked =>
                        handleAudioSettingsChange({ always_play_audio_alert: checked !== true })
                      }
                    />
                    {t('audio.conditions.playWhenInactive')}
                  </Label>
                  <Label htmlFor="alert-unread" className="font-normal">
                    <Checkbox
                      id="alert-unread"
                      checked={audioSettings.alert_if_unread_assigned_conversation_exist}
                      onCheckedChange={checked =>
                        handleAudioSettingsChange({
                          alert_if_unread_assigned_conversation_exist: checked === true,
                        })
                      }
                    />
                    {t('audio.conditions.alertUnread')}
                  </Label>
                </div>
              </>
            )}
          </div>
        </CardPanel>
      </Card>
    );
  };

  const getNotificationLabel = (key: string) => {
    const labels: Record<string, string> = {
      conversation_creation: t('notifications.email.types.conversation_creation'),
      conversation_assignment: t('notifications.email.types.conversation_assignment'),
      assigned_conversation_new_message: t(
        'notifications.email.types.assigned_conversation_new_message',
      ),
      conversation_mention: t('notifications.email.types.conversation_mention'),
      participating_conversation_new_message: t(
        'notifications.email.types.participating_conversation_new_message',
      ),
      sla_missed_first_response: t('notifications.email.types.sla_missed_first_response'),
      sla_missed_next_response: t('notifications.email.types.sla_missed_next_response'),
      sla_missed_resolution: t('notifications.email.types.sla_missed_resolution'),
    };
    return labels[key] ?? key;
  };

  const renderZonaPerigo = () => (
    <Card className="border-destructive/32">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-destructive-foreground">
          <AlertTriangle className="size-4.5" />
          {t('dangerZone.title')}
        </CardTitle>
        <CardDescription>{t('dangerZone.description')}</CardDescription>
      </CardHeader>
      <CardPanel>
        <div className="flex flex-col gap-4 rounded-xl border border-destructive/24 bg-destructive/4 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm">{t('dangerZone.deleteAccount.title')}</span>
            <p className="text-muted-foreground text-sm">{t('dangerZone.deleteAccount.description')}</p>
          </div>
          <Button variant="destructive" className="shrink-0" onClick={() => setDeleteDialogOpen(true)}>
            {t('dangerZone.deleteAccount.button')}
          </Button>
        </div>
      </CardPanel>
    </Card>
  );

  // Loading state se não há usuário
  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6" aria-busy="true">
        <div className="flex items-center gap-4 rounded-2xl border p-6">
          <div className="size-16 animate-pulse rounded-full bg-muted" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <p className="sr-only">{t('loading')}</p>
      </div>
    );
  }

  const isDeleteConfirmValid = deleteConfirmEmail === user.email;
  const displayName = userData.display_name || userData.name || user.name || user.email;
  const initials = (userData.name || user.name || user.email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');
  const roleName = (user as { role?: { name?: string } }).role?.name;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="font-semibold text-xl md:text-2xl">{t('title')}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{t('subtitle')}</p>
        </div>

        {/* Avatar header */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/16 via-primary/8 to-transparent" aria-hidden="true" />
          <div className="relative -mt-10 flex flex-col gap-4 px-6 pb-5 sm:flex-row sm:items-end">
            <Avatar className="size-20 border-4 border-card text-xl shadow-sm">
              {normalizeAvatarUrl(userData.avatar_url) && (
                <AvatarImage src={normalizeAvatarUrl(userData.avatar_url)} alt={displayName} />
              )}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1 sm:pt-12">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-semibold text-lg">{displayName}</span>
                {roleName && <Badge variant="secondary">{roleName}</Badge>}
              </div>
              <span className="flex items-center gap-1.5 truncate text-muted-foreground text-sm">
                <Mail className="size-3.5 shrink-0" />
                {userData.email || user.email}
              </span>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={value => handleTabChange(value as string)} className="gap-6">
          <TabsList variant="underline" className="w-full justify-start overflow-x-auto border-b">
            <TabsTab value="dados">{t('tabs.personalData')}</TabsTab>
            <TabsTab value="interface">{t('tabs.interface')}</TabsTab>
            <TabsTab value="notificacoes">{t('tabs.notifications')}</TabsTab>
            <TabsTab value="seguranca">{t('tabs.security')}</TabsTab>
          </TabsList>

          <TabsPanel value="dados" className="flex flex-col gap-6">
            {renderDadosPessoais()}
          </TabsPanel>

          <TabsPanel value="interface" className="flex flex-col gap-6">
            {renderInterfaceSettings()}
          </TabsPanel>

          <TabsPanel value="notificacoes" className="flex flex-col gap-6">
            {renderNotificationSettings()}
            {renderAudioSettings()}
          </TabsPanel>

          <TabsPanel value="seguranca" className="flex flex-col gap-6">
            {renderSenha()}
            <TwoFactorSetup onUpdate={refreshUser} />
            {renderZonaPerigo()}
          </TabsPanel>
        </Tabs>
      </div>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive-foreground">
              <AlertTriangle className="size-5" />
              {t('dangerZone.deleteAccount.confirmTitle')}
            </DialogTitle>
            <DialogDescription render={<div />} className="flex flex-col gap-2">
              <p className="font-medium text-foreground">{t('dangerZone.deleteAccount.confirmDescription')}</p>
              <p>{t('dangerZone.deleteAccount.permanentWarning')}</p>
              <p>
                {t('dangerZone.deleteAccount.emailConfirmText')} <strong className="text-foreground">{user.email}</strong>
              </p>
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <Field invalid={Boolean(deleteConfirmEmail) && !isDeleteConfirmValid}>
              <FieldLabel htmlFor="confirm-email">{t('dangerZone.deleteAccount.emailLabel')}</FieldLabel>
              <Input
                id="confirm-email"
                type="email"
                value={deleteConfirmEmail}
                onChange={e => setDeleteConfirmEmail(e.target.value)}
                placeholder={t('dangerZone.deleteAccount.emailPlaceholder')}
                aria-invalid={(Boolean(deleteConfirmEmail) && !isDeleteConfirmValid) || undefined}
              />
              {deleteConfirmEmail && !isDeleteConfirmValid && (
                <FieldError match>{t('dangerZone.deleteAccount.emailMismatch')}</FieldError>
              )}
            </Field>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button variant="ghost" />} disabled={isDeleting}>
              {t('dangerZone.deleteAccount.cancel')}
            </DialogClose>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={!isDeleteConfirmValid} loading={isDeleting}>
              {isDeleting ? t('dangerZone.deleteAccount.deleting') : t('dangerZone.deleteAccount.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </div>
  );
};

export default Profile;
