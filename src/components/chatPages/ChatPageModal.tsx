import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import OptionSelect from '@/components/segments/ui/OptionSelect';
import { useLanguage } from '@/hooks/useLanguage';
import type { ChatPage, ChatPagePayload, WebWidgetOption } from '@/types/chatPages';

interface ChatPageModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: ChatPagePayload) => void | Promise<void>;
  saving: boolean;
  initial: ChatPage | null;
  widgets: WebWidgetOption[];
}

const ChatPageModal = ({ open, onClose, onSave, saving, initial, widgets }: ChatPageModalProps) => {
  const { t } = useLanguage('chatPages');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(false);
  const [websiteToken, setWebsiteToken] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? '');
    setDescription(initial?.description ?? '');
    setPublished(initial?.published ?? false);
    setWebsiteToken(initial?.website_token ?? '');
    setPrimaryColor(initial?.appearance?.primary_color ?? '');
    setLogoUrl(initial?.appearance?.logo_url ?? '');
    setError(null);
  }, [open, initial]);

  // An edited page may reference a widget that is no longer listed (e.g. created
  // via console); keep its token selectable so editing never silently drops it.
  const widgetOptions: WebWidgetOption[] =
    websiteToken && !widgets.some(w => w.website_token === websiteToken)
      ? [...widgets, { inbox_id: websiteToken, name: t('modal.widget.unknown'), website_token: websiteToken }]
      : widgets;

  const handleSave = () => {
    setError(null);
    if (!websiteToken) return setError(t('modal.errors.widget'));

    const payload: ChatPagePayload = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      published,
      website_token: websiteToken,
      appearance: {
        primary_color: primaryColor || undefined,
        logo_url: logoUrl || undefined,
      },
    };
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogPopup className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? t('modal.editTitle') : t('modal.createTitle')}</DialogTitle>
        </DialogHeader>

        <DialogPanel className="flex flex-col gap-8">
          <Fieldset className="max-w-none gap-5">
            <FieldsetLegend className="text-sm">{t('modal.sections.basic')}</FieldsetLegend>
            <Field>
              <FieldLabel htmlFor="chat-page-title">{t('modal.basic.title')}</FieldLabel>
              <Input
                id="chat-page-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={t('modal.basic.titlePlaceholder')}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="chat-page-description">{t('modal.basic.description')}</FieldLabel>
              <Textarea id="chat-page-description" value={description} onChange={e => setDescription(e.target.value)} />
            </Field>
            <Label>
              <Switch checked={published} onCheckedChange={setPublished} />
              {t('modal.basic.published')}
            </Label>
          </Fieldset>

          <Fieldset className="max-w-none gap-5">
            <FieldsetLegend className="text-sm">{t('modal.sections.widget')}</FieldsetLegend>
            <Field>
              <FieldLabel htmlFor="chat-page-widget">{t('modal.widget.label')}</FieldLabel>
              <OptionSelect
                id="chat-page-widget"
                value={websiteToken}
                onValueChange={setWebsiteToken}
                placeholder={t('modal.widget.placeholder')}
                aria-invalid={error === t('modal.errors.widget')}
                options={widgetOptions.map(w => ({ value: w.website_token, label: w.name }))}
              />
              {widgets.length === 0 && <FieldDescription>{t('modal.widget.empty')}</FieldDescription>}
            </Field>
          </Fieldset>

          <Fieldset className="max-w-none gap-5">
            <FieldsetLegend className="text-sm">{t('modal.sections.appearance')}</FieldsetLegend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="chat-page-color">{t('modal.appearance.primaryColor')}</FieldLabel>
                <Input
                  id="chat-page-color"
                  value={primaryColor}
                  onChange={e => setPrimaryColor(e.target.value)}
                  placeholder="#1f93ff"
                  className="font-mono"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="chat-page-logo">{t('modal.appearance.logoUrl')}</FieldLabel>
                <Input
                  id="chat-page-logo"
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://…"
                />
              </Field>
            </div>
          </Fieldset>

          {error && (
            <Alert variant="error">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />} disabled={saving}>
            {t('modal.cancel')}
          </DialogClose>
          <Button onClick={handleSave} loading={saving}>
            {saving ? t('modal.saving') : t('modal.save')}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
};

export default ChatPageModal;
