import { useLanguage } from '@/hooks/useLanguage';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { useDarkMode } from '../hooks/useDarkMode';

export function ThemeToggle() {
  const { t } = useLanguage('common');
  const { toggleTheme } = useDarkMode();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={t('base.theme.toggle')} />
        }
      >
        {/* Moon in light mode, sun in dark mode (CSS only, no state read) */}
        <Moon className="dark:hidden" />
        <Sun className="hidden dark:block" />
      </TooltipTrigger>
      <TooltipPopup>
        <span className="dark:hidden">{t('base.theme.dark')}</span>
        <span className="hidden dark:inline">{t('base.theme.light')}</span>
      </TooltipPopup>
    </Tooltip>
  );
}
