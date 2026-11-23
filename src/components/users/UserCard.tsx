import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Edit, MessageSquare, Trash2 } from 'lucide-react';
import { User } from '@/types/users';
import UserStatusBadge from './UserStatusBadge';
import { useLanguage } from '@/hooks/useLanguage';

type UserCardProps = {
  user: User;
  onStartConversation?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  canDelete?: boolean;
};

export default function UserCard({
  user,
  onStartConversation,
  onEdit,
  onDelete,
  canDelete = true,
}: UserCardProps) {
  const { t } = useLanguage('users');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getRoleLabel = (user: User) => {
    // Priorizar role_data se disponível
    if (user.role && user.role.name) {
      return user.role.name
    }
    
    return t('card.customRole');
  };

  const avatar = user.avatar_url || user.thumbnail;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md/5">
      <div className="flex items-center gap-3 p-4">
        <Avatar className="size-10">
          {avatar && <AvatarImage src={avatar} alt={user.name} />}
          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-sm">{user.name}</h3>
          {user.email && <p className="truncate text-muted-foreground text-xs">{user.email}</p>}
        </div>
        <UserStatusBadge status={user.availability} confirmed={user.confirmed} />
      </div>

      <dl className="flex flex-col gap-1 border-t px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('card.id')}</dt>
          <dd className="font-mono">{user.id}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-muted-foreground">{t('card.role')}</dt>
          <dd className="truncate">{getRoleLabel(user)}</dd>
        </div>
      </dl>

      {(onStartConversation || onEdit || (onDelete && canDelete)) && (
        <div className="flex items-center gap-1 border-t bg-muted/24 p-2">
          {onStartConversation && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => onStartConversation(user)}>
              <MessageSquare />
              {t('card.actions.chat')}
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" className="flex-1" onClick={() => onEdit(user)}>
              <Edit />
              {t('card.actions.edit')}
            </Button>
          )}
          {onDelete && canDelete && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive-foreground hover:bg-destructive/8"
                    onClick={() => onDelete(user)}
                    aria-label={t('card.actions.delete')}
                  />
                }
              >
                <Trash2 />
              </TooltipTrigger>
              <TooltipPopup>{t('card.actions.delete')}</TooltipPopup>
            </Tooltip>
          )}
        </div>
      )}
    </Card>
  );
}
