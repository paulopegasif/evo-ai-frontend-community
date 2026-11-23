import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Lock, Eye, EyeOff } from '@/components/icons';
import { toast } from 'sonner';
import { resetPassword } from '@/services/auth/authService';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppLogo } from '@/components/AppLogo';

const resetPasswordSchema = (t: any) =>
  z
    .object({
      password: z
        .string()
        .min(8, t('auth.errors.password.minLength'))
        .max(128, t('auth.errors.password.maxLength'))
        .regex(
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/,
          t('auth.errors.password.pattern'),
        ),
      password_confirmation: z.string().min(1, t('auth.errors.confirmPassword.required')),
    })
    .refine(data => data.password === data.password_confirmation, {
      message: t('auth.errors.confirmPassword.mismatch'),
      path: ['password_confirmation'],
    });

type ResetPasswordFormData = {
  password: string;
  password_confirmation: string;
};

const ResetPassword = () => {
  const { t } = useLanguage('auth');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const resetToken = searchParams.get('reset_password_token');

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema(t)),
    defaultValues: {
      password: '',
      password_confirmation: '',
    },
  });

  useEffect(() => {
    if (!resetToken) {
      setError(t('auth.resetPassword.tokenNotFound'));
    }
  }, [resetToken, t]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!resetToken) {
      setError(t('auth.resetPassword.tokenNotFound'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword({
        reset_password_token: resetToken,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });

      toast.success(t('auth.resetPassword.success'));
      navigate('/login');
    } catch (error: any) {
      const apiError = error?.response?.data?.error;
      const detailMessages = Array.isArray(apiError?.details)
        ? apiError.details.map((detail: { message?: string }) => detail?.message).filter(Boolean)
        : [];
      const errorMessage =
        detailMessages.join(', ') ||
        apiError?.message ||
        error?.response?.data?.message ||
        t('auth.resetPassword.error');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40 relative">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <AppLogo className="h-9 mx-auto" />
          </div>

          <Card>
            <CardPanel className="p-6 sm:p-8">
              <div className="text-center mb-6">
                <Lock className="size-12 text-destructive mx-auto mb-4" />
                <h2 className="font-semibold text-xl">
                  {t('auth.resetPassword.tokenInvalid.title')}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {t('auth.resetPassword.tokenInvalid.description')}
                </p>
              </div>

              <div className="space-y-4">
                <Alert variant="error">
                  <AlertDescription>{t('auth.resetPassword.tokenInvalid.alert')}</AlertDescription>
                </Alert>

                <Button type="button" onClick={() => navigate('/login')} className="w-full">
                  {t('auth.resetPassword.tokenInvalid.button')}
                </Button>
              </div>
            </CardPanel>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/40 relative">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <AppLogo className="h-9 mx-auto" />
        </div>

        {/* Form */}
        <Card>
          <CardPanel className="p-6 sm:p-8">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center size-12 rounded-full bg-primary/10 mb-4">
                <Lock className="size-6 text-primary" />
              </div>
              <h2 className="font-semibold text-xl">{t('auth.resetPassword.title')}</h2>
              <p className="text-muted-foreground mt-2">{t('auth.resetPassword.subtitle')}</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {error && (
                <Alert variant="error">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Field invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">{t('auth.resetPassword.newPassword')}</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.resetPassword.passwordPlaceholder')}
                    disabled={isLoading}
                    {...form.register('password')}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={
                        showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')
                      }
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError match={!!form.formState.errors.password}>
                  {form.formState.errors.password?.message}
                </FieldError>
              </Field>

              <Field invalid={!!form.formState.errors.password_confirmation}>
                <FieldLabel htmlFor="password_confirmation">
                  {t('auth.resetPassword.confirmPassword')}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={t('auth.resetPassword.confirmPlaceholder')}
                    disabled={isLoading}
                    {...form.register('password_confirmation')}
                  />
                  <InputGroupAddon align="inline-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={
                        showConfirmPassword
                          ? t('auth.login.hidePassword')
                          : t('auth.login.showPassword')
                      }
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </InputGroupAddon>
                </InputGroup>
                <FieldError match={!!form.formState.errors.password_confirmation}>
                  {form.formState.errors.password_confirmation?.message}
                </FieldError>
              </Field>

              <Button type="submit" loading={isLoading} className="w-full">
                {isLoading ? t('auth.resetPassword.resetting') : t('auth.resetPassword.button')}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/login')}
                  className="text-sm"
                >
                  {t('auth.resetPassword.backToLogin')}
                </Button>
              </div>
            </form>
          </CardPanel>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
