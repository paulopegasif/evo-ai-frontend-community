import { useState, useEffect } from 'react';
import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Server,
  Plus,
  Settings,
  Trash2,
  MoreHorizontal,
  Eye,
  Edit,
  Wrench,
  AlertTriangle,
} from '@/components/icons';
import { toast } from 'sonner';

import { MCPServer } from '@/types/ai';
import { listMCPServers } from '@/services/agents/mcpServerService';
import { useLanguage } from '@/hooks/useLanguage';
const McpServers = () => {
  const { t } = useLanguage('mcpServers');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page] = useState(1);
  const [limit] = useState(1000);

  useEffect(() => {
    const fetchServers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const skip = (page - 1) * limit;
        const data = await listMCPServers({ skip, limit });
        setServers(data);
      } catch (error) {
        console.error('Erro ao carregar servidores MCP:', error);
        setError(t('mcpServers.messages.loadError'));
        toast.error(t('mcpServers.messages.loadError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();
  }, [page, limit, t]);

  const stats = {
    total: servers.length,
    active: servers.filter(s => s.type === 'official').length, // Assumindo que 'official' são ativos
    inactive: servers.filter(s => s.type === 'community').length,
    withTools: servers.filter(s => s.tools && s.tools.length > 0).length,
    newThisMonth: servers.filter(s => {
      const createdDate = new Date(s.created_at);
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return createdDate >= thisMonth;
    }).length,
  };

  const percent = (n: number) =>
    t('stats.percentOfTotal', { percent: stats.total > 0 ? Math.round((n / stats.total) * 100) : 0 });

  const statCards = [
    {
      key: 'total',
      icon: Server,
      label: t('stats.total'),
      value: stats.total,
      hint:
        stats.newThisMonth > 0
          ? t('stats.newThisMonth', { count: stats.newThisMonth })
          : t('stats.noNewThisMonth'),
    },
    { key: 'official', icon: Server, label: t('stats.official'), value: stats.active, hint: percent(stats.active) },
    { key: 'community', icon: Settings, label: t('stats.community'), value: stats.inactive, hint: percent(stats.inactive) },
    { key: 'tools', icon: Wrench, label: t('stats.withTools'), value: stats.withTools, hint: percent(stats.withTools) },
  ];

  const header = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-semibold text-xl md:text-2xl">{t('title')}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{t('subtitle')}</p>
      </div>
      {!isLoading && !error && (
        <Button>
          <Plus />
          {t('buttons.newServer')}
        </Button>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 p-4 md:p-6">
        {header}

        {error ? (
          <Alert variant="error">
            <AlertTriangle />
            <AlertDescription>{error}</AlertDescription>
            <AlertAction>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                {t('buttons.tryAgain')}
              </Button>
            </AlertAction>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map(card => {
                const Icon = card.icon;
                return (
                  <Card key={card.key} className="min-w-0">
                    <CardPanel className="flex flex-col gap-2 pt-6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-muted-foreground text-sm">{card.label}</span>
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                      {isLoading ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <span className="font-semibold text-2xl tabular-nums">{card.value}</span>
                      )}
                      <span className="truncate text-muted-foreground text-xs">
                        {isLoading ? <Skeleton className="h-3 w-24" /> : card.hint}
                      </span>
                    </CardPanel>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('table.title')}</CardTitle>
                <CardDescription>{t('table.description')}</CardDescription>
              </CardHeader>
              <CardPanel className="px-0 pb-0">
                {isLoading ? (
                  <div className="flex flex-col gap-3 px-6 pb-6" aria-busy="true">
                    <span className="sr-only">{t('messages.loading')}</span>
                    {[0, 1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : servers.length === 0 ? (
                  <Empty className="py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Server />
                      </EmptyMedia>
                      <EmptyTitle>{t('emptyState.title')}</EmptyTitle>
                      <EmptyDescription>{t('emptyState.description')}</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button>
                        <Plus />
                        {t('emptyState.addFirst')}
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <div className="overflow-x-auto border-t">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="ps-6">{t('table.headers.name')}</TableHead>
                          <TableHead>{t('table.headers.description')}</TableHead>
                          <TableHead>{t('table.headers.type')}</TableHead>
                          <TableHead>{t('table.headers.configuration')}</TableHead>
                          <TableHead>{t('table.headers.tools')}</TableHead>
                          <TableHead>{t('table.headers.createdAt')}</TableHead>
                          <TableHead className="pe-6 text-end">
                            <span className="sr-only">{t('table.headers.actions')}</span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {servers.map(server => (
                          <TableRow key={server.id}>
                            <TableCell className="ps-6">
                              <div className="flex items-center gap-3">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                                  <Server className="size-4 text-muted-foreground" />
                                </span>
                                <span className="font-medium">{server.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[220px] truncate text-muted-foreground">
                              {server.description || t('fields.noDescription')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={server.type === 'official' ? 'success' : 'warning'}>
                                {server.type === 'official' ? t('types.official') : t('types.community')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={server.config_type === 'sse' ? 'info' : 'outline'} className="font-mono">
                                {server.config_type?.charAt(0).toUpperCase() + server.config_type?.slice(1) || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground tabular-nums">
                              <span className="inline-flex items-center gap-1.5">
                                <Wrench className="size-3.5" />
                                {server.tools?.length || 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(server.created_at).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="pe-6 text-end">
                              <Menu>
                                <MenuTrigger
                                  render={
                                    <Button variant="ghost" size="icon-sm" aria-label={t('table.actions.openMenu')} />
                                  }
                                >
                                  <MoreHorizontal />
                                </MenuTrigger>
                                <MenuPopup align="end">
                                  <MenuItem onClick={() => console.log('Ver detalhes', server.id)}>
                                    <Eye />
                                    {t('table.actions.viewDetails')}
                                  </MenuItem>
                                  <MenuItem onClick={() => console.log('Editar', server.id)}>
                                    <Edit />
                                    {t('table.actions.edit')}
                                  </MenuItem>
                                  <MenuSeparator />
                                  <MenuItem variant="destructive" onClick={() => console.log('Excluir', server.id)}>
                                    <Trash2 />
                                    {t('table.actions.delete')}
                                  </MenuItem>
                                </MenuPopup>
                              </Menu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardPanel>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default McpServers;
