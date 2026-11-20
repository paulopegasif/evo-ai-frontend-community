import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowRight, ArrowLeft, Users, Plus, X, Tag as TagIcon, Target } from 'lucide-react';
import WizardStepLayout from './WizardStepLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { contactsService } from '@/services/contacts';
import { segmentsService } from '@/services/segments/segmentsService';
import { labelsService } from '@/services/contacts/labelsService';
import type { Segment } from '@/types/analytics';
import type { Label as LabelType } from '@/types/settings';

type FilterType = 'segment' | 'tag';
type FilterOperator = 'include' | 'exclude';

interface FilterCondition {
  id: string; // unique ID for this filter condition
  type: FilterType;
  operator: FilterOperator;
  value: string; // segment_id or tag_id
}

interface Step2Props {
  data: {
    contact_selection: 'all' | 'segments' | 'tags' | '';
    segment_ids?: string[];
    tag_ids?: string[];
    estimated_contacts?: number;
  };
  onChange: (data: Partial<Step2Props['data']>) => void;
  onNext: () => void;
  onBack: () => void;
}

const Step2_Audience = ({ data, onChange, onNext, onBack }: Step2Props) => {
  const { t, currentLanguage } = useLanguage('campaigns');
  const [totalContacts, setTotalContacts] = useState<number | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [labels, setLabels] = useState<LabelType[]>([]);

  // Fetch all data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [contactsRes, segmentsRes, labelsRes] = await Promise.all([
          contactsService.getContacts({ page: 1, per_page: 1 }),
          segmentsService.getSegments({ limit: 1000 }),
          labelsService.getLabels(),
        ]);

        setTotalContacts(contactsRes.meta?.pagination?.total || 0);
        setSegments(segmentsRes.data || []);
        setLabels(labelsRes.data || []);
      } catch (error) {
        console.error('Error fetching audience data:', error);
        setTotalContacts(0);
        setSegments([]);
        setLabels([]);
      }
    };

    fetchData();
  }, []);

  const [useAllContacts, setUseAllContacts] = useState(data.contact_selection === 'all');
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [newFilterType, setNewFilterType] = useState<FilterType>('segment');
  const [newFilterOperator, setNewFilterOperator] = useState<FilterOperator>('include');
  const [newFilterValue, setNewFilterValue] = useState<string>('');

  // Hydrate existing audience filters when editing a campaign.
  useEffect(() => {
    const selectedAll = data.contact_selection === 'all';
    setUseAllContacts(selectedAll);

    if (selectedAll) {
      setFilters([]);
      return;
    }

    const mapIdsToFilters = (
      ids: string[] | undefined,
      type: FilterType,
      startIndex: number,
    ): FilterCondition[] =>
      (ids || [])
        .filter(Boolean)
        .map((rawId, index) => {
          const isExcluded = rawId.startsWith('!');
          const value = isExcluded ? rawId.slice(1) : rawId;
          return {
            id: `hydrated_${type}_${startIndex + index}`,
            type,
            operator: isExcluded ? 'exclude' : 'include',
            value,
          } as FilterCondition;
        })
        .filter(filter => !!filter.value);

    const hydratedSegmentFilters = mapIdsToFilters(data.segment_ids, 'segment', 0);
    const hydratedTagFilters = mapIdsToFilters(data.tag_ids, 'tag', hydratedSegmentFilters.length);
    setFilters([...hydratedSegmentFilters, ...hydratedTagFilters]);
  }, [data.contact_selection, data.segment_ids, data.tag_ids]);

  const addFilter = () => {
    if (!newFilterValue) return;

    const newFilter: FilterCondition = {
      id: `filter_${Date.now()}`,
      type: newFilterType,
      operator: newFilterOperator,
      value: newFilterValue,
    };

    const updatedFilters = [...filters, newFilter];
    setFilters(updatedFilters);

    // Update parent data
    updateParentData(updatedFilters);

    // Reset form
    setNewFilterValue('');
  };

  const removeFilter = (filterId: string) => {
    const updatedFilters = filters.filter(f => f.id !== filterId);
    setFilters(updatedFilters);
    updateParentData(updatedFilters);
  };

  const updateParentData = (currentFilters: FilterCondition[]) => {
    // Extract segment and tag IDs from filters
    const includedSegments = currentFilters
      .filter(f => f.type === 'segment' && f.operator === 'include')
      .map(f => f.value);

    const excludedSegments = currentFilters
      .filter(f => f.type === 'segment' && f.operator === 'exclude')
      .map(f => f.value);

    const includedTags = currentFilters
      .filter(f => f.type === 'tag' && f.operator === 'include')
      .map(f => f.value);

    const excludedTags = currentFilters
      .filter(f => f.type === 'tag' && f.operator === 'exclude')
      .map(f => f.value);

    // Calculate estimated contacts (simplified logic)
    let estimatedContacts = 0;
    if (useAllContacts) {
      estimatedContacts = totalContacts || 0;
    } else if (currentFilters.length > 0) {
      // Sum contacts from included filters
      includedSegments.forEach(segId => {
        const seg = segments.find(s => s.id === segId);
        if (seg) estimatedContacts += seg.contactsCount || 0;
      });
      includedTags.forEach(tagId => {
        const label = labels.find(l => l.id === tagId);
        // Labels don't have contact count in the API, estimate based on total
        if (label) estimatedContacts += Math.floor((totalContacts || 0) * 0.1);
      });
      // Subtract excluded (simplified)
      excludedSegments.forEach(segId => {
        const seg = segments.find(s => s.id === segId);
        if (seg)
          estimatedContacts = Math.max(0, estimatedContacts - (seg.contactsCount || 0) * 0.1);
      });
      excludedTags.forEach(tagId => {
        const label = labels.find(l => l.id === tagId);
        if (label)
          estimatedContacts = Math.max(
            0,
            estimatedContacts - Math.floor((totalContacts || 0) * 0.05),
          );
      });
    }

    // Determine contact_selection based on filters
    let contactSelection: 'all' | 'segments' | 'tags' | '' = '';
    if (useAllContacts) {
      contactSelection = 'all';
    } else if (currentFilters.length > 0) {
      const hasSegments = currentFilters.some(f => f.type === 'segment');
      const hasTags = currentFilters.some(f => f.type === 'tag');
      if (hasSegments && hasTags) {
        contactSelection = 'segments'; // Mixed - use segments as primary
      } else if (hasSegments) {
        contactSelection = 'segments';
      } else if (hasTags) {
        contactSelection = 'tags';
      }
    }

    onChange({
      contact_selection: contactSelection,
      segment_ids: [...includedSegments, ...excludedSegments.map(id => `!${id}`)], // Prefix excluded with !
      tag_ids: [...includedTags, ...excludedTags.map(id => `!${id}`)], // Prefix excluded with !
    });
  };

  const handleToggleAllContacts = (checked: boolean) => {
    setUseAllContacts(checked);
    if (checked) {
      setFilters([]);
      onChange({
        contact_selection: 'all',
        segment_ids: [],
        tag_ids: [],
        estimated_contacts: totalContacts || 0,
      });
    } else {
      onChange({
        contact_selection: '',
        segment_ids: [],
        tag_ids: [],
        estimated_contacts: 0,
      });
    }
  };

  const getFilterLabel = (filter: FilterCondition) => {
    if (filter.type === 'segment') {
      const segment = segments.find(s => s.id === filter.value);
      return segment?.name || filter.value;
    } else {
      const label = labels.find(l => l.id === filter.value);
      return label?.title || filter.value;
    }
  };

  const getFilterIcon = (filter: FilterCondition) => {
    return filter.type === 'segment' ? (
      <Target className="h-3 w-3" />
    ) : (
      <TagIcon className="h-3 w-3" />
    );
  };

  const handleNext = () => {
    if (useAllContacts || filters.length > 0) {
      onNext();
    }
  };

  const isValid = useAllContacts || filters.length > 0;

  const operatorItems = [
    { value: 'include', label: t('wizard.step2.include') },
    { value: 'exclude', label: t('wizard.step2.exclude') },
  ];
  const typeItems = [
    { value: 'segment', label: t('wizard.step2.segment') },
    { value: 'tag', label: t('wizard.step2.tag') },
  ];
  const valueItems =
    newFilterType === 'segment'
      ? segments.map(seg => ({
          value: seg.id,
          label: `${seg.name} (${(seg.contactsCount || 0).toLocaleString(currentLanguage)})`,
        }))
      : labels.map(label => ({ value: label.id.toString(), label: label.title }));

  return (
    <WizardStepLayout
      footer={
        <>
          <Button variant="ghost" className="me-auto" onClick={onBack}>
            <ArrowLeft />
            {t('wizard.actions.back')}
          </Button>
          <Button onClick={handleNext} disabled={!isValid}>
            {t('wizard.actions.continue')}
            <ArrowRight />
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{t('wizard.step2.selectAudience')}</CardTitle>
          <CardDescription>{t('wizard.step2.audienceDescription')}</CardDescription>
        </CardHeader>
        <CardPanel className="flex flex-col gap-4">
          <label
            htmlFor="all-contacts"
            className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-data-checked:border-primary has-data-checked:bg-primary/4"
          >
            <Checkbox
              id="all-contacts"
              checked={useAllContacts}
              onCheckedChange={checked => handleToggleAllContacts(checked)}
              className="mt-0.5"
            />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2 font-medium text-sm">
                <Users className="size-4 text-muted-foreground" />
                {t('wizard.step2.allContacts')}
              </span>
              <span className="text-muted-foreground text-xs">
                {t('wizard.step2.allContactsDescription')}
              </span>
            </span>
          </label>

          {!useAllContacts && (
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/24 p-4">
              <div>
                <p className="font-medium text-sm">{t('wizard.step2.audienceFilters')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('wizard.step2.audienceFiltersDescription')}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  items={operatorItems}
                  value={newFilterOperator}
                  onValueChange={v => v && setNewFilterOperator(v as FilterOperator)}
                >
                  <SelectTrigger className="sm:w-40" aria-label={t('wizard.step2.operatorLabel')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {operatorItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>

                <Select
                  items={typeItems}
                  value={newFilterType}
                  onValueChange={v => {
                    if (!v) return;
                    setNewFilterType(v as FilterType);
                    setNewFilterValue('');
                  }}
                >
                  <SelectTrigger className="sm:w-40" aria-label={t('wizard.step2.typeLabel')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {typeItems.map(item => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>

                <Select
                  items={valueItems}
                  value={newFilterValue || null}
                  onValueChange={v => setNewFilterValue(v == null ? '' : String(v))}
                >
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue
                      placeholder={
                        newFilterType === 'segment'
                          ? t('wizard.step2.selectSegment')
                          : t('wizard.step2.selectTag')
                      }
                    />
                  </SelectTrigger>
                  <SelectPopup>
                    {newFilterType === 'segment' &&
                      valueItems.map(item => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    {newFilterType === 'tag' &&
                      labels.map(label => (
                        <SelectItem key={label.id} value={label.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: label.color }}
                            />
                            {label.title}
                          </span>
                        </SelectItem>
                      ))}
                  </SelectPopup>
                </Select>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon"
                        onClick={addFilter}
                        disabled={!newFilterValue}
                        aria-label={t('wizard.step2.addFilter')}
                      />
                    }
                  >
                    <Plus />
                  </TooltipTrigger>
                  <TooltipPopup>{t('wizard.step2.addFilter')}</TooltipPopup>
                </Tooltip>
              </div>

              {filters.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="font-medium text-sm">
                    {t('wizard.step2.activeFilters')} ({filters.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {filters.map(filter => (
                      <Badge
                        key={filter.id}
                        variant={filter.operator === 'include' ? 'info' : 'secondary'}
                        className="gap-1.5 py-1 ps-2 pe-1 text-sm"
                      >
                        {getFilterIcon(filter)}
                        <span className="font-medium">
                          {filter.operator === 'include'
                            ? t('wizard.step2.include')
                            : t('wizard.step2.exclude')}
                          :
                        </span>
                        <span>{getFilterLabel(filter)}</span>
                        <button
                          type="button"
                          onClick={() => removeFilter(filter.id)}
                          aria-label={t('wizard.step2.removeFilter', {
                            label: getFilterLabel(filter),
                          })}
                          className="rounded-full p-0.5 hover:bg-foreground/8"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-muted-foreground text-sm">
                  {t('wizard.step2.noFiltersAdded')}
                </p>
              )}
            </div>
          )}
        </CardPanel>
      </Card>
    </WizardStepLayout>
  );
};

export default Step2_Audience;
