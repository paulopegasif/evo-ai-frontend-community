import { describe, expect, it } from 'vitest';
import {
  cleanProviderError,
  explainEditError,
  explainSendError,
  htmlToPlainText,
  messageTimestampMs,
} from './messageErrors';

const LID_ERROR =
  '[Evolution Go] HTTP 500: {"error":"recipient is not on WhatsApp: no LID found for 75595736191090@s.whatsapp.net from server"}';

describe('messageErrors', () => {
  it('extracts the inner provider message', () => {
    expect(cleanProviderError(LID_ERROR)).toBe(
      'recipient is not on WhatsApp: no LID found for 75595736191090@s.whatsapp.net from server',
    );
    expect(cleanProviderError('plain failure')).toBe('plain failure');
    expect(cleanProviderError(undefined)).toBe('');
  });

  it('maps a recipient-not-found send error to a friendly key', () => {
    expect(explainSendError(LID_ERROR).key).toBe('messages.sendErrors.notOnWhatsapp');
    expect(explainSendError('[Evolution Go] HTTP 500: {"error":"client not connected"}').key).toBe(
      'messages.sendErrors.disconnected',
    );
    expect(explainSendError('weird').key).toBeNull();
  });

  it('maps edit rejections from the API', () => {
    expect(explainEditError('WhatsApp only allows editing within 15 minutes').key).toBe(
      'messages.editErrors.window',
    );
    expect(explainEditError('Message was not delivered to WhatsApp').key).toBe(
      'messages.editErrors.notDelivered',
    );
    expect(explainEditError('Editing is not supported on this channel').key).toBe(
      'messages.editErrors.unsupported',
    );
    expect(explainEditError('[Evolution Go] HTTP 500: {"error":"boom"}')).toEqual({ key: null, raw: 'boom' });
  });

  it('normalizes timestamps in seconds or ISO', () => {
    expect(messageTimestampMs(1_700_000_000)).toBe(1_700_000_000_000);
    expect(messageTimestampMs(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(messageTimestampMs('2026-11-18T12:00:00Z')).toBe(Date.parse('2026-11-18T12:00:00Z'));
  });

  it('turns editor HTML into editable plain text', () => {
    expect(htmlToPlainText('<p>Olá bom dia.</p><p>Tudo bem?</p>')).toBe('Olá bom dia.\nTudo bem?');
    expect(htmlToPlainText('linha 1<br>linha 2')).toBe('linha 1\nlinha 2');
    expect(htmlToPlainText('sem html & ok')).toBe('sem html & ok');
    expect(htmlToPlainText('<p>a &amp; b</p>')).toBe('a & b');
  });
});
