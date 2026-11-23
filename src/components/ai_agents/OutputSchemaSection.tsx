import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import SchemaField from './SchemaField';

import CollapsibleHeader from './CollapsibleHeader';

interface OutputSchemaSectionProps {
  outputSchema: Record<
    string,
    {
      type?: string;
      description?: string;
    }
  >;
  isOpen: boolean;
  onToggle: () => void;
  onOutputSchemaChange: (schema: OutputSchemaSectionProps['outputSchema']) => void;
  isReadOnly?: boolean;
}

const OutputSchemaSection = ({
  outputSchema,
  isOpen,
  onToggle,
  onOutputSchemaChange,
  isReadOnly = false,
}: OutputSchemaSectionProps) => {
  const { t } = useLanguage('aiAgents');
  const handleSchemaFieldUpdate = useCallback(
    (originalKey: string, newKey: string, field: { type?: string; description?: string }) => {
      const newSchema = { ...outputSchema };

      // Se a chave mudou, remover a antiga
      if (originalKey !== newKey) {
        delete newSchema[originalKey];
      }

      // Adicionar/atualizar com a nova chave
      newSchema[newKey] = field;

      onOutputSchemaChange(newSchema);
    },
    [outputSchema, onOutputSchemaChange],
  );

  const handleSchemaFieldRemove = useCallback(
    (fieldKey: string) => {
      const newSchema = { ...outputSchema };
      delete newSchema[fieldKey];
      onOutputSchemaChange(newSchema);
    },
    [outputSchema, onOutputSchemaChange],
  );

  const handleAddSchemaField = useCallback(() => {
    const newSchema = { ...outputSchema };
    let fieldName = 'new_field';
    let counter = 1;
    while (newSchema[fieldName]) {
      fieldName = `new_field_${counter}`;
      counter++;
    }
    newSchema[fieldName] = {
      type: 'string',
      description: '',
    };
    onOutputSchemaChange(newSchema);
  }, [outputSchema, onOutputSchemaChange]);

  return (
    <Card>
      <CardHeader>
        <CollapsibleHeader
          title={t('outputSchema.title')}
          description={t('outputSchema.subtitle')}
          icon={<FileText className="h-5 w-5 text-info" />}
          count={Object.keys(outputSchema).length}
          isOpen={isOpen}
          onToggle={onToggle}
        />
      </CardHeader>

      {isOpen && (
        <CardPanel className="space-y-4">
          <div className="p-4 bg-info/8 rounded-lg border border-info/24">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-info/12 rounded">
                <FileText className="h-4 w-4 text-info-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-info-foreground mb-1">
                  {t('outputSchema.structuredSchema')}
                </h4>
                <p className="text-sm text-info-foreground">
                  {t('outputSchema.structuredDescription')}
                </p>
              </div>
            </div>
          </div>

          {Object.keys(outputSchema).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(outputSchema).map(([fieldKey, field]) => (
                <SchemaField
                  key={fieldKey}
                  fieldKey={fieldKey}
                  field={field}
                  onUpdate={(newKey, newField) =>
                    handleSchemaFieldUpdate(fieldKey, newKey, newField)
                  }
                  onRemove={handleSchemaFieldRemove}
                  isReadOnly={isReadOnly}
                />
              ))}

              {!isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSchemaField}
                  className="w-full mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('outputSchema.addField')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-dashed">
              <div>
                <p className="font-medium">{t('outputSchema.noSchema')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('outputSchema.addFieldsToStructure')}
                </p>
              </div>
              {!isReadOnly && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddSchemaField}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('outputSchema.firstField')}
                </Button>
              )}
            </div>
          )}
        </CardPanel>
      )}
    </Card>
  );
};

export default OutputSchemaSection;
