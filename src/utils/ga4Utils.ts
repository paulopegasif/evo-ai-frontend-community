/**
 * Google Analytics 4 (GA4) Integration
 *
 * Initializes GA4 for page views and event tracking.
 * Only runs in production when the brand (src/brand/brand.json) sets
 * analytics.ga4MeasurementId.
 * Supports cross-domain tracking via linker configuration.
 */

import { BRAND } from '@/brand';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const LINKER_DOMAINS = BRAND.analytics.ga4LinkerDomains ?? [];

const GA4_MEASUREMENT_ID = BRAND.analytics.ga4MeasurementId;

export const initGA4 = (): void => {
  // Only initialize in production, and only when the brand configures GA4
  if (import.meta.env.DEV || !GA4_MEASUREMENT_ID) {
    return;
  }

  try {
    window.dataLayer = window.dataLayer || [];
    const gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA4_MEASUREMENT_ID, {
      linker: {
        domains: LINKER_DOMAINS,
      },
    });

    // Load gtag.js script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(script);
  } catch (error) {
    console.error('GA4: Initialization failed', error);
  }
};

/**
 * Track custom events in GA4
 */
export const gtagEvent = (
  eventName: string,
  params?: Record<string, unknown>,
): void => {
  if (window.gtag) {
    window.gtag('event', eventName, params);
  }
};
