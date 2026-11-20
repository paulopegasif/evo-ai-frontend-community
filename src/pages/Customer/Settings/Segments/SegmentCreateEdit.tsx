import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import EmptyState from '@/components/base/EmptyState';
import RadioCardGroup from '@/components/base/RadioCard';
import { Plus, Save, ArrowLeft, RefreshCw, Target, Users, Filter, Eye, AlertCircle, List, Workflow } from 'lucide-react';

import { segmentsService } from '@/services/segments/segmentsService';
import { SegmentCanvasBuilder } from '@/components/segments/canvas/SegmentCanvasBuilder';
import {
  Segment,
  SegmentFormData,
  SegmentDefinition,
  SegmentNodeUnion,
  DEFAULT_SEGMENT_DEFINITION,
  UserPropertyNode,
  isSegmentDefinition,
} from '@/types/analytics';
import SegmentConditionEditor from '@/components/segments/SegmentConditionEditor';

export default function SegmentCreateEdit() {
  const { t } = useLanguage('segments');
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [segment, setSegment] = useState<Segment | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [definitionType, setDefinitionType] = useState<'Everyone' | 'And' | 'Or'>('Everyone');
  const [nodes, setNodes] = useState<SegmentNodeUnion[]>([]);
  const [editorMode, setEditorMode] = useState<'form' | 'canvas'>('form');
  const [originalDefinition, setOriginalDefinition] = useState<SegmentDefinition | null>(null);

  // Preview state (count + sample of matching contacts). The preview is
  // debounced and never mutates the form — on error we only surface a banner
  // so the in-progress definition is preserved (422 keep-work).
  const [previewing, setPreviewing] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewSample, setPreviewSample] = useState<string[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSeq = useRef(0);

  // Computed values
  const hasChanges = (() => {
    if (!isEditing) return true; // New segments always have changes
    if (!segment) return false;

    const currentDef: SegmentDefinition = {
      nodes: nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    };

    const hasDefinitionChanges = JSON.stringify(currentDef) !== JSON.stringify(originalDefinition);
    const hasNameChanges = name !== segment.name;

    return hasDefinitionChanges || hasNameChanges;
  })();

  // Load segment data
  const loadSegment = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await segmentsService.getSegment(id);
      // A API pode retornar o segmento diretamente ou wrapped em payload
      const loadedSegment = 'data' in response ? response.data : response;

      setSegment(loadedSegment);
      setName(loadedSegment.name);

      let segmentDefinition: SegmentDefinition;

      if (loadedSegment.definition) {
        if (isSegmentDefinition(loadedSegment.definition)) {
          segmentDefinition = loadedSegment.definition;
        } else {
          segmentDefinition = DEFAULT_SEGMENT_DEFINITION;
        }
      } else {
        segmentDefinition = DEFAULT_SEGMENT_DEFINITION;
      }

      setDefinitionType(segmentDefinition.entryNode?.type || 'Everyone');
      setNodes(segmentDefinition.nodes || []);
      setOriginalDefinition(JSON.parse(JSON.stringify(segmentDefinition)));
    } catch (error) {
      console.error('Error loading segment:', error);
      toast.error(t('messages.loadSegmentError'));
      navigate('/settings/segments');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, t]);

  useEffect(() => {
    if (isEditing) {
      loadSegment();
    }
  }, [isEditing, loadSegment]);

  // Handlers
  const handleDefinitionTypeChange = (value: string) => {
    setDefinitionType(value as 'Everyone' | 'And' | 'Or');
    if (value === 'Everyone') {
      setNodes([]);
    }
  };

  const addCondition = () => {
    const newNode: UserPropertyNode = {
      id: uuidv4(),
      type: 'UserProperty',
      path: '',
      operator: {
        type: 'Equals',
        value: '',
      },
    };
    setNodes([...nodes, newNode]);
  };

  const updateCondition = (index: number, node: SegmentNodeUnion) => {
    const updated = [...nodes];
    updated[index] = node;
    setNodes(updated);
  };

  const removeCondition = (index: number) => {
    setNodes(nodes.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('messages.nameRequired'));
      return;
    }

    setSaving(true);

    try {
      const definition: SegmentDefinition = {
        nodes: nodes,
        entryNode: {
          id: 'entry',
          type: definitionType,
          children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
        },
      };

      const formData: SegmentFormData = {
        name: name.trim(),
        definition,
        status: 'running',
      };

      if (isEditing && id) {
        const response = await segmentsService.updateSegment(id, formData);
        // Lidar com resposta que pode ser segment direto ou wrapped
        const updatedSegment = 'data' in response ? response.data : response;
        setSegment(updatedSegment);
        toast.success(t('messages.updateSuccess'));
      } else {
        await segmentsService.createSegment(formData);
        toast.success(t('messages.createSuccess'));
      }

      navigate('/settings/segments');
    } catch (error) {
      console.error('Error saving segment:', error);
      toast.error(isEditing ? t('messages.updateError') : t('messages.createError'));
    } finally {
      setSaving(false);
    }
  };

  const handleRecompute = async () => {
    if (!id) return;

    setRecomputing(true);
    try {
      await segmentsService.recomputeSegment(id);
      toast.success(t('messages.recomputeSuccess'));
      await loadSegment(); // Reload to get updated data
    } catch (error) {
      console.error('Error recomputing segment:', error);
      toast.error(t('messages.recomputeError'));
    } finally {
      setRecomputing(false);
    }
  };

  const buildCurrentDefinition = useCallback(
    (): SegmentDefinition => ({
      nodes,
      entryNode: {
        id: 'entry',
        type: definitionType,
        children: definitionType === 'Everyone' ? undefined : nodes.map(n => n.id),
      },
    }),
    [nodes, definitionType],
  );

  const runPreview = useCallback(async () => {
    const definition = buildCurrentDefinition();
    const seq = ++previewSeq.current;
    setPreviewing(true);
    setPreviewError(null);
    try {
      const { count, sample } = await segmentsService.previewSegment(definition);
      if (seq !== previewSeq.current) return; // superseded by a newer preview
      setPreviewCount(count);
      setPreviewSample((sample || []).map(c => c.id));
    } catch (error) {
      if (seq !== previewSeq.current) return;
      // 422 keep-work: never touch the form; surface the upstream message.
      const data = (error as { response?: { data?: { errors?: { error?: { message?: unknown }; message?: unknown } } }; message?: string })
        ?.response?.data?.errors;
      const candidate = data?.error?.message ?? data?.message ?? (error as { message?: string })?.message;
      setPreviewError(typeof candidate === 'string' ? candidate : t('preview.error'));
    } finally {
      if (seq === previewSeq.current) setPreviewing(false);
    }
  }, [buildCurrentDefinition, t]);

  // Debounced (500ms) so rapid clicks collapse into a single request.
  const handlePreview = useCallback(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      void runPreview();
    }, 500);
  }, [runPreview]);

  useEffect(
    () => () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    },
    [],
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('createEdit.lastComputedNever');
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6" aria-busy="true">
        <span className="sr-only">{t('loadingSegment')}</span>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/settings/segments')}
                    aria-label={t('actions.back')}
                  />
                }
              >
                <ArrowLeft />
              </TooltipTrigger>
              <TooltipPopup>{t('actions.back')}</TooltipPopup>
            </Tooltip>
            <div className="min-w-0">
              <h1 className="flex items-center gap-2 font-semibold text-xl md:text-2xl">
                <Target className="size-5 text-muted-foreground" />
                {isEditing ? t('createEdit.titleEdit') : t('createEdit.titleNew')}
              </h1>
              {isEditing && segment && (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  <Badge variant="secondary">
                    <Users />
                    {t('createEdit.contactsCount', { count: segment.contactsCount || 0 })}
                  </Badge>
                  <span>{t('createEdit.lastComputed', { date: formatDate(segment.lastComputedAt) })}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handlePreview} loading={previewing}>
              {!previewing && <Eye />}
              {previewing ? t('actions.previewing') : t('actions.preview')}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={handleRecompute} disabled={recomputing}>
                <RefreshCw className={recomputing ? 'animate-spin' : ''} />
                {t('actions.recompute')}
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges} loading={saving}>
              {!saving && <Save />}
              {saving ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
          {/* Preview result / error (does not affect the form) */}
          {previewError && (
            <Alert variant="error">
              <AlertCircle />
              <AlertDescription>{previewError}</AlertDescription>
            </Alert>
          )}
          {previewCount !== null && !previewError && (
            <Alert variant="info">
              <Eye />
              <AlertDescription className="text-foreground">
                {t('preview.result', { count: previewCount })}
                {previewSample.length > 0 && (
                  <span className="text-muted-foreground">
                    {' '}
                    {t('preview.sample', { ids: previewSample.join(', ') })}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Nome do Segmento */}
          <Card>
            <CardPanel className="pt-6">
              <Field>
                <FieldLabel htmlFor="name">{t('createEdit.name.label')}</FieldLabel>
                <Input
                  id="name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t('createEdit.name.placeholder')}
                  className="max-w-xl"
                />
                <FieldDescription>{t('createEdit.name.description')}</FieldDescription>
              </Field>
            </CardPanel>
          </Card>

          {/* Definição do Segmento */}
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="size-4 text-muted-foreground" />
                  {t('createEdit.definition.title')}
                </CardTitle>
                <CardDescription>{t('createEdit.definition.description')}</CardDescription>
              </div>
              {/* Form ⇄ Canvas editor toggle (same underlying definition) */}
              <ToggleGroup
                variant="outline"
                size="sm"
                value={[editorMode]}
                onValueChange={next => {
                  const mode = next[0] as 'form' | 'canvas' | undefined;
                  if (mode) setEditorMode(mode);
                }}
              >
                <ToggleGroupItem value="form">
                  <List />
                  {t('actions.form')}
                </ToggleGroupItem>
                <ToggleGroupItem value="canvas">
                  <Workflow />
                  {t('actions.canvas')}
                </ToggleGroupItem>
              </ToggleGroup>
            </CardHeader>

            <CardPanel className="flex flex-col gap-6">
              {editorMode === 'canvas' ? (
                <SegmentCanvasBuilder
                  definitionType={definitionType}
                  nodes={nodes}
                  onNodesChange={setNodes}
                  onDefinitionTypeChange={handleDefinitionTypeChange}
                />
              ) : (
                <>
                  {/* Tipo de Combinação */}
                  <div className="flex flex-col gap-2">
                    <span className="font-medium text-sm" id="segment-combination-label">
                      {t('createEdit.definition.combinationType')}
                    </span>
                    <RadioCardGroup
                      aria-labelledby="segment-combination-label"
                      value={definitionType}
                      onValueChange={handleDefinitionTypeChange}
                      className="sm:grid-cols-3"
                      options={(['Everyone', 'And', 'Or'] as const).map(value => {
                        const key = value === 'Everyone' ? 'everyone' : value === 'And' ? 'and' : 'or';
                        return {
                          value,
                          title: t(`createEdit.definition.${key}.label`),
                          description: t(`createEdit.definition.${key}.description`),
                        };
                      })}
                    />
                  </div>

                  {/* Mensagem para Everyone */}
                  {definitionType === 'Everyone' && (
                    <Alert variant="info">
                      <Users />
                      <AlertDescription className="text-foreground">
                        <span className="font-medium">{t('createEdit.definition.everyone.messageTitle')}</span>
                        <span className="block text-muted-foreground">
                          {t('createEdit.definition.everyone.messageDescription')}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Lista de Condições */}
                  {definitionType !== 'Everyone' && (
                    <div className="flex flex-col gap-3">
                      {nodes.length === 0 && (
                        <EmptyState
                          icon={Filter}
                          title={t('createEdit.definition.noConditions.title')}
                          description={t('createEdit.definition.noConditions.description')}
                          action={{
                            label: t('actions.addFirstCondition'),
                            onClick: addCondition,
                            variant: 'outline',
                          }}
                          className="rounded-xl border border-dashed py-10"
                        />
                      )}

                      {nodes.map((node, index) => (
                        <SegmentConditionEditor
                          key={node.id}
                          condition={node}
                          index={index}
                          onUpdate={updateCondition}
                          onRemove={removeCondition}
                        />
                      ))}

                      {nodes.length > 0 && (
                        <Button type="button" variant="outline" onClick={addCondition} className="w-full border-dashed">
                          <Plus />
                          {t('actions.addCondition')}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardPanel>
          </Card>
        </div>
      </div>
    </div>
  );
}
