import React, { useState, useEffect } from 'react';

import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { toast } from 'sonner';

import { scheduledActionsService } from '@/services/scheduledActions/scheduledActionsService';
import type { CreateScheduledAction } from '@/types/automation';
import { CHANNEL_TYPE_MAP } from '../../scheduledActions/scheduledActionChannelUtils';
import { useLanguage } from '@/hooks/useLanguage';

interface ScheduleMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | number;
  channelType?: string;
  /** The message currently typed in the composer — this is what gets scheduled. */
  messageContent: string;
}

const getMinDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const ScheduleMessageModal: React.FC<ScheduleMessageModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  channelType,
  messageContent,
}) => {
  const { t } = useLanguage('chat');
  const [scheduledFor, setScheduledFor] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setScheduledFor('');
      setNote('');
      setErrors({});
    }
  }, [isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!scheduledFor) {
      newErrors.scheduledFor = t('messageInput.schedule.errors.dateTimeRequired');
    } else if (new Date(scheduledFor) <= new Date()) {
      newErrors.scheduledFor = t('messageInput.schedule.errors.dateTimeFuture');
    }

    if (!messageContent.trim()) {
      newErrors.message = t('messageInput.schedule.errors.messageRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validate()) return;

    setIsSaving(true);
    try {
      // Backend contract note (pendência): scheduledActionsService is proven
      // with contact_id + payload.channel (see ScheduleActionModal). Whether a
      // send_message action resolves purely via conversation_id — and whether
      // payload.channel is required/honored in that path — is unverified from
      // the frontend. Flagged as a pendência, not assumed.
      const payload: CreateScheduledAction = {
        conversation_id: String(conversationId),
        action_type: 'send_message',
        scheduled_for: new Date(scheduledFor).toISOString(),
        payload: {
          channel: channelType ? CHANNEL_TYPE_MAP[channelType] : undefined,
          message: messageContent,
          note: note.trim() || undefined,
        },
        recurrence_type: 'once',
      };

      await scheduledActionsService.create(payload);
      toast.success(t('messageInput.schedule.success'));
      onClose();
    } catch (error) {
      console.error('Error scheduling message:', error);
      toast.error(t('messageInput.schedule.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={openState => !openState && onClose()}>
      <DialogPopup className="max-w-lg">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t('messageInput.schedule.title')}</DialogTitle>
          </DialogHeader>

          <DialogPanel className="space-y-4">
            <Field invalid={!!errors.message}>
              <FieldLabel render={<span />}>{t('messageInput.schedule.messagePreview')}</FieldLabel>
              <div className="max-h-32 w-full overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/40 px-3 py-2 text-foreground text-sm">
                {messageContent.trim() || (
                  <span className="text-muted-foreground italic">{t('messageInput.schedule.emptyMessage')}</span>
                )}
              </div>
              {errors.message && <FieldError match>{errors.message}</FieldError>}
            </Field>

            <Field invalid={!!errors.scheduledFor}>
              <FieldLabel htmlFor="schedule-datetime">{t('messageInput.schedule.dateTime')}</FieldLabel>
              <Input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduledFor}
                min={getMinDateTime()}
                onChange={e => {
                  setScheduledFor(e.target.value);
                  if (errors.scheduledFor) setErrors({ ...errors, scheduledFor: '' });
                }}
                aria-invalid={!!errors.scheduledFor || undefined}
                required
              />
              {errors.scheduledFor && <FieldError match>{errors.scheduledFor}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="schedule-note">{t('messageInput.schedule.note')}</FieldLabel>
              <Textarea
                id="schedule-note"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                placeholder={t('messageInput.schedule.notePlaceholder')}
              />
            </Field>
          </DialogPanel>

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={isSaving} />}>
              {t('messageInput.schedule.cancel')}
            </DialogClose>
            <Button type="submit" loading={isSaving}>
              {t('messageInput.schedule.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
};

export default ScheduleMessageModal;
