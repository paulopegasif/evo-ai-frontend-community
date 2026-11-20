import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip';
import ConfirmDialog from '@/components/base/ConfirmDialog';
import { Pencil, StickyNote, Trash, X, Check } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePermissions } from '@/contexts/PermissionsContext';
import { contactsService } from '@/services/contacts';
import type { ContactNote } from '@/types/contacts';

interface ContactNotesCardProps {
  contactId: string;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContactNotesCard({ contactId }: ContactNotesCardProps) {
  const { t } = useLanguage('contacts');
  const { can, isReady } = usePermissions();
  const canUpdate = isReady && can('contacts', 'update');
  const canDelete = isReady && can('contacts', 'delete');

  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await contactsService.getContactNotes(contactId);
      const list = [...(response.data ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setNotes(list);
    } catch (error) {
      console.error('Error loading contact notes:', error);
      toast.error(t('notes.messages.loadError'));
    } finally {
      setLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async () => {
    const content = newNote.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const created = await contactsService.createContactNote(contactId, content);
      setNotes(prev => [created, ...prev]);
      setNewNote('');
      toast.success(t('notes.messages.createSuccess'));
    } catch (error) {
      console.error('Error creating contact note:', error);
      toast.error(t('notes.messages.createError'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (note: ContactNote) => {
    setEditingId(note.id);
    setEditingContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    const content = editingContent.trim();
    if (!content) return;

    setSavingEditId(noteId);
    try {
      const updated = await contactsService.updateContactNote(contactId, noteId, content);
      setNotes(prev => prev.map(n => (n.id === noteId ? updated : n)));
      toast.success(t('notes.messages.updateSuccess'));
      cancelEdit();
    } catch (error) {
      console.error('Error updating contact note:', error);
      toast.error(t('notes.messages.updateError'));
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDelete = async (noteId: string) => {
    setDeletingId(noteId);
    try {
      await contactsService.deleteContactNote(contactId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success(t('notes.messages.deleteSuccess'));
    } catch (error) {
      console.error('Error deleting contact note:', error);
      toast.error(t('notes.messages.deleteError'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="size-4 text-muted-foreground" />
          {t('notes.title')}
          {!loading && notes.length > 0 && (
            <Badge variant="secondary" className="tabular-nums">
              {notes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardPanel className="flex flex-col gap-4">
        {canUpdate && (
          <div className="flex flex-col gap-2">
            <Textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder={t('notes.addPlaceholder')}
              aria-label={t('notes.addPlaceholder')}
              rows={3}
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()} loading={submitting}>
                {t('notes.actions.add')}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : notes.length === 0 ? (
          <p className="rounded-lg border border-dashed py-6 text-center text-muted-foreground text-sm">{t('notes.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notes.map(note => (
              <li key={note.id} className="group rounded-lg border bg-muted/24 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="truncate text-muted-foreground text-xs">
                    <span className="font-medium text-foreground">{note.user?.name}</span>
                    {' · '}
                    <span className="tabular-nums">{formatDateTime(note.created_at)}</span>
                  </div>
                  {editingId !== note.id && (canUpdate || canDelete) && (
                    <div className="-my-1 flex shrink-0 items-center gap-0.5">
                      {canUpdate && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => startEdit(note)}
                                aria-label={t('notes.actions.edit')}
                              />
                            }
                          >
                            <Pencil />
                          </TooltipTrigger>
                          <TooltipPopup>{t('notes.actions.edit')}</TooltipPopup>
                        </Tooltip>
                      )}
                      {canDelete && (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-destructive-foreground"
                                onClick={() => setNoteToDelete(note.id)}
                                disabled={deletingId === note.id}
                                aria-label={t('notes.actions.delete')}
                              />
                            }
                          >
                            <Trash />
                          </TooltipTrigger>
                          <TooltipPopup>{t('notes.actions.delete')}</TooltipPopup>
                        </Tooltip>
                      )}
                    </div>
                  )}
                </div>

                {editingId === note.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      aria-label={t('notes.actions.edit')}
                      rows={3}
                      disabled={savingEditId === note.id}
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={savingEditId === note.id}>
                        <X />
                        {t('notes.actions.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={!editingContent.trim()}
                        loading={savingEditId === note.id}
                      >
                        <Check />
                        {t('notes.actions.save')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm">{note.content}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardPanel>

      <ConfirmDialog
        open={noteToDelete !== null}
        onOpenChange={open => !open && setNoteToDelete(null)}
        title={t('notes.deleteConfirm.title')}
        description={t('notes.deleteConfirm.description')}
        cancelLabel={t('notes.actions.cancel')}
        confirmLabel={t('notes.actions.delete')}
        loading={deletingId !== null}
        onConfirm={async () => {
          if (noteToDelete) await handleDelete(noteToDelete);
          setNoteToDelete(null);
        }}
      />
    </Card>
  );
}
