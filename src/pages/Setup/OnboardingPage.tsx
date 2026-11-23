import { useState, useEffect } from 'react';
import { ChevronDown, Globe } from '@/components/icons';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { type Locale } from '@/i18n/config';
import { setupService } from '@/services/setup/setupService';
import { surveyService } from '@/services/survey/surveyService';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/cn';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingFormData {
  teamSize: string;
  dailyVolume: string;
  mainChannel: string;
  mainChannelOther: string;
  usesAI: string;
  biggestPain: string;
  crmExperience: string;
  mainGoal: string;
}

// ─── SelectField ─────────────────────────────────────────────────────────────

interface SelectFieldProps {
  label: string;
  id: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

// Native <select> styled like a coss input: best on mobile for a short survey.
const NATIVE_SELECT =
  'h-10 w-full appearance-none rounded-lg border border-input bg-background ps-3 pe-9 text-sm shadow-xs/5 outline-none transition-shadow focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 sm:h-9 dark:bg-input/32';

function NativeSelect({ id, value, options, onChange, placeholder }: Omit<SelectFieldProps, 'label'>) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={cn(NATIVE_SELECT, !value && 'text-muted-foreground')}
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function SelectField({ label, id, value, options, onChange, placeholder = 'Select...' }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <NativeSelect id={id} value={value} options={options} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const LANGUAGES: { value: Locale; labelKey: string }[] = [
  { value: 'pt-BR', labelKey: 'language.portuguese' },
  { value: 'en',    labelKey: 'language.english' },
  { value: 'es',    labelKey: 'language.spanish' },
  { value: 'fr',    labelKey: 'language.french' },
  { value: 'it',    labelKey: 'language.italian' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { t, currentLanguage, changeLanguage } = useLanguage('onboarding');
  const { isAuthenticated, refreshUser } = useAuth();

  const [form, setForm] = useState<OnboardingFormData>({
    teamSize: '',
    dailyVolume: '',
    mainChannel: '',
    mainChannelOther: '',
    usesAI: '',
    biggestPain: '',
    crmExperience: '',
    mainGoal: '',
  });
  const [loading, setLoading] = useState(false);

  // Guard: if not coming from bootstrap (no survey_token) and not authenticated, redirect to /setup
  useEffect(() => {
    const hasSurveyToken = !!sessionStorage.getItem('survey_token');
    if (!hasSurveyToken && !isAuthenticated) {
      navigate('/setup', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const set = (key: keyof OnboardingFormData) => (value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'mainChannel' && value !== t('survey.channel.other')) {
        next.mainChannelOther = '';
      }
      return next;
    });
  };

  const isChannelValid =
    form.mainChannel !== '' &&
    (form.mainChannel !== t('survey.channel.other') || form.mainChannelOther.trim().length > 0);

  // Define os campos que compõem as etapas do onboarding
  const onboardingSteps = [
    form.teamSize,
    form.dailyVolume,
    isChannelValid ? 'ok' : '',
    form.usesAI,
    form.biggestPain,
    form.crmExperience,
    form.mainGoal,
  ] as const;

  const filledCount = onboardingSteps.filter(Boolean).length;
  const totalSteps = onboardingSteps.length;
  const progressPct = Math.round((filledCount / totalSteps) * 100);

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const surveyToken = sessionStorage.getItem('survey_token');

      if (surveyToken) {
        // Pre-login path: use the one-time survey_token from bootstrap
        await setupService.saveSurvey(form, surveyToken);
        sessionStorage.removeItem('survey_token');
        navigate('/login', { replace: true });
      } else {
        // Post-login path: refresh user so RouterGuard sees setup_survey_completed: true
        await surveyService.saveSurvey(form);
        await refreshUser();
        navigate('/conversations', { replace: true });
      }
    } catch {
      // On error (e.g. expired token), still navigate to login
      sessionStorage.removeItem('survey_token');
      navigate('/login', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const teamSizeOptions   = t('survey.teamSize.options', { returnObjects: true }) as unknown as string[];
  const dailyVolumeOptions = t('survey.dailyVolume.options', { returnObjects: true }) as unknown as string[];
  const channelOptions    = t('survey.channel.options', { returnObjects: true }) as unknown as string[];
  const aiOptions         = t('survey.ai.options', { returnObjects: true }) as unknown as string[];
  const painOptions       = t('survey.pain.options', { returnObjects: true }) as unknown as string[];
  const crmOptions        = t('survey.crm.options', { returnObjects: true }) as unknown as string[];
  const goalOptions       = t('survey.goal.options', { returnObjects: true }) as unknown as string[];

  const languageItems = LANGUAGES.map(lang => ({ value: lang.value, label: t(lang.labelKey) }));
  const placeholder = t('survey.placeholder');
  const opts = (list: unknown) => (Array.isArray(list) ? (list as string[]) : []);

  return (
    <div className="relative flex min-h-screen flex-col bg-muted/40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--color-primary)_16%,transparent),transparent_70%)]"
      />
      <header className="relative flex justify-end p-4">
        <Select items={languageItems} value={currentLanguage} onValueChange={value => value && changeLanguage(value as Locale)}>
          <SelectTrigger size="sm" className="w-auto min-w-36 bg-background" aria-label="Language">
            <Globe className="text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {languageItems.map(lang => (
              <SelectItem key={lang.value} value={lang.value}>
                {lang.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <Card className="w-full max-w-2xl">
          <CardPanel className="space-y-6 p-6 sm:p-8">
            <div className="space-y-4">
              <AppLogo className="h-8" />
              <div className="space-y-1.5">
                <h1 className="font-semibold text-xl">{t('survey.title')}</h1>
                <p className="text-muted-foreground text-sm">{t('survey.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Progress
                value={progressPct}
                className="flex-1"
                aria-valuenow={filledCount}
                aria-valuemin={0}
                aria-valuemax={totalSteps}
                data-testid="progress-bar-fill"
              />
              <span
                className="whitespace-nowrap text-muted-foreground text-xs tabular-nums"
                data-testid="progress-text"
                data-filled={filledCount}
                data-total={totalSteps}
              >
                {filledCount} {t('survey.progress.of')} {totalSteps}
              </span>
            </div>

            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <SelectField label={t('survey.teamSize.label')} id="teamSize" value={form.teamSize} options={opts(teamSizeOptions)} onChange={set('teamSize')} placeholder={placeholder} />
                <SelectField label={t('survey.dailyVolume.label')} id="dailyVolume" value={form.dailyVolume} options={opts(dailyVolumeOptions)} onChange={set('dailyVolume')} placeholder={placeholder} />
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mainChannel">{t('survey.channel.label')}</Label>
                  <NativeSelect id="mainChannel" value={form.mainChannel} options={opts(channelOptions)} onChange={set('mainChannel')} placeholder={placeholder} />
                  {form.mainChannel === t('survey.channel.other') && (
                    <Input
                      type="text"
                      placeholder={t('survey.channel.otherPlaceholder')}
                      value={form.mainChannelOther}
                      onChange={e => set('mainChannelOther')(e.target.value)}
                      aria-label={t('survey.channel.otherPlaceholder')}
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <SelectField label={t('survey.ai.label')} id="usesAI" value={form.usesAI} options={opts(aiOptions)} onChange={set('usesAI')} placeholder={placeholder} />
                <SelectField label={t('survey.pain.label')} id="biggestPain" value={form.biggestPain} options={opts(painOptions)} onChange={set('biggestPain')} placeholder={placeholder} />
                <SelectField label={t('survey.crm.label')} id="crmExperience" value={form.crmExperience} options={opts(crmOptions)} onChange={set('crmExperience')} placeholder={placeholder} />
                <SelectField label={t('survey.goal.label')} id="mainGoal" value={form.mainGoal} options={opts(goalOptions)} onChange={set('mainGoal')} placeholder={placeholder} />
              </div>
            </div>

            <div className="space-y-3 border-t pt-5">
              <Button size="lg" className="w-full" loading={loading} onClick={handleSubmit}>
                {loading ? t('survey.submit.loading') : t('survey.submit.idle')}
              </Button>
              <p className="text-center text-muted-foreground text-xs">{t('survey.footer')}</p>
            </div>
          </CardPanel>
        </Card>
      </main>
    </div>
  );
}
