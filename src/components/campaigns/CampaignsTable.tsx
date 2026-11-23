import type React from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Edit, Trash2, Megaphone, Eye, Pause, Play, Copy, Square } from '@/components/icons';
import { Campaign, CampaignStatus } from '@/types/campaigns';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import CampaignStatusBadge from './CampaignStatusBadge';
import CampaignTypeBadge from './CampaignTypeBadge';
import CampaignChannelBadge from './CampaignChannelBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es, fr, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';

interface CampaignsTableProps {
  campaigns: Campaign[];
  selectedCampaigns: Campaign[];
  loading?: boolean;
  onSelectionChange: (campaigns: Campaign[]) => void;
  onCampaignClick: (campaign: Campaign) => void;
  onEditCampaign: (campaign: Campaign) => void;
  onDeleteCampaign: (campaign: Campaign) => void;
  onStartCampaign: (campaign: Campaign) => void;
  onPauseCampaign: (campaign: Campaign) => void;
  onStopCampaign: (campaign: Campaign) => void;
  onDuplicateCampaign: (campaign: Campaign) => void;
  onViewStats: (campaign: Campaign) => void;
  onCreateCampaign?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function CampaignsTable({
  campaigns,
  selectedCampaigns,
  loading,
  onSelectionChange,
  onCampaignClick,
  onEditCampaign,
  onDeleteCampaign,
  onStartCampaign,
  onPauseCampaign,
  onStopCampaign,
  onDuplicateCampaign,
  onViewStats,
  onCreateCampaign,
  sortBy,
  sortOrder,
  onSort,
}: CampaignsTableProps) {
  const { t } = useLanguage('campaigns');
  const { i18n } = useTranslation();
  const campaignsList = campaigns || [];

  const getDateFnsLocale = () => {
    switch (i18n.language) {
      case 'pt-BR':
      case 'pt':
        return ptBR;
      case 'es':
        return es;
      case 'fr':
        return fr;
      case 'it':
        return it;
      default:
        return enUS;
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: getDateFnsLocale(),
      });
    } catch {
      return t('messages.invalidDate');
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('pt-BR');
  };

  const formatPercentage = (delivered: number, total: number) => {
    if (!total) return '0%';
    return `${Math.round((delivered / total) * 100)}%`;
  };

