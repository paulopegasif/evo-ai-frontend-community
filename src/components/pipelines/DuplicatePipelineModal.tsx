import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Info, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pipeline } from '@/types/analytics';

interface DuplicatePipelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipeline: Pipeline;
  onSubmit: (data: { name: string; description?: string }) => void;
  loading: boolean;
}

export default function DuplicatePipelineModal({
  open,
  onOpenChange,
  pipeline,
  onSubmit,
  loading,
}: DuplicatePipelineModalProps) {
  const { t } = useLanguage('pipelines');
  const [formData, setFormData] = useState({
    name: t('duplicatePipeline.copyDefault', { name: pipeline.name }),
    description: pipeline.description || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSubmit(formData);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setFormData({
        name: t('duplicatePipeline.copyDefault', { name: pipeline.name }),
        description: pipeline.description || '',
      });
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPopup className="max-w-lg">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t('duplicatePipeline.title')}</DialogTitle>
            <DialogDescription>{t('duplicatePipeline.description', { name: pipeline.name })}</DialogDescription>
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-5">
            <Field>
              <FieldLabel>{t('duplicatePipeline.name')}</FieldLabel>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('duplicatePipeline.namePlaceholder')}
                required
                disabled={loading}
                autoFocus
              />
            </Field>

            <Field>
              <FieldLabel>{t('duplicatePipeline.descriptionLabel')}</FieldLabel>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('duplicatePipeline.descriptionPlaceholder')}
                rows={3}
                disabled={loading}
              />
            </Field>

            <Alert variant="info">
              <Info />
              <AlertTitle>{t('duplicatePipeline.whatCopied')}</AlertTitle>
              <AlertDescription>
                <ul className="list-inside list-disc space-y-0.5">
                  <li>{t('duplicatePipeline.settings')}</li>
                  <li>{t('duplicatePipeline.allStages')}</li>
                  <li>{t('duplicatePipeline.structure')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <TriangleAlert />
              <AlertTitle>{t('duplicatePipeline.observation')}</AlertTitle>
              <AlertDescription>{t('duplicatePipeline.noConversations')}</AlertDescription>
            </Alert>
          </DialogPanel>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleClose(false)} disabled={loading}>
              {t('duplicatePipeline.cancel')}
            </Button>
            <Button type="submit" disabled={!formData.name.trim()} loading={loading}>
              {t('duplicatePipeline.duplicate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
