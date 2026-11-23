import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Globe, GripVertical, Lock, Plus, Trash2, Users, X } from '@/components/icons';
import PipelineTeamPicker from '@/components/pipelines/PipelineTeamPicker';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionsContext';
import { pipelinesService } from '@/services/pipelines';
import { CreatePipelineData, PipelineStage } from '@/types/analytics';
import TeamsService from '@/services/teams/teamsService';
import { Team } from '@/types/users/teams';

interface StageFormData {
  name: string;
  color: string;
  description: string;
}

// Stage templates per pipeline type — same seeds the modal used, kept here so
// selecting a type reveals its stages (mockup §3.6 "seleção de tipo revela etapas").
const getStageTemplates = (
  t: (key: string) => string,
): Record<
  string,
  Omit<PipelineStage, 'id' | 'pipeline_id' | 'conversations_count' | 'created_at' | 'updated_at'>[]
> => ({
  sales: [
    { name: t('createPipeline.templates.sales.newLead.name'), color: '#3B82F6', description: t('createPipeline.templates.sales.newLead.description'), position: 1 },
    { name: t('createPipeline.templates.sales.qualification.name'), color: '#F59E0B', description: t('createPipeline.templates.sales.qualification.description'), position: 2 },
    { name: t('createPipeline.templates.sales.demo.name'), color: '#8B5CF6', description: t('createPipeline.templates.sales.demo.description'), position: 3 },
    { name: t('createPipeline.templates.sales.proposal.name'), color: '#EC4899', description: t('createPipeline.templates.sales.proposal.description'), position: 4 },
    { name: t('createPipeline.templates.sales.won.name'), color: '#10B981', description: t('createPipeline.templates.sales.won.description'), position: 5, stage_type: 'completed' },
    { name: t('createPipeline.templates.sales.lost.name'), color: '#EF4444', description: t('createPipeline.templates.sales.lost.description'), position: 6, stage_type: 'cancelled' },
    { name: t('createPipeline.templates.sales.nurturing.name'), color: '#64748B', description: t('createPipeline.templates.sales.nurturing.description'), position: 7 },
  ],
  support: [
    { name: t('createPipeline.templates.support.new.name'), color: '#3B82F6', description: t('createPipeline.templates.support.new.description'), position: 1 },
    { name: t('createPipeline.templates.support.triage.name'), color: '#F59E0B', description: t('createPipeline.templates.support.triage.description'), position: 2 },
    { name: t('createPipeline.templates.support.inProgress.name'), color: '#8B5CF6', description: t('createPipeline.templates.support.inProgress.description'), position: 3 },
    { name: t('createPipeline.templates.support.waiting.name'), color: '#6366F1', description: t('createPipeline.templates.support.waiting.description'), position: 4 },
    { name: t('createPipeline.templates.support.resolved.name'), color: '#10B981', description: t('createPipeline.templates.support.resolved.description'), position: 5, stage_type: 'completed' },
    { name: t('createPipeline.templates.support.churnRisk.name'), color: '#EF4444', description: t('createPipeline.templates.support.churnRisk.description'), position: 6 },
  ],
  marketing: [
    { name: t('createPipeline.templates.marketing.lead.name'), color: '#3B82F6', description: t('createPipeline.templates.marketing.lead.description'), position: 1 },
    { name: t('createPipeline.templates.marketing.nurturing.name'), color: '#F59E0B', description: t('createPipeline.templates.marketing.nurturing.description'), position: 2 },
    { name: t('createPipeline.templates.marketing.qualified.name'), color: '#8B5CF6', description: t('createPipeline.templates.marketing.qualified.description'), position: 3 },
    { name: t('createPipeline.templates.marketing.converted.name'), color: '#10B981', description: t('createPipeline.templates.marketing.converted.description'), position: 4 },
  ],
  custom: [
    { name: t('createPipeline.templates.custom.start.name'), color: '#3B82F6', description: t('createPipeline.templates.custom.start.description'), position: 1 },
    { name: t('createPipeline.templates.custom.inProgress.name'), color: '#F59E0B', description: t('createPipeline.templates.custom.inProgress.description'), position: 2 },
    { name: t('createPipeline.templates.custom.completed.name'), color: '#10B981', description: t('createPipeline.templates.custom.completed.description'), position: 3 },
  ],
});

