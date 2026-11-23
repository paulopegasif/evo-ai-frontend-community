import { Users, X } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { Team } from '@/types/users/teams';

interface PipelineTeamPickerProps {
  /** i18n prefix that owns the teamSelection.* keys (createPipeline or editPipeline). */
  prefix: 'createPipeline' | 'editPipeline';
  teams: Team[];
  teamIds: string[];
  loading: boolean;
  disabled?: boolean;
  onChange: (next: string[]) => void;
}

/** Team multi-select used when a pipeline's visibility is "team". */
export default function PipelineTeamPicker({
  prefix,
  teams,
  teamIds,
  loading,
  disabled,
  onChange,
}: PipelineTeamPickerProps) {
  const { t } = useLanguage('pipelines');
  const toggle = (id: string) =>
    onChange(teamIds.includes(id) ? teamIds.filter(tid => tid !== id) : [...teamIds, id]);

  return (
    <div className="flex flex-col gap-2">
      <Label>{t(`${prefix}.teamSelection.label`)}</Label>
      {teamIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {teamIds.map(id => {
            const team = teams.find(tm => tm.id === id);
            if (!team) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 pe-0.5">
                <Users className="size-3" />
                {team.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  disabled={disabled}
                  className="rounded-sm p-0.5 opacity-72 outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t(`${prefix}.teamSelection.remove`, { name: team.name })}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
      <div className="max-h-40 overflow-y-auto rounded-lg border">
        {loading ? (
          <div className="flex flex-col gap-2 p-2.5" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground text-sm">{t(`${prefix}.teamSelection.noTeams`)}</p>
        ) : (
          <div className="flex flex-col p-1">
            {teams.map(team => (
              <Label
                key={team.id}
                className="cursor-pointer gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-accent/50"
              >
                <Checkbox
                  checked={teamIds.includes(team.id)}
                  onCheckedChange={() => toggle(team.id)}
                  disabled={disabled}
                />
                {team.name}
              </Label>
            ))}
          </div>
        )}
      </div>
      {teamIds.length === 0 && (
        <p className="text-destructive-foreground text-xs">{t(`${prefix}.teamSelection.required`)}</p>
      )}
    </div>
  );
}
