import { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, Plus, Trash2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import PipelineTeamPicker from './PipelineTeamPicker';
import { CreatePipelineData, PipelineStage } from '@/types/analytics';
import TeamsService from '@/services/teams/teamsService';
import { Team } from '@/types/users/teams';

const PIPELINE_TYPES = ['custom', 'sales', 'support', 'marketing'] as const;
const VISIBILITIES = ['private', 'public', 'team'] as const;

interface StageFormData {
  name: string;
  color: string;
  description: string;
}

interface CreatePipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePipelineData) => void;
  loading: boolean;
}

// Templates de etapas predefinidas - will be populated with translations inside component
const getStageTemplates = (t: (key: string) => string): Record<
  string,
  Omit<PipelineStage, 'id' | 'pipeline_id' | 'conversations_count' | 'created_at' | 'updated_at'>[]
> => ({
  sales: [
    {
      name: t('createPipeline.templates.sales.newLead.name'),
      color: '#3B82F6',
      description: t('createPipeline.templates.sales.newLead.description'),
      position: 1,
    },
    {
      name: t('createPipeline.templates.sales.qualification.name'),
      color: '#F59E0B',
      description: t('createPipeline.templates.sales.qualification.description'),
      position: 2,
    },
    {
      name: t('createPipeline.templates.sales.proposal.name'),
      color: '#8B5CF6',
      description: t('createPipeline.templates.sales.proposal.description'),
      position: 3,
    },
    {
      name: t('createPipeline.templates.sales.closing.name'),
      color: '#10B981',
      description: t('createPipeline.templates.sales.closing.description'),
      position: 4
    },
  ],
  support: [
    {
      name: t('createPipeline.templates.support.new.name'),
      color: '#3B82F6',
      description: t('createPipeline.templates.support.new.description'),
      position: 1
    },
    {
      name: t('createPipeline.templates.support.inProgress.name'),
      color: '#F59E0B',
      description: t('createPipeline.templates.support.inProgress.description'),
      position: 2
    },
    {
      name: t('createPipeline.templates.support.waiting.name'),
      color: '#8B5CF6',
      description: t('createPipeline.templates.support.waiting.description'),
      position: 3,
    },
    {
      name: t('createPipeline.templates.support.resolved.name'),
      color: '#10B981',
      description: t('createPipeline.templates.support.resolved.description'),
      position: 4
    },
  ],
  marketing: [
    {
      name: t('createPipeline.templates.marketing.lead.name'),
      color: '#3B82F6',
      description: t('createPipeline.templates.marketing.lead.description'),
      position: 1
    },
    {
      name: t('createPipeline.templates.marketing.nurturing.name'),
      color: '#F59E0B',
      description: t('createPipeline.templates.marketing.nurturing.description'),
      position: 2
    },
    {
      name: t('createPipeline.templates.marketing.qualified.name'),
      color: '#8B5CF6',
      description: t('createPipeline.templates.marketing.qualified.description'),
      position: 3
    },
    {
      name: t('createPipeline.templates.marketing.converted.name'),
      color: '#10B981',
      description: t('createPipeline.templates.marketing.converted.description'),
      position: 4,
    },
  ],
  custom: [
    {
      name: t('createPipeline.templates.custom.start.name'),
      color: '#3B82F6',
      description: t('createPipeline.templates.custom.start.description'),
      position: 1
    },
    {
      name: t('createPipeline.templates.custom.inProgress.name'),
      color: '#F59E0B',
      description: t('createPipeline.templates.custom.inProgress.description'),
      position: 2
    },
    {
      name: t('createPipeline.templates.custom.completed.name'),
      color: '#10B981',
      description: t('createPipeline.templates.custom.completed.description'),
      position: 3
    },
  ],
});

