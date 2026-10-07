import type { CSSProperties } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';
import { BRAND, BRAND_LOGOS } from '@/brand';

interface AppLogoProps {
  className?: string;
  alt?: string;
  style?: CSSProperties;
  forceTheme?: 'dark' | 'light';
}

export function AppLogo({ className, alt = BRAND.name, style, forceTheme }: AppLogoProps) {
  const { theme } = useDarkMode();
  const effectiveTheme = forceTheme ?? theme;
  const src = effectiveTheme === 'dark' ? BRAND_LOGOS.dark : BRAND_LOGOS.light;

  return <img src={src} alt={alt} className={className} style={style} />;
}
