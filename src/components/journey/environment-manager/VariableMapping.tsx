import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { VariableSelect } from './VariableSelect';
import { useLanguage } from '@/hooks/useLanguage';

export interface DataMapping {
  id: string;
  sourcePath: string;
  variableName: string;
  transform?: 'none' | 'uppercase' | 'lowercase' | 'date' | 'number';
}

interface VariableMappingProps {
  mappings: DataMapping[];
  onMappingsChange: (mappings: DataMapping[]) => void;
  paths?: string[];
  className?: string;
  journeyId?: string;
}

const getTransformOptions = (t: any) => [
  { value: 'none', label: t('environmentManager.form.fields.type.text') },
  { value: 'uppercase', label: t('environmentManager.form.fields.type.uppercase') },
  { value: 'lowercase', label: t('environmentManager.form.fields.type.lowercase') },
  { value: 'date', label: t('environmentManager.form.fields.type.date') },
  { value: 'number', label: t('environmentManager.form.fields.type.number') },
];

export function VariableMapping({
  mappings,
  onMappingsChange,
  paths,
  className = '',
  journeyId,
}: VariableMappingProps) {
  const { t } = useLanguage('journey');
  const [showCustomInput, setShowCustomInput] = useState<Record<string, boolean>>({});
  const TRANSFORM_OPTIONS = getTransformOptions(t);

  // Verificar se algum mapping tem um sourcePath que não está na lista de paths
  useEffect(() => {
    const customInputs: Record<string, boolean> = {};

    mappings.forEach(mapping => {
      if (mapping.sourcePath && mapping.sourcePath !== '' && mapping.sourcePath !== '__custom__') {
        // Se não há paths ou se o sourcePath não está na lista de paths
        if (!paths || paths.length === 0 || !paths.includes(mapping.sourcePath)) {
          customInputs[mapping.id] = true;
        }
      }
    });

    setShowCustomInput(customInputs);
  }, [mappings, paths]);

  const addMapping = () => {
    const newMapping: DataMapping = {
      id: Date.now().toString(),
      sourcePath: '',
      variableName: '',
      transform: 'none',
    };
    onMappingsChange([...mappings, newMapping]);
  };

  const updateMapping = (id: string, field: keyof DataMapping, value: string) => {
    const updatedMappings = mappings.map(mapping =>
      mapping.id === id ? { ...mapping, [field]: value } : mapping,
    );
    onMappingsChange(updatedMappings);
  };

  const removeMapping = (id: string) => {
    onMappingsChange(mappings.filter(mapping => mapping.id !== id));
  };

  const validMappings = mappings.filter(m => m.sourcePath && m.variableName);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{t('environmentManager.title')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('environmentManager.description')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addMapping}>
          <Plus />
          {t('environmentManager.customVariables.actions.new')}
        </Button>
      </div>

      {/* Mostrar mapeamentos configurados em formato compacto */}
      {validMappings.length > 0 && (
        <div className="rounded-lg border border-info/24 bg-info/8 p-3">
          <div className="mb-2 flex items-center gap-2">
            <ArrowRight className="size-4 text-info-foreground" aria-hidden="true" />
            <span className="font-medium text-info-foreground text-sm">
              {t('environmentManager.customVariables.empty.count', { count: validMappings.length })}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {validMappings.map(mapping => (
              <div
                key={mapping.id}
                className="inline-flex max-w-full items-center gap-1 rounded bg-info/12 px-2 py-1 text-info-foreground text-xs"
              >
                <code className="max-w-[150px] truncate font-mono">
                  {mapping.sourcePath}
                </code>
                <ArrowRight className="size-3 shrink-0 opacity-72" aria-hidden="true" />
                <span className="max-w-[120px] truncate font-medium">
                  ${mapping.variableName}
                </span>
                {mapping.transform && mapping.transform !== 'none' && (
                  <span className="shrink-0 opacity-80">
                    ({mapping.transform})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {mappings.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('environmentManager.customVariables.empty.title')}
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={addMapping}
            className="mt-2 text-primary"
          >
            <Plus />
            {t('environmentManager.customVariables.actions.new')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map(mapping => (
            <div
              key={mapping.id}
              className="rounded-lg border bg-muted/24 p-3"
            >
              <div className="flex items-end gap-2">
                {/* Caminho de origem */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {t('environmentManager.form.fields.description.label')}
                  </Label>
                  {paths && paths.length > 0 ? (
                    <Select
                      value={
                        showCustomInput[mapping.id]
                          ? '__custom__'
                          : paths.includes(mapping.sourcePath || '')
                          ? mapping.sourcePath
                          : '__custom__'
                      }
                      items={[
                        ...paths.map(path => ({ value: path, label: path })),
                        { value: '__custom__', label: t('environmentManager.customVariables.actions.new') },
                      ]}
                      onValueChange={next => {
                        const value = next == null ? '' : String(next);
                        if (value === '__custom__') {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: true }));
                        } else {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: false }));
                          updateMapping(mapping.id, 'sourcePath', value);
                        }
                      }}
                    >
                      <SelectTrigger size="sm" className="w-full min-w-0">
                        <SelectValue placeholder={t('environmentManager.searchPlaceholder')} />
                      </SelectTrigger>
                      <SelectPopup alignItemWithTrigger={false} className="max-h-[200px]">
                        {paths.map(path => (
                          <SelectItem key={path} value={path}>
                            <span className="font-mono text-xs">{path}</span>
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__" className="text-primary">
                          <div className="flex items-center gap-2">
                            <Plus className="size-3" />
                            <span className="text-xs">
                              {t('environmentManager.customVariables.actions.new')}
                            </span>
                          </div>
                        </SelectItem>
                      </SelectPopup>
                    </Select>
                  ) : (
                    <Input
                      placeholder={t('environmentManager.form.fields.name.placeholder')}
                      value={mapping.sourcePath || ''}
                      onChange={e => updateMapping(mapping.id, 'sourcePath', e.target.value)}
                      size="sm" className="font-mono text-xs"
                    />
                  )}
                </div>

                {/* Input para caminho personalizado quando selecionado */}
                {showCustomInput[mapping.id] && (
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground font-medium">
                      {t('environmentManager.form.fields.name.help')}
                    </Label>
                    <Input
                      placeholder={t('environmentManager.form.fields.name.placeholder')}
                      value={mapping.sourcePath || ''}
                      onChange={e => {
                        updateMapping(mapping.id, 'sourcePath', e.target.value);
                      }}
                      onBlur={e => {
                        if (!e.target.value.trim()) {
                          setShowCustomInput(prev => ({ ...prev, [mapping.id]: false }));
                          updateMapping(mapping.id, 'sourcePath', '');
                        }
                      }}
                      size="sm" className="font-mono text-xs"
                      autoFocus
                    />
                  </div>
                )}

                {/* Seta visual */}
                <div className="pb-2">
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </div>

                {/* Variável destino */}
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {t('environmentManager.form.fields.name.label')}
                  </Label>
                  <VariableSelect
                    value={mapping.variableName}
                    onValueChange={value => updateMapping(mapping.id, 'variableName', value)}
                    journeyId={journeyId}
                    placeholder={t('environmentManager.searchPlaceholder')}
                    showCreateOption={true}
                    showSystemVariables={false}
                    className="w-full min-w-0 text-xs"
                  />
                </div>

                {/* Transformação */}
                <div className="w-24 space-y-1">
                  <Label className="text-xs text-muted-foreground font-medium">
                    {t('environmentManager.form.fields.type.label')}
                  </Label>
                  <Select
                    items={TRANSFORM_OPTIONS}
                    value={mapping.transform || 'none'}
                    onValueChange={next =>
                      updateMapping(mapping.id, 'transform', next == null ? '' : String(next))
                    }
                  >
                    <SelectTrigger size="sm" className="w-full min-w-0">
                      <SelectValue>
                        {mapping.transform && (
                          <span
                            className="truncate max-w-full"
                            title={
                              TRANSFORM_OPTIONS.find(o => o.value === mapping.transform)?.label
                            }
                          >
                            {TRANSFORM_OPTIONS.find(o => o.value === mapping.transform)?.label ||
                              mapping.transform}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectPopup alignItemWithTrigger={false}>
                      {TRANSFORM_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.value === 'none' ? 'None' : option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </div>

                {/* Botão remover */}
                <div className="pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeMapping(mapping.id)}
                    className="text-destructive-foreground hover:bg-destructive/8"
                    aria-label={t('environmentManager.customVariables.actions.delete')}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Informação adicional */}
      {mappings.length > 0 && (
        <div className="text-xs text-muted-foreground bg-muted/48 p-3 rounded border border-dashed">
          <p>{t('environmentManager.footer.tip')}</p>
        </div>
      )}
    </div>
  );
}
