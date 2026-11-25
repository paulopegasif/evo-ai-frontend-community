import { extractError } from '@/utils/apiHelpers';
import type { ApiFieldError } from '@/types/dailyPanel';

/**
 * Group a 422 `error.details` array (`[{ field, messages }]`) by field.
 * Returns an empty object when the error carries no field details.
 */
export function fieldErrorsFrom(error: unknown): Record<string, string[]> {
  const details = extractError(error)?.details as unknown;
  const out: Record<string, string[]> = {};
  if (!Array.isArray(details)) return out;
  for (const item of details as Partial<ApiFieldError>[]) {
    if (!item || typeof item.field !== 'string') continue;
    const messages = item.messages?.length ? item.messages : item.full_messages ?? [];
    out[item.field] = [...(out[item.field] ?? []), ...messages];
  }
  return out;
}
