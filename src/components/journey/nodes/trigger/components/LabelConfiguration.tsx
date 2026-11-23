import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Field, FieldLabel } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { labelsService } from '@/services/contacts/labelsService';
import { Label as LabelType } from '@/types/settings';
import { useLanguage } from '@/hooks/useLanguage';

interface LabelConfigurationProps {
  labelId: string;
  labelAction: 'applied' | 'removed';
  onLabelIdChange: (labelId: string, labelName?: string) => void;
  onLabelActionChange: (action: 'applied' | 'removed') => void;
}

export function LabelConfiguration({
  labelId,
  labelAction,
  onLabelIdChange,
  onLabelActionChange,
}: LabelConfigurationProps) {
  const { t } = useLanguage('journey');
  const [availableLabels, setAvailableLabels] = useState<LabelType[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAvailableLabels([]);
    setError(null);

    const loadLabels = async () => {
      if (loadingLabels) return;

      setLoadingLabels(true);
      setError(null);

      try {
        const response = await labelsService.getLabels();
        setAvailableLabels(response.data || []);
      } catch (error) {
        console.error('Error loading labels:', error);
        setError(t('triggerComponents.label.loadError'));
      } finally {
        setLoadingLabels(false);
      }
    };

    loadLabels();
    // loadingLabels is a guard flag, not an input — including it would re-run the fetch on every toggle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const selectedLabel = availableLabels.find(l => l.id === labelId);
  const actionItems = [
    { value: 'applied', label: t('triggerComponents.label.whenApplied') },
    { value: 'removed', label: t('triggerComponents.label.whenRemoved') },
  ];
  const labelItems = availableLabels.map(label => ({ value: label.id, label: label.title }));

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <h3 className="font-medium text-sm text-foreground">
          {t('triggerComponents.label.configuration')}
        </h3>

        {/* Ação da Etiqueta */}
        <Field>
          <FieldLabel>{t('triggerComponents.label.labelAction')}</FieldLabel>
          <Select
            items={actionItems}
            value={labelAction || null}
            onValueChange={value => value != null && onLabelActionChange(value as 'applied' | 'removed')}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('triggerComponents.label.selectAction')} />
            </SelectTrigger>
            <SelectPopup alignItemWithTrigger={false}>
              <SelectItem value="applied">
                <div className="flex items-center gap-2">
                  <Badge variant="success">
                    {t('triggerComponents.label.applied')}
                  </Badge>
                  <span>{t('triggerComponents.label.whenApplied')}</span>
                </div>
              </SelectItem>
              <SelectItem value="removed">
                <div className="flex items-center gap-2">
                  <Badge variant="error">{t('triggerComponents.label.removed')}</Badge>
                  <span>{t('triggerComponents.label.whenRemoved')}</span>
                </div>
              </SelectItem>
            </SelectPopup>
          </Select>
        </Field>

        {/* Seleção da Etiqueta */}
        <Field>
          <FieldLabel>{t('triggerComponents.label.label')}</FieldLabel>
          {error ? (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Select
              items={labelItems}
              value={labelId || null}
              onValueChange={value => {
                const selectedLabelId = String(value ?? '');
                const selectedLabel = availableLabels.find(l => l.id === selectedLabelId);
                onLabelIdChange(selectedLabelId, selectedLabel?.title);
              }}
              disabled={loadingLabels}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    loadingLabels
                      ? t('triggerComponents.label.loadingLabels')
                      : t('triggerComponents.label.selectLabel')
                  }
                />
              </SelectTrigger>
              <SelectPopup alignItemWithTrigger={false}>
                {loadingLabels ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.label.loading')}
                  </div>
                ) : availableLabels.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    {t('triggerComponents.label.noLabelsFound')}
                  </div>
                ) : (
                  availableLabels.map(label => (
                    <SelectItem key={label.id} value={label.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-3 rounded-full"
                          style={{ backgroundColor: label.color || '#6b7280' }}
                        />
                        <span className="font-medium">{label.title}</span>
                        {label.description && (
                          <span className="text-xs text-muted-foreground">
                            • {label.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectPopup>
            </Select>
          )}
        </Field>

        {/* Informações da Etiqueta Selecionada */}
        {selectedLabel && (
          <div className="rounded-xl border bg-muted/24 p-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              {t('triggerComponents.label.selectedLabel')}
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between items-center">
                <span>{t('triggerComponents.label.name')}:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: selectedLabel.color || '#6b7280' }}
                  />
                  <span className="font-medium">{selectedLabel.title}</span>
                </div>
              </div>
              {selectedLabel.description && (
                <div className="flex justify-between">
                  <span>{t('triggerComponents.label.description')}:</span>
                  <span className="font-medium">{selectedLabel.description}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t('triggerComponents.label.createdAt')}:</span>
                <span className="font-medium">
                  {new Date(selectedLabel.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Descrição da Configuração */}
        <div className="rounded-xl border border-info/24 bg-info/8 p-4">
          <p className="text-sm text-info-foreground">
            {labelAction === 'applied'
              ? t('triggerComponents.label.appliedDescription')
              : t('triggerComponents.label.removedDescription')}
            {selectedLabel && (
              <span className="block mt-1 font-medium">
                {t('triggerComponents.label.label')}: {selectedLabel.title}
              </span>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
