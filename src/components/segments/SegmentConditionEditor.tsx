import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OptionSelect from './ui/OptionSelect';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Settings, Clock, Plus, X } from 'lucide-react';
import {
  EVENT_CATEGORIES,
  getEventsByCategory,
  getEventLabel,
  resolveLegacyEventName,
  type EventCategory,
} from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

// Componentes especializados
import ConditionTypeSelector from './ui/ConditionTypeSelector';
import UserPropertyEditor from './editors/UserPropertyEditor';
import LabelConditionEditor from './editors/LabelConditionEditor';
import CustomAttributeEditor from './editors/CustomAttributeEditor';
import {
  SegmentNodeUnion,
  UserPropertyNode,
  PerformedNode,
  LastPerformedNode,
  EmailNode,
  RandomBucketNode,
  ManualNode,
  LabelNode,
  CustomAttributeNode,
  PropertyFilter,
} from '@/types/analytics';
import { labelsService } from '@/services/contacts/labelsService';
import { customAttributesService } from '@/services/customAttributes/customAttributesService';
import { Label as LabelType } from '@/types/settings';
import { CustomAttributeDefinition, AttributeModel } from '@/types/settings';

interface SegmentConditionEditorProps {
  condition: SegmentNodeUnion;
  index: number;
  onUpdate: (index: number, condition: SegmentNodeUnion) => void;
  onRemove: (index: number) => void;
}

// Category headers for the Performed/LastPerformed event selector. The 'custom'
// category is intentionally omitted: free-form custom events were removed in
// EVO-1263 (only canonical manifest events are selectable now).
const SEGMENT_EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  contact: 'Eventos de Contato',
  conversation: 'Eventos de Conversa',
  message: 'Eventos de Mensagem',
  campaign: 'Eventos de Campanha',
  custom: 'Personalizado',
};

// Manifest-driven, category-grouped event picker shared by the Performed and
// LastPerformed conditions. Stores the canonical dot-notation event name (e.g.
// `contact.created`) — the SAME format evo-flow matches against in ClickHouse
// (`event_name = '<event>'`). This replaces the old free-text input + hardcoded
// snake_case templates, which never matched the stored canonical names.
function ManifestEventSelect({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (eventName: string) => void;
}) {
  const { currentLanguage } = useLanguage();
  // A persisted node may hold a legacy snake_case value (e.g. `contact_created`)
  // from before EVO-1263, or a value already in canonical form. Resolve it so it
  // matches a dot-notation <SelectItem> and the saved event still renders its
  // label (AC6). Non-backend legacy values (no canonical equivalent) resolve to
  // 'custom', which is not an option, so the picker shows the placeholder.
  const resolved = resolveLegacyEventName(value);
  const selected = resolved.selectorValue && resolved.selectorValue !== 'custom' ? resolved.selectorValue : '';
  return (
    <OptionSelect
      value={selected}
      onValueChange={v => v && onSelect(v)}
      placeholder="Selecione um evento"
      className="w-full"
      groups={EVENT_CATEGORIES.filter(category => category !== 'custom').map(category => ({
        key: category,
        label: SEGMENT_EVENT_CATEGORY_LABELS[category],
      }))}
      options={EVENT_CATEGORIES.filter(category => category !== 'custom').flatMap(category =>
        getEventsByCategory(category).map(entry => ({
          value: entry.eventName,
          label: getEventLabel(entry.eventName, currentLanguage),
          group: category,
        })),
      )}
    />
  );
}

