import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs';
import { DetailRow, DetailSection } from '@/components/users/DetailSection';
import {
  Edit,
  Users,
  Clock,
  Settings,
  History,
  StickyNote,
} from 'lucide-react';
import { Team } from '@/types/users';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';
import { parseApiDate } from '@/utils/apiDate';

interface TeamDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  onEdit: (team: Team) => void;
  onManageUsers: (team: Team) => void;
}

export default function TeamDetails({
  open,
  onOpenChange,
  team,
  onEdit,
  onManageUsers,
}: TeamDetailsProps) {
  const { t } = useLanguage('teams');

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);

  if (!team) return null;

  const autoAssignBadge = (labelOn: string, labelOff: string) => (
    <Badge variant={team.allow_auto_assign ? 'success' : 'secondary'}>
      {team.allow_auto_assign ? labelOn : labelOff}
    </Badge>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader className="border-b">
          <div className="flex flex-col gap-4 pe-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-12 rounded-xl text-base">
                <AvatarFallback className="rounded-xl">{getInitials(team.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DialogTitle className="truncate">{team.name}</DialogTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {autoAssignBadge(t('details.autoAssignActive'), t('details.autoAssignInactive'))}
                  <span className="text-muted-foreground text-xs">
                    {t('details.id')}: <span className="font-mono">{team.id}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => onManageUsers(team)}>
                <Users />
                {t('details.actions.manageUsers')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(team)}>
                <Edit />
                {t('details.actions.edit')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="underline" className="w-full justify-start overflow-x-auto border-b px-6">
            <TabsTab value="overview">
              <StickyNote />
              {t('details.tabs.overview')}
            </TabsTab>
            <TabsTab value="members">
              <Users />
              {t('details.tabs.members')} ({team.members_count || 0})
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
              <section className="flex flex-col gap-2">
                <h3 className="flex items-center gap-2 font-semibold text-sm">
                  <StickyNote className="size-4 text-muted-foreground" />
                  {t('details.overview.description')}
                </h3>
                <p className="rounded-xl border bg-muted/24 p-4 text-muted-foreground text-sm">
                  {team.description || t('details.overview.noDescription')}
                </p>
              </section>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardPanel className="flex flex-col gap-1 pt-4 pb-4">
                    <span className="text-muted-foreground text-sm">{t('details.overview.totalMembers')}</span>
                    <span className="font-semibold text-2xl tabular-nums">{team.members_count || 0}</span>
                  </CardPanel>
                </Card>
                <Card>
                  <CardPanel className="flex flex-col gap-1 pt-4 pb-4">
                    <span className="text-muted-foreground text-sm">{t('details.overview.autoAssign')}</span>
                    <span
                      className={`font-semibold text-2xl ${team.allow_auto_assign ? 'text-success-foreground' : 'text-muted-foreground'}`}
                    >
                      {team.allow_auto_assign ? t('details.overview.active') : t('details.overview.inactive')}
                    </span>
                  </CardPanel>
                </Card>
              </div>

              {(team.created_at || team.updated_at) && (
                <DetailSection icon={<Clock />} title={t('details.overview.temporalInfo')}>
                  {team.created_at && (
                    <DetailRow label={t('details.overview.created')}>
                      {formatDistanceToNow(parseApiDate(team.created_at) ?? new Date(), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </DetailRow>
                  )}
                  {team.updated_at && (
                    <DetailRow label={t('details.overview.lastUpdate')}>
                      {formatDistanceToNow(new Date(team.updated_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </DetailRow>
                  )}
                </DetailSection>
              )}
            </TabsPanel>

            <TabsPanel value="members">
              <Empty className="py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyDescription>{t('details.members.placeholder')}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" onClick={() => onManageUsers(team)}>
                    {t('details.members.manageUsers')}
                  </Button>
                </EmptyContent>
              </Empty>
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
              <DetailSection icon={<Settings />} title={t('details.settings.title')}>
                <DetailRow
                  label={t('details.settings.autoAssignTitle')}
                  hint={t('details.settings.autoAssignDescription')}
                >
                  {autoAssignBadge(t('details.settings.enabled'), t('details.settings.disabled'))}
                </DetailRow>
              </DetailSection>
              <Button variant="outline" onClick={() => onEdit(team)} className="w-full">
                <Edit />
                {t('details.settings.editSettings')}
              </Button>
            </TabsPanel>
          </DialogPanel>
        </Tabs>
      </DialogPopup>
    </Dialog>
  );
}
