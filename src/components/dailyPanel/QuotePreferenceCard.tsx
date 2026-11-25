import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { useLanguage } from '@/hooks/useLanguage';
import { useIsAdmin } from '@/hooks/dailyPanel/useIsAdmin';
import { dailyPanelService } from '@/services/dailyPanel/dailyPanelService';
import { useDailyPanelStore } from '@/store/dailyPanelStore';
import { getApiErrorMessage } from '@/utils/apiHelpers';
import type { QuoteCategory, QuotePreferences } from '@/types/dailyPanel';

const USE_DEFAULT = '__default__';
const FALLBACK_CATEGORIES: QuoteCategory[] = ['motivacao', 'negocios', 'biblia', 'off'];

/** "Frase do dia" choice in the profile; admins also pick the installation default. */
export default function QuotePreferenceCard() {
  const { t } = useLanguage('dailyPanel');
  const isAdmin = useIsAdmin();
  const invalidatePanel = useDailyPanelStore(s => s.invalidate);
  const ids = useId();
  const [prefs, setPrefs] = useState<QuotePreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dailyPanelService
      .getPreferences()
      .then(p => !cancelled && setPrefs(p))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!prefs) return null;

  const categories = prefs.categories?.length ? prefs.categories : FALLBACK_CATEGORIES;
  const categoryLabel = (c: QuoteCategory) => t(`quote.categories.${c}`);

  const savePersonal = async (value: string) => {
    const category = value === USE_DEFAULT ? null : (value as QuoteCategory);
    setSaving(true);
    try {
      const next = await dailyPanelService.updatePreferences(category);
      setPrefs(prev => ({ ...(prev as QuotePreferences), ...next, daily_quote_category: category }));
      invalidatePanel();
      toast.success(t('quote.saved'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('quote.saveError')));
    } finally {
      setSaving(false);
    }
  };

  const saveDefault = async (value: string) => {
    setSaving(true);
    try {
      const next = await dailyPanelService.updateSettings(value as QuoteCategory);
      setPrefs(prev => ({ ...(prev as QuotePreferences), ...next, default_quote_category: value as QuoteCategory }));
      invalidatePanel();
      toast.success(t('quote.saved'));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('quote.saveError')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card data-testid="quote-preference-card">
      <CardHeader>
        <CardTitle className="text-base">{t('quote.preferenceTitle')}</CardTitle>
        <CardDescription>{t('quote.preferenceDescription')}</CardDescription>
      </CardHeader>
      <CardPanel className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor={`${ids}-mine`} className="flex flex-col gap-1">
            <span className="font-medium text-sm">{t('quote.mine')}</span>
            <span className="text-muted-foreground text-sm">{t('quote.mineHint')}</span>
          </label>
          <OptionSelect
            id={`${ids}-mine`}
            className="sm:w-56"
            disabled={saving}
            value={prefs.daily_quote_category ?? USE_DEFAULT}
            onValueChange={value => void savePersonal(value)}
            options={[
              {
                value: USE_DEFAULT,
                label: t('quote.useDefault', { category: categoryLabel(prefs.default_quote_category) }),
              },
              ...categories.map(c => ({ value: c, label: categoryLabel(c) })),
            ]}
          />
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor={`${ids}-default`} className="flex flex-col gap-1">
              <span className="font-medium text-sm">{t('quote.installationDefault')}</span>
              <span className="text-muted-foreground text-sm">{t('quote.installationDefaultHint')}</span>
            </label>
            <OptionSelect
              id={`${ids}-default`}
              className="sm:w-56"
              disabled={saving}
              value={prefs.default_quote_category}
              onValueChange={value => void saveDefault(value)}
              options={categories.map(c => ({ value: c, label: categoryLabel(c) }))}
            />
          </div>
        )}
      </CardPanel>
    </Card>
  );
}
