import { isValidE164 } from '@/utils/dailyPanel/format';

export const MAX_PHONES = 5;

/** Drop spaces, dashes, dots and parentheses so `+55 (62) 99999-0000` validates. */
export const normalizePhone = (value: string) => value.replace(/[\s().-]/g, '');

export interface DailySummaryFormState {
  enabled: boolean;
  time: string;
  inbox_id: string;
  phones: string[];
}

export interface DailySummaryFormErrors {
  inbox?: string;
  time?: string;
  phones: (string | undefined)[];
  phonesGeneral?: string;
}

/** Client-side checks mirroring the server: E.164 phones, 1–5 when enabled, inbox when enabled. */
export function validateDailySummary(
  form: DailySummaryFormState,
  t: (key: string, opts?: Record<string, unknown>) => string,
): DailySummaryFormErrors | null {
  const phones = form.phones.map(normalizePhone);
  const errors: DailySummaryFormErrors = { phones: phones.map(() => undefined) };
  let invalid = false;

  phones.forEach((phone, i) => {
    if (!phone) {
      if (form.enabled || phones.length > 1) {
        errors.phones[i] = t('summary.errors.phoneRequired');
        invalid = true;
      }
      return;
    }
    if (!isValidE164(phone)) {
      errors.phones[i] = t('summary.errors.phoneInvalid', { phone });
      invalid = true;
    }
  });
  if (phones.filter(Boolean).length > MAX_PHONES) {
    errors.phonesGeneral = t('summary.errors.phonesMax', { count: MAX_PHONES });
    invalid = true;
  }
  if (form.enabled && !form.inbox_id) {
    errors.inbox = t('summary.errors.inboxRequired');
    invalid = true;
  }
  return invalid ? errors : null;
}
