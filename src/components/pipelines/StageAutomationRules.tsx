import { useRef, useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusIcon, TrashIcon } from 'lucide-react';
import type {
  StageAutomationRule,
  StageAutomationTrigger,
  StageAutomationAction,
  InactivityBase,
  InactivityTriggerValue,
} from '@/types/analytics/pipelines';
import type { PipelineStage } from '@/types/analytics';
import type { Label } from '@/types/settings/labels';

interface Agent {
  id: string;
  name: string;
}

// Minimal shapes the picker needs — the parent modal passes these in (agent
// bots come from agentBotsService.getAll, NOT the human-assignee list).
const TRIGGER_OPTIONS: StageAutomationTrigger[] = [
  'label_added',
  'conversation_status_changed',
  'custom_attribute_updated',
  'inactivity',
];
const ACTION_OPTIONS: StageAutomationAction[] = [
  'move_to_stage',
  'move_to_pipeline',
  'assign_agent',
  'apply_label',
  'send_ai_message',
  'send_direct_message',
  'send_template',
  'finalize',
];

export interface AgentBotOption {
  id: string;
  name: string;
}

export interface MessageTemplateOption {
  id: string;
  name: string;
  language?: string;
}

export interface PipelineWithStages {
  id: string;
  name: string;
  stages: { id: string; name: string }[];
}

interface StageAutomationRulesProps {
  rules: StageAutomationRule[];
  onChange: (rules: StageAutomationRule[]) => void;
  disabled?: boolean;
  currentStageId?: string;
  currentPipelineId?: string;
  stages?: PipelineStage[];
  agents?: Agent[];
  labels?: Label[];
  pipelines?: PipelineWithStages[];
  agentBots?: AgentBotOption[];
  messageTemplates?: MessageTemplateOption[];
}

function newRuleId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const makeEmptyRule = (): StageAutomationRule => ({
  id: newRuleId(),
  trigger: 'label_added',
  trigger_value: '',
  action: 'move_to_stage',
  action_value: '',
});

const CONVERSATION_STATUSES = ['open', 'resolved', 'pending', 'snoozed'] as const;
const INACTIVITY_MINUTES = [2, 5, 10, 15, 30, 60, 120, 240, 480, 720, 1440] as const;
const INACTIVITY_BASES: InactivityBase[] = ['no_customer_reply', 'stage_stagnation'];

const ANY_VALUE_SENTINEL = '__any__';
const PLACEHOLDER_SENTINEL = '__placeholder__';

// trigger_value is an object for the inactivity trigger, a string otherwise.
function asInactivityValue(value: StageAutomationRule['trigger_value']): InactivityTriggerValue {
  if (value && typeof value === 'object') {
    return { minutes: value.minutes ?? INACTIVITY_MINUTES[1], base: value.base ?? 'no_customer_reply' };
  }
  return { minutes: INACTIVITY_MINUTES[1], base: 'no_customer_reply' };
}

// Narrow the union to the string form for the non-inactivity triggers (label /
// status / generic input), where trigger_value is always a string at runtime.
function asStringValue(value: StageAutomationRule['trigger_value']): string {
  return typeof value === 'string' ? value : '';
}

