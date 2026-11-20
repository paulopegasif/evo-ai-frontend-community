import { useState } from 'react';
import { ListFilter } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { getContactColor } from '@/utils/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PRIORITY_DOT, STATUS_DOT, initials } from './kanbanUtils';

const ALL = '__all__';

interface Assignee {
  id: string;
  name: string;
  avatar_url?: string;
}

export interface KanbanFiltersValue {
  assignee: string;
  status: string;
  period: string;
  priority: string;
}

interface KanbanFiltersProps {
  value: KanbanFiltersValue;
  assignees: Assignee[];
  activeCount: number;
  onChange: (updates: { assignee?: string; status?: string; priority?: string }) => void;
  onPeriodChange: (period: string) => void;
  onClear: () => void;
}

export default function KanbanFilters({
  value,
  assignees,
  activeCount,
  onChange,
  onPeriodChange,
  onClear,
}: KanbanFiltersProps) {
  const { t } = useLanguage('pipelines');
  const [open, setOpen] = useState(false);
  const all = t('kanban.search.all');

  const assigneeItems = [
    { value: ALL, label: all },
    ...assignees.map(a => ({ value: a.id, label: a.name })),
  ];
  const statusItems = [
    { value: ALL, label: all },
    ...(['open', 'pending', 'resolved', 'snoozed'] as const).map(s => ({
      value: s,
      label: t(`kanban.search.status.${s}`),
    })),
  ];
  const periodItems = [
    { value: ALL, label: t('kanban.search.period.all') },
    { value: 'today', label: t('kanban.search.period.today') },
    { value: '7d', label: t('kanban.search.period.last7') },
    { value: '30d', label: t('kanban.search.period.last30') },
    { value: 'month', label: t('kanban.search.period.month') },
  ];
  const priorityItems = [
    { value: ALL, label: all },
    ...(['alta', 'media', 'baixa'] as const).map(p => ({ value: p, label: t(`kanban.search.priority.${p}`) })),
  ];

  const fromSelect = (v: unknown) => (v === ALL || v == null ? undefined : String(v));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" />}>
        <ListFilter />
        {t('kanban.search.filters')}
        {activeCount > 0 && (
          <Badge size="sm" className="tabular-nums">
            {activeCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-80">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm">{t('kanban.search.filters')}</span>
            {activeCount > 0 && (
              <Button variant="link" size="xs" className="h-auto p-0" onClick={onClear}>
                {t('kanban.search.clearFilters')}
              </Button>
            )}
          </div>

          <Field>
            <FieldLabel>{t('kanban.search.assigneeFilter')}</FieldLabel>
            <Select
              items={assigneeItems}
              value={value.assignee || ALL}
              onValueChange={v => onChange({ assignee: fromSelect(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                <SelectItem value={ALL}>{all}</SelectItem>
                {assignees.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <Avatar className="size-5 text-[0.625rem]">
                        {a.avatar_url && <AvatarImage src={a.avatar_url} alt="" />}
                        <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: getContactColor(a.name) }}>
                          {initials(a.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{a.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t('kanban.search.statusFilter')}</FieldLabel>
            <Select
              items={statusItems}
              value={value.status || ALL}
              onValueChange={v => onChange({ status: fromSelect(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {statusItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      {item.value !== ALL && <span className={`size-2 rounded-full ${STATUS_DOT[item.value]}`} />}
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t('kanban.search.periodFilter')}</FieldLabel>
            <Select
              items={periodItems}
              value={value.period || ALL}
              onValueChange={v => onPeriodChange(fromSelect(v) ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {periodItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t('kanban.search.priorityFilter')}</FieldLabel>
            <Select
              items={priorityItems}
              value={value.priority || ALL}
              onValueChange={v => onChange({ priority: fromSelect(v) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopup>
                {priorityItems.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      {item.value !== ALL && (
                        <span className={`size-2 rounded-full ${PRIORITY_DOT[item.value as 'alta' | 'media' | 'baixa']}`} />
                      )}
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </Field>

          <div className="flex justify-end gap-2 border-t pt-3">
            <Button variant="ghost" size="sm" onClick={onClear} disabled={activeCount === 0}>
              {t('kanban.search.clearFilters')}
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              {t('kanban.search.apply')}
            </Button>
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}
