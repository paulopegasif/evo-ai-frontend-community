import React, { useState } from 'react';
import { X } from '@/components/icons';

import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NoteComposerProps {
  onSave: (content: string) => void;
  onExit: () => void;
  isSaving?: boolean;
}

/**
 * Replaces the composer bar when the agent picks "Notas da Conversa" (+ menu);
 * not a modal. Saving sends the note as a private message. Uses the warning
 * tokens, the same tint as private notes in the timeline.
 */
const NoteComposer: React.FC<NoteComposerProps> = ({ onSave, onExit, isSaving = false }) => {
  const { t } = useLanguage('chat');
  const [content, setContent] = useState('');

  const handleSave = () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setContent('');
  };

  return (
    <div className="w-full border-t-2 border-t-warning bg-warning/8 px-3 py-3 md:px-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-warning-foreground leading-snug">
          {t(
            'messageInput.noteComposer.helper',
            'Salve notas importantes na conversa para que outros usuários possam ver no futuro.',
          )}
        </p>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onExit}
          aria-label={t('messageInput.noteComposer.cancel', 'Cancelar')}
          className="text-warning-foreground"
        >
          <X />
        </Button>
      </div>

      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (!isSaving) handleSave();
          }
        }}
        placeholder={t('messageInput.noteComposer.placeholder', 'Adicionar nota ao atendimento...')}
        disabled={isSaving}
        autoFocus
        aria-label={t('messageInput.noteComposer.placeholder', 'Adicionar nota ao atendimento...')}
        className="mt-2.5 border-warning/32 [&_textarea]:resize-none"
      />

      <div className="mt-2.5 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onExit}>
          {t('messageInput.noteComposer.cancel', 'Cancelar')}
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!content.trim() && !isSaving}
          loading={isSaving}
          className="border-warning bg-warning text-white shadow-warning/24 hover:bg-warning/90"
        >
          {isSaving ? t('messageInput.noteComposer.saving', 'Salvando...') : t('messageInput.noteComposer.save', 'Salvar')}
        </Button>
      </div>
    </div>
  );
};

export default NoteComposer;