export default function SegmentConditionEditor({
  condition,
  index,
  onUpdate,
  onRemove,
}: SegmentConditionEditorProps) {
  const { t } = useLanguage('segments');
  const [selectedConditionType, setSelectedConditionType] = useState<string>(condition.type || '');
  const [localCondition, setLocalCondition] = useState<SegmentNodeUnion>(condition);

  // Configuration toggles
  const [showPropertyConfig, setShowPropertyConfig] = useState(false);
  const [showTimeWindow, setShowTimeWindow] = useState(false);

  // Form values
  const [operatorType, setOperatorType] = useState<string>('Equals');
  const [operatorValue, setOperatorValue] = useState<string>('');
  const [timeWindowValue, setTimeWindowValue] = useState<number>(30);
  const [timeWindowUnit, setTimeWindowUnit] = useState<string>('days');
  const [initialized, setInitialized] = useState(false);
  const [bucketPercent, setBucketPercent] = useState<number>(50);
  const [performedProperties, setPerformedProperties] = useState<PropertyFilter[]>([]);

  // Label and Custom Attribute specific
  const [selectedLabelId, setSelectedLabelId] = useState<string>('');
  const [labelConditionType, setLabelConditionType] = useState<'has' | 'not_has'>('has');
  const [customAttributeName, setCustomAttributeName] = useState<string>('');
  const [customAttributeOperatorType, setCustomAttributeOperatorType] = useState<string>('Equals');
  const [customAttributeValue, setCustomAttributeValue] = useState<string>('');

  // Lists from API
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>([]);
  const [availableCustomAttributes, setAvailableCustomAttributes] = useState<
    CustomAttributeDefinition[]
  >([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [loadingCustomAttributes, setLoadingCustomAttributes] = useState(false);

  // Load labels when needed
  const loadLabels = useCallback(async () => {
    if (loadingLabels || availableLabels.length > 0) return;

    setLoadingLabels(true);
    try {
      const response = await labelsService.getLabels();
      setAvailableLabels(response.data || []);
    } catch (error) {
      console.error('Error loading labels:', error);
    } finally {
      setLoadingLabels(false);
    }
  }, [loadingLabels, availableLabels.length]);

  // Load custom attributes when needed
  const loadCustomAttributes = useCallback(async () => {
    if (loadingCustomAttributes) return;

    setLoadingCustomAttributes(true);
    try {
      const attributes = await customAttributesService.getCustomAttributes();

      // Filter only contact attributes
      const contactAttributes = attributes.data.filter(
        attr => attr.attribute_model === AttributeModel.CONTACT_ATTRIBUTE,
      );

      setAvailableCustomAttributes(contactAttributes);
    } catch (error) {
      console.error('Error loading custom attributes:', error);
    } finally {
      setLoadingCustomAttributes(false);
    }
  }, [loadingCustomAttributes, availableCustomAttributes.length]);

  // Initialize from condition only once to avoid reset loops
  useEffect(() => {
    if (initialized) return;

    setSelectedConditionType(condition.type);

    switch (condition.type) {
      case 'UserProperty': {
        const node = condition as UserPropertyNode;
        setOperatorType(node.operator?.type || 'Equals');
        setOperatorValue(String(node.operator?.value || ''));
        break;
      }
      case 'Performed': {
        const node = condition as PerformedNode;
        setPerformedProperties(node.properties || []);
        setShowPropertyConfig((node.properties?.length || 0) > 0);
        setShowTimeWindow(node.withinSeconds !== undefined);
        if (node.withinSeconds) {
          // Convert from seconds to best unit
          const { value, unit } = convertFromSeconds(node.withinSeconds);
          setTimeWindowValue(value);
          setTimeWindowUnit(unit);
        }
        break;
      }
      case 'LastPerformed': {
        const node = condition as LastPerformedNode;
        setPerformedProperties(node.whereProperties || []);
        setShowPropertyConfig((node.whereProperties?.length || 0) > 0);
        setShowTimeWindow(node.withinSeconds !== undefined);
        if (node.withinSeconds) {
          // Convert from seconds to best unit
          const { value, unit } = convertFromSeconds(node.withinSeconds);
          setTimeWindowValue(value);
          setTimeWindowUnit(unit);
        }
        break;
      }
      case 'RandomBucket': {
        const node = condition as RandomBucketNode;
        setBucketPercent(node.percent * 100);
        break;
      }
      case 'Label': {
        const node = condition as LabelNode;
        // Para manter compatibilidade, verificar se labelId é um UUID (formato antigo) ou nome (formato novo)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          node.labelId,
        );
        if (isUUID) {
          // Formato antigo com UUID - precisamos encontrar o nome da label
          // Por enquanto, usar o UUID e converter depois que as labels carregarem
          setSelectedLabelId(node.labelId);
        } else {
          // Formato novo com nome da label
          setSelectedLabelId(node.labelId);
        }
        setLabelConditionType(node.condition);
        loadLabels(); // Load labels when editing
        break;
      }
      case 'CustomAttribute': {
        const node = condition as CustomAttributeNode;
        setCustomAttributeName(node.attributeName);
        setCustomAttributeOperatorType(node.operator?.type || 'Equals');
        setCustomAttributeValue(String(node.operator?.value || ''));
        loadCustomAttributes(); // Load attributes when editing
        break;
      }
    }

    setInitialized(true);
  }, [condition, initialized, loadCustomAttributes, loadLabels]);

  // Convert UUID labelId to label name after labels are loaded (for backward compatibility)
  useEffect(() => {
    if (selectedConditionType === 'Label' && selectedLabelId && availableLabels.length > 0) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        selectedLabelId,
      );
      if (isUUID) {
        // Find label by ID and update to use name instead
        const label = availableLabels.find(l => l.id === selectedLabelId);
        if (label) {
          setSelectedLabelId(label.title);
          // Update the condition to use the label name
          const node = localCondition as LabelNode;
          const updatedCondition = { ...node, labelId: label.title };
          setLocalCondition(updatedCondition);
          onUpdate(index, updatedCondition);
        }
      }
    }
  }, [selectedConditionType, selectedLabelId, availableLabels, localCondition, index, onUpdate]);

  const handleConditionTypeChange = (value: string) => {
    setSelectedConditionType(value);

    const baseCondition = {
      id: condition.id,
      type: value,
    };

    let newCondition: SegmentNodeUnion;

    switch (value) {
      case 'UserProperty':
        newCondition = {
          ...baseCondition,
          type: 'UserProperty',
          path: '',
          operator: { type: 'Equals', value: '' },
        } as UserPropertyNode;
        break;
      case 'Performed':
        newCondition = {
          ...baseCondition,
          type: 'Performed',
          event: '',
          times: 1,
          timesOperator: 'GreaterThanOrEqual',
        } as PerformedNode;
        break;
      case 'LastPerformed':
        newCondition = {
          ...baseCondition,
          type: 'LastPerformed',
          event: '',
        } as LastPerformedNode;
        break;
      case 'Email':
        newCondition = {
          ...baseCondition,
          type: 'Email',
          event: 'MessageSent',
          templateId: '',
        } as EmailNode;
        break;
      case 'WhatsApp':
        newCondition = {
          ...baseCondition,
          type: 'WhatsApp',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'Web':
        newCondition = {
          ...baseCondition,
          type: 'Web',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'SMS':
        newCondition = {
          ...baseCondition,
          type: 'SMS',
          event: 'MessageSent',
          templateId: '',
        } as unknown as EmailNode;
        break;
      case 'RandomBucket':
        newCondition = {
          ...baseCondition,
          type: 'RandomBucket',
          percent: 0.5,
        } as RandomBucketNode;
        break;
      case 'Manual':
        newCondition = {
          ...baseCondition,
          type: 'Manual',
          version: Date.now(),
        } as ManualNode;
        break;
      case 'Label':
        newCondition = {
          ...baseCondition,
          type: 'Label',
          labelId: '',
          condition: 'has',
        } as LabelNode;
        loadLabels(); // Load labels when selecting this type
        break;
      case 'CustomAttribute':
        newCondition = {
          ...baseCondition,
          type: 'CustomAttribute',
          attributeName: '',
          operator: { type: 'Equals', value: '' },
        } as CustomAttributeNode;
        loadCustomAttributes(); // Load attributes when selecting this type
        break;
      default:
        return;
    }

    setLocalCondition(newCondition);
    onUpdate(index, newCondition);
  };

  const updateCondition = () => {
    onUpdate(index, localCondition);
  };

  const handlePropertyChange = (field: string, value: unknown) => {
    const updatedCondition = { ...localCondition, [field]: value } as SegmentNodeUnion;
    setLocalCondition(updatedCondition);
    updateCondition();
  };

  // Selecting a canonical event from the manifest. Stores the dot-notation name.
  // For the events that have a dedicated property editor (custom attribute /
  // label pickers) we eagerly load the aux data AND seed the keyed property so
  // the special UI shows up — preserving the affordance the old per-event
  // templates used to provide (the templates themselves were removed in
  // EVO-1263, but this single keyed property is what gates the editors).
  const handleEventSelect = (eventName: string) => {
    let seeded: PropertyFilter[] | undefined;
    if (eventName === 'contact.custom_attribute.changed') {
      loadCustomAttributes();
      seeded = [{ path: 'attributeName', operator: { type: 'Equals', value: '' } }];
    } else if (eventName === 'contact.label.added' || eventName === 'contact.label.removed') {
      loadLabels();
      seeded = [{ path: 'labelName', operator: { type: 'Equals', value: '' } }];
    }

    if (!seeded) {
      handlePropertyChange('event', eventName);
      return;
    }

    // LastPerformed stores its filters under `whereProperties`; Performed under
    // `properties`. Update + propagate directly (handlePropertyChange's
    // updateCondition reads stale state).
    const isLast = localCondition.type === 'LastPerformed';
    const updated = {
      ...localCondition,
      event: eventName,
      ...(isLast ? { whereProperties: seeded } : { properties: seeded }),
    } as PerformedNode | LastPerformedNode;
    setLocalCondition(updated);
    setPerformedProperties(seeded);
    setShowPropertyConfig(true);
    onUpdate(index, updated);
  };

  const handleOperatorChange = () => {
    if (localCondition.type === 'UserProperty') {
      const updated = {
        ...localCondition,
        operator: {
          type: operatorType,
          value:
            operatorType === 'Exists' || operatorType === 'NotExists' ? undefined : operatorValue,
        },
      } as UserPropertyNode;
      setLocalCondition(updated);
      onUpdate(index, updated);
    } else if (localCondition.type === 'CustomAttribute') {
      const updated = {
        ...localCondition,
        operator: {
          type: customAttributeOperatorType,
          value:
            customAttributeOperatorType === 'Exists' || customAttributeOperatorType === 'NotExists'
              ? undefined
              : customAttributeValue,
        },
      } as CustomAttributeNode;
      setLocalCondition(updated);
      onUpdate(index, updated);
    }
  };

  const addProperty = () => {
    const newProperty: PropertyFilter = {
      path: '',
      operator: { type: 'Equals', value: '' },
    };
    const updated = [...performedProperties, newProperty];
    setPerformedProperties(updated);

    if (localCondition.type === 'Performed') {
      const node = { ...localCondition, properties: updated } as PerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    } else if (localCondition.type === 'LastPerformed') {
      const node = { ...localCondition, whereProperties: updated } as LastPerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const removeProperty = (propertyIndex: number) => {
    const updated = performedProperties.filter((_, i) => i !== propertyIndex);
    setPerformedProperties(updated);

    if (localCondition.type === 'Performed') {
      const node = {
        ...localCondition,
        properties: updated.length > 0 ? updated : undefined,
      } as PerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    } else if (localCondition.type === 'LastPerformed') {
      const node = {
        ...localCondition,
        whereProperties: updated.length > 0 ? updated : undefined,
      } as LastPerformedNode;
      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const updateTimeWindow = (newValue?: number, newUnit?: string) => {
    if (localCondition.type === 'Performed' || localCondition.type === 'LastPerformed') {
      // Get the most current values - either from parameters or current state
      const actualValue = newValue !== undefined ? newValue : timeWindowValue;
      const actualUnit = newUnit !== undefined ? newUnit : timeWindowUnit;

      const seconds = showTimeWindow ? convertToSeconds(actualValue, actualUnit) : undefined;
      const node = {
        ...localCondition,
        withinSeconds: seconds,
      } as PerformedNode | LastPerformedNode;

      setLocalCondition(node);
      onUpdate(index, node);
    }
  };

  const convertToSeconds = (value: number, unit: string): number => {
    switch (unit) {
      case 'minutes':
        return value * 60;
      case 'hours':
        return value * 3600;
      case 'days':
        return value * 86400;
      case 'weeks':
        return value * 604800;
      case 'months':
        return value * 2592000;
      default:
        return value;
    }
  };

  const convertFromSeconds = (seconds: number): { value: number; unit: string } => {
    if (seconds === 0) return { value: 0, unit: 'minutes' };

    // Check in order from smallest to largest unit to get the best fit
    if (seconds % 2592000 === 0) {
      // months
      return { value: seconds / 2592000, unit: 'months' };
    } else if (seconds % 604800 === 0) {
      // weeks
      return { value: seconds / 604800, unit: 'weeks' };
    } else if (seconds % 86400 === 0) {
      // days
      return { value: seconds / 86400, unit: 'days' };
    } else if (seconds % 3600 === 0) {
      // hours
      return { value: seconds / 3600, unit: 'hours' };
    } else if (seconds % 60 === 0) {
      // minutes
      return { value: seconds / 60, unit: 'minutes' };
    } else {
      // If not divisible by any standard unit, use the most appropriate
      if (seconds >= 2592000) {
        return { value: Math.round((seconds / 2592000) * 10) / 10, unit: 'months' };
      } else if (seconds >= 604800) {
        return { value: Math.round((seconds / 604800) * 10) / 10, unit: 'weeks' };
      } else if (seconds >= 86400) {
        return { value: Math.round((seconds / 86400) * 10) / 10, unit: 'days' };
      } else if (seconds >= 3600) {
        return { value: Math.round((seconds / 3600) * 10) / 10, unit: 'hours' };
      } else {
        return { value: Math.round((seconds / 60) * 10) / 10, unit: 'minutes' };
      }
    }
  };


  return (
    <div className="rounded-xl border bg-card p-4 shadow-xs/5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ConditionTypeSelector
            value={selectedConditionType}
            onChange={handleConditionTypeChange}
          />
        </div>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(index)}
                aria-label={t('conditionEditor.removeCondition')}
              />
            }
          >
            <Trash2 />
          </TooltipTrigger>
          <TooltipPopup>{t('conditionEditor.removeCondition')}</TooltipPopup>
        </Tooltip>
      </div>

      {/* Condition Body */}
      {selectedConditionType && (
        <div className="mt-4 border-t pt-4">
          {/* User Property Configuration */}
          {selectedConditionType === 'UserProperty' && (
            <UserPropertyEditor
              condition={localCondition as UserPropertyNode}
              operatorType={operatorType}
              operatorValue={operatorValue}
              onOperatorTypeChange={type => {
                setOperatorType(type);
                handleOperatorChange();
              }}
              onOperatorValueChange={value => {
                setOperatorValue(value);
                handleOperatorChange();
              }}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
            />
          )}

          {/* Label Configuration */}
          {selectedConditionType === 'Label' && (
            <LabelConditionEditor
              condition={localCondition as LabelNode}
              availableLabels={availableLabels}
              loadingLabels={loadingLabels}
              selectedLabelId={selectedLabelId}
              labelConditionType={labelConditionType}
              onLabelIdChange={setSelectedLabelId}
              onConditionTypeChange={setLabelConditionType}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
              onLoadLabels={loadLabels}
            />
          )}

          {/* Custom Attribute Configuration */}
          {selectedConditionType === 'CustomAttribute' && (
            <CustomAttributeEditor
              condition={localCondition as CustomAttributeNode}
              availableCustomAttributes={availableCustomAttributes}
              loadingCustomAttributes={loadingCustomAttributes}
              customAttributeName={customAttributeName}
              customAttributeOperatorType={customAttributeOperatorType}
              customAttributeValue={customAttributeValue}
              onAttributeNameChange={setCustomAttributeName}
              onOperatorTypeChange={type => {
                setCustomAttributeOperatorType(type);
                handleOperatorChange();
              }}
              onValueChange={value => {
                setCustomAttributeValue(value);
                handleOperatorChange();
              }}
              onUpdate={updatedCondition => {
                setLocalCondition(updatedCondition);
                onUpdate(index, updatedCondition);
              }}
              onLoadCustomAttributes={loadCustomAttributes}
            />
          )}

          {/* Performed Configuration */}
          {selectedConditionType === 'Performed' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Nome do Evento</Label>
                <ManifestEventSelect
                  value={(localCondition as PerformedNode).event}
                  onSelect={handleEventSelect}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="mb-2">Vezes Executado</Label>
                  <OptionSelect
                    value={(localCondition as PerformedNode).timesOperator}
                    onValueChange={v => handlePropertyChange('timesOperator', v)}
                    options={[
                      { value: 'GreaterThanOrEqual', label: 'Pelo menos' },
                      { value: 'LessThan', label: 'Menos que' },
                      { value: 'Equals', label: 'Exatamente' },
                    ]}
                  />
                </div>
                <div className="flex-1">
                  <Label className="mb-2">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={(localCondition as PerformedNode).times || 1}
                    onChange={e => handlePropertyChange('times', parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={showPropertyConfig ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowPropertyConfig(!showPropertyConfig);
                    if (!showPropertyConfig && performedProperties.length === 0) {
                      addProperty();
                    }
                  }}
                  
                >
                  <Settings />
                  Propriedades
                </Button>
                <Button
                  variant={showTimeWindow ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newShowTimeWindow = !showTimeWindow;
                    setShowTimeWindow(newShowTimeWindow);
                    // Use the new state value directly since setState is async
                    if (
                      localCondition.type === 'Performed' ||
                      localCondition.type === 'LastPerformed'
                    ) {
                      const seconds = newShowTimeWindow
                        ? convertToSeconds(timeWindowValue, timeWindowUnit)
                        : undefined;
                      const node = {
                        ...localCondition,
                        withinSeconds: seconds,
                      } as PerformedNode | LastPerformedNode;
                      setLocalCondition(node);
                      onUpdate(index, node);
                    }
                  }}
                  
                >
                  <Clock />
                  Janela de Tempo
                </Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-xl border bg-muted/24 p-4">
                  <h4 className="mb-3 font-semibold text-sm">Propriedades do Evento</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/24 p-2">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as PerformedNode).event === 'contact.custom_attribute.changed' &&
                        prop.path === 'attributeName' ? (
                          <OptionSelect
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'attributeName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);
                            }}
                            disabled={loadingCustomAttributes}
                            placeholder={loadingCustomAttributes ? 'Carregando...' : 'Selecione um atributo'}
                            empty={!loadingCustomAttributes ? 'Nenhum atributo personalizado cadastrado' : undefined}
                            className="flex-1"
                            options={availableCustomAttributes.map(attr => ({
                              value: attr.attribute_key,
                              label: attr.attribute_display_name,
                              content: (
                                <div className="flex flex-col">
                                  <span>{attr.attribute_display_name}</span>
                                  {attr.attribute_description && (
                                    <span className="text-muted-foreground text-xs">{attr.attribute_description}</span>
                                  )}
                                </div>
                              ),
                            }))}
                          />
                        ) : /* Special handling for labelName in label events */
                        ((localCondition as PerformedNode).event === 'contact.label.added' ||
                            (localCondition as PerformedNode).event === 'contact.label.removed') &&
                          prop.path === 'labelName' ? (
                          <OptionSelect
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'labelName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);
                            }}
                            disabled={loadingLabels}
                            placeholder={loadingLabels ? 'Carregando...' : 'Selecione uma label'}
                            empty={!loadingLabels ? 'Nenhuma label cadastrada' : undefined}
                            className="flex-1"
                            options={availableLabels.map(label => ({
                              value: label.title,
                              label: label.title,
                              content: (
                                <span className="flex items-center gap-2">
                                  <span className="size-3 rounded-full" style={{ backgroundColor: label.color }} />
                                  {label.title}
                                </span>
                              ),
                            }))}
                          />
                        ) : (
                          <Input
                            placeholder="Caminho"
                            value={prop.path}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = { ...prop, path: e.target.value };
                              setPerformedProperties(updated);
                            }}
                            className="flex-1"
                          />
                        )}
                        <OptionSelect
                          value={prop.operator.type}
                          onValueChange={v => {
                            const updated = [...performedProperties];
                            updated[i] = { ...prop, operator: { ...prop.operator, type: v } };
                            setPerformedProperties(updated);
                          }} className="w-32"
                          options={[
                            { value: 'Equals', label: 'Igual' },
                            { value: 'NotEquals', label: 'Diferente' },
                            { value: 'Contains', label: 'Contém' },
                            { value: 'Exists', label: 'Existe' },
                          ]}
                        />
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder="Valor"
                            value={prop.operator.value || ''}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                operator: { ...prop.operator, value: e.target.value },
                              };
                              setPerformedProperties(updated);
                            }}
                            className="flex-1"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeProperty(i)}
                          aria-label={t('conditionEditor.removeProperty')}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addProperty} className="w-full">
                      <Plus />
                      Adicionar Propriedade
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-xl border bg-muted/24 p-4">
                  <h4 className="mb-3 font-semibold text-sm">Janela de Tempo</h4>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={timeWindowValue}
                      onChange={e => {
                        const newValue = parseInt(e.target.value);
                        setTimeWindowValue(newValue);
                        updateTimeWindow(newValue, timeWindowUnit);
                      }}
                      className="w-24"
                    />
                    <OptionSelect
                      value={timeWindowUnit}
                      onValueChange={v => {
                        setTimeWindowUnit(v);
                        updateTimeWindow(timeWindowValue, v);
                      }}
                      options={[
                        { value: 'minutes', label: 'Minutos' },
                        { value: 'hours', label: 'Horas' },
                        { value: 'days', label: 'Dias' },
                        { value: 'weeks', label: 'Semanas' },
                        { value: 'months', label: 'Meses' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Last Performed Configuration */}
          {selectedConditionType === 'LastPerformed' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Nome do Evento</Label>
                <ManifestEventSelect
                  value={(localCondition as LastPerformedNode).event}
                  onSelect={handleEventSelect}
                />
              </div>

              {/* Toggle Buttons */}
              <div className="flex gap-2">
                <Button
                  variant={showPropertyConfig ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setShowPropertyConfig(!showPropertyConfig);
                    if (!showPropertyConfig && performedProperties.length === 0) {
                      addProperty();
                    }
                  }}
                  
                >
                  <Settings />
                  Onde Propriedades
                </Button>
                <Button
                  variant={showTimeWindow ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newShowTimeWindow = !showTimeWindow;
                    setShowTimeWindow(newShowTimeWindow);
                    // Use the new state value directly since setState is async
                    if (
                      localCondition.type === 'Performed' ||
                      localCondition.type === 'LastPerformed'
                    ) {
                      const seconds = newShowTimeWindow
                        ? convertToSeconds(timeWindowValue, timeWindowUnit)
                        : undefined;
                      const node = {
                        ...localCondition,
                        withinSeconds: seconds,
                      } as PerformedNode | LastPerformedNode;
                      setLocalCondition(node);
                      onUpdate(index, node);
                    }
                  }}
                  
                >
                  <Clock />
                  Janela de Tempo
                </Button>
              </div>

              {/* Properties Panel */}
              {showPropertyConfig && (
                <div className="rounded-xl border bg-muted/24 p-4">
                  <h4 className="mb-3 font-semibold text-sm">Onde Propriedades</h4>
                  <div className="space-y-2">
                    {performedProperties.map((prop, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/24 p-2">
                        {/* Special handling for attributeName in custom_attribute_changed */}
                        {(localCondition as LastPerformedNode).event ===
                          'contact.custom_attribute.changed' && prop.path === 'attributeName' ? (
                          <OptionSelect
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'attributeName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            disabled={loadingCustomAttributes}
                            placeholder={loadingCustomAttributes ? 'Carregando...' : 'Selecione um atributo'}
                            empty={!loadingCustomAttributes ? 'Nenhum atributo personalizado cadastrado' : undefined}
                            className="flex-1"
                            options={availableCustomAttributes.map(attr => ({
                              value: attr.attribute_key,
                              label: attr.attribute_display_name,
                              content: (
                                <div className="flex flex-col">
                                  <span>{attr.attribute_display_name}</span>
                                  {attr.attribute_description && (
                                    <span className="text-muted-foreground text-xs">{attr.attribute_description}</span>
                                  )}
                                </div>
                              ),
                            }))}
                          />
                        ) : /* Special handling for labelName in label events */
                        ((localCondition as LastPerformedNode).event === 'contact.label.added' ||
                            (localCondition as LastPerformedNode).event === 'contact.label.removed') &&
                          prop.path === 'labelName' ? (
                          <OptionSelect
                            value={(prop.operator.value as string) || ''}
                            onValueChange={value => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                path: 'labelName',
                                operator: { ...prop.operator, value: value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            disabled={loadingLabels}
                            placeholder={loadingLabels ? 'Carregando...' : 'Selecione uma label'}
                            empty={!loadingLabels ? 'Nenhuma label cadastrada' : undefined}
                            className="flex-1"
                            options={availableLabels.map(label => ({
                              value: label.title,
                              label: label.title,
                              content: (
                                <span className="flex items-center gap-2">
                                  <span className="size-3 rounded-full" style={{ backgroundColor: label.color }} />
                                  {label.title}
                                </span>
                              ),
                            }))}
                          />
                        ) : (
                          <Input
                            placeholder="Caminho"
                            value={prop.path}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = { ...prop, path: e.target.value };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            className="flex-1"
                          />
                        )}
                        <OptionSelect
                          value={prop.operator.type}
                          onValueChange={v => {
                            const updated = [...performedProperties];
                            updated[i] = { ...prop, operator: { ...prop.operator, type: v } };
                            setPerformedProperties(updated);

                            // Update condition for LastPerformed
                            if (localCondition.type === 'LastPerformed') {
                              const node = {
                                ...localCondition,
                                whereProperties: updated,
                              } as LastPerformedNode;
                              setLocalCondition(node);
                              onUpdate(index, node);
                            }
                          }} className="w-32"
                          options={[
                            { value: 'Equals', label: 'Igual' },
                            { value: 'NotEquals', label: 'Diferente' },
                            { value: 'Contains', label: 'Contém' },
                            { value: 'Exists', label: 'Existe' },
                          ]}
                        />
                        {prop.operator.type !== 'Exists' && (
                          <Input
                            placeholder="Valor"
                            value={prop.operator.value || ''}
                            onChange={e => {
                              const updated = [...performedProperties];
                              updated[i] = {
                                ...prop,
                                operator: { ...prop.operator, value: e.target.value },
                              };
                              setPerformedProperties(updated);

                              // Update condition for LastPerformed
                              if (localCondition.type === 'LastPerformed') {
                                const node = {
                                  ...localCondition,
                                  whereProperties: updated,
                                } as LastPerformedNode;
                                setLocalCondition(node);
                                onUpdate(index, node);
                              }
                            }}
                            className="flex-1"
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeProperty(i)}
                          aria-label={t('conditionEditor.removeProperty')}
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={addProperty} className="w-full">
                      <Plus />
                      Adicionar Propriedade
                    </Button>
                  </div>
                </div>
              )}

              {/* Time Window Panel */}
              {showTimeWindow && (
                <div className="rounded-xl border bg-muted/24 p-4">
                  <h4 className="mb-3 font-semibold text-sm">Janela de Tempo</h4>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={timeWindowValue}
                      onChange={e => {
                        const newValue = parseInt(e.target.value);
                        setTimeWindowValue(newValue);
                        updateTimeWindow(newValue, timeWindowUnit);
                      }}
                      className="w-24"
                    />
                    <OptionSelect
                      value={timeWindowUnit}
                      onValueChange={v => {
                        setTimeWindowUnit(v);
                        updateTimeWindow(timeWindowValue, v);
                      }}
                      options={[
                        { value: 'minutes', label: 'Minutos' },
                        { value: 'hours', label: 'Horas' },
                        { value: 'days', label: 'Dias' },
                        { value: 'weeks', label: 'Semanas' },
                        { value: 'months', label: 'Meses' },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Email Configuration */}
          {selectedConditionType === 'Email' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Evento de Email</Label>
                <OptionSelect
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                  options={[
                    { value: 'MessageSent', label: 'Email Enviado' },
                    { value: 'EmailOpened', label: 'Email Aberto' },
                    { value: 'EmailClicked', label: 'Email Clicado' },
                    { value: 'EmailBounced', label: 'Email Retornado' },
                    { value: 'EmailDelivered', label: 'Email Entregue' },
                  ]}
                />
              </div>
              <div>
                <Label className="mb-2">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de email"
                />
              </div>
            </div>
          )}

          {/* WhatsApp Configuration */}
          {selectedConditionType === 'WhatsApp' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Evento de WhatsApp</Label>
                <OptionSelect
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                  options={[
                    { value: 'MessageSent', label: 'WhatsApp Enviado' },
                    { value: 'MessageRead', label: 'WhatsApp Lido' },
                    { value: 'MessageReplied', label: 'WhatsApp Respondido' },
                  ]}
                />
              </div>
              <div>
                <Label className="mb-2">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de WhatsApp"
                />
              </div>
            </div>
          )}

          {/* Web Configuration */}
          {selectedConditionType === 'Web' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Evento Web</Label>
                <OptionSelect
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                  options={[
                    { value: 'MessageSent', label: 'Mensagem Web Enviada' },
                    { value: 'MessageOpened', label: 'Mensagem Web Aberta' },
                    { value: 'MessageClicked', label: 'Mensagem Web Clicada' },
                  ]}
                />
              </div>
              <div>
                <Label className="mb-2">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template web"
                />
              </div>
            </div>
          )}

          {/* SMS Configuration */}
          {selectedConditionType === 'SMS' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Evento de SMS</Label>
                <OptionSelect
                  value={(localCondition as EmailNode).event || 'MessageSent'}
                  onValueChange={v => handlePropertyChange('event', v)}
                  options={[
                    { value: 'MessageSent', label: 'SMS Enviado' },
                    { value: 'MessageRead', label: 'SMS Lido' },
                    { value: 'MessageReplied', label: 'SMS Respondido' },
                  ]}
                />
              </div>
              <div>
                <Label className="mb-2">Template ID (opcional)</Label>
                <Input
                  value={(localCondition as EmailNode).templateId || ''}
                  onChange={e => handlePropertyChange('templateId', e.target.value)}
                  placeholder="ID do template de SMS"
                />
              </div>
            </div>
          )}

          {/* Random Bucket Configuration */}
          {selectedConditionType === 'RandomBucket' && (
            <div className="space-y-4">
              <div>
                <Label className="mb-2">Porcentagem Incluída</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={bucketPercent}
                    onChange={e => {
                      const percent = parseFloat(e.target.value);
                      setBucketPercent(percent);
                      const updated = {
                        ...localCondition,
                        percent: percent / 100,
                      } as RandomBucketNode;
                      setLocalCondition(updated);
                      onUpdate(index, updated);
                    }}
                    className="w-32"
                  />
                  <span className="text-lg font-semibold">%</span>
                </div>
              </div>
            </div>
          )}

          {/* Manual Configuration */}
          {selectedConditionType === 'Manual' && (
            <div className="rounded-xl border border-dashed py-8 text-center">
              <h4 className="text-lg font-semibold mb-2">Upload Manual de Segmento</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload de um arquivo CSV com os IDs dos usuários
              </p>
              <Button variant="outline">📁 Upload CSV</Button>
              <p className="text-xs text-muted-foreground mt-2">Formato: Uma coluna com user_id</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