  const quickAction = (label: string, icon: React.ReactNode, onClick: () => void, destructive = false) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className={destructive ? 'text-destructive-foreground hover:bg-destructive/8' : undefined}
            onClick={e => {
              e.stopPropagation();
              onClick();
            }}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );

  const columns: TableColumn<Campaign>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      render: campaign => (
        <div className="flex min-w-0 flex-col gap-1.5 py-1">
          <button
            type="button"
            className="truncate text-left font-medium text-sm outline-none hover:underline focus-visible:underline"
            onClick={() => onCampaignClick(campaign)}
          >
            {campaign.title}
          </button>
          <div className="flex items-center gap-1.5">
            <CampaignTypeBadge type={campaign.type} />
            {campaign.channel_type !== undefined && (
              <CampaignChannelBadge channelType={campaign.channel_type} />
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      sortable: true,
      render: campaign => <CampaignStatusBadge status={campaign.status} />,
    },
    {
      key: 'contacts',
      align: 'right',
      label: t('table.columns.contacts'),
      sortable: true,
      render: campaign => (
        <div className="text-right">
          <div className="font-medium tabular-nums">{formatNumber(campaign.contacts_count)}</div>
          {campaign.stats?.total_sent !== undefined && campaign.stats.total_sent > 0 && (
            <div className="text-muted-foreground text-xs">
              {formatNumber(campaign.stats.total_sent)} {t('table.sent')}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'delivery',
      align: 'right',
      label: t('table.columns.delivery'),
      sortable: false,
      render: campaign => {
        const deliveryRate = campaign.stats?.total_sent
          ? formatPercentage(campaign.stats.total_delivered || 0, campaign.stats.total_sent)
          : '0%';
        return (
          <div className="text-right">
            <div className="font-medium tabular-nums">{deliveryRate}</div>
            <div className="text-muted-foreground text-xs">
              {formatNumber(campaign.stats?.total_delivered || 0)} {t('table.delivered')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'engagement',
      align: 'right',
      label: t('table.columns.engagement'),
      sortable: false,
      render: campaign => {
        const readRate = campaign.stats?.total_delivered
          ? formatPercentage(campaign.stats.total_read || 0, campaign.stats.total_delivered)
          : '0%';
        return (
          <div className="text-right">
            <div className="font-medium tabular-nums">{readRate}</div>
            <div className="text-muted-foreground text-xs">
              {formatNumber(campaign.stats?.total_read || 0)} {t('table.read')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      label: t('table.columns.created'),
      sortable: true,
      render: campaign => (
        <div className="text-sm">
          {formatDate(campaign.created_at)}
          {campaign.schedule_to && (
            <div className="text-muted-foreground text-xs">
              {t('table.scheduled')}: {formatDate(campaign.schedule_to)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'quick_actions',
      label: t('table.columns.quickActions'),
      sortable: false,
      align: 'center',
      render: campaign => (
        <div className="flex items-center justify-center gap-0.5">
          {(campaign.status === CampaignStatus.DRAFT ||
            campaign.status === CampaignStatus.SCHEDULED ||
            campaign.status === CampaignStatus.PAUSED ||
            campaign.status === CampaignStatus.STOPPED) && (
            quickAction(
              campaign.status === CampaignStatus.PAUSED || campaign.status === CampaignStatus.STOPPED
                ? t('card.actions.resume')
                : t('card.actions.start'),
              <Play />,
              () => onStartCampaign(campaign),
            )
          )}
          {campaign.status === CampaignStatus.SENDING && (
            quickAction(t('card.actions.pause'), <Pause />, () => onPauseCampaign(campaign))
          )}
          {(campaign.status === CampaignStatus.DRAFT ||
            campaign.status === CampaignStatus.SCHEDULED ||
            campaign.status === CampaignStatus.SENDING ||
            campaign.status === CampaignStatus.PAUSED) && (
            quickAction(t('card.actions.cancel'), <Square />, () => onStopCampaign(campaign), true)
          )}
        </div>
      ),
    },
  ];

  const actions: TableAction<Campaign>[] = [
    {
      label: t('card.actions.viewStats'),
      icon: <Eye />,
      onClick: onViewStats,
    },
    {
      label: t('card.actions.start'),
      icon: <Play />,
      onClick: onStartCampaign,
      show: campaign =>
        campaign.status === CampaignStatus.DRAFT ||
        campaign.status === CampaignStatus.SCHEDULED ||
        campaign.status === CampaignStatus.PAUSED ||
        campaign.status === CampaignStatus.STOPPED,
    },
    {
      label: t('card.actions.pause'),
      icon: <Pause />,
      onClick: onPauseCampaign,
      show: campaign => campaign.status === CampaignStatus.SENDING,
    },
    {
      label: t('card.actions.cancel'),
      icon: <Square />,
      onClick: onStopCampaign,
      variant: 'destructive' as const,
      show: campaign =>
        campaign.status === CampaignStatus.DRAFT ||
        campaign.status === CampaignStatus.SCHEDULED ||
        campaign.status === CampaignStatus.SENDING ||
        campaign.status === CampaignStatus.PAUSED,
    },
    {
      label: t('card.actions.duplicate'),
      icon: <Copy />,
      onClick: onDuplicateCampaign,
    },
    {
      label: t('card.actions.edit'),
      icon: <Edit />,
      onClick: onEditCampaign,
    },
    {
      label: t('card.actions.delete'),
      icon: <Trash2 />,
      onClick: onDeleteCampaign,
      variant: 'destructive' as const,
    },
  ];

  return (
    <BaseTable<Campaign>
      data={campaignsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedCampaigns}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Megaphone}
      emptyTitle={t('empty.title')}
      emptyDescription={t('empty.description')}
      emptyAction={
        onCreateCampaign
          ? {
              label: t('empty.action'),
              onClick: onCreateCampaign,
            }
          : undefined
      }
      getRowKey={campaign => String(campaign.id)}
    />
  );
}
