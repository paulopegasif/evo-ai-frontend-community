import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Edit, Lock } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';
import { useContactPiiMasking } from '@/hooks/useContactPiiMasking';
import { unixTimestampToIso } from '@/utils/chat/contactTimestamp';
import ContactForm from './ContactForm';
import ContactTagsList from './ContactTagsList';
import type { Contact, ContactFormData } from '@/types/contacts';

interface ContactDetailsCardProps {
  /** Required unless isNew — the new-contact card has no existing record to show/edit. */
  contact?: Contact;
  loading?: boolean;
  onSave: (data: ContactFormData) => void | Promise<void>;
  /** New-contact mode: card opens already in edit mode, with no Cancel-back-to-view
   *  (Cancel is wired by the caller to navigate away instead — there's no view state
   *  to fall back to for a contact that doesn't exist yet). */
  isNew?: boolean;
  onCancelNew?: () => void;
}

// Contact.created_at is typed as `string` but the API actually returns a Unix
// timestamp (seconds), same as elsewhere in this codebase (see contactTimestamp.ts).
// Normalize through unixTimestampToIso before formatting, otherwise a raw epoch-seconds
// value is misread as epoch-milliseconds by `new Date()` and renders as 1970.
function formatDate(dateValue?: string | number): string | null {
  if (!dateValue && dateValue !== 0) return null;
  const iso = unixTimestampToIso(dateValue) ?? (typeof dateValue === 'string' ? dateValue : undefined);
  if (!iso) return null;
  const date = new Date(iso);
  if (isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface FieldRowProps {
  label: string;
  value: string | null | undefined;
  masked?: boolean;
  protectedTitle?: string;
}

function FieldRow({ label, value, masked, protectedTitle }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-baseline gap-3 py-2">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd
        className={`flex min-w-0 items-center gap-1.5 text-sm ${value ? 'text-foreground' : 'text-muted-foreground/72'}`}
        title={protectedTitle}
      >
        {masked && <Lock className="size-3 shrink-0 text-muted-foreground" aria-label={protectedTitle} />}
        <span className="min-w-0 break-words">{value || '—'}</span>
      </dd>
    </div>
  );
}

const SOCIAL_KEYS = ['linkedin', 'facebook', 'instagram', 'twitter', 'github'] as const;

export default function ContactDetailsCard({
  contact,
  loading,
  onSave,
  isNew = false,
  onCancelNew,
}: ContactDetailsCardProps) {
  const { t } = useLanguage('contacts');
  const { shouldMask, maskPhone, maskEmail } = useContactPiiMasking();
  const protectedTitle = shouldMask ? t('card.dataProtectedTooltip') : undefined;
  const [isEditing, setIsEditing] = useState(false);

  if (isNew || isEditing) {
    return (
      <Card>
        <CardPanel>
          <ContactForm
            contact={isNew ? undefined : contact}
            isNew={isNew}
            loading={loading}
            onSubmit={async data => {
              await onSave(data);
              if (!isNew) setIsEditing(false);
            }}
            onCancel={isNew ? onCancelNew : () => setIsEditing(false)}
          />
        </CardPanel>
      </Card>
    );
  }

  // From here on, contact is always defined (isNew is the only caller-side case
  // where it can be omitted, and that branch already returned above).
  if (!contact) return null;

  const isPerson = contact.type === 'person';
  const linkedCompanyName = isPerson ? contact.companies?.[0]?.name : undefined;
  const socialProfiles = contact.additional_attributes?.social_profiles;
  const filledSocial = SOCIAL_KEYS.filter(key => socialProfiles?.[key]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('details.sections.basicInfo')}</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit />
            {t('details.actions.edit')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardPanel className="flex flex-col gap-5">
        <dl className="-my-2 flex flex-col divide-y">
          <FieldRow label={t('details.fields.name')} value={contact.name} />
          <FieldRow label={t('details.fields.taxId')} value={contact.tax_id} />
          <FieldRow
            label={t('details.fields.email')}
            value={contact.email ? maskEmail(contact.email) : null}
            masked={shouldMask && !!contact.email}
            protectedTitle={protectedTitle}
          />
          <FieldRow
            label={t('details.fields.phone')}
            value={contact.phone_number ? maskPhone(contact.phone_number) : null}
            masked={shouldMask && !!contact.phone_number}
            protectedTitle={protectedTitle}
          />
          <FieldRow label={t('details.fields.city')} value={contact.additional_attributes?.city} />
          <FieldRow label={t('details.fields.country')} value={contact.additional_attributes?.country} />
          <FieldRow label={t('details.fields.company')} value={linkedCompanyName} />
          <FieldRow label={t('details.sections.description')} value={contact.additional_attributes?.description} />
          <FieldRow label={t('details.fields.createdAt')} value={formatDate(contact.created_at)} />
        </dl>

        <section className="flex flex-col gap-2 border-t pt-4">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">{t('form.sections.labels')}</h3>
          {contact.labels && contact.labels.length > 0 ? (
            <ContactTagsList labels={contact.labels} maxVisible={contact.labels.length} size="sm" />
          ) : (
            <span className="text-muted-foreground/72 text-sm">—</span>
          )}
        </section>

        <section className="flex flex-col gap-1 border-t pt-4">
          <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            {t('details.sections.socialProfiles')}
          </h3>
          {filledSocial.length === 0 ? (
            <span className="text-muted-foreground/72 text-sm">—</span>
          ) : (
            <dl className="flex flex-col">
              {filledSocial.map(key => (
                <FieldRow key={key} label={t(`form.fields.social.${key}.label`)} value={socialProfiles?.[key]} />
              ))}
            </dl>
          )}
        </section>
      </CardPanel>
    </Card>
  );
}
