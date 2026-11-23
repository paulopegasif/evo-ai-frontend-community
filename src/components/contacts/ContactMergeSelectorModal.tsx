import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Contact } from '@/types/contacts';
import { contactsService } from '@/services/contacts/contactsService';
import { Building2, Check, Mail, MessageSquare, Phone, Search, SearchX, User } from '@/components/icons';
import { formatContactPhone } from '@/utils/contact/formatContactPhone';
import { toast } from 'sonner';

interface ContactMergeSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContact: Contact;
  onContactSelected: (contact: Contact) => void;
}

export default function ContactMergeSelectorModal({
  open,
  onOpenChange,
  currentContact,
  onContactSelected,
}: ContactMergeSelectorModalProps) {
  const { t } = useLanguage('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contactsService.getContacts({
        page: 1,
        per_page: 20,
        ...(searchQuery && { query: searchQuery }),
      });

      // Filter out the current contact
      const filteredContacts = response.data.filter((c: Contact) => c.id !== currentContact.id);
      setContacts(filteredContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error(t('messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [searchQuery, currentContact.id, t]);

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open, loadContacts]);

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact);
  };

  const handleConfirm = () => {
    if (selectedContact) {
      onContactSelected(selectedContact);
      onOpenChange(false);
      setSelectedContact(null);
      setSearchQuery('');
    }
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
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('dialog.selectContactToMerge.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.selectContactToMerge.description', { name: currentContact.name })}
          </DialogDescription>
          <InputGroup className="mt-2">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              aria-label={t('header.searchPlaceholder')}
            />
          </InputGroup>
        </DialogHeader>
        <DialogPanel>
          {loading ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border p-4">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchX />
                </EmptyMedia>
                <EmptyDescription>
                  {searchQuery ? t('empty.title') : t('dialog.selectContactToMerge.noContacts')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-2" role="listbox" aria-label={t('dialog.selectContactToMerge.title')}>
              {contacts.map(contact => {
                const selected = selectedContact?.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                      selected ? 'border-primary/64 bg-primary/4 dark:bg-primary/8' : 'hover:border-ring/40',
                    )}
                    onClick={() => handleSelectContact(contact)}
                  >
                    <Avatar className="size-10 shrink-0">
                      <AvatarImage src={contact.avatar_url || contact.thumbnail} />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {getInitials(contact.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold">{contact.name}</span>
                        {contact.type === 'company' && <Building2 className="size-4 shrink-0 text-muted-foreground" />}
                        {contact.type === 'person' && <User className="size-4 shrink-0 text-muted-foreground" />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
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
                        {contact.conversations_count !== undefined && (
                          <span className="flex items-center gap-1.5 tabular-nums">
                            <MessageSquare className="size-3 shrink-0" />
                            {t('dialog.mergeContacts.conversations', { count: contact.conversations_count })}
                          </span>
                        )}
                      </div>
                    </div>
                    {selected && <Check className="size-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}
        </DialogPanel>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              setSelectedContact(null);
              setSearchQuery('');
            }}
          >
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedContact}>
            {t('dialog.selectContactToMerge.select')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
