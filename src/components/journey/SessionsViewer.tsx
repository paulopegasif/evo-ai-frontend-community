import { useState, useEffect } from 'react';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardPanel } from '@/components/ui/card';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Trash2,
  RefreshCw,
  Filter,
  Search,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  PauseCircle,
  Ban,
  User,
  ChevronRight,
} from 'lucide-react';
import { journeyService } from '@/services';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLanguage } from '@/hooks/useLanguage';

interface SessionsViewerProps {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

type SessionStatus = 'active' | 'waiting' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface SessionStats {
  total?: number;
  byStatus?: Partial<Record<SessionStatus, number>>;
}

interface JourneySession {
  id: string;
  journeyId: string;
  contactId: string;
  accountId: string;
  status: SessionStatus;
  currentNodeId?: string;
  variables: Record<string, any>;
  context?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failedAt?: string;
  startedAt?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  executionLogs: Array<{
    nodeId: string;
    nodeType: string;
    status: 'started' | 'completed' | 'failed';
    timestamp: string;
    executionTime?: number;
    result?: any;
    error?: string;
  }>;
}

export function SessionsViewer({ journeyId, journeyName, onClose }: SessionsViewerProps) {
  const { t } = useLanguage('journey');

  type StatusTone = {
    label: string;
    icon: typeof Activity;
    badge: 'success' | 'info' | 'warning' | 'error' | 'secondary';
    color: string;
    bgColor: string;
    borderColor: string;
  };

  const getStatusConfig = (): Record<SessionStatus, StatusTone> => ({
    active: {
      label: t('sessions.viewer.status.active'),
      icon: Activity,
      badge: 'success',
      color: 'text-success-foreground',
      bgColor: 'bg-success/8',
      borderColor: 'border-success/24',
    },
    waiting: {
      label: t('sessions.viewer.status.waiting'),
      icon: Clock,
      badge: 'info',
      color: 'text-info-foreground',
      bgColor: 'bg-info/8',
      borderColor: 'border-info/24',
    },
    paused: {
      label: t('sessions.viewer.status.paused'),
      icon: PauseCircle,
      badge: 'warning',
      color: 'text-warning-foreground',
      bgColor: 'bg-warning/8',
      borderColor: 'border-warning/24',
    },
    completed: {
      label: t('sessions.viewer.status.completed'),
      icon: CheckCircle,
      badge: 'success',
      color: 'text-success-foreground',
      bgColor: 'bg-success/8',
      borderColor: 'border-success/24',
    },
    failed: {
      label: t('sessions.viewer.status.failed'),
      icon: XCircle,
      badge: 'error',
      color: 'text-destructive-foreground',
      bgColor: 'bg-destructive/8',
      borderColor: 'border-destructive/24',
    },
    cancelled: {
      label: t('sessions.viewer.status.cancelled'),
      icon: Ban,
      badge: 'secondary',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      borderColor: 'border-border',
    },
  });

  const statusConfig = getStatusConfig();
  const [sessions, setSessions] = useState<JourneySession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<JourneySession | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchContact, setSearchContact] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;
  const [pendingAction, setPendingAction] = useState<
    { type: 'delete' | 'cancel'; sessionId: string } | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        pageSize,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (searchContact.trim()) {
        params.contactId = searchContact.trim();
      }

      const [sessionsResponse, statsResponse] = await Promise.all([
        journeyService.getJourneySessions(journeyId, params),
        journeyService.getJourneySessionStats(journeyId),
      ]);