export default function CreatePipelineModal({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreatePipelineModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState<CreatePipelineData>({
    name: '',
    description: '',
    pipeline_type: 'custom',
    visibility: 'private',
    is_active: true,
    stages: [],
  });

  const [newStage, setNewStage] = useState<StageFormData>({
    name: '',
    color: '#6366F1',
    description: '',
  });

  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [hasManualStageChanges, setHasManualStageChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const stageTemplates = useMemo(() => getStageTemplates(t), [t]);

  // Inicializar com template quando o tipo mudar
  useEffect(() => {
    if (
      !hasManualStageChanges &&
      formData.pipeline_type &&
      stageTemplates[formData.pipeline_type]
    ) {
      const template = stageTemplates[formData.pipeline_type];
      const stages = template.map(stage => ({
        ...stage,
        id: Date.now() + Math.random(),
        pipeline_id: 0,
        conversations_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setFormData(prev => ({
        ...prev,
        stages,
      }));
    }
  }, [formData.pipeline_type, hasManualStageChanges, stageTemplates]);

  // Load teams when visibility is 'team'
  useEffect(() => {
    if (formData.visibility === 'team' && teams.length === 0) {
      setTeamsLoading(true);
      TeamsService.getTeams({ page: 1, per_page: 100, sort: 'name', order: 'asc' })
        .then(response => setTeams(response.data))
        .catch(err => console.error('Error loading teams:', err))
        .finally(() => setTeamsLoading(false));
    }
    if (formData.visibility !== 'team') {
      setTeamIds([]);
    }
  }, [formData.visibility]);

  // Inicializar ao abrir o modal
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    const templates = getStageTemplates(t);
    const customTemplate = templates.custom;
    const stages = customTemplate.map(stage => ({
      ...stage,
      id: (Date.now() + Math.random()).toString(),
      pipeline_id: '0',
      conversations_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setFormData({
      name: '',
      description: '',
      pipeline_type: 'custom',
      visibility: 'private',
      is_active: true,
      stages,
    });
    setTeamIds([]);
    setNewStage({
      name: '',
      color: '#6366F1',
      description: '',
    });
    setHasManualStageChanges(false);
  };

  const addStage = () => {
    if (!newStage.name.trim()) return;

    const stage: PipelineStage = {
      ...newStage,
      id: Date.now().toString(), // Temporary ID
      position: formData.stages!.length + 1,
      pipeline_id: '0', // Will be set by backend
      conversations_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setFormData(prev => ({
      ...prev,
      stages: [...(prev.stages || []), stage],
    }));
    setHasManualStageChanges(true);

    setNewStage({
      name: '',
      color: '#6366F1',
      description: '',
    });
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stages:
        prev.stages
          ?.filter((_, i) => i !== index)
          .map((stage, i) => ({
            ...stage,
            position: i + 1,
          })) || [],
    }));
    setHasManualStageChanges(true);
  };

  const resetToTemplate = () => {
    setFormData(prev => {
      const templates = getStageTemplates(t);
      if (prev.pipeline_type && templates[prev.pipeline_type]) {
        const template = templates[prev.pipeline_type];
        const stages = template.map(stage => ({
          ...stage,
          id: Date.now() + Math.random(),
          pipeline_id: 0,
          conversations_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        return { ...prev, stages };
      }
      return prev;
    });
    setHasManualStageChanges(false);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) return;

    const stages = [...(formData.stages || [])];
    const [draggedStage] = stages.splice(draggedIndex, 1);
    stages.splice(dropIndex, 0, draggedStage);

    // Reordenar posições
    const reorderedStages = stages.map((stage, index) => ({
      ...stage,
      position: index + 1,
    }));

    setFormData(prev => ({
      ...prev,
      stages: reorderedStages,
    }));
    setHasManualStageChanges(true);
    setDraggedIndex(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.stages?.length) return;
    if (formData.visibility === 'team' && teamIds.length === 0) return;
    onSubmit({ ...formData, team_ids: formData.visibility === 'team' ? teamIds : undefined });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const canCreatePipeline = formData.name.trim().length > 0
    && (formData.stages?.length || 0) > 0
    && (formData.visibility !== 'team' || teamIds.length > 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPopup className="max-w-5xl">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t('createPipeline.title')}</DialogTitle>
            <DialogDescription>
              {t('createPipeline.description')}
            </DialogDescription>
          </DialogHeader>

          <DialogPanel>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              {/* Coluna da Esquerda - Informações Básicas (2/5) */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h3 className="mb-4 font-semibold text-base">{t('createPipeline.basicInfo')}</h3>

                  {/* Nome */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="name">{t('createPipeline.pipelineName')}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('createPipeline.pipelineNamePlaceholder')}
                      required
                      disabled={loading}
                    />
                  </div>

                  {/* Descrição */}
                  <div className="space-y-2 mb-4">
                    <Label htmlFor="description">{t('createPipeline.descriptionLabel')}</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('createPipeline.descriptionPlaceholder')}
                      rows={2}
                      disabled={loading}
                    />
                  </div>

                  {/* Tipo e Visibilidade */}
                  <div className="grid grid-cols-1 gap-3 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">{t('createPipeline.type')}</Label>
                      <Select
                        value={formData.pipeline_type}
                        items={PIPELINE_TYPES.map(v => ({ value: v, label: t(`createPipeline.types.${v}`) }))}
                onValueChange={(value: 'custom' | 'sales' | 'support' | 'marketing' | null) =>
                  value != null &&
                          setFormData({ ...formData, pipeline_type: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger id="type" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value="custom">{t('createPipeline.types.custom')}</SelectItem>
                          <SelectItem value="sales">{t('createPipeline.types.sales')}</SelectItem>
                          <SelectItem value="support">{t('createPipeline.types.support')}</SelectItem>
                          <SelectItem value="marketing">{t('createPipeline.types.marketing')}</SelectItem>
                        </SelectPopup>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="visibility">{t('createPipeline.visibility')}</Label>
                      <Select
                        value={formData.visibility}
                        items={VISIBILITIES.map(v => ({ value: v, label: t(`createPipeline.visibilities.${v}`) }))}
                onValueChange={(value: 'private' | 'public' | 'team' | null) =>
                  value != null &&
                          setFormData({ ...formData, visibility: value })
                        }
                        disabled={loading}
                      >
                        <SelectTrigger id="visibility" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectPopup>
                          <SelectItem value="private">{t('createPipeline.visibilities.private')}</SelectItem>
                          <SelectItem value="public">{t('createPipeline.visibilities.public')}</SelectItem>
                          <SelectItem value="team">{t('createPipeline.visibilities.team')}</SelectItem>
                        </SelectPopup>
                      </Select>
                    </div>

                    {formData.visibility === 'team' && (
                      <PipelineTeamPicker
                        prefix="createPipeline"
                        teams={teams}
                        teamIds={teamIds}
                        loading={teamsLoading}
                        disabled={loading}
                        onChange={setTeamIds}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Coluna da Direita - Etapas (3/5) */}
              <div className="flex flex-col lg:col-span-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">{t('createPipeline.stages')}</h3>
                  <div className="flex items-center gap-2">
                    {hasManualStageChanges && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetToTemplate}
                        
                      >
                        {t('createPipeline.reset')}
                      </Button>
                    )}
                    <span className="text-muted-foreground text-sm tabular-nums">
                      {t('createPipeline.stagesCount', { count: formData.stages?.length || 0 })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {formData.stages?.map((stage, index) => (
                    <div
                      key={`${stage.name}-${index}`}
                      draggable
                      onDragStart={e => handleDragStart(e, index)}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, index)}
                      className={cn(
                        'group flex cursor-move items-center justify-between rounded-lg border bg-background p-3 transition-all hover:border-ring/40',
                        draggedIndex === index && 'scale-95 opacity-50',
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <GripVertical className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        <span className="w-5 text-center font-medium text-muted-foreground text-xs tabular-nums">
                          {index + 1}
                        </span>
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm truncate">{stage.name}</div>
                          {stage.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {stage.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeStage(index)}
                        className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive-foreground focus-visible:opacity-100 group-hover:opacity-100"
                        aria-label={t('createPipeline.removeStage', { name: stage.name })}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )) || []}

                  {/* Adicionar Nova Etapa - Inline */}
                  <div className="rounded-lg border border-dashed bg-muted/48 p-3 dark:bg-muted/24">
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-2">
                        <Input
                          value={newStage.name}
                          onChange={e => setNewStage({ ...newStage, name: e.target.value })}
                          placeholder={t('createPipeline.newStageName')}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                        />

                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newStage.color}
                            onChange={e => setNewStage({ ...newStage, color: e.target.value })}
                            className="size-9 shrink-0 cursor-pointer rounded-lg border bg-background p-1"
                            aria-label={t('createPipeline.newStageColor')}
                          />
                          <Input
                            value={newStage.description}
                            onChange={e =>
                              setNewStage({ ...newStage, description: e.target.value })
                            }
                            placeholder={t('createPipeline.newStageDescription')}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            onClick={addStage}
                            disabled={!newStage.name.trim()}
                            size="icon"
                            aria-label={t('createPipeline.addStage')}
                          >
                            <Plus />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {(!formData.stages || formData.stages.length === 0) && (
                    <p className="py-6 text-center text-muted-foreground text-sm">{t('createPipeline.addStageMessage')}</p>
                  )}
                </div>
              </div>
            </div>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={loading}>
              {t('createPipeline.cancel')}
            </Button>
            <Button type="submit" disabled={!canCreatePipeline} loading={loading}>
              {t('createPipeline.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
