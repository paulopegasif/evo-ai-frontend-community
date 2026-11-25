import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { login, register, forgotPassword } from '@/services/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthStore } from '@/store/authStore';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useLanguage } from '@/hooks/useLanguage';
import MfaVerification from '@/components/auth/MfaVerification';
import { twoFactorService } from '@/services/profile/twoFactorService';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Globe } from '@/components/icons';

import { ApiError } from '@/types/auth';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import { type Locale } from '@/i18n/config';
import { useGlobalConfig } from '@/contexts/GlobalConfigContext';

import { AppLogo } from '@/components/AppLogo';

export const Auth: React.FC = () => {
  const { login: authLogin, mfaState, verifyMfaCode, clearMfaState, setMfaRequired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { executeRecaptcha } = useRecaptcha({
    autoLoad: false,
  });
  const { t, currentLanguage, changeLanguage } = useLanguage('auth');
  const globalConfig = useGlobalConfig();

  // Verificar se signup está habilitado (padrão: false se não especificado)
  // Signup só é habilitado se explicitamente configurado como true
  const enableAccountSignup = globalConfig.enableAccountSignup === true;

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  // Ref para controlar se o toast de sessão expirada já foi mostrado
  const sessionExpiredToastShown = useRef(false);

  // Se signup estiver desabilitado e activeTab for 'register', mudar para 'login'
  useEffect(() => {
    if (!enableAccountSignup && activeTab === 'register') {
      setActiveTab('login');
    }
  }, [enableAccountSignup, activeTab]);

  // Detectar se a sessão expirou e mostrar notificação
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);

    // Session expired notification
    if (urlParams.get('session_expired') === 'true' && !sessionExpiredToastShown.current) {
      sessionExpiredToastShown.current = true;

      toast.error(t('auth.sessionExpired.title'), {
        description: t('auth.sessionExpired.description'),
      });

      // Limpar o parâmetro da URL sem recarregar a página
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Registration confirmation success
    if (urlParams.get('confirmation_success') === 'true') {
      toast.success(t('auth.register.confirmationSuccess'), {
        description: t('auth.register.confirmationSuccessDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle access denied error
    if (urlParams.get('error') === 'access-denied') {
      toast.error(t('auth.errors.accessDenied'), {
        description: t('auth.errors.accessDeniedDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle confirmation error
    if (urlParams.get('confirmation_error') === 'true') {
      toast.error(t('auth.errors.confirmationError'), {
        description: t('auth.errors.confirmationErrorDescription'),
      });

      // Clear the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search, t]);

  // Schema de validação para login
  const loginSchema = z.object({
    email: z
      .string()
      .min(1, { message: t('auth.errors.email.required') })
      .email({ message: t('auth.errors.email.invalid') }),
    password: z
      .string()
      .min(1, { message: t('auth.errors.password.required') })
      .min(8, { message: t('auth.errors.password.minLength') }),
  });

  // Schema de validação para cadastro
  const registerSchema = z
    .object({
      fullName: z
        .string()
        .min(1, { message: t('auth.errors.fullName.required') })
        .min(2, { message: t('auth.errors.fullName.minLength') }),
      email: z
        .string()
        .min(1, { message: t('auth.errors.email.required') })
        .email({ message: t('auth.errors.email.invalid') }),
      password: z
        .string()
        .min(1, { message: t('auth.errors.password.required') })
        .min(8, { message: t('auth.errors.password.minLength') })
        .max(128, { message: t('auth.errors.password.maxLength') })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/, {
          message: t('auth.errors.password.pattern'),
        }),
      confirmPassword: z.string().min(1, { message: t('auth.errors.confirmPassword.required') }),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: t('auth.errors.confirmPassword.mismatch'),
      path: ['confirmPassword'],
    });

  // Schema de validação para esqueci minha senha
  const forgotPasswordSchema = z.object({
    email: z
      .string()
      .min(1, { message: t('auth.errors.email.required') })
      .email({ message: t('auth.errors.email.invalid') }),
  });

  type LoginFormData = z.infer<typeof loginSchema>;
  type RegisterFormData = z.infer<typeof registerSchema>;
  type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

  // Formulário de login
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Formulário de cadastro
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Formulário de esqueci minha senha
  const forgotPasswordForm = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginError('');

    try {
      // Get reCAPTCHA token before login
      const recaptchaToken = await executeRecaptcha('login');

      const result = await login({
        email: data.email,
        password: data.password,
        recaptcha_token: recaptchaToken || undefined,
      });

      // Check if MFA is required
      if (result.requiresMfa && result.mfaData) {
        const mfaData = result.mfaData as {
          method: 'totp' | 'email';
          tempToken: string;
          email: string;
        };
        setMfaRequired({
          required: true,
          method: mfaData.method,
          tempToken: mfaData.tempToken,
          email: mfaData.email,
        });
        return;
      }
      
      // Normal login without MFA
      await authLogin(result.response.data.user, { access_token: result.response.data.token?.access_token || result.response.data.token?.token?.access_token });

      const { validityCheck } = useAuthStore.getState();
      await validityCheck();

      // Verificar se há returnUrl nos parâmetros de query
      const searchParams = new URLSearchParams(location.search);
      const returnUrl = searchParams.get('returnUrl');

      if (returnUrl) {
        // Redirecionar de volta para o OAuth flow
        window.location.href = returnUrl;
      } else {
        // Navegar para a rota raiz: o Painel do Dia é a tela inicial
        navigate('/', { replace: true });
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      const errorMessage = getApiErrorMessage(error, t('auth.notifications.loginError'));

      // Toast de erro para credenciais inválidas
      toast.error(t('auth.login.invalidCredentials'), {
        description: errorMessage,
      });

      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setRegisterError('');

    try {
      // Get reCAPTCHA token before registration
      const recaptchaToken = await executeRecaptcha('register');

      await register({
        email: data.email,
        password: data.password,
        password_confirmation: data.confirmPassword,
        name: data.fullName,
        recaptcha_token: recaptchaToken || undefined,
      });

      toast.success(t('auth.register.registrationSuccessful'));
      setActiveTab('login');
    } catch (error) {
      console.error('Erro ao fazer cadastro:', error);
      const errorMessage = getApiErrorMessage(error, t('auth.notifications.registerError'));

      // Toast de erro para cadastro
      toast.error(t('auth.notifications.registerError'), {
        description: errorMessage,
      });

      setRegisterError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setForgotPasswordError('');

    try {
      // Get reCAPTCHA token before forgot password request
      const recaptchaToken = await executeRecaptcha('forgot_password');

      await forgotPassword({
        email: data.email,
        recaptcha_token: recaptchaToken || undefined,
      });

      toast.success(t('auth.forgotPassword.emailSent'));
      setActiveTab('login');
    } catch (error) {
      console.error('Erro ao enviar email de recuperação:', error);
      const apiError = error as ApiError & {
        response?: {
          status?: number;
          data?: {
            error?: string;
            message?: string;
            detail?: string;
            code?: string;
          };
        };
      };

      const isServiceError =
        apiError?.response?.status === 503 ||
        apiError?.response?.data?.code === 'email_delivery_failed';

      const errorMessage = getApiErrorMessage(error, t('auth.notifications.forgotPasswordError'));

      toast.error(
        isServiceError
          ? t('auth.forgotPassword.serviceUnavailable')
          : t('auth.notifications.forgotPasswordError'),
        {
          description: errorMessage,
        },
      );

      setForgotPasswordError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    // Não permitir mudar para 'register' se signup estiver desabilitado
    if (value === 'register' && !enableAccountSignup) {
      return;
    }
    setActiveTab(value as 'login' | 'register' | 'forgot');
  };

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng as Locale);
  };

  const handleMfaVerification = async (code: string) => {
    await verifyMfaCode(code);

    // Verificar se há returnUrl nos parâmetros de query
    const searchParams = new URLSearchParams(location.search);
    const returnUrl = searchParams.get('returnUrl');

    if (returnUrl) {
      // Redirecionar de volta para o OAuth flow
      window.location.href = returnUrl;
    } else {
      // Redirecionar para / por padrão
      navigate('/', { replace: true });
    }
  };

  const handleMfaResendEmailCode = async () => {
    if (mfaState?.method === 'email') {
      await twoFactorService.sendEmailCode();
    }
  };

  const handleMfaBack = () => {
    clearMfaState();
    setIsLoading(false);
  };

  // Show MFA verification if required
  if (mfaState?.required) {
    return (
      <>
        <MfaVerification
          email={mfaState.email}
          method={mfaState.method}
          tempToken={mfaState.tempToken}
          onVerificationSuccess={handleMfaVerification}
          onResendEmailCode={mfaState.method === 'email' ? handleMfaResendEmailCode : undefined}
          onBack={handleMfaBack}
          isLoading={isLoading}
        />
      </>
    );
  }

  const languages = [
    { value: 'pt-BR', label: t('language.selector.portuguese') },
    { value: 'en', label: t('language.selector.english') },
    { value: 'es', label: t('language.selector.spanish') },
    { value: 'fr', label: t('language.selector.french') },
    { value: 'it', label: t('language.selector.italian') },
  ];

  const errorAlert = (message: string) =>
    message ? (
      <Alert variant="error">
        <AlertCircle />
        <AlertTitle>{t('auth.errors.title')}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    ) : null;

  const heading = (title: string, subtitle: string) => (
    <div className="space-y-1.5 text-center">
      <h1 className="font-semibold text-xl">{title}</h1>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );

  const recaptchaNote = (text: string) => (
    <p className="text-center text-muted-foreground text-xs leading-relaxed">{text}</p>
  );

  const backToLogin = (
    <Button variant="ghost" size="sm" className="-ms-2 w-fit text-muted-foreground" onClick={() => setActiveTab('login')}>
      <ArrowLeft />
      {t('auth.login.backToLogin')}
    </Button>
  );

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_70%)]"
      />
      <header className="relative flex justify-end p-4">
        <Select items={languages} value={currentLanguage} onValueChange={value => value && handleLanguageChange(value as string)}>
          <SelectTrigger size="sm" className="w-auto min-w-36 bg-background" aria-label={t('language.selector.label')}>
            <Globe className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {languages.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pt-[6vh] pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm space-y-6">
          <AppLogo className="mx-auto h-9" />

          <Card>
            <CardPanel className="space-y-5 p-6 sm:p-8">
              {activeTab === 'login' && (
                <>
                  {heading(t('auth.login.title'), t('auth.login.subtitle'))}
                  {errorAlert(loginError)}
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4" noValidate>
                    <Field invalid={!!loginForm.formState.errors.email}>
                      <FieldLabel htmlFor="login-email">{t('auth.login.email')}</FieldLabel>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        disabled={isLoading}
                        {...loginForm.register('email')}
                      />
                      <FieldError match={!!loginForm.formState.errors.email}>
                        {loginForm.formState.errors.email?.message}
                      </FieldError>
                    </Field>

                    <Field invalid={!!loginForm.formState.errors.password}>
                      <div className="flex w-full items-center justify-between">
                        <FieldLabel htmlFor="login-password">{t('auth.login.password')}</FieldLabel>
                        <button
                          type="button"
                          onClick={() => setActiveTab('forgot')}
                          className="rounded-sm font-medium text-primary text-xs outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {t('auth.login.forgotPasswordLink')}
                        </button>
                      </div>
                      <InputGroup>
                        <InputGroupInput
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...loginForm.register('password')}
                        />
                        <InputGroupAddon align="inline-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setShowPassword(v => !v)}
                            aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? <EyeOff /> : <Eye />}
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError match={!!loginForm.formState.errors.password}>
                        {loginForm.formState.errors.password?.message}
                      </FieldError>
                    </Field>

                    <Button type="submit" size="lg" loading={isLoading} className="w-full">
                      {isLoading ? t('auth.login.signingIn') : t('auth.login.signIn')}
                    </Button>
                  </form>
                  {recaptchaNote(t('auth.login.protectedByRecaptcha'))}
                </>
              )}

              {activeTab === 'register' && enableAccountSignup && (
                <>
                  {backToLogin}
                  {heading(t('auth.register.title'), t('auth.register.subtitle'))}
                  {errorAlert(registerError)}
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4" noValidate>
                    {(
                      [
                        ['fullName', 'text', 'name', t('auth.register.fullName')],
                        ['email', 'email', 'email', t('auth.register.email')],
                        ['password', 'password', 'new-password', t('auth.register.password')],
                        ['confirmPassword', 'password', 'new-password', t('auth.register.confirmPassword')],
                      ] as const
                    ).map(([name, type, autoComplete, label]) => {
                      const error = registerForm.formState.errors[name];
                      return (
                        <Field key={name} invalid={!!error}>
                          <FieldLabel htmlFor={`register-${name}`}>{label}</FieldLabel>
                          <Input
                            id={`register-${name}`}
                            type={type}
                            autoComplete={autoComplete}
                            disabled={isLoading}
                            {...registerForm.register(name)}
                          />
                          <FieldError match={!!error}>{error?.message}</FieldError>
                        </Field>
                      );
                    })}
                    <Button type="submit" size="lg" loading={isLoading} className="w-full">
                      {isLoading ? t('auth.register.registering') : t('auth.register.createAccount')}
                    </Button>
                  </form>
                  {recaptchaNote(t('auth.register.protectedByRecaptcha'))}
                </>
              )}

              {activeTab === 'forgot' && (
                <>
                  {backToLogin}
                  {heading(t('auth.forgotPassword.title'), t('auth.forgotPassword.subtitle'))}
                  {errorAlert(forgotPasswordError)}
                  <form
                    onSubmit={forgotPasswordForm.handleSubmit(onForgotPasswordSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    <Field invalid={!!forgotPasswordForm.formState.errors.email}>
                      <FieldLabel htmlFor="forgot-email">{t('auth.forgotPassword.email')}</FieldLabel>
                      <Input
                        id="forgot-email"
                        type="email"
                        autoComplete="email"
                        autoFocus
                        disabled={isLoading}
                        {...forgotPasswordForm.register('email')}
                      />
                      <FieldError match={!!forgotPasswordForm.formState.errors.email}>
                        {forgotPasswordForm.formState.errors.email?.message}
                      </FieldError>
                    </Field>
                    <Button type="submit" size="lg" loading={isLoading} className="w-full">
                      {isLoading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.sendInstructions')}
                    </Button>
                  </form>
                  {recaptchaNote(t('auth.forgotPassword.protectedByRecaptcha'))}
                </>
              )}
            </CardPanel>
          </Card>

          {activeTab === 'login' && enableAccountSignup && (
            <p className="text-center text-muted-foreground text-sm">
              {t('auth.login.noAccount')}{' '}
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                className="rounded-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t('auth.tabs.register')}
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Auth;
