import { useLanguage } from '@/hooks/useLanguage';
import { MessageSquare, Edit, Trash, Users, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import { Contact } from '@/types/contacts';
import { BaseTable, TableColumn, TableAction } from '@/components/base';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';
import ContactStatusBadge from './ContactStatusBadge';
import ContactTagsList from './ContactTagsList';
import ContactTypeBadge from './ContactTypeBadge';
import ContactPipelinesBadge from './ContactPipelinesBadge';

interface ContactsTableProps {
  contacts: Contact[];
  selectedContacts: Contact[];
  loading?: boolean;
  onSelectionChange: (contacts: Contact[]) => void;
  onContactClick: (contact: Contact) => void;
  onStartConversation: (contact: Contact) => void;
  onEditContact: (contact: Contact) => void;
  onDeleteContact?: (contact: Contact) => void;
  onCreateContact?: () => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
}

export default function ContactsTable({
  contacts,
  selectedContacts,
  loading,
  onSelectionChange,
  onContactClick,
  onStartConversation,
  onEditContact,
  onDeleteContact,
  onCreateContact,
  sortBy,
  sortOrder,
  onSort,
}: ContactsTableProps) {
  const { t } = useLanguage('contacts');
  const { shouldMask, maskPhone, maskEmail } = useContactPiiMasking();
  const protectedTitle = shouldMask ? t('card.dataProtectedTooltip') : undefined;
  const contactsList = contacts || [];

  // const formatLastActivity = (date: string) => {
  //   if (!date) return 'Nunca';
  //   try {
  //     return formatDistanceToNow(new Date(date), {
  //       addSuffix: true,
  //       locale: ptBR,
  //     });
  //   } catch {
  //     return 'Data inválida';
  //   }
  // };

  const columns: TableColumn<Contact>[] = [
    {
      key: 'name',
      label: t('table.columns.name'),
      sortable: true,
      width: 'w-56',
      render: contact => (
        <button
          type="button"
          className="group/name -mx-1 flex min-w-0 items-center gap-3 rounded-lg px-1 py-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onContactClick(contact)}
        >
          <ContactAvatar contact={contact} size="md" showColoredFallback={true} />
          <span className="min-w-0 flex-1 break-words font-medium text-foreground text-sm group-hover/name:underline">
            {contact.name || t('table.noName')}
          </span>
        </button>
      ),
    },
    {
      key: 'email',
      label: t('table.columns.email'),
      sortable: true,
      width: 'w-48',
      render: contact =>
        contact.email ? (
          <span className="flex items-center gap-1 truncate text-muted-foreground text-sm" title={protectedTitle}>
            {shouldMask && <Lock className="size-3 shrink-0" aria-label={protectedTitle} />}
            {maskEmail(contact.email)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'phone_number',
      label: t('table.columns.phone'),
      sortable: true,
      width: 'w-40',
      render: contact =>
        contact.phone_number ? (
          <span className="flex items-center gap-1 whitespace-nowrap text-muted-foreground text-sm tabular-nums" title={protectedTitle}>
            {shouldMask && <Lock className="size-3 shrink-0" aria-label={protectedTitle} />}
            {maskPhone(contact.phone_number)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'type',
      label: t('table.columns.type'),
      sortable: false,
      // Secondary columns drop on narrower screens so name/e-mail/phone and the
      // row actions fit without horizontal scrolling.
      className: 'hidden 2xl:table-cell',
      render: contact => (
        <ContactTypeBadge type={contact.type || 'person'} className="justify-center" />
      ),
    },
    {
      key: 'labels',
      label: t('table.columns.labels'),
      sortable: false,
      className: 'hidden lg:table-cell',
      render: contact => <ContactTagsList labels={contact.labels} maxVisible={2} size="sm" />,
    },
    {
      key: 'pipelines',
      label: t('table.columns.pipelines'),
      sortable: false,
      className: 'hidden xl:table-cell',
      render: contact =>
        contact.pipelines && contact.pipelines.length > 0 ? (
          <ContactPipelinesBadge contact={contact} maxPipelines={2} compact={true} />
        ) : null,
    },
    {
      key: 'status',
      label: t('table.columns.status'),
      sortable: false,
      className: 'hidden xl:table-cell',
      render: contact => <ContactStatusBadge blocked={contact.blocked} />,
    },
    {
      key: 'startConversation',
      label: '',
      sortable: false,
      align: 'center',
      width: 'w-10',
      render: contact =>
        !contact.blocked ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={e => {
                    e.stopPropagation();
                    onStartConversation(contact);
                  }}
                  aria-label={t('table.actions.startConversation')}
                />
              }
            >
              <MessageSquare />
            </TooltipTrigger>
            <TooltipPopup>{t('table.actions.startConversation')}</TooltipPopup>
          </Tooltip>
        ) : null,
    },
  ];

  const actions: TableAction<Contact>[] = [
    {
      label: t('table.actions.edit'),
      icon: <Edit />,
      onClick: onEditContact,
    },
    ...(onDeleteContact
      ? [
          {
            label: t('table.actions.delete'),
            icon: <Trash />,
            onClick: onDeleteContact,
            variant: 'destructive' as const,
          },
        ]
      : []),
  ];

  return (
    <BaseTable<Contact>
      data={contactsList}
      columns={columns}
      actions={actions}
      selectable
      selectedItems={selectedContacts}
      onSelectionChange={onSelectionChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      loading={loading}
      emptyMessage={t('table.empty.noResults')}
      emptyIcon={Users}
      emptyTitle={t('table.empty.title')}
      emptyDescription={t('table.empty.description')}
      emptyAction={
        onCreateContact
          ? {
              label: t('table.actions.create'),
              onClick: onCreateContact,
            }
          : undefined
      }
      getRowKey={contact => String(contact.id)}
      getRowLabel={contact => contact.name || contact.email || contact.phone_number || String(contact.id)}
    />
  );
}
