import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { Trash2, Plus } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import type { Pipeline } from '@/types/analytics/pipelines';
import type { CustomAttributeDefinition } from '@/types/settings';
import type { CrmForm, CrmFormField, CrmFormPayload, CrmFieldType, RoutingOp, RoutingRule } from '@/types/crmForms';
import {
  encodeTarget,
  decodeTarget,
  buildTargetGroups,
  suggestFieldFromAttribute,
  attrForTarget,
  NONE_TARGET,
} from '@/services/crmForms/crmFormTargets';

interface CrmFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: CrmFormPayload) => void | Promise<void>;
  saving: boolean;
  initial: CrmForm | null;
  pipelines: Pipeline[];
  contactAttrs: CustomAttributeDefinition[];
  dealAttrs: CustomAttributeDefinition[];
  /** Preselected pipeline for a NEW form (create mode only). */
  presetPipelineId?: string;
}

const FIELD_TYPES: CrmFieldType[] = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'];
const ROUTING_OPS: RoutingOp[] = ['equals', 'not_equals', 'contains'];
const NONE = '__none__';

interface ChooseProps {
  value?: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
}
const Choose = ({ value, onChange, options, placeholder, id, 'aria-label': ariaLabel }: ChooseProps) => (
  <OptionSelect
    id={id}
    value={value || ''}
    onValueChange={onChange}
    options={options}
    placeholder={placeholder}
    aria-label={ariaLabel}
  />
);

const SectionHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-3">
    <h3 className="font-semibold text-sm">{title}</h3>
    {action}
  </div>
);

const emptyField = (): CrmFormField => ({ key: '', label: '', type: 'text', required: false, maps_to: '' });

const contactStdKey = (f: CrmFormField): string | null => {
  const mt = f.maps_to || '';
  if (['name', 'email', 'phone', 'company'].includes(mt)) return mt;
  if (mt === 'contact') return f.maps_to_key || null;
  return null;
};

