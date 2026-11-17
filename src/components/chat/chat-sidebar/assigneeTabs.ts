import { DEFAULT_BASE_FILTER, type BaseFilter } from '@/types/core/filters';
import type { ConversationFilter } from '@/types/chat/api';

export type AssigneeTab = 'me' | 'unassigned' | 'all';

export const ASSIGNEE_TABS: { id: AssigneeTab; labelKey: string; fallback: string }[] = [
  { id: 'me', labelKey: 'chatSidebar.assigneeTabs.mine', fallback: 'Minhas' },
  { id: 'unassigned', labelKey: 'chatSidebar.assigneeTabs.unassigned', fallback: 'Não atribuídas' },
  { id: 'all', labelKey: 'chatSidebar.assigneeTabs.all', fallback: 'Todas' },
];

const ASSIGNEE_KEYS = ['assignee_type', 'assignee_id'];
// Não combinam com outros filtros no POST /conversations/filter (EVO-1970).
const CHIP_ONLY_KEYS = ['unread', 'is_group'];

const firstValue = (f: ConversationFilter): string =>
  String(Array.isArray(f.values) ? f.values[0] ?? '' : f.values ?? '');

const toBase = (f: ConversationFilter): BaseFilter => ({
  ...DEFAULT_BASE_FILTER,
  attributeKey: f.attribute_key,
  filterOperator: f.filter_operator,
  values: Array.isArray(f.values) ? f.values.join(',') : String(f.values ?? ''),
});

/** Which tab the current global filters represent. */
export const getActiveAssigneeTab = (active: ConversationFilter[]): AssigneeTab => {
  const row = active.find(
    f => ASSIGNEE_KEYS.includes(f.attribute_key) && f.filter_operator === 'equal_to',
  );
  const value = row ? firstValue(row) : 'all';
  return value === 'me' || value === 'unassigned' ? value : 'all';
};

/**
 * Filters to apply when a tab is clicked: swaps only the assignee axis and keeps
 * everything else. With an assignee row the request goes through POST /filter,
 * so rows it can't take are dropped: status "all" (means "no status filter") and
 * the chip-only unread/groups views. `droppedChipOnly` lets the UI tell the user.
 */
export const buildAssigneeTabFilters = (
  active: ConversationFilter[],
  tab: AssigneeTab,
): { filters: BaseFilter[]; droppedChipOnly: boolean } => {
  let rest = active.filter(f => !ASSIGNEE_KEYS.includes(f.attribute_key));
  let droppedChipOnly = false;

  if (tab !== 'all') {
    const before = rest.length;
    rest = rest.filter(f => !CHIP_ONLY_KEYS.includes(f.attribute_key));
    droppedChipOnly = rest.length !== before;
    rest = rest.filter(f => !(f.attribute_key === 'status' && firstValue(f) === 'all'));
  }

  const filters = rest.map(toBase);
  if (tab !== 'all') {
    filters.unshift({
      ...DEFAULT_BASE_FILTER,
      attributeKey: 'assignee_type',
      filterOperator: 'equal_to',
      values: tab,
    });
  }
  return { filters, droppedChipOnly };
};
