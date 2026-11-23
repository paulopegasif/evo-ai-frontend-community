import { useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { VariableMapping, type DataMapping } from '@/components/journey/environment-manager';
import { propertiesToRecord, type EventProperty } from '@/lib/events-manifest';
import { useLanguage } from '@/hooks/useLanguage';

export interface EventAdvancedConfigProps {
  eventProperties: EventProperty[];
  variableMappings: DataMapping[];
  onVariableMappingsChange: (mappings: DataMapping[]) => void;
  journeyId?: string;
}

/**
 * Avançado half of the event trigger config (EVO-1276): the "Capture Event Data"
 * <VariableMapping> block. Stateless — it derives the available autocomplete
 * `paths` from the lifted `eventProperties` and round-trips mappings through the
 * parent. Extracted from EventConfiguration so the Avançado tab can render it
 * without re-mounting the stateful selector that lives in EventBasicConfig.
 */
export function EventAdvancedConfig({
  eventProperties,
  variableMappings,
  onVariableMappingsChange,
  journeyId,
}: EventAdvancedConfigProps) {
  const { t } = useLanguage('journey');

  const paths = useMemo(() => {
    const basePaths = ['event.id', 'event.name', 'event.timestamp', 'event.user_id'];
    const record = propertiesToRecord(eventProperties);
    const propertyPaths = Object.keys(record).map((key) => `event.properties.${key}`);
    return [...basePaths, ...propertyPaths];
  }, [eventProperties]);

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-foreground">
          {t('triggerComponents.event.captureEventData')}
        </h4>
        <VariableMapping
          mappings={variableMappings}
          onMappingsChange={onVariableMappingsChange}
          paths={paths}
          journeyId={journeyId}
          className="rounded-xl border bg-muted/24 p-4"
        />
      </div>
    </>
  );
}
