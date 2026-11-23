import { describe, expect, it } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('uses first and last word', () => expect(initials('Ana Maria Costa')).toBe('AC'));
  it('handles a single word', () => expect(initials('ana')).toBe('A'));
  it('falls back when empty', () => {
    expect(initials('')).toBe('U');
    expect(initials(undefined, '?')).toBe('?');
  });
});
