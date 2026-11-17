import { beforeEach, describe, expect, it } from 'vitest';
import { clearConversationDraft, getConversationDraft, saveConversationDraft } from './conversationDrafts';

describe('conversationDrafts', () => {
  beforeEach(() => localStorage.clear());

  it('keeps a separate draft per conversation', () => {
    saveConversationDraft('u1', 'c1', '<p>oi</p>');
    saveConversationDraft('u1', 'c2', '<p>tchau</p>');

    expect(getConversationDraft('u1', 'c1')).toBe('<p>oi</p>');
    expect(getConversationDraft('u1', 'c2')).toBe('<p>tchau</p>');
    expect(getConversationDraft('u1', 'c3')).toBe('');
  });

  it('does not share drafts between users', () => {
    saveConversationDraft('u1', 'c1', 'texto');
    expect(getConversationDraft('u2', 'c1')).toBe('');
  });

  it('removes the draft when cleared or emptied', () => {
    saveConversationDraft('u1', 'c1', 'texto');
    clearConversationDraft('u1', 'c1');
    expect(getConversationDraft('u1', 'c1')).toBe('');

    saveConversationDraft('u1', 'c2', 'texto');
    saveConversationDraft('u1', 'c2', '   ');
    expect(getConversationDraft('u1', 'c2')).toBe('');
  });
});
