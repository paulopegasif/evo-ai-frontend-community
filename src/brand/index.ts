/**
 * White-label brand layer.
 *
 * Everything that identifies the product (name, logos, palette, external
 * links, analytics) is resolved from this folder. A client branch rebrands
 * the app by replacing only:
 *   - src/brand/brand.json
 *   - src/brand/assets/logo-dark.svg / logo-light.svg
 *   - src/brand/theme.css
 *   - public/favicon.svg / public/logo.svg
 * See src/brand/README.md.
 */
import brandJson from './brand.json';
import logoDark from './assets/logo-dark.svg';
import logoLight from './assets/logo-light.svg';

export interface BrandConfig {
  name: string;
  copyrightHolder: string;
  themeColor: string;
  links: {
    docs?: string;
    support?: string;
    tutorialsEmbed?: string;
  };
  analytics: {
    ga4MeasurementId?: string | null;
    ga4LinkerDomains?: string[];
  };
  /** Optional modules; omitted keys default to enabled. */
  features?: {
    /** Agenda & appointments (clinics). Off for businesses without appointments, e.g. SaaS sales. */
    appointments?: boolean;
  };
}

export const BRAND = brandJson as unknown as BrandConfig;

export const BRAND_FEATURES = {
  appointments: BRAND.features?.appointments !== false,
} as const;

export const BRAND_LOGOS = {
  dark: logoDark,
  light: logoLight,
} as const;
