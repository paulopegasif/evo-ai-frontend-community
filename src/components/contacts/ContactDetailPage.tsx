import { ArrowLeft, GitBranch, Mail, MessageSquare, Phone, Users } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/base/EmptyState';
import ContactAvatar from '@/components/chat/contact/ContactAvatar';
import ContactDetailsCard from './ContactDetailsCard';
import ContactNotesCard from './ContactNotesCard';
import ContactStatusBadge from './ContactStatusBadge';
import ContactTypeBadge from './ContactTypeBadge';
import ContactPipelineItem from '@/components/pipelines/ContactPipelineItem';
import ContactEventsTab from './ContactEventsTab';
import ContactEventsErrorBoundary from './ContactEventsErrorBoundary';
import type { Contact, ContactFormData } from '@/types/contacts';

interface ContactDetailPageProps {
  contact: Contact | null;
  loading: boolean;
  notFound: boolean;
  formSaving?: boolean;
  onClose: () => void;
  onSave: (data: ContactFormData) => void | Promise<void>;
  onStartConversation: (contact: Contact) => void;
  onContactUpdated?: () => void;
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-[28rem] rounded-2xl" />
      </div>
    </div>
  );
}

export default function ContactDetailPage({
  contact,
  loading,
  notFound,
  formSaving,
  onClose,
  onSave,
  onStartConversation,
  onContactUpdated,
}: ContactDetailPageProps) {
  const { t } = useLanguage('contacts');
  const { shouldMask, maskPhone, maskEmail } = useContactPiiMasking();

  const backButton = (
    <Tooltip>
      <TooltipTrigger
        render={<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('details.page.back')} />}
      >
        <ArrowLeft />
      </TooltipTrigger>
      <TooltipPopup>{t('details.page.back')}</TooltipPopup>
    </Tooltip>
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-auto">
        <div>{backButton}</div>
        <DetailSkeleton />
      </div>
    );
  }

  if (notFound || !contact) {
    return (
      <div className="flex h-full flex-col">
        <div>{backButton}</div>
        <EmptyState
          icon={Users}
          title={t('details.page.notFound.title')}
          description={t('details.page.notFound.description')}
          action={{ label: t('details.page.back'), onClick: onClose }}
          className="flex-1"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Identity header */}
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {backButton}
          <ContactAvatar contact={contact} size="mdlg" showColoredFallback />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-semibold text-xl md:text-2xl">{contact.name}</h1>
              <ContactTypeBadge type={contact.type || 'person'} />
              <ContactStatusBadge blocked={contact.blocked} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-sm">
              {contact.email && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{shouldMask ? maskEmail(contact.email) : contact.email}</span>
                </span>
              )}
              {contact.phone_number && (
                <span className="flex items-center gap-1.5 tabular-nums">
                  <Phone className="size-3.5 shrink-0" />
                  {shouldMask ? maskPhone(contact.phone_number) : contact.phone_number}
                </span>
              )}
            </div>
          </div>
        </div>
        <Button onClick={() => onStartConversation(contact)} disabled={contact.blocked} className="shrink-0">
          <MessageSquare />
          {t('details.actions.startConversation')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 pb-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <ContactDetailsCard contact={contact} loading={formSaving} onSave={onSave} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="size-4 text-muted-foreground" />
                {t('details.tabs.pipeline')}
              </CardTitle>
            </CardHeader>
            <CardPanel>
              <ContactPipelineItem contactId={contact.id} onPipelineUpdated={onContactUpdated} />
            </CardPanel>
          </Card>
          <ContactNotesCard contactId={contact.id} />
        </div>
        <Card className="min-w-0 self-start">
          <CardPanel>
            <ContactEventsErrorBoundary
              fallbackTitle={t('events.timeline.crashed.title')}
              fallbackReload={t('events.timeline.crashed.reload')}
            >
              <ContactEventsTab contactId={contact.id} />
            </ContactEventsErrorBoundary>
          </CardPanel>
        </Card>
      </div>
    </div>
  );
}