const CrmFormModal = ({ open, onClose, onSave, saving, initial, pipelines, contactAttrs, dealAttrs, presetPipelineId }: CrmFormModalProps) => {
  const { t } = useLanguage('crmForms');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fields, setFields] = useState<CrmFormField[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [defaultPipelineId, setDefaultPipelineId] = useState('');
  const [defaultStageId, setDefaultStageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setPublished(initial?.published ?? false);
    setPrimaryColor(initial?.appearance?.primary_color ?? '');
    setLogoUrl(initial?.appearance?.logo_url ?? '');
    setSuccessMessage(initial?.appearance?.success_message ?? '');
    setFields(
      initial?.fields?.length
        ? initial.fields
        : [
            { key: 'name', label: t('modal.targets.contactName'), type: 'text', required: true, maps_to: 'contact', maps_to_key: 'name' },
            { key: 'email', label: t('modal.targets.contactEmail'), type: 'email', required: true, maps_to: 'contact', maps_to_key: 'email' },
          ],
    );
    setRules(initial?.routing_rules ?? []);
    // On create (no initial), preselect the pipeline this modal was opened from.
    setDefaultPipelineId(initial?.default_pipeline_id ?? presetPipelineId ?? '');
    setDefaultStageId(initial?.default_stage_id ?? '');
    setError(null);
  }, [open, initial, t, presetPipelineId]);

  const targetGroups = buildTargetGroups(contactAttrs, dealAttrs, t);

  const stageOptions = (pipelineId?: string) => [
    { value: NONE, label: t('modal.destination.stageNone') },
    ...(pipelines.find(p => p.id === pipelineId)?.stages ?? []).map(s => ({ value: s.id, label: s.name })),
  ];
  const pipelineOptions = pipelines.map(p => ({ value: p.id, label: p.name }));

  const updateField = (idx: number, patch: Partial<CrmFormField>) =>
    setFields(prev => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  const updateRule = (idx: number, patch: Partial<RoutingRule>) =>
    setRules(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const applyTarget = (idx: number, value: string) => {
    const patch: Partial<CrmFormField> = decodeTarget(value);
    const attr = attrForTarget(value, contactAttrs, dealAttrs);
    if (attr) {
      const suggestion = suggestFieldFromAttribute(attr);
      patch.type = suggestion.type;
      if (suggestion.options) patch.options = suggestion.options;
    }
    updateField(idx, patch);
  };

  const handleSave = () => {
    setError(null);
    if (!name.trim()) return setError(t('modal.errors.name'));
    if (!defaultPipelineId) return setError(t('modal.errors.pipeline'));

    const std = fields.map(contactStdKey);
    if (!std.includes('email')) return setError(t('modal.errors.email'));
    if (!std.includes('name')) return setError(t('modal.errors.nameField'));
    if (fields.some(f => !f.key.trim())) return setError(t('modal.errors.fieldKey'));

    const payload: CrmFormPayload = {
      name: name.trim(),
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      published,
      appearance: {
        primary_color: primaryColor || undefined,
        logo_url: logoUrl || undefined,
        success_message: successMessage || undefined,
      },
      fields,
      routing_rules: rules.filter(r => r.pipeline_id),
      default_pipeline_id: defaultPipelineId,
      default_stage_id: defaultStageId || undefined,
    };
    onSave(payload);
  };

  const renderTargetSelect = (f: CrmFormField, idx: number) => (
    <OptionSelect
      id={`crm-field-${idx}-target`}
      value={encodeTarget(f)}
      onValueChange={v => applyTarget(idx, v)}
      placeholder={t('modal.fields.mapTo')}
      groups={targetGroups.map(g => ({ key: g.label, label: g.label }))}
      options={[
        { value: NONE_TARGET, label: t('modal.targets.none') },
        ...targetGroups.flatMap(g => g.options.map(o => ({ value: o.value, label: o.label, group: g.label }))),
      ]}
    />
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-8">
          <section className="flex flex-col gap-5">
            <SectionHeader title={t('modal.sections.basic')} />
            <Field>
              <FieldLabel htmlFor="crm-form-name">{t('modal.basic.name')}</FieldLabel>
              <Input
                id="crm-form-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t('modal.basic.namePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="crm-form-title">{t('modal.basic.title')}</FieldLabel>
              <Input
                id="crm-form-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('modal.basic.titlePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="crm-form-description">{t('modal.basic.description')}</FieldLabel>
              <Textarea id="crm-form-description" value={description} onChange={e => setDescription(e.target.value)} />
            </Field>
            <Label>
              <Switch checked={published} onCheckedChange={setPublished} />
              {t('modal.basic.published')}
            </Label>
          </section>

          <section className="flex flex-col gap-5">
            <SectionHeader title={t('modal.sections.appearance')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="crm-form-color">{t('modal.appearance.primaryColor')}</FieldLabel>
                <Input
                  id="crm-form-color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#1E40AF"
                  className="font-mono"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="crm-form-logo">{t('modal.appearance.logoUrl')}</FieldLabel>
                <Input
                  id="crm-form-logo"
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="crm-form-success">{t('modal.appearance.successMessage')}</FieldLabel>
              <Input id="crm-form-success" value={successMessage} onChange={e => setSuccessMessage(e.target.value)} />
            </Field>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader
              title={t('modal.sections.fields')}
              action={
                <Button variant="outline" size="sm" onClick={() => setFields(prev => [...prev, emptyField()])}>
                  <Plus />
                  {t('modal.fields.add')}
                </Button>
              }
            />
            {fields.map((f, idx) => (
              <div key={idx} className="flex flex-col gap-4 rounded-xl border bg-muted/24 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`crm-field-${idx}-key`}>{t('modal.fields.key')}</FieldLabel>
                    <Input
                      id={`crm-field-${idx}-key`}
                      value={f.key}
                      onChange={e => updateField(idx, { key: e.target.value })}
                      className="font-mono"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`crm-field-${idx}-label`}>{t('modal.fields.label')}</FieldLabel>
                    <Input
                      id={`crm-field-${idx}-label`}
                      value={f.label ?? ''}
                      onChange={e => updateField(idx, { label: e.target.value })}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`crm-field-${idx}-type`}>{t('modal.fields.type')}</FieldLabel>
                    <Choose
                      id={`crm-field-${idx}-type`}
                      value={f.type}
                      onChange={v => updateField(idx, { type: v as CrmFieldType })}
                      options={FIELD_TYPES.map(ft => ({ value: ft, label: ft }))}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`crm-field-${idx}-target`}>{t('modal.fields.mapTo')}</FieldLabel>
                    {renderTargetSelect(f, idx)}
                  </Field>
                </div>
                {f.type === 'select' && (
                  <Input
                    placeholder={t('modal.fields.optionsPlaceholder')}
                    aria-label={t('modal.fields.optionsPlaceholder')}
                    value={(f.options ?? []).join(', ')}
                    onChange={e =>
                      updateField(idx, {
                        options: e.target.value
                          .split(',')
                          .map(o => o.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                )}
                <div className="flex items-center justify-between gap-3">
                  <Label className="font-normal">
                    <Checkbox checked={!!f.required} onCheckedChange={c => updateField(idx, { required: c === true })} />
                    {t('modal.fields.required')}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground hover:bg-destructive/8"
                    onClick={() => setFields(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 />
                    {t('modal.fields.remove')}
                  </Button>
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-5">
            <SectionHeader title={t('modal.sections.defaultDestination')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="crm-form-pipeline">{t('modal.destination.pipeline')}</FieldLabel>
                <Choose
                  id="crm-form-pipeline"
                  value={defaultPipelineId}
                  onChange={v => {
                    setDefaultPipelineId(v);
                    setDefaultStageId('');
                  }}
                  options={pipelineOptions}
                  placeholder={t('modal.destination.pipeline')}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="crm-form-stage">{t('modal.destination.stage')}</FieldLabel>
                <Choose
                  id="crm-form-stage"
                  value={defaultStageId || NONE}
                  onChange={v => setDefaultStageId(v === NONE ? '' : v)}
                  options={stageOptions(defaultPipelineId)}
                  placeholder={t('modal.destination.stage')}
                />
              </Field>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionHeader
              title={t('modal.sections.routing')}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setRules(prev => [...prev, { field: '', op: 'equals', value: '', pipeline_id: '', stage_id: '' }])
                  }
                >
                  <Plus />
                  {t('modal.routing.add')}
                </Button>
              }
            />
            {rules.map((r, idx) => (
              <div key={idx} className="flex flex-col gap-3 rounded-xl border bg-muted/24 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Choose
                    value={r.field}
                    onChange={v => updateRule(idx, { field: v })}
                    options={fields.filter(f => f.key).map(f => ({ value: f.key, label: f.key }))}
                    placeholder={t('modal.routing.field')}
                    aria-label={t('modal.routing.field')}
                  />
                  <Choose
                    value={r.op ?? 'equals'}
                    onChange={v => updateRule(idx, { op: v as RoutingOp })}
                    options={ROUTING_OPS.map(o => ({ value: o, label: o }))}
                  />
                  <Input
                    placeholder={t('modal.routing.value')}
                    aria-label={t('modal.routing.value')}
                    value={r.value ?? ''}
                    onChange={e => updateRule(idx, { value: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Choose
                    value={r.pipeline_id}
                    onChange={v => updateRule(idx, { pipeline_id: v, stage_id: '' })}
                    options={pipelineOptions}
                    placeholder={t('modal.routing.pipeline')}
                    aria-label={t('modal.routing.pipeline')}
                  />
                  <Choose
                    value={r.stage_id || NONE}
                    onChange={v => updateRule(idx, { stage_id: v === NONE ? '' : v })}
                    options={stageOptions(r.pipeline_id)}
                    placeholder={t('modal.routing.stage')}
                    aria-label={t('modal.routing.stage')}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive-foreground hover:bg-destructive/8"
                    onClick={() => setRules(prev => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 />
                    {t('modal.routing.remove')}
                  </Button>
                </div>
              </div>
            ))}
          </section>

          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />} disabled={saving}>
            {t('modal.cancel')}
          </DialogClose>
          <Button onClick={handleSave} loading={saving}>
            {saving ? t('modal.saving') : t('modal.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default CrmFormModal;
