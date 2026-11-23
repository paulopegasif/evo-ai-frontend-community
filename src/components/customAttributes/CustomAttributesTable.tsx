import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Edit, Trash2 } from '@/components/icons';
import BaseTable from '@/components/base/BaseTable';
import { Badge } from '@/components/ui/badge';
import { CustomAttributeDefinition, ATTRIBUTE_TYPE_OPTIONS, AttributeModel } from '@/types/settings';

interface CustomAttributesTableProps {
  activeTab: AttributeModel;
  attributes: CustomAttributeDefinition[];
  selectedAttributes: CustomAttributeDefinition[];
  loading: boolean;
  onSelectionChange: (attributes: CustomAttributeDefinition[]) => void;
  onEditAttribute: (attribute: CustomAttributeDefinition) => void;
  onDeleteAttribute: (attribute: CustomAttributeDefinition) => void;
  onCreateAttribute: () => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
}

export default function CustomAttributesTable({
  activeTab,
  attributes,
  selectedAttributes,
  loading,
  onSelectionChange,
  onEditAttribute,
  onDeleteAttribute,
  onSort,
  sortBy,
  sortOrder,
}: CustomAttributesTableProps) {
  const { t } = useLanguage('customAttributes');
  const { can, isReady } = usePermissions();

  const getAttributeTypeLabel = (type: string) => {
    const option = ATTRIBUTE_TYPE_OPTIONS.find(opt => opt.value === type);
    return option ? t(option.labelKey, { defaultValue: option.defaultLabel }) : type;
  };

  const columns = [
    {
      key: 'attribute_display_name',
      label: t('table.columns.name'),
      sortable: true,
      render: (attribute: CustomAttributeDefinition) => (
        <div className="font-medium">{attribute.attribute_display_name}</div>
      ),
    },
    {
      key: 'attribute_description',
      label: t('table.columns.description'),
      render: (attribute: CustomAttributeDefinition) => (
        <div className="text-muted-foreground max-w-md truncate">
          {attribute.attribute_description || t('table.noDescription')}
        </div>
      ),
    },
    {
      key: 'attribute_display_type',
      label: t('table.columns.type'),
      render: (attribute: CustomAttributeDefinition) => (
        <Badge variant="info">{getAttributeTypeLabel(attribute.attribute_display_type)}</Badge>
      ),
    },
    {
      key: 'attribute_key',
      label: t('table.columns.key'),
      render: (attribute: CustomAttributeDefinition) => (
        <code className="rounded-md border bg-muted/48 px-1.5 py-0.5 font-mono text-xs">{attribute.attribute_key}</code>
      ),
    },
    {
      key: 'attribute_values',
      label: t('table.columns.values'),
      render: (attribute: CustomAttributeDefinition) => (
        <div className="max-w-32">
          {attribute.attribute_values && attribute.attribute_values.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {attribute.attribute_values.slice(0, 2).map((value, index) => (
                <Badge key={index} variant="secondary" className="max-w-full truncate">
                  {value}
                </Badge>
              ))}
              {attribute.attribute_values.length > 2 && (
                <Badge variant="outline">
                  {t('table.moreValues', { count: attribute.attribute_values.length - 2 })}
                </Badge>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">{t('table.noValues')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'regex_pattern',
      label: t('table.columns.regex'),
      render: (attribute: CustomAttributeDefinition) => (
        attribute.regex_pattern ? (
          <Badge variant="success">{t('table.regexBadge.yes')}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{t('table.noRegex')}</span>
        )
      ),
    },
    {
      key: 'created_at',
      label: t('table.columns.createdAt'),
      sortable: true,
      render: (attribute: CustomAttributeDefinition) => (
        <div className="text-sm text-muted-foreground">
          {new Date(attribute.created_at).toLocaleDateString('pt-BR')}
        </div>
      ),
    },
  ];

  const getModelLabel = (model: string) => {
    return t(`table.columns.model.${model}`) || model;
  };

  if (activeTab === 'pipeline_attribute') {
    columns.push({
      key: 'attribute_model',
      label: t('table.columns.model.label'),
      render: (attribute: CustomAttributeDefinition) => (
        <div className="text-muted-foreground">
          {getModelLabel(attribute.attribute_model)}
        </div>
      ),
    });
  }

  const actions = [
    {
      label: t('actions.edit'),
      icon: <Edit className="h-4 w-4" />,
      onClick: onEditAttribute,
      show: () => isReady && can('custom_attribute_definitions', 'update'),
    },
    {
      label: t('actions.delete'),
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDeleteAttribute,
      variant: 'destructive' as const,
      show: () => isReady && can('custom_attribute_definitions', 'delete'),
    },
  ];

  return (
    <BaseTable
      data={attributes}
      columns={columns}
      actions={actions}
      loading={loading}
      getRowKey={attribute => attribute.id.toString()}
      selectable={true}
      selectedItems={selectedAttributes}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  );
}
