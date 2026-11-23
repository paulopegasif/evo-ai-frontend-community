import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, AlertCircle } from '@/components/icons';
import { TransferJourneyNodeData } from './TransferJourneyNode';
import { NodeConfigModal } from '@/components/journey/shared/NodeConfigModal';
import { FlowFeedbackBanner } from '@/components/journey/_ui';
import { journeyService } from '@/services';
import type { Journey } from '@/types/automation';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface TransferJourneyPanelProps {
  nodeId: string;
  data: TransferJourneyNodeData;
  onUpdate: (nodeId: string, newData: TransferJourneyNodeData) => void;
  onClose: () => void;
  journeyId: string;
}

export function TransferJourneyPanel({
  nodeId,
  data,
  onUpdate,
  onClose,
  journeyId,
}: TransferJourneyPanelProps) {
  const { t } = useLanguage('journey');

  const [formData, setFormData] = useState<TransferJourneyNodeData>({
    ...data,
    targetJourneyId: data.targetJourneyId || '',
    targetJourneyName: data.targetJourneyName || '',
  });
  const [originalTargetId] = useState<string>(() => data.targetJourneyId || '');

  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJourneys = async () => {
      try {
        setLoading(true);
        const response = await journeyService.getJourneys({
          limit: 100,
        });

        const availableJourneys = response.data.filter(j => j.id !== journeyId && j.isActive);
        setJourneys(availableJourneys);
      } catch (error) {
        console.error('Erro ao carregar jornadas:', error);
        toast.error(t('panels.transferJourney.messages.loadError'));
        setJourneys([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJourneys();
  }, [journeyId]);

  const handleSave = () => {
    onUpdate(nodeId, formData);
    toast.success(t('panels.transferJourney.messages.configuredSuccess'));
    onClose();
  };

  const handleJourneyChange = (newJourneyId: string) => {
    const selectedJourney = journeys.find(j => j.id === newJourneyId);
    setFormData(prev => ({
      ...prev,
      targetJourneyId: newJourneyId,
      targetJourneyName: selectedJourney?.name || '',
    }));
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="success">{t('panels.transferJourney.status.active')}</Badge>;
    } else {
      return <Badge variant="secondary">{t('panels.transferJourney.status.inactive')}</Badge>;
    }
  };

  const journeyItems = journeys.map(journey => ({ value: journey.id || '', label: journey.name }));

  const isValid = !!formData.targetJourneyId;
  const dirty = useMemo(
    () => formData.targetJourneyId !== originalTargetId,
    [formData.targetJourneyId, originalTargetId],
  );

  return (
    <NodeConfigModal
      open
      variant="simple"
      title={t('panels.transferJourney.title')}
      icon={<ArrowRight className="size-5 text-flow-node-action-pipeline-fg" />}
      onCancel={onClose}
      onSave={handleSave}
      dirty={dirty && isValid}
      saveLabel={t('panels.transferJourney.actions.save')}
      cancelLabel={t('panels.transferJourney.actions.cancel')}
    >
      <div className="space-y-4">
        {!isValid && (
          <FlowFeedbackBanner variant="warn">
            <p className="font-medium">{t('panels.transferJourney.incompleteConfig')}:</p>
            <ul className="text-xs mt-1 list-disc list-inside">
              <li>{t('panels.transferJourney.selectDestination')}</li>
            </ul>
          </FlowFeedbackBanner>
        )}

        <Field>
          <FieldLabel>
            {t('panels.transferJourney.destinationJourney')}
          </FieldLabel>

          {loading ? (
            <div className="w-full" aria-busy="true">
              <Skeleton className="h-9 w-full rounded-lg sm:h-8" />
              <span className="sr-only">{t('panels.transferJourney.loading')}</span>
            </div>
          ) : journeys.length === 0 ? (
            <Empty className="w-full rounded-xl border border-dashed p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle />
                </EmptyMedia>
                <EmptyTitle className="text-base">
                  {t('panels.transferJourney.noJourneysAvailable')}
                </EmptyTitle>
                <EmptyDescription>{t('panels.transferJourney.noActiveJourneys')}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Select
                items={journeyItems}
                value={formData.targetJourneyId || null}
                onValueChange={v => handleJourneyChange(String(v ?? ''))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('panels.transferJourney.chooseJourney')} />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {journeys.map(journey => (
                    <SelectItem key={journey.id} value={journey.id || ''}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-medium">{journey.name}</span>
                        {getStatusBadge(journey.isActive)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>

              <FieldDescription>{t('panels.transferJourney.onlyActiveJourneys')}</FieldDescription>
            </>
          )}
        </Field>

        {formData.targetJourneyId && (
          <FlowFeedbackBanner variant="warn">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="mt-1 size-4 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{t('panels.transferJourney.transferConfigured')}</p>
                  <p className="text-sm mt-1">
                    {t('panels.transferJourney.contactWillBeTransferred')}:
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {formData.targetJourneyName}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-flow-feedback-warn-border pt-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">
                      {t('panels.transferJourney.important')}:
                    </p>
                    <ul className="text-xs space-y-0.5">
                      <li>• {t('panels.transferJourney.warnings.exitImmediately')}</li>
                      <li>• {t('panels.transferJourney.warnings.startFromFirst')}</li>
                      <li>• {t('panels.transferJourney.warnings.noDataTransfer')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </FlowFeedbackBanner>
        )}
      </div>
    </NodeConfigModal>
  );
}
