import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import {
  Edit,
  Mail,
  Clock,
  User as UserIcon,
  History,
  Settings,
  Shield,
} from '@/components/icons';
import { User } from '@/types/users';
import { DetailRow, DetailSection } from './DetailSection';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { parseApiDate } from '@/utils/apiDate';

interface UserDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onEdit: (user: User) => void;
  canDelete?: (user: User) => boolean;
}

export default function UserDetails({
  open,
  onOpenChange,
  user,
  onEdit,
}: UserDetailsProps) {
  const { t } = useLanguage('users');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const statusVariant = (status: string) =>
    status === 'online' ? 'success' : status === 'busy' ? 'warning' : 'secondary';

  const getStatusLabel = (status: string) => {
    const statusKey = `details.status.${status}`;
    return t(statusKey) || t('details.status.offline');
  };

  const getRoleLabel = (user: User) => {
    // Priorizar role_data se disponível
    if (user.role && user.role.name) {
      return user.role.name
    }
    
    return t('card.customRole');
  };

  if (!user) return null;

  const statusBadge = (
    <Badge variant={statusVariant(user.availability)}>{getStatusLabel(user.availability)}</Badge>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader className="border-b">
          <div className="flex flex-col gap-4 pe-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-12 text-base">
                {user.thumbnail && <AvatarImage src={user.thumbnail} alt={user.name} />}
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="truncate">{user.name}</DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {statusBadge}
                  <Badge variant={user.confirmed ? 'success' : 'warning'}>
                    {user.confirmed ? t('details.status.confirmed') : t('details.status.pending')}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {t('details.id')}: <span className="font-mono">{user.id}</span>
                  </span>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
              <Edit />
              {t('details.edit')}
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="underline" className="w-full justify-start border-b px-6">
            <TabsTab value="overview">
              <UserIcon />
              {t('details.tabs.overview')}
            </TabsTab>
            <TabsTab value="activity">
              <History />
              {t('details.tabs.activity')}
            </TabsTab>
            <TabsTab value="settings">
              <Settings />
              {t('details.tabs.settings')}
            </TabsTab>
          </TabsList>

          <DialogPanel className="pt-4">
            <TabsPanel value="overview" className="flex flex-col gap-5">
              <DetailSection icon={<Mail />} title={t('details.contactInfo.title')}>
                <DetailRow label={t('details.contactInfo.email')}>
                  <span className="font-mono text-xs">{user.email}</span>
                </DetailRow>
              </DetailSection>

              <DetailSection icon={<Shield />} title={t('details.rolePermissions.title')}>
                <DetailRow label={t('details.rolePermissions.role')}>
                  <Badge variant="outline">{getRoleLabel(user)}</Badge>
                </DetailRow>
                <DetailRow label={t('details.rolePermissions.availability')}>{statusBadge}</DetailRow>
              </DetailSection>

              <DetailSection icon={<Settings />} title={t('details.accountStatus.title')}>
                <DetailRow label={t('details.accountStatus.confirmation')}>
                  <Badge variant={user.confirmed ? 'success' : 'warning'}>
                    {user.confirmed ? t('details.accountStatus.confirmed') : t('details.accountStatus.pending')}
                  </Badge>
                </DetailRow>
              </DetailSection>

              {(user.created_at || user.updated_at) && (
                <DetailSection icon={<Clock />} title={t('details.timestamps.title')}>
                  {user.created_at && (
                    <DetailRow label={t('details.timestamps.created')}>
                      {formatDistanceToNow(parseApiDate(user.created_at) ?? new Date(), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </DetailRow>
                  )}
                  {user.updated_at && (
                    <DetailRow label={t('details.timestamps.lastUpdate')}>
                      {formatDistanceToNow(new Date(user.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </DetailRow>
                  )}
                </DetailSection>
              )}
            </TabsPanel>

            <TabsPanel value="activity">
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <History />
                  </EmptyMedia>
                  <EmptyDescription>{t('details.activity.placeholder')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </TabsPanel>

            <TabsPanel value="settings" className="flex flex-col gap-4">
              <DetailSection icon={<Settings />} title={t('details.settingsTab.title')}>
                <DetailRow
                  label={t('details.settingsTab.systemRole.title')}
                  hint={t('details.settingsTab.systemRole.description')}
                >
                  <Badge variant="outline">{getRoleLabel(user)}</Badge>
                </DetailRow>
                <DetailRow
                  label={t('details.settingsTab.availabilityStatus.title')}
                  hint={t('details.settingsTab.availabilityStatus.description')}
                >
                  {statusBadge}
                </DetailRow>
                <DetailRow
                  label={t('details.settingsTab.emailConfirmation.title')}
                  hint={t('details.settingsTab.emailConfirmation.description')}
                >
                  <Badge variant={user.confirmed ? 'success' : 'warning'}>
                    {user.confirmed
                      ? t('details.settingsTab.emailConfirmation.verified')
                      : t('details.settingsTab.emailConfirmation.pending')}
                  </Badge>
                </DetailRow>
              </DetailSection>
              <Button variant="outline" onClick={() => onEdit(user)} className="w-full">
                <Edit />
                {t('details.settingsTab.editSettings')}
              </Button>
            </TabsPanel>
          </DialogPanel>
        </Tabs>
      </DialogPopup>
    </Dialog>
  );
}
