import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, Users, Trash2 } from '@/components/icons';
import { Team } from '@/types/users';
import { useLanguage } from '@/hooks/useLanguage';

type TeamCardProps = {
  team: Team;
  onManageUsers?: (team: Team) => void;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
};

export default function TeamCard({
  team,
  onManageUsers,
  onEdit,
  onDelete,
}: TeamCardProps) {
  const { t } = useLanguage('teams');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md/5">
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-10 rounded-lg">
          <AvatarFallback className="rounded-lg">{getInitials(team.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-sm">{team.name}</h3>
          {team.description && <p className="truncate text-muted-foreground text-xs">{team.description}</p>}
        </div>
        {team.allow_auto_assign && <Badge variant="success">{t('card.autoAssign')}</Badge>}
      </div>

      <dl className="flex flex-col gap-1 border-t px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('card.id')}</dt>
          <dd className="font-mono">{team.id}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('card.members')}</dt>
          <dd className="tabular-nums">{team.members_count || 0}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-1 border-t bg-muted/24 p-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => onManageUsers?.(team)}>
          <Users />
          {t('card.actions.users')}
        </Button>
        <Button variant="ghost" size="sm" className="flex-1" onClick={() => onEdit?.(team)}>
          <Edit />
          {t('card.actions.edit')}
        </Button>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive-foreground hover:bg-destructive/8"
                onClick={() => onDelete?.(team)}
                aria-label={t('card.actions.delete')}
              />
            }
          >
            <Trash2 />
          </TooltipTrigger>
          <TooltipPopup>{t('card.actions.delete')}</TooltipPopup>
        </Tooltip>
      </div>
    </Card>
  );
}
