import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Contact } from '@/types/contacts';
import { Building2, Calendar, Mail, MessageSquare, Phone, TriangleAlert, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';

interface ContactMergeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onConfirm: (parentContactId: string, childContactId: string) => void;
  loading: boolean;
}

export default function ContactMergeModal({
  open,
  onOpenChange,
  contacts,
  onConfirm,
  loading,
}: ContactMergeModalProps) {
  const { t } = useLanguage('contacts');
  const [selectedParentId, setSelectedParentId] = useState<string>(contacts[0]?.id || '');

  const handleConfirm = () => {
    if (!selectedParentId) return;

    // O contato pai é o selecionado, os outros são os filhos que serão mesclados
    const childIds = contacts.filter(c => c.id !== selectedParentId).map(c => c.id);

    // A API aceita apenas um child por vez, então vamos mesclar com o primeiro
    if (childIds.length > 0) {
      onConfirm(selectedParentId, childIds[0]);
    }
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('dialog.mergeContacts.title')}</DialogTitle>
          <DialogDescription>{t('dialog.mergeContacts.description')}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-4">
          <RadioGroup
            value={selectedParentId}
            onValueChange={value => setSelectedParentId(String(value))}
            className="gap-2"
          >
            {contacts.map(contact => {
              const selected = selectedParentId === contact.id;
              return (
                <div
                  key={contact.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                    selected ? 'border-primary/64 bg-primary/4 dark:bg-primary/8' : 'hover:border-ring/40',
                  )}
                  onClick={() => setSelectedParentId(contact.id)}
                >
                  <RadioGroupItem value={contact.id} id={contact.id} className="mt-3" />
                  <Label htmlFor={contact.id} className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 font-normal">
                    <Avatar className="size-10">
                      <AvatarImage src={contact.avatar_url || contact.thumbnail} />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{contact.name}</span>
                        {contact.type === 'company' && <Building2 className="size-4 text-muted-foreground" />}
                        {contact.type === 'person' && <User className="size-4 text-muted-foreground" />}
                        {selected && (
                          <Badge variant="success" size="sm">
                            {t('dialog.mergeContacts.primary')}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 text-muted-foreground text-xs md:grid-cols-2">
                        {contact.email && (
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Mail className="size-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </span>
                        )}
                        {contact.phone_number && (
                          <span className="flex items-center gap-1.5 tabular-nums">
                            <Phone className="size-3 shrink-0" />
                            {formatContactPhone(contact.phone_number)}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Calendar className="size-3 shrink-0" />
                          {t('dialog.mergeContacts.createdAt', { date: formatDate(contact.created_at) })}
                        </span>
                        {contact.conversations_count !== undefined && (
                          <span className="flex items-center gap-1.5 tabular-nums">
                            <MessageSquare className="size-3 shrink-0" />
                            {t('dialog.mergeContacts.conversations', { count: contact.conversations_count })}
                          </span>
                        )}
                      </div>

                      {contact.additional_attributes?.company_name && (
                        <p className="mt-1.5 text-xs">
                          <span className="text-muted-foreground">{t('dialog.mergeContacts.company')} </span>
                          <span className="font-medium">{contact.additional_attributes.company_name}</span>
                        </p>
                      )}

                      {contact.labels && contact.labels.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {contact.labels.slice(0, 3).map((label, index) => (
                            <Badge key={index} variant="outline" size="sm">
                              {label}
                            </Badge>
                          ))}
                          {contact.labels.length > 3 && (
                            <Badge variant="outline" size="sm" className="tabular-nums">
                              +{contact.labels.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>{t('dialog.mergeContacts.infoTitle')}</AlertTitle>
            <AlertDescription>
              <ul className="list-inside list-disc space-y-0.5">
                <li>{t('dialog.mergeContacts.info1')}</li>
                <li>{t('dialog.mergeContacts.info2')}</li>
                <li>{t('dialog.mergeContacts.info3')}</li>
                <li>{t('dialog.mergeContacts.info4')}</li>
              </ul>
            </AlertDescription>
          </Alert>
        </DialogPanel>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('dialog.mergeContacts.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedParentId} loading={loading}>
            {t('dialog.mergeContacts.confirm')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
