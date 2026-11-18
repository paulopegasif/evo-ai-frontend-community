// Turns backend/provider error strings into i18n keys (chat namespace) so agents
// see *why* a message failed or couldn't be edited instead of a generic notice.

export type MessageErrorKey =
  | 'messages.sendErrors.notOnWhatsapp'
  | 'messages.sendErrors.disconnected'
  | 'messages.editErrors.window'
  | 'messages.editErrors.notDelivered'
  | 'messages.editErrors.unsupported';

export interface ExplainedError {
  key: MessageErrorKey | null;
  // Cleaned provider text, shown when there is no friendly key.
  raw: string;
}

// "[Evolution Go] HTTP 500: {\"error\":\"recipient is not on WhatsApp...\"}" → inner text.
export function cleanProviderError(error: string | null | undefined): string {
  if (!error) return '';
  let text = String(error).replace(/^\[[^\]]+\]\s*(HTTP\s*\d+:\s*)?/i, '').trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const inner = parsed.error ?? parsed.message;
      if (typeof inner === 'string') text = inner;
    }
  } catch {
    // not JSON — keep as is
  }
  return text;
}

export function explainSendError(error: string | null | undefined): ExplainedError {
  const raw = cleanProviderError(error);
  if (/not on whatsapp|no lid found|not registered/i.test(raw)) {
    return { key: 'messages.sendErrors.notOnWhatsapp', raw };
  }
  if (/not connected|disconnected|no session|websocket|logged out/i.test(raw)) {
    return { key: 'messages.sendErrors.disconnected', raw };
  }
  return { key: null, raw };
}

const EDIT_ERRORS: Array<[RegExp, MessageErrorKey]> = [
  [/15 minutes/i, 'messages.editErrors.window'],
  [/not delivered/i, 'messages.editErrors.notDelivered'],
  [/not supported/i, 'messages.editErrors.unsupported'],
];

export function explainEditError(details: string | null | undefined): ExplainedError {
  const raw = cleanProviderError(details);
  const match = EDIT_ERRORS.find(([re]) => re.test(raw));
  return { key: match ? match[1] : null, raw };
}

// WhatsApp lets the sender edit for 15 minutes; mirror it so the menu only
// offers what the backend will accept.
export const WHATSAPP_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function messageTimestampMs(createdAt: string | number): number {
  if (typeof createdAt === 'number') {
    // Unix seconds vs ms
    return createdAt < 1e12 ? createdAt * 1000 : createdAt;
  }
  return new Date(createdAt).getTime();
}

// Rich-editor HTML ("<p>a</p><p>b</p>", "<br>") → plain text for the edit box.
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (!/<[a-z][\s\S]*>/i.test(html)) return html;
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '');
  const doc = new DOMParser().parseFromString(withBreaks, 'text/html');
  return (doc.body.textContent ?? '').trim();
}
