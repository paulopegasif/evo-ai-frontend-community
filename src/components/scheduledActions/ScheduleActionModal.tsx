import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import InboxesService from '@/services/channels/inboxesService';
import { contactsService } from '@/services/contacts';
import type { ScheduledAction, CreateScheduledAction } from '@/types/automation';
import type { Inbox } from '@/types/channels/inbox';
import type { Contact } from '@/types/contacts';
import { useLanguage } from '@/hooks/useLanguage';
import { Search, XIcon } from '@/components/icons';
import {
  buildChannelOptions,
  getMessagingInboxes,
  isSupportedPayloadChannel,
  type ChannelOption,
} from './scheduledActionChannelUtils';

interface ScheduleActionModalProps {
  open: boolean;
  onClose: () => void;
  contactId?: string;
  action?: ScheduledAction | null;
}

export function ScheduleActionModal({
  open,
  onClose,
  contactId: initialContactId,
  action,
}: ScheduleActionModalProps) {
  const { t } = useLanguage('contacts');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availableInboxes, setAvailableInboxes] = useState<Inbox[]>([]);
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(initialContactId);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactSearchResults, setContactSearchResults] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState({
    action_type: 'send_message',
    scheduled_for: '',
    channel: '',
    message: '',
    subject: '',
    body: '',
    webhook_url: '',
    webhook_method: 'POST',
    task_title: '',
    task_description: '',
    recurrence_type: 'once',
  });

  const recurrenceOptions = [
    { value: 'once', label: t('scheduledActions.recurrenceOnce') },
    { value: 'daily', label: t('scheduledActions.recurrenceDaily') },
    { value: 'weekly', label: t('scheduledActions.recurrenceWeekly') },
    { value: 'monthly', label: t('scheduledActions.recurrenceMonthly') },
  ];

  const actionTypeOptions = [
    { value: 'send_message', label: t('scheduledActions.actions.send_message') },
    { value: 'execute_webhook', label: t('scheduledActions.actions.execute_webhook') },
    { value: 'create_task', label: t('scheduledActions.actions.create_task') },
  ];

  const webhookMethodOptions = ['GET', 'POST', 'PUT', 'DELETE'].map(method => ({ value: method, label: method }));

  const channelOptions = useMemo<ChannelOption[]>(() => buildChannelOptions(availableInboxes, t), [availableInboxes, t]);

  // Fetch available inboxes when modal opens
  useEffect(() => {
    const fetchInboxes = async () => {
      if (!open) return;

      setLoadingInboxes(true);
      try {
        const response = await InboxesService.list();
        const inboxes = response.data || [];
        setAvailableInboxes(getMessagingInboxes(inboxes));

      } catch (error) {
        console.error('Error fetching inboxes:', error);
      } finally {
        setLoadingInboxes(false);
      }
    };

    fetchInboxes();
  }, [open]);

  useEffect(() => {
    if (!open || action || formData.channel || channelOptions.length === 0) {
      return;
    }

    setFormData(prev => ({ ...prev, channel: channelOptions[0].value }));
  }, [action, channelOptions, formData.channel, open]);

  // Load contact when contactId is provided or when editing
  useEffect(() => {
    if (action?.contact_id) {
      setSelectedContactId(action.contact_id);
      // Try to load contact details if available
      contactsService
        .getContact(action.contact_id)
        .then(contact => setSelectedContact(contact))
        .catch(() => {
          // Contact might not exist, ignore error
        });
    } else if (initialContactId) {
      setSelectedContactId(initialContactId);
      contactsService
        .getContact(initialContactId)
        .then(contact => setSelectedContact(contact))
        .catch(() => {
          // Contact might not exist, ignore error
        });
    }
  }, [action?.contact_id, initialContactId]);

  // Search contacts with debounce
  const searchContacts = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setContactSearchResults([]);
      return;
    }

    setLoadingContacts(true);
    try {
      const response = await contactsService.searchContacts({
        q: query,
        page: 1,
        per_page: 10,
      });
      setContactSearchResults(response.data || []);
    } catch (error) {
      console.error('Error searching contacts:', error);
      setContactSearchResults([]);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Debounce contact search
  useEffect(() => {
    if (!open) return;

    const timeoutId = setTimeout(() => {
      if (contactSearchQuery) {
        searchContacts(contactSearchQuery);
      } else {
        setContactSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [contactSearchQuery, open, searchContacts]);

  // Reset contact search when modal closes
  useEffect(() => {
    if (!open) {
      setContactSearchQuery('');
      setContactSearchResults([]);
      setShowContactDropdown(false);
      if (!initialContactId && !action) {
        setSelectedContactId(undefined);
        setSelectedContact(null);
      } else {
        // Reset to initial contactId if provided
        setSelectedContactId(initialContactId || action?.contact_id);
      }
    }
  }, [open, initialContactId, action]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showContactDropdown && !target.closest('.contact-selector-container')) {
        setShowContactDropdown(false);
      }
    };

    if (showContactDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showContactDropdown]);

  const getMinDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate contact_id is required
    if (!selectedContactId) {
      newErrors.contact_id = t('scheduledActions.validationRequired.contact');
    }

    if (!formData.scheduled_for) {
      newErrors.scheduled_for = t('scheduledActions.validationRequired.dateTime');
    } else {
      const selectedDate = new Date(formData.scheduled_for);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.scheduled_for = t('scheduledActions.validationRequired.dateTimeFuture');
      }
    }

    switch (formData.action_type) {
      case 'send_message':
        if (!formData.channel) newErrors.channel = t('scheduledActions.validationRequired.channel');
        if (formData.channel && !isSupportedPayloadChannel(formData.channel)) {
          newErrors.channel = t('scheduledActions.validationRequired.channel');
        }
        if (!formData.message) newErrors.message = t('scheduledActions.validationRequired.message');
        break;
      case 'execute_webhook':
        if (!formData.webhook_url)
          newErrors.webhook_url = t('scheduledActions.validationRequired.webhookUrl');
        break;
      case 'create_task':
        if (!formData.task_title)
          newErrors.task_title = t('scheduledActions.validationRequired.taskTitle');
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (action) {
      const getStringValue = (value: unknown, defaultValue: string = ''): string => {
        return typeof value === 'string' ? value : defaultValue;
      };

      setFormData({
        action_type: action.action_type,
        scheduled_for: action.scheduled_for.slice(0, 16),
        channel: getStringValue(action.payload.channel),
        message: getStringValue(action.payload.message),
        subject: getStringValue(action.payload.subject),
        body: getStringValue(action.payload.body),
        webhook_url: getStringValue(action.payload.webhook_url),
        webhook_method: getStringValue(action.payload.webhook_method, 'POST'),
        task_title: getStringValue(action.payload.task_title),
        task_description: getStringValue(action.payload.task_description),
        recurrence_type: action.recurrence_type || 'once',
      });
    } else if (!open) {
      // Reset form when modal closes
      setFormData({
        action_type: 'send_message',
        scheduled_for: '',
        channel: '',
        message: '',
        subject: '',
        body: '',
        webhook_url: '',
        webhook_method: 'POST',
        task_title: '',
        task_description: '',
        recurrence_type: 'once',
      });
      setErrors({});
    }
  }, [action, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const payload: CreateScheduledAction = {
        contact_id: selectedContactId,
        action_type: formData.action_type,
        scheduled_for: new Date(formData.scheduled_for).toISOString(),
        payload: {},
        recurrence_type: formData.recurrence_type,
      };

      // Build payload based on action type
      switch (formData.action_type) {
        case 'send_message':
          payload.payload = {
            channel: formData.channel,
            message: formData.message,
          };
          break;
        case 'execute_webhook':
          payload.payload = {
            webhook_url: formData.webhook_url,
            webhook_method: formData.webhook_method,
          };
          break;
        case 'create_task':
          payload.payload = {
            task_title: formData.task_title,
            task_description: formData.task_description || undefined,
          };
          break;
      }

      if (action) {
        await scheduledActionsService.update(action.id, payload);
      } else {
        await scheduledActionsService.create(payload);
      }

      onClose();
    } catch (error) {
      console.error('Error saving scheduled action:', error);
      if (error instanceof Error && error.message.includes('422')) {
        const errorData = JSON.parse(error.message);
        if (errorData.errors) {
          setErrors(errorData.errors);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {action ? t('scheduledActions.titleEdit') : t('scheduledActions.title')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="contents">
          <DialogPanel className="flex flex-col gap-4">
            {/* CONTACT SELECTOR - Show when contactId is not provided and not editing */}
            {!initialContactId && !action?.contact_id && (
              <Field className="contact-selector-container" invalid={!!errors.contact_id}>
                <FieldLabel htmlFor="contact">{t('scheduledActions.contact')}</FieldLabel>
                <div className="relative w-full">
                  <InputGroup>
                    <InputGroupInput
                      id="contact"
                      value={selectedContact ? selectedContact.name : contactSearchQuery}
                      onChange={e => {
                        setContactSearchQuery(e.target.value);
                        setShowContactDropdown(true);
                        if (selectedContact) {
                          setSelectedContact(null);
                          setSelectedContactId(undefined);
                        }
                      }}
                      onFocus={() => {
                        if (contactSearchQuery.length >= 2 || contactSearchResults.length > 0) {
                          setShowContactDropdown(true);
                        }
                      }}
                      placeholder={t('scheduledActions.contactPlaceholder')}
                      aria-invalid={errors.contact_id ? true : undefined}
                    />
                    <InputGroupAddon>
                      <Search aria-hidden="true" />
                    </InputGroupAddon>
                    {(loadingContacts || (selectedContact && !showContactDropdown)) && (
                      <InputGroupAddon align="inline-end">
                        {loadingContacts && <Spinner />}
                        {selectedContact && !showContactDropdown && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('scheduledActions.clearContact')}
                            onClick={() => {
                              setSelectedContact(null);
                              setSelectedContactId(undefined);
                              setContactSearchQuery('');
                            }}
                          >
                            <XIcon />
                          </Button>
                        )}
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                  {showContactDropdown && contactSearchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover text-popover-foreground shadow-lg">
                      {contactSearchResults.map(contact => (
                        <div
                          key={contact.id}
                          className="cursor-pointer border-b px-4 py-2 last:border-b-0 hover:bg-accent"
                          onClick={() => {
                            setSelectedContact(contact);
                            setSelectedContactId(contact.id);
                            setContactSearchQuery('');
                            setShowContactDropdown(false);
                            if (errors.contact_id) {
                              setErrors({ ...errors, contact_id: '' });
                            }
                          }}
                        >
                          <div className="font-medium">{contact.name}</div>
                          {contact.email && (
                            <div className="text-sm text-muted-foreground">{contact.email}</div>
                          )}
                          {contact.phone_number && (
                            <div className="text-sm text-muted-foreground">{contact.phone_number}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {showContactDropdown && contactSearchQuery.length >= 2 && !loadingContacts && contactSearchResults.length === 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-4 text-muted-foreground text-sm shadow-lg">
                      {t('scheduledActions.noContactsFound')}
                    </div>
                  )}
                </div>
                {errors.contact_id && <FieldError match>{errors.contact_id}</FieldError>}
              </Field>
            )}

            {/* GENERAL SCHEDULE PARAMETERS - FIRST */}
            <Field invalid={!!errors.scheduled_for}>
              <FieldLabel htmlFor="scheduled_for">{t('scheduledActions.dateTime')}</FieldLabel>
              <Input
                id="scheduled_for"
                type="datetime-local"
                value={formData.scheduled_for}
                min={getMinDateTime()}
                onChange={e => {
                  setFormData({ ...formData, scheduled_for: e.target.value });
                  if (errors.scheduled_for) {
                    setErrors({ ...errors, scheduled_for: '' });
                  }
                }}
                required
                aria-invalid={errors.scheduled_for ? true : undefined}
              />
              {errors.scheduled_for && <FieldError match>{errors.scheduled_for}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="recurrence_type">{t('scheduledActions.recurrence')}</FieldLabel>
              <Select
                items={recurrenceOptions}
                value={formData.recurrence_type || null}
                onValueChange={value => setFormData({ ...formData, recurrence_type: String(value ?? '') })}
              >
                <SelectTrigger id="recurrence_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {recurrenceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>

            {/* ACTION TYPE - MIDDLE */}
            <Field>
              <FieldLabel htmlFor="action_type">{t('scheduledActions.actionType')}</FieldLabel>
              <Select
                items={actionTypeOptions}
                value={formData.action_type || null}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    action_type: String(value ?? ''),
                    message: '',
                    webhook_url: '',
                    task_title: '',
                  })
                }
              >
                <SelectTrigger id="action_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup alignItemWithTrigger={false}>
                  {actionTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </Field>

            {/* ACTION-SPECIFIC FIELDS - LAST */}
            {/* SEND MESSAGE - with channel selector */}
            {formData.action_type === 'send_message' && (
              <>
                <Field invalid={!!errors.channel}>
                  <FieldLabel htmlFor="channel">{t('scheduledActions.channel')}</FieldLabel>
                  <Select
                    items={channelOptions}
                    value={formData.channel || null}
                    onValueChange={value => setFormData({ ...formData, channel: String(value ?? '') })}
                    disabled={loadingInboxes || channelOptions.length === 0}
                  >
                    <SelectTrigger id="channel">
                      <SelectValue
                        placeholder={
                          loadingInboxes
                            ? t('scheduledActions.loadingChannels')
                            : t('scheduledActions.selectChannel')
                        }
                      />
                    </SelectTrigger>
                    <SelectPopup alignItemWithTrigger={false}>
                      {channelOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                  {channelOptions.length === 0 && !loadingInboxes && (
                    <p className="text-sm text-warning-foreground">
                      {t('scheduledActions.messages.noChannelsConfigured')}
                    </p>
                  )}
                  {errors.channel && <FieldError match>{errors.channel}</FieldError>}
                </Field>

                <Field invalid={!!errors.message}>
                  <FieldLabel htmlFor="message">{t('scheduledActions.message')}</FieldLabel>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={e => {
                      setFormData({ ...formData, message: e.target.value });
                      if (errors.message) {
                        setErrors({ ...errors, message: '' });
                      }
                    }}
                    rows={5}
                    required
                    aria-invalid={errors.message ? true : undefined}
                  />
                  {errors.message && <FieldError match>{errors.message}</FieldError>}
                </Field>
              </>
            )}

            {/* EXECUTE WEBHOOK */}
            {formData.action_type === 'execute_webhook' && (
              <>
                <Field invalid={!!errors.webhook_url}>
                  <FieldLabel htmlFor="webhook_url">{t('scheduledActions.webhookUrl')}</FieldLabel>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={formData.webhook_url}
                    onChange={e => {
                      setFormData({ ...formData, webhook_url: e.target.value });
                      if (errors.webhook_url) {
                        setErrors({ ...errors, webhook_url: '' });
                      }
                    }}
                    placeholder="https://example.com/webhook"
                    required
                    aria-invalid={errors.webhook_url ? true : undefined}
                  />
                  {errors.webhook_url && <FieldError match>{errors.webhook_url}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="webhook_method">{t('scheduledActions.webhookMethod')}</FieldLabel>
                  <Select
                    items={webhookMethodOptions}
                    value={formData.webhook_method || null}
                    onValueChange={value => setFormData({ ...formData, webhook_method: String(value ?? '') })}
                  >
                    <SelectTrigger id="webhook_method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup alignItemWithTrigger={false}>
                      {webhookMethodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
                </Field>
              </>
            )}

            {/* CREATE TASK */}
            {formData.action_type === 'create_task' && (
              <>
                <Field invalid={!!errors.task_title}>
                  <FieldLabel htmlFor="task_title">{t('scheduledActions.taskTitle')}</FieldLabel>
                  <Input
                    id="task_title"
                    value={formData.task_title}
                    onChange={e => {
                      setFormData({ ...formData, task_title: e.target.value });
                      if (errors.task_title) {
                        setErrors({ ...errors, task_title: '' });
                      }
                    }}
                    required
                    aria-invalid={errors.task_title ? true : undefined}
                  />
                  {errors.task_title && <FieldError match>{errors.task_title}</FieldError>}
                </Field>

                <Field>
                  <FieldLabel htmlFor="task_description">{t('scheduledActions.taskDescription')}</FieldLabel>
                  <Textarea
                    id="task_description"
                    value={formData.task_description}
                    onChange={e => setFormData({ ...formData, task_description: e.target.value })}
                    rows={4}
                  />
                </Field>
              </>
            )}

          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('scheduledActions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (formData.action_type === 'send_message' && channelOptions.length === 0) ||
                (!initialContactId && !selectedContactId)
              }
            >
              {loading ? t('scheduledActions.saving') : t('scheduledActions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