function generateKey() {
  return `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function StageAutomationRules({
  rules,
  onChange,
  disabled = false,
  currentStageId,
  currentPipelineId,
  stages = [],
  agents = [],
  labels = [],
  pipelines = [],
  agentBots = [],
  messageTemplates = [],
}: StageAutomationRulesProps) {
  const { t } = useLanguage('pipelines');

  const [keys, setKeys] = useState<string[]>(() => rules.map(() => generateKey()));
  const prevLengthRef = useRef(rules.length);

  useEffect(() => {
    if (rules.length !== prevLengthRef.current) {
      if (rules.length > prevLengthRef.current) {
        setKeys(prev => [...prev, generateKey()]);
      } else {
        setKeys(prev => prev.slice(0, rules.length));
      }
      prevLengthRef.current = rules.length;
    }
  }, [rules.length]);

  const addRule = () => onChange([...rules, makeEmptyRule()]);

  const removeRule = (index: number) => onChange(rules.filter((_, i) => i !== index));

  const updateRule = (index: number, patch: Partial<StageAutomationRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const otherStages = stages.filter(s => s.id !== currentStageId);

  // Format the inactivity delay label: minutes below 60, hours when a whole
  // multiple of 60 (the stored value stays in minutes, only the label changes).
  const formatInactivityLabel = (m: number): string => {
    if (m < 60 || m % 60 !== 0) {
      return `${m} ${t('stageAutomation.inactivity.minutes')}`;
    }
    const h = m / 60;
    return `${h} ${t(h === 1 ? 'stageAutomation.inactivity.hour' : 'stageAutomation.inactivity.hours')}`;
  };

  const renderTriggerValue = (rule: StageAutomationRule, index: number) => {
    if (rule.trigger === 'custom_attribute_updated') return null;

    if (rule.trigger === 'inactivity') {
      const iv = asInactivityValue(rule.trigger_value);
      return (
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Select
            items={Object.fromEntries(INACTIVITY_MINUTES.map(m => [String(m), formatInactivityLabel(m)]))}
            value={String(iv.minutes)}
            onValueChange={v =>
              v != null && updateRule(index, { trigger_value: { ...iv, minutes: parseInt(v, 10) } })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {INACTIVITY_MINUTES.map(m => (
                <SelectItem key={m} value={String(m)}>
                  {formatInactivityLabel(m)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>

          <Select
            items={Object.fromEntries(INACTIVITY_BASES.map(b => [b, t(`stageAutomation.inactivity.base.${b}`)]))}
            value={iv.base}
            onValueChange={v =>
              v != null && updateRule(index, { trigger_value: { ...iv, base: v as InactivityBase } })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {INACTIVITY_BASES.map(b => (
                <SelectItem key={b} value={b}>
                  {t(`stageAutomation.inactivity.base.${b}`)}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </div>
      );
    }

    if (rule.trigger === 'label_added') {
      return (
        <Select
          items={{ [ANY_VALUE_SENTINEL]: t('stageAutomation.anyLabel'), ...Object.fromEntries(labels.map(l => [l.title, l.title])) }}
          value={asStringValue(rule.trigger_value) || ANY_VALUE_SENTINEL}
          onValueChange={v =>
            v != null && updateRule(index, { trigger_value: v === ANY_VALUE_SENTINEL ? '' : v })
          }
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.anyLabel')} />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={ANY_VALUE_SENTINEL}>{t('stageAutomation.anyLabel')}</SelectItem>
            {labels.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noLabels')}
              </SelectItem>
            ) : (
              labels.map(l => (
                <SelectItem key={l.id} value={l.title}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.title}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectPopup>
        </Select>
      );
    }

    if (rule.trigger === 'conversation_status_changed') {
      return (
        <Select
          items={{ [ANY_VALUE_SENTINEL]: t('stageAutomation.anyValue'), ...Object.fromEntries(CONVERSATION_STATUSES.map(st => [st, t(`kanban.search.status.${st}`) || st])) }}
          value={asStringValue(rule.trigger_value) || ANY_VALUE_SENTINEL}
          onValueChange={v =>
            v != null && updateRule(index, { trigger_value: v === ANY_VALUE_SENTINEL ? '' : v })
          }
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.anyValue')} />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value={ANY_VALUE_SENTINEL}>{t('stageAutomation.anyValue')}</SelectItem>
            {CONVERSATION_STATUSES.map(s => (
              <SelectItem key={s} value={s}>
                {t(`kanban.search.status.${s}`) || s}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      );
    }

    return (
      <Input
        className="flex-1"
        placeholder={t('stageAutomation.labelNamePlaceholder')}
        value={asStringValue(rule.trigger_value)}
        onChange={e => updateRule(index, { trigger_value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  const renderActionValue = (rule: StageAutomationRule, index: number) => {
    if (rule.action === 'move_to_stage') {
      return (
        <Select
          items={Object.fromEntries(otherStages.map(st => [st.id, st.name]))}
          value={rule.action_value || null}
          onValueChange={v => v != null && updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectStage')} />
          </SelectTrigger>
          <SelectPopup>
            {otherStages.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>{t('stageAutomation.noOtherStages')}</SelectItem>
            ) : (
              otherStages.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectPopup>
        </Select>
      );
    }

    if (rule.action === 'move_to_pipeline') {
      const [selectedPipelineId, selectedStageId] = (rule.action_value || '').split(':');
      const otherPipelines = pipelines.filter(p => p.id !== currentPipelineId);
      const selectedPipeline = otherPipelines.find(p => p.id === selectedPipelineId);

      return (
        <div className="flex-1 grid grid-cols-2 gap-2">
          <Select
            items={Object.fromEntries(otherPipelines.map(p => [p.id, p.name]))}
            value={selectedPipelineId || null}
            onValueChange={v => v != null && updateRule(index, { action_value: v })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('stageAutomation.selectPipeline')} />
            </SelectTrigger>
            <SelectPopup>
              {otherPipelines.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noOtherPipelines')}
                </SelectItem>
              ) : (
                otherPipelines.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              )}
            </SelectPopup>
          </Select>

          <Select
            items={Object.fromEntries((selectedPipeline?.stages ?? []).map(st => [st.id, st.name]))}
            value={selectedStageId || null}
            onValueChange={v =>
              v != null && updateRule(index, {
                action_value: selectedPipelineId ? `${selectedPipelineId}:${v}` : '',
              })
            }
            disabled={disabled || !selectedPipeline}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('stageAutomation.selectStage')} />
            </SelectTrigger>
            <SelectPopup>
              {!selectedPipeline || selectedPipeline.stages.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noStagesInPipeline')}
                </SelectItem>
              ) : (
                selectedPipeline.stages.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))
              )}
            </SelectPopup>
          </Select>
        </div>
      );
    }

    if (rule.action === 'assign_agent') {
      return (
        <Select
          items={Object.fromEntries(agents.map(a => [a.id, a.name]))}
          value={rule.action_value || null}
          onValueChange={v => v != null && updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectAgent')} />
          </SelectTrigger>
          <SelectPopup>
            {agents.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>{t('stageAutomation.noAgents')}</SelectItem>
            ) : (
              agents.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))
            )}
          </SelectPopup>
        </Select>
      );
    }

    if (rule.action === 'apply_label') {
      return (
        <Select
          items={Object.fromEntries(labels.map(l => [l.title, l.title]))}
          value={rule.action_value || null}
          onValueChange={v => v != null && updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectLabel')} />
          </SelectTrigger>
          <SelectPopup>
            {labels.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noLabels')}
              </SelectItem>
            ) : (
              labels.map(l => (
                <SelectItem key={l.id} value={l.title}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    {l.title}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectPopup>
        </Select>
      );
    }

    if (rule.action === 'send_ai_message') {
      return (
        <div className="flex-1 space-y-2">
          <Select
            items={Object.fromEntries(agentBots.map(b => [b.id, b.name]))}
            value={rule.action_value || null}
            onValueChange={v => v != null && updateRule(index, { action_value: v })}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('stageAutomation.selectAgentBot')} />
            </SelectTrigger>
            <SelectPopup>
              {agentBots.length === 0 ? (
                <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                  {t('stageAutomation.noAgentBots')}
                </SelectItem>
              ) : (
                agentBots.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))
              )}
            </SelectPopup>
          </Select>
          <Textarea
            rows={2}
            maxLength={512}
            placeholder={t('stageAutomation.aiMessagePlaceholder')}
            value={rule.ai_message ?? ''}
            onChange={e => updateRule(index, { ai_message: e.target.value })}
            disabled={disabled}
          />
        </div>
      );
    }

    if (rule.action === 'send_direct_message' || rule.action === 'finalize') {
      return (
        <Textarea
          className="flex-1"
          rows={2}
          maxLength={512}
          placeholder={
            rule.action === 'finalize'
              ? t('stageAutomation.finalizeMessagePlaceholder')
              : t('stageAutomation.directMessagePlaceholder')
          }
          value={rule.action_value}
          onChange={e => updateRule(index, { action_value: e.target.value })}
          disabled={disabled}
        />
      );
    }

    if (rule.action === 'send_template') {
      return (
        <Select
          items={Object.fromEntries(messageTemplates.map(tpl => [tpl.id, `${tpl.name}${tpl.language ? ` (${tpl.language})` : ''}`]))}
          value={rule.action_value || null}
          onValueChange={v => v != null && updateRule(index, { action_value: v })}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('stageAutomation.selectTemplate')} />
          </SelectTrigger>
          <SelectPopup>
            {messageTemplates.length === 0 ? (
              <SelectItem value={PLACEHOLDER_SENTINEL} disabled>
                {t('stageAutomation.noTemplates')}
              </SelectItem>
            ) : (
              messageTemplates.map(tpl => (
                <SelectItem key={tpl.id} value={tpl.id}>
                  {tpl.name}
                  {tpl.language ? ` (${tpl.language})` : ''}
                </SelectItem>
              ))
            )}
          </SelectPopup>
        </Select>
      );
    }

    return (
      <Input
        className="flex-1"
        placeholder={t('stageAutomation.labelNamePlaceholder')}
        value={rule.action_value}
        onChange={e => updateRule(index, { action_value: e.target.value })}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{t('stageAutomation.title')}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t('stageAutomation.description')}</p>
      </div>

      {rules.length === 0 && (
        <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground text-sm">
          {t('stageAutomation.noRules')}
        </p>
      )}

      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={keys[index] ?? index} className="space-y-3 rounded-xl border bg-muted/48 p-3 dark:bg-muted/24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('stageAutomation.rule')} {index + 1}
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => removeRule(index)}
                disabled={disabled}
                className="text-muted-foreground hover:text-destructive-foreground"
                aria-label={t('stageAutomation.removeRule')}
              >
                <TrashIcon />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t('stageAutomation.when')}</p>
              <div className="flex items-start gap-2">
                <Select
                  items={Object.fromEntries(TRIGGER_OPTIONS.map(o => [o, t(`stageAutomation.triggers.${o}`)]))}
                  value={rule.trigger}
                  onValueChange={v => {
                    if (v == null) return;
                    const trigger = v as StageAutomationTrigger;
                    updateRule(index, {
                      trigger,
                      trigger_value:
                        trigger === 'inactivity'
                          ? { minutes: INACTIVITY_MINUTES[1], base: 'no_customer_reply' }
                          : '',
                    });
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-52 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {TRIGGER_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>
                        {t(`stageAutomation.triggers.${o}`)}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {renderTriggerValue(rule, index)}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">{t('stageAutomation.then')}</p>
              <div className="flex items-start gap-2">
                <Select
                  items={Object.fromEntries(ACTION_OPTIONS.map(o => [o, t(`stageAutomation.actions.${o}`)]))}
                  value={rule.action}
                  onValueChange={v => v != null && updateRule(index, { action: v as StageAutomationAction, action_value: '' })}
                  disabled={disabled}
                >
                  <SelectTrigger className="w-52 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {ACTION_OPTIONS.map(o => (
                      <SelectItem key={o} value={o}>
                        {t(`stageAutomation.actions.${o}`)}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {renderActionValue(rule, index)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={addRule}
        disabled={disabled}
        className="w-full"
      >
        <PlusIcon />
        {t('stageAutomation.addRule')}
      </Button>
    </div>
  );
}
