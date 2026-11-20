import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { segmentsService } from '@/services/segments/segmentsService';
import { Segment } from '@/types/analytics';
import { useLanguage } from '@/hooks/useLanguage';

interface SegmentConfigurationProps {
  segmentId: string;
  segmentAction: 'entered' | 'exited';
  onSegmentIdChange: (segmentId: string, segmentName?: string) => void;
  onSegmentActionChange: (action: 'entered' | 'exited') => void;
}

export function SegmentConfiguration({
  segmentId,
  segmentAction,
  onSegmentIdChange,
  onSegmentActionChange,
}: SegmentConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableSegments, setAvailableSegments] = useState<Segment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableSegments([]);
    setError(null);

    const loadSegments = async () => {
      if (loadingSegments) return;

      setLoadingSegments(true);
      setError(null);

      try {
        const response = await segmentsService.getSegments({
          limit: 100, // Buscar todos os segmentos
          status: 'running', // Apenas segmentos ativos
        });
        setAvailableSegments(response.data || []);
      } catch (error) {
        console.error('Error loading segments:', error);
        setError(t('triggerComponents.segment.loadError'));
      } finally {
        setLoadingSegments(false);
      }
    };

    loadSegments();
    // loadingSegments is a guard flag, not an input — including it would re-run the fetch on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const selectedSegment = availableSegments.find(s => s.id === segmentId);
  const actionItems = [
    { value: 'entered', label: t('triggerComponents.segment.whenEntered') },
    { value: 'exited', label: t('triggerComponents.segment.whenExited') },
  ];
  const segmentItems = availableSegments.map(segment => ({ value: segment.id, label: segment.name }));

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-foreground">
          {t('triggerComponents.segment.configuration')}
        </h3>

        {/* Ação do Segmento */}
        <Field>
          <FieldLabel>
            {t('triggerComponents.segment.segmentAction')}
          </FieldLabel>
          <Select
            items={actionItems}
            value={segmentAction || null}
            onValueChange={value => value != null && onSegmentActionChange(value as 'entered' | 'exited')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('triggerComponents.segment.selectAction')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              <SelectItem value="entered">
                <div className="flex items-center gap-2">
                  <Badge variant="success">
                    {t('triggerComponents.segment.entered')}
                  </Badge>
                  <span>{t('triggerComponents.segment.whenEntered')}</span>
                </div>
              </SelectItem>
              <SelectItem value="exited">
                <div className="flex items-center gap-2">
                  <Badge variant="error">{t('triggerComponents.segment.exited')}</Badge>
                  <span>{t('triggerComponents.segment.whenExited')}</span>
                </div>
              </SelectItem>
            </SelectPopup>
          </Select>
        </Field>

        {/* Seleção do Segmento */}
        <Field>
          <FieldLabel>{t('triggerComponents.segment.segment')}</FieldLabel>
          {error ? (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Select
              items={segmentItems}
              value={segmentId || null}
              onValueChange={value => {
                const selectedSegmentId = String(value ?? '');
                const selectedSegment = availableSegments.find(s => s.id === selectedSegmentId);
                onSegmentIdChange(selectedSegmentId, selectedSegment?.name);
              }}
              disabled={loadingSegments}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingSegments
                      ? t('triggerComponents.segment.loadingSegments')
                      : t('triggerComponents.segment.selectSegment')
                  }
                />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {loadingSegments ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.segment.loading')}
                  </div>
                ) : availableSegments.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.segment.noActiveSegmentsFound')}
                  </div>
                ) : (
                  availableSegments.map(segment => (
                    <SelectItem
                      key={segment.id}
                      value={segment.id}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{segment.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {segment.contactsCount || segment.computedCount || 0}{' '}
                            {t('triggerComponents.segment.contacts')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {t('triggerComponents.segment.status')}:{' '}
                            {segment.status === 'running'
                              ? t('triggerComponents.segment.active')
                              : t('triggerComponents.segment.paused')}
                          </span>
                          {segment.lastComputedAt && (
                            <span>
                              • {t('triggerComponents.segment.updated')}:{' '}
                              {new Date(segment.lastComputedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectPopup>
            </Select>
          )}
        </Field>

        {/* Informações do Segmento Selecionado */}
        {selectedSegment && (
          <div className="rounded-xl border bg-muted/24 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('triggerComponents.segment.selectedSegment')}
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.name')}:</span>
                <span className="font-medium">{selectedSegment.name}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.contacts')}:</span>
                <span className="font-medium">
                  {selectedSegment.contactsCount || selectedSegment.computedCount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('triggerComponents.segment.status')}:</span>
                <Badge
                  variant={selectedSegment.status === 'running' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {selectedSegment.status === 'running'
                    ? t('triggerComponents.segment.active')
                    : t('triggerComponents.segment.paused')}
                </Badge>
              </div>
              {selectedSegment.lastComputedAt && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.segment.lastUpdate')}:</span>
                  <span className="font-medium">
                    {new Date(selectedSegment.lastComputedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="text-sm text-info-foreground">
            {segmentAction === 'entered'
              ? t('triggerComponents.segment.enteredDescription')
              : t('triggerComponents.segment.exitedDescription')}
            {selectedSegment && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.segment.segment')}: {selectedSegment.name} (
                {selectedSegment.contactsCount || selectedSegment.computedCount || 0}{' '}
                {t('triggerComponents.segment.contacts')})
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