      setSessions(sessionsResponse.data.sessions || []);
      setTotal(sessionsResponse.data.total || 0);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error(t('sessions.viewer.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [journeyId, filterStatus, searchContact, page]);

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await journeyService.deleteJourneySession(journeyId, sessionId);
      toast.success(t('sessions.viewer.messages.deleteSuccess'));
      loadSessions();
    } catch (error) {
      console.error('Erro ao deletar sessão:', error);
      toast.error(t('sessions.viewer.messages.deleteError'));
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    try {
      await journeyService.cancelJourneySession(journeyId, sessionId);
      toast.success(t('sessions.viewer.messages.cancelSuccess'));
      loadSessions();
    } catch (error: any) {
      console.error('Erro ao cancelar sessão:', error);
      toast.error(error?.message || t('sessions.viewer.messages.cancelError'));
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    setActionLoading(true);
    try {
      if (pendingAction.type === 'delete') {
        await handleDeleteSession(pendingAction.sessionId);
      } else {
        await handleCancelSession(pendingAction.sessionId);
      }
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as SessionStatus];
    const Icon = config?.icon || Activity;
    return <Icon className={`size-4 ${config?.color ?? ''}`} aria-hidden="true" />;
  };

  const statusFilterItems = [
    { value: 'all', label: t('sessions.viewer.filters.allStatus') },
    ...(['active', 'waiting', 'paused', 'completed', 'failed', 'cancelled'] as const).map(status => ({
      value: status,
      label: t(`sessions.viewer.status.${status}`),
    })),
  ];

  const statCards: { key: 'total' | SessionStatus; testId: string; value: number; className: string; valueClassName: string }[] = [
    { key: 'total', testId: 'sessions-stat-total', value: stats?.total ?? 0, className: 'bg-muted/48', valueClassName: 'text-foreground' },
    ...(['active', 'waiting', 'paused', 'completed', 'failed', 'cancelled'] as const).map(status => ({
      key: status,
      testId: `sessions-stat-${status}`,
      value: stats?.byStatus?.[status] ?? 0,
      className: `${statusConfig[status].bgColor} ${statusConfig[status].borderColor}`,
      valueClassName: statusConfig[status].color,
    })),
  ];

  const logBadgeVariant = (status: string): 'success' | 'error' | 'secondary' =>
    status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'secondary';

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogPopup
        className="h-[90vh] max-w-6xl"
        closeProps={{ 'aria-label': t('sessions.viewer.actions.close') }}
      >
        <DialogHeader className="border-b">
          <DialogTitle>{t('sessions.viewer.title')}</DialogTitle>
          <DialogDescription>{journeyName}</DialogDescription>
        </DialogHeader>

        {/* Stats Cards */}
        {stats && (
          <div className="border-b px-6 py-4" data-testid="sessions-stats-grid">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
              {statCards.map(card => (
                <Card key={card.key} className={card.className} data-testid={card.testId}>
                  <CardPanel className="p-4">
                    <div className={`font-bold text-2xl ${card.valueClassName}`}>{card.value}</div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      {t(`sessions.viewer.stats.${card.key}`)}
                    </div>
                  </CardPanel>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="border-b bg-muted/24 px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row">
            {/* Status Filter */}
            <div className="flex flex-1 items-center gap-2">
              <Filter className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Select
                items={statusFilterItems}
                value={filterStatus}
                onValueChange={value => {
                  if (value == null) return;
                  setFilterStatus(String(value));
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label={t('sessions.viewer.filters.allStatus')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {statusFilterItems.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            {/* Contact Search */}
            <InputGroup className="flex-1">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={searchContact}
                onChange={e => {
                  setSearchContact(e.target.value);
                  setPage(1);
                }}
                placeholder={t('sessions.viewer.filters.searchPlaceholder')}
                aria-label={t('sessions.viewer.filters.searchPlaceholder')}
              />
            </InputGroup>

            {/* Refresh Button */}
            <Button variant="outline" onClick={() => loadSessions()} disabled={loading}>
              <RefreshCw className={loading ? 'animate-spin' : undefined} aria-hidden="true" />
              {t('sessions.viewer.filters.refresh')}
            </Button>
          </div>
        </div>

        {/* Sessions List */}
        <DialogPanel className="pt-4!">
          {loading && sessions.length === 0 ? (
            <div className="space-y-3" aria-busy="true" aria-label={t('sessions.viewer.list.loading')}>
              {[0, 1, 2, 3].map(i => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Activity />
                </EmptyMedia>
                <EmptyTitle>{t('sessions.viewer.list.noSessions')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {sessions.map(session => {
                const config = statusConfig[session.status];
                return (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${config.borderColor}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSession(session)}
                    onKeyDown={e => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedSession(session);
                      }
                    }}
                  >
                    <CardPanel className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${config.bgColor}`}>
                              {getStatusIcon(session.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-foreground">{config.label}</span>
                                <Badge variant="outline">{session.id.slice(0, 8)}</Badge>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                                <User className="size-3" aria-hidden="true" />
                                <span>{t('sessions.viewer.list.contact')}: {session.contactId.slice(0, 8)}...</span>
                                <span aria-hidden="true">•</span>
                                <span>
                                  {formatDistanceToNow(new Date(session.createdAt), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {session.errorMessage && (
                            <div className="flex items-start gap-2 rounded-md bg-destructive/8 p-2 text-destructive-foreground text-xs">
                              <AlertCircle className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                              <span className="flex-1">{session.errorMessage}</span>
                            </div>
                          )}

                          {session.currentNodeId && (
                            <div className="text-muted-foreground text-xs">
                              {t('sessions.viewer.list.currentNode')}: <span className="font-mono">{session.currentNodeId}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 text-muted-foreground text-xs">
                            <span>{t('sessions.viewer.list.logs')}: {session.executionLogs?.length || 0}</span>
                            <span>
                              {t('sessions.viewer.list.retries')}: {session.retryCount}/{session.maxRetries}
                            </span>
                          </div>
                        </div>

                        <div className="ms-4 flex items-center gap-2">
                          {(session.status === 'active' || session.status === 'waiting') && (
                            <Button
                              variant="outline"
                              size="icon-sm"
                              onClick={e => {
                                e.stopPropagation();
                                setPendingAction({ type: 'cancel', sessionId: session.id });
                              }}
                              className="text-warning-foreground hover:bg-warning/8"
                              aria-label={t('sessions.viewer.actions.cancel')}
                              title={t('sessions.viewer.actions.cancel')}
                            >
                              <Ban />
                            </Button>
                          )}
                          <Button
                            variant="destructive-outline"
                            size="icon-sm"
                            onClick={e => {
                              e.stopPropagation();
                              setPendingAction({ type: 'delete', sessionId: session.id });
                            }}
                            aria-label={t('sessions.viewer.actions.delete')}
                            title={t('sessions.viewer.actions.delete')}
                          >
                            <Trash2 />
                          </Button>
                          <ChevronRight className="size-5 text-muted-foreground/72" aria-hidden="true" />
                        </div>
                      </div>
                    </CardPanel>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogPanel>

        {/* Pagination */}
        {total > pageSize && (
          <DialogFooter className="sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm">
              {t('sessions.viewer.pagination.showing', {
                from: (page - 1) * pageSize + 1,
                to: Math.min(page * pageSize, total),
                total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                {t('sessions.viewer.pagination.previous')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= total}
                onClick={() => setPage(p => p + 1)}
              >
                {t('sessions.viewer.pagination.next')}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogPopup>

      {/* Session Details Modal */}
      <Dialog open={!!selectedSession} onOpenChange={open => !open && setSelectedSession(null)}>
        <DialogPopup
          className="max-h-[80vh] max-w-2xl"
          closeProps={{ 'aria-label': t('sessions.viewer.actions.close') }}
        >
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>{t('sessions.viewer.details.title')}</DialogTitle>
                <DialogDescription className="sr-only">{journeyName}</DialogDescription>
              </DialogHeader>

              <DialogPanel className="space-y-4">
                <div>
                  <div className="font-medium text-muted-foreground text-sm">{t('sessions.viewer.details.status')}</div>
                  <div className="mt-1">
                    <Badge variant={statusConfig[selectedSession.status].badge}>
                      {statusConfig[selectedSession.status].label}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="font-medium text-muted-foreground text-sm">
                    {t('sessions.viewer.details.sessionId')}
                  </div>
                  <div className="mt-1 font-mono text-sm">{selectedSession.id}</div>
                </div>

                <div>
                  <div className="font-medium text-muted-foreground text-sm">
                    {t('sessions.viewer.details.contactId')}
                  </div>
                  <div className="mt-1 font-mono text-sm">{selectedSession.contactId}</div>
                </div>

                {selectedSession.executionLogs && selectedSession.executionLogs.length > 0 && (
                  <div>
                    <div className="mb-2 font-medium text-muted-foreground text-sm">
                      {t('sessions.viewer.details.executionLogs')} ({selectedSession.executionLogs.length})
                    </div>
                    <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg bg-muted/48 p-3">
                      {selectedSession.executionLogs.map((log, index) => (
                        <div key={index} className="rounded border bg-background p-2 text-xs">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="font-mono text-primary">{log.nodeId}</span>
                            <Badge variant={logBadgeVariant(log.status)}>{log.status}</Badge>
                          </div>
                          <div className="text-muted-foreground">
                            {log.nodeType} •{' '}
                            {formatDistanceToNow(new Date(log.timestamp), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </div>
                          {log.error && (
                            <div className="mt-1 text-destructive-foreground">{log.error}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSession.variables && Object.keys(selectedSession.variables).length > 0 && (
                  <div>
                    <div className="mb-2 font-medium text-muted-foreground text-sm">
                      {t('sessions.viewer.details.variables')}
                    </div>
                    <pre className="max-h-40 overflow-auto rounded-lg bg-muted/48 p-3 text-xs">
                      {JSON.stringify(selectedSession.variables, null, 2)}
                    </pre>
                  </div>
                )}
              </DialogPanel>
            </>
          )}
        </DialogPopup>
      </Dialog>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={open => !open && setPendingAction(null)}
        title={
          pendingAction?.type === 'cancel'
            ? t('sessions.viewer.confirm.cancelTitle')
            : t('sessions.viewer.confirm.deleteTitle')
        }
        description={
          pendingAction?.type === 'cancel'
            ? t('sessions.viewer.actions.confirmCancel')
            : t('sessions.viewer.actions.confirmDelete')
        }
        cancelLabel={t('sessions.viewer.confirm.back')}
        confirmLabel={
          pendingAction?.type === 'cancel'
            ? t('sessions.viewer.confirm.cancelConfirm')
            : t('sessions.viewer.actions.delete')
        }
        icon={pendingAction?.type === 'cancel' ? <Ban /> : <Trash2 />}
        onConfirm={confirmPendingAction}
        loading={actionLoading}
      />
    </Dialog>
  );
}
