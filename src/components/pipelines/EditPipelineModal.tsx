import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Pipeline, UpdatePipelineData } from '@/types/analytics';
import TeamsService from '@/services/teams/teamsService';
import { Team } from '@/types/users/teams';
import { LocalAttributeDefinition, LocalAttributeDefinitionPayload } from '@/types/pipelines/localAttributeDefinition';
import PipelineCustomAttributes from './PipelineCustomAttributes';
import PipelineTeamPicker from './PipelineTeamPicker';

const PIPELINE_TYPES = ['custom', 'sales', 'support', 'marketing'] as const;
const VISIBILITIES = ['private', 'public', 'team'] as const;

interface EditPipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  onSubmit: (data: UpdatePipelineData) => void;
  loading: boolean;
}

export default function EditPipelineModal({
  open,
  onOpenChange,
  pipeline,
  onSubmit,
  loading,
}: EditPipelineModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState<UpdatePipelineData>({
    name: pipeline.name,
    description: pipeline.description || '',
    pipeline_type: pipeline.pipeline_type,
    visibility: pipeline.visibility,
    is_active: pipeline.is_active,
  });
  const [teamIds, setTeamIds] = useState<string[]>(pipeline.team_ids || []);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [customAttributes, setCustomAttributes] = useState<Record<string, unknown>>({});

  useEffect(() => {
    // Update form data when pipeline changes
    setFormData({
      name: pipeline.name,
      description: pipeline.description || '',
      pipeline_type: pipeline.pipeline_type,
      visibility: pipeline.visibility,
      is_active: pipeline.is_active,
    });
    setTeamIds(pipeline.team_ids || []);
    // Load attributes array from custom_fields.attributes
    // Structure: custom_fields = { attributes: ["key1", "key2", ...] }
    const attributesArray = (pipeline.custom_fields?.attributes as string[]) || [];
    const localDefinitions =
      (pipeline.custom_fields?.attribute_definitions as Record<string, LocalAttributeDefinitionPayload>) || {};
    const createdAttributes: Record<string, unknown> = {};
    attributesArray.forEach(key => {
      const localDefinition = localDefinitions[key];
      createdAttributes[key] = localDefinition
        ? {
            __local_definition: true,
            ...localDefinition,
          }
        : null;
    });
    Object.entries(localDefinitions).forEach(([key, definition]) => {
      if (!createdAttributes[key]) {
        createdAttributes[key] = {
          __local_definition: true,
          ...definition,
        };
      }
    });
    setCustomAttributes(createdAttributes);
  }, [pipeline]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    if (formData.visibility === 'team' && teamIds.length === 0) return;

    const attributeKeys = Object.keys(customAttributes);
    const attributeDefinitions = Object.entries(customAttributes).reduce(
      (acc, [key, value]) => {
        if (value && typeof value === 'object' && (value as LocalAttributeDefinition).__local_definition) {
          const localDefinition = value as LocalAttributeDefinition;
          acc[key] = {
            attribute_display_name: localDefinition.attribute_display_name,
            attribute_display_type: localDefinition.attribute_display_type,
            ...(localDefinition.attribute_values?.length
              ? { attribute_values: localDefinition.attribute_values }
              : {}),
          };
        }
        return acc;
      },
      {} as Record<string, LocalAttributeDefinitionPayload>,
    );

    const existingCustomFields = { ...(pipeline.custom_fields || {}) };
    delete (existingCustomFields as Record<string, unknown>).attributes;
    delete (existingCustomFields as Record<string, unknown>).attribute_definitions;

    const submitData: UpdatePipelineData = {
      ...formData,
      team_ids: formData.visibility === 'team' ? teamIds : [],
      custom_fields: attributeKeys.length > 0
        ? {
            ...existingCustomFields,
            attributes: attributeKeys,
            ...(Object.keys(attributeDefinitions).length > 0
              ? { attribute_definitions: attributeDefinitions }
              : {}),
          }
        : undefined,
    };

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-2xl">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t('editPipeline.title')}</DialogTitle>
            <DialogDescription>
              {t('editPipeline.description', { name: pipeline.name })}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="details" className="contents">
            <div className="px-6">
              <TabsList className="w-full">
                <TabsTab value="details" className="flex-1">{t('editPipeline.details')}</TabsTab>
                <TabsTab value="attributes" className="flex-1">{t('editPipeline.customAttributes')}</TabsTab>
              </TabsList>
            </div>

            <DialogPanel>

            <TabsPanel value="details">
              <div className="grid gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{t('editPipeline.name')}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('editPipeline.namePlaceholder')}
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="edit-description">{t('editPipeline.descriptionLabel')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('editPipeline.descriptionPlaceholder')}
                rows={3}
                disabled={loading}
              />
            </div>

            {/* Pipeline Type */}
            <div className="grid gap-2">
              <Label htmlFor="edit-type">{t('editPipeline.pipelineType')}</Label>
              <Select
                value={formData.pipeline_type}
                items={PIPELINE_TYPES.map(v => ({ value: v, label: t(`editPipeline.types.${v}`) }))}
                onValueChange={(value: 'custom' | 'sales' | 'support' | 'marketing' | null) =>
                  value != null &&
                  setFormData({ ...formData, pipeline_type: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit-type" className="w-full">
                  <SelectValue placeholder={t('editPipeline.selectType')} />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="custom">{t('editPipeline.types.custom')}</SelectItem>
                  <SelectItem value="sales">{t('editPipeline.types.sales')}</SelectItem>
                  <SelectItem value="support">{t('editPipeline.types.support')}</SelectItem>
                  <SelectItem value="marketing">{t('editPipeline.types.marketing')}</SelectItem>
                </SelectPopup>
              </Select>
            </div>

            {/* Visibility */}
            <div className="grid gap-2">
              <Label htmlFor="edit-visibility">{t('editPipeline.visibility')}</Label>
              <Select
                value={formData.visibility}
                items={VISIBILITIES.map(v => ({ value: v, label: t(`editPipeline.visibilityOptions.${v}`) }))}
                onValueChange={(value: 'private' | 'public' | 'team' | null) =>
                  value != null &&
                  setFormData({ ...formData, visibility: value })
                }
                disabled={loading}
              >
                <SelectTrigger id="edit-visibility" className="w-full">
                  <SelectValue placeholder={t('editPipeline.selectVisibility')} />
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value="private">{t('editPipeline.visibilityOptions.private')}</SelectItem>
                  <SelectItem value="public">{t('editPipeline.visibilityOptions.public')}</SelectItem>
                  <SelectItem value="team">{t('editPipeline.visibilityOptions.team')}</SelectItem>
                </SelectPopup>
              </Select>
            </div>

            {formData.visibility === 'team' && (
              <PipelineTeamPicker
                prefix="editPipeline"
                teams={teams}
                teamIds={teamIds}
                loading={teamsLoading}
                disabled={loading}
                onChange={setTeamIds}
              />
            )}

            {/* Active Status */}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label htmlFor="edit-is_active" className="cursor-pointer">
                {t('editPipeline.pipelineActive')}
              </Label>
              <Switch
                id="edit-is_active"
                checked={formData.is_active}
                onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                disabled={loading}
              />
            </div>
              </div>
            </TabsPanel>

            <TabsPanel value="attributes">
              <div className="mb-4">
                <h3 className="mb-1 font-semibold text-base">{t('editPipeline.customAttributes')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('editPipeline.attributesDescription')}
                </p>
              </div>
              <PipelineCustomAttributes
                attributes={customAttributes}
                onAttributesChange={setCustomAttributes}
                disabled={loading}
                pipelineId={pipeline.id}
              />
            </TabsPanel>
            </DialogPanel>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('editPipeline.cancel')}
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!formData.name?.trim() || (formData.visibility === 'team' && teamIds.length === 0)}
            >
              {t('editPipeline.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
