import { describe, it, expect } from 'vitest';
import type { ConversationFilter } from '@/types/chat/api';
import { buildAssigneeTabFilters, getActiveAssigneeTab } from './assigneeTabs';

const row = (attribute_key: string, value: string): ConversationFilter => ({
  attribute_key,
  filter_operator: 'equal_to',
  values: [value],
  query_operator: 'and',
});

describe('getActiveAssigneeTab', () => {
  it('defaults to all', () => {
    expect(getActiveAssigneeTab([])).toBe('all');
    expect(getActiveAssigneeTab([row('status', 'open')])).toBe('all');
  });
  it('reads assignee_type / assignee_id', () => {
    expect(getActiveAssigneeTab([row('assignee_type', 'me')])).toBe('me');
    expect(getActiveAssigneeTab([row('assignee_id', 'unassigned')])).toBe('unassigned');
    expect(getActiveAssigneeTab([row('assignee_id', '42')])).toBe('all');
  });
});

describe('buildAssigneeTabFilters', () => {
  it('adds the assignee row and keeps a real status', () => {
    const { filters, droppedChipOnly } = buildAssigneeTabFilters([row('status', 'open')], 'me');
    expect(filters.map(f => [f.attributeKey, f.values])).toEqual([
      ['assignee_type', 'me'],
      ['status', 'open'],
    ]);
    expect(droppedChipOnly).toBe(false);
  });

  it('drops status=all and chip-only views, which POST /filter cannot take', () => {
    const { filters, droppedChipOnly } = buildAssigneeTabFilters(
      [row('status', 'all'), row('unread', 'true')],
      'unassigned',
    );
    expect(filters.map(f => f.attributeKey)).toEqual(['assignee_type']);
    expect(droppedChipOnly).toBe(true);
  });

  it('switching tabs replaces the previous assignee row', () => {
    const { filters } = buildAssigneeTabFilters([row('assignee_type', 'me'), row('status', 'pending')], 'unassigned');
    expect(filters.map(f => [f.attributeKey, f.values])).toEqual([
      ['assignee_type', 'unassigned'],
      ['status', 'pending'],
    ]);
  });

  it('"all" removes the assignee row and keeps the rest untouched', () => {
    const { filters } = buildAssigneeTabFilters([row('assignee_type', 'me'), row('unread', 'true')], 'all');
    expect(filters.map(f => f.attributeKey)).toEqual(['unread']);
  });
});