const TYPE_CHIPS: Array<CreatePipelineData['pipeline_type']> = [
  'custom',
  'sales',
  'support',
  'marketing',
];

/**
 * "/pipelines/new" — full-page pipeline creation (mockup §3.6). Same form logic and
 * submit shape as the old CreatePipelineModal, laid out as a full screen instead of a
 * cramped dialog. On success it navigates straight into the new board.
 */
export default function PipelineFormPage() {
  const { t } = useLanguage('pipelines');
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [formData, setFormData] = useState<CreatePipelineData>({
    name: '',
    description: '',
    pipeline_type: 'custom',
    visibility: 'private',
    is_active: true,
    stages: [],
  });
  const [newStage, setNewStage] = useState<StageFormData>({ name: '', color: '#6366F1', description: '' });
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [hasManualStageChanges, setHasManualStageChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stageTemplates = useMemo(() => getStageTemplates(t), [t]);

  const close = useCallback(() => navigate('/pipelines'), [navigate]);

  // Seed stages from the selected type until the user edits them manually.
  useEffect(() => {
    if (!hasManualStageChanges && formData.pipeline_type && stageTemplates[formData.pipeline_type]) {
      const stages = stageTemplates[formData.pipeline_type].map(stage => ({
        ...stage,
        id: (Date.now() + Math.random()).toString(),
        pipeline_id: '0',
        conversations_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setFormData(prev => ({ ...prev, stages }));
    }
  }, [formData.pipeline_type, hasManualStageChanges, stageTemplates]);

  // Load teams lazily when visibility becomes 'team'.
  useEffect(() => {
    if (formData.visibility === 'team' && teams.length === 0) {
      setTeamsLoading(true);
      TeamsService.getTeams({ page: 1, per_page: 100, sort: 'name', order: 'asc' })
        .then(response => setTeams(response.data))
        .catch(err => console.error('Error loading teams:', err))
        .finally(() => setTeamsLoading(false));
    }
    if (formData.visibility !== 'team') setTeamIds([]);
  }, [formData.visibility, teams.length]);

  const addStage = () => {
    if (!newStage.name.trim()) return;
    const stage: PipelineStage = {
      ...newStage,
      id: Date.now().toString(),
      position: (formData.stages?.length || 0) + 1,
      pipeline_id: '0',
      conversations_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setFormData(prev => ({ ...prev, stages: [...(prev.stages || []), stage] }));
    setHasManualStageChanges(true);
    setNewStage({ name: '', color: '#6366F1', description: '' });
  };

  const removeStage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      stages: prev.stages?.filter((_, i) => i !== index).map((s, i) => ({ ...s, position: i + 1 })) || [],
    }));
    setHasManualStageChanges(true);
  };

  const resetToTemplate = () => {
    setFormData(prev => {
      if (prev.pipeline_type && stageTemplates[prev.pipeline_type]) {
        const stages = stageTemplates[prev.pipeline_type].map(stage => ({
          ...stage,
          id: (Date.now() + Math.random()).toString(),
          pipeline_id: '0',
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
    const [dragged] = stages.splice(draggedIndex, 1);
    stages.splice(dropIndex, 0, dragged);
    setFormData(prev => ({ ...prev, stages: stages.map((s, i) => ({ ...s, position: i + 1 })) }));
    setHasManualStageChanges(true);
    setDraggedIndex(null);
  };

  const canCreate =
    formData.name.trim().length > 0 &&
    (formData.stages?.length || 0) > 0 &&
    (formData.visibility !== 'team' || teamIds.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    if (!can('pipelines', 'create')) {
      toast.error(t('messages.noPermissionCreate'));
      return;
    }
    setSubmitting(true);
    try {
      const response = await pipelinesService.createPipeline({
        ...formData,
        team_ids: formData.visibility === 'team' ? teamIds : undefined,
      });
      toast.success(t('messages.createSuccess'));
      if (response.id) navigate(`/pipelines/${response.id}`);
      else navigate('/pipelines');
    } catch (error) {
      console.error('Error creating pipeline:', error);
      toast.error(t('messages.createError'));
      setSubmitting(false);
    }
  };

  const visIcon = (v: string) =>
    v === 'private' ? <Lock className="size-3.5" /> : v === 'public' ? <Globe className="size-3.5" /> : <Users className="size-3.5" />;

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      {/* Page header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="sm" onClick={close} className="shrink-0">
            <ArrowLeft />
            {t('createPipeline.back')}
          </Button>
          <h1 className="truncate font-semibold text-base">{t('createPipeline.pageTitle')}</h1>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={close} aria-label={t('createPipeline.cancel')}>
          <X />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto pt-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left — basic info (2/5) */}
            <div className="lg:col-span-2 space-y-5">
              <h3 className="font-semibold text-base">{t('createPipeline.basicInfo')}</h3>

              <div className="space-y-2">
                <Label htmlFor="name">{t('createPipeline.pipelineName')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('createPipeline.pipelineNamePlaceholder')}
                  required
                  disabled={submitting}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('createPipeline.descriptionLabel')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t('createPipeline.descriptionPlaceholder')}
                  rows={3}
                  disabled={submitting}
                />
              </div>

              {/* Type as chips (mockup) */}
              <div className="space-y-2">
                <Label>{t('createPipeline.type')}</Label>
                <div className="flex flex-wrap gap-2">
                  {TYPE_CHIPS.map(type => {
                    const active = formData.pipeline_type === type;
                    return (
                      <Button
                        key={type}
                        type="button"
                        size="sm"
                        variant={active ? 'secondary' : 'outline'}
                        disabled={submitting}
                        onClick={() => setFormData({ ...formData, pipeline_type: type })}
                        aria-pressed={active}
                        className={cn('rounded-full', active && 'border-primary/40 text-foreground')}
                      >
                        {t(`createPipeline.types.${type}`)}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-2">
                <Label htmlFor="visibility">{t('createPipeline.visibility')}</Label>
                <Select
                  items={(['private', 'public', 'team'] as const).map(v => ({
                    value: v,
                    label: t(`createPipeline.visibilities.${v}`),
                  }))}
                  value={formData.visibility}
                  onValueChange={(value: 'private' | 'public' | 'team' | null) =>
                    value != null && setFormData({ ...formData, visibility: value })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="visibility" className="w-full">
                    <span className="flex items-center gap-2">
                      {visIcon(formData.visibility || 'private')}
                      <SelectValue />
                    </span>
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
                  disabled={submitting}
                  onChange={setTeamIds}
                />
              )}
            </div>

            {/* Right — stages (3/5) */}
            <div className="flex flex-col lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base">{t('createPipeline.stages')}</h3>
                <div className="flex items-center gap-2">
                  {hasManualStageChanges && (
                    <Button type="button" variant="ghost" size="sm" onClick={resetToTemplate}>
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
                      'group flex cursor-move items-center justify-between rounded-xl border bg-background p-3.5 transition-all hover:border-ring/40',
                      draggedIndex === index && 'scale-95 border-primary/40 opacity-50',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <GripVertical className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      <span className="w-5 text-center font-medium text-muted-foreground text-xs tabular-nums">{index + 1}</span>
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{stage.name}</div>
                        {stage.description && (
                          <div className="text-xs text-muted-foreground truncate">{stage.description}</div>
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
                ))}

                {/* Inline add-stage row */}
                <div className="space-y-2 rounded-xl border border-dashed bg-muted/48 p-3 dark:bg-muted/24">
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
                      onChange={e => setNewStage({ ...newStage, description: e.target.value })}
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

                {(!formData.stages || formData.stages.length === 0) && (
                  <p className="py-6 text-center text-muted-foreground text-sm">{t('createPipeline.addStageMessage')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t pt-4">
          <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
            {t('createPipeline.cancel')}
          </Button>
          <Button type="submit" disabled={!canCreate} loading={submitting}>
            {t('createPipeline.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
