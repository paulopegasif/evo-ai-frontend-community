import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import PipelineItemCard from './PipelineItemCard';

vi.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback || key }),
}));

vi.mock('@/components/icons', () => ({
  Edit: () => <span data-testid="icon-edit" />,
  Trash2: () => <span data-testid="icon-trash" />,
  MoreHorizontal: () => <span data-testid="icon-more" />,
  Inbox: () => <span data-testid="icon-inbox" />,
  CircleDollarSign: () => <span data-testid="icon-dollar" />,
  Phone: () => <span data-testid="icon-phone" />,
  Mail: () => <span data-testid="icon-mail" />,
  MessageSquare: () => <span data-testid="icon-message" />,
  User: () => <span data-testid="icon-user" />,
  Clock: () => <span data-testid="icon-clock" />,
  AlertCircle: () => <span data-testid="icon-alert" />,
  ListTodo: () => <span data-testid="icon-list" />,
  CheckCircle2: () => <span data-testid="icon-check" />,
  GripVertical: () => <span data-testid="icon-grip" />,
  GitBranch: () => <span data-testid="icon-branch" />,
}));

const baseItem = {
  id: 'item-1',
  pipeline_id: 'pipeline-1',
  stage_id: 'stage-1',
  contact: { name: 'João Silva', phone_number: '+5511999999999' },
  entered_at: Date.now() / 1000,
} as any;

describe('PipelineItemCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders menu with mobile-visible responsive classes', () => {
    const { container } = render(
      <PipelineItemCard item={baseItem} onEdit={vi.fn()} showActions />,
    );

    const menuContainer = container.querySelector('.absolute.top-2.right-2');
    expect(menuContainer).toBeTruthy();
    expect(menuContainer?.className).toContain('opacity-100');
    expect(menuContainer?.className).toContain('md:opacity-0');
    expect(menuContainer?.className).toContain('md:group-hover:opacity-100');
  });

  it('calls onView when card body is clicked', () => {
    const onView = vi.fn();

    const { container } = render(
      <PipelineItemCard item={baseItem} onView={onView} />,
    );

    fireEvent.click(container.firstElementChild!);
    expect(onView).toHaveBeenCalledWith(baseItem);
  });

  it('does not call onView when menu area is clicked', () => {
    const onView = vi.fn();

    const { container } = render(
      <PipelineItemCard item={baseItem} onView={onView} onEdit={vi.fn()} showActions />,
    );

    const menuContainer = container.querySelector('.absolute.top-2.right-2');
    fireEvent.click(menuContainer!);
    expect(onView).not.toHaveBeenCalled();
  });

  it('renders contact name', () => {
    render(<PipelineItemCard item={baseItem} />);
    expect(screen.getByText('João Silva')).toBeTruthy();
  });
});
