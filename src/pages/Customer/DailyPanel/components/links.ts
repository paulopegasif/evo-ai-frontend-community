import type { TodoCounts } from '@/types/dailyPanel';

/**
 * Where each "Fazer agora" item leads. The app has no URL-driven filters on
 * the conversation list or kanban yet, so these point at the closest list.
 */
export const TODO_LINKS: Record<keyof TodoCounts, string> = {
  awaiting_reply: '/conversations',
  overdue_follow_ups: '/pipelines',
  stalled_items: '/pipelines',
  sales_missing_amount: '/pipelines',
};

export const TODO_ORDER: (keyof TodoCounts)[] = [
  'awaiting_reply',
  'overdue_follow_ups',
  'stalled_items',
  'sales_missing_amount',
];

export const SALES_GOALS_PATH = '/settings/sales-goals';
