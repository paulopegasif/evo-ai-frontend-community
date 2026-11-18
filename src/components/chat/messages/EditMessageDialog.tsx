import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@evoapi/design-system/dialog';
import { Button } from '@evoapi/design-system/button';
import { Textarea } from '@evoapi/design-system/textarea';
import { Loader2 } from 'lucide-react';
import { Message } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { htmlToPlainText } from './messageErrors';

interface EditMessageDialogProps {
  message: Message;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Resolves true when saved (dialog closes), false to keep it open.
  onSave: (content: string) => Promise<boolean>;
}

const EditMessageDialog: React.FC<EditMessageDialogProps> = ({ message, open, onOpenChange, onSave }) => {
  const { t } = useLanguage('chat');
  const original = htmlToPlainText(message.content || '');
  const [value, setValue] = useState(original);
  const [saving, setSaving] = useState(false);

  // Reset the draft every time the dialog opens.
  useEffect(() => {
    if (open) setValue(original);
  }, [open, original]);

  const trimmed = value.trim();
  const canSave = !saving && trimmed.length > 0 && trimmed !== original.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const saved = await onSave(trimmed);
      if (saved) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('messages.messageBubble.editDialog.title')}</DialogTitle>
          <DialogDescription>
            {message.private
              ? t('messages.messageBubble.editDialog.descriptionPrivate')
              : t('messages.messageBubble.editDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSave();
            }
          }}
          rows={4}
          autoFocus
          spellCheck={false}
          autoCorrect="off"
          aria-label={t('messages.messageBubble.editDialog.title')}
          className="resize-none"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {t('messages.messageBubble.editDialog.cancel')}
          </Button>
          <Button onClick={() => void handleSave()} disabled={!canSave}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t('messages.messageBubble.editDialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMessageDialog;
