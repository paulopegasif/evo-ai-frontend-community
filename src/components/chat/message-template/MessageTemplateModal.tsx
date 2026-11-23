import React, { useState, useEffect } from 'react';
import { Dialog, DialogDescription, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import MessageTemplateService from '@/services/channels/messageTemplatesService';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import TemplatesPicker from './TemplatesPicker';
import TemplateParser from './TemplateParser';
import { MessageTemplate } from '@/types';

interface MessageTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  inboxId: string;
  channelType?: string;
  isWhatsAppCloud?: boolean;
  onSend: (payload: {
    message: string;
    templateParams?: {
      id: string;
      name: string;
      category: string;
      language: string;
      namespace: string;
      processed_params: Record<string, string>;
    };
  }) => void;
}

const MessageTemplateModal: React.FC<MessageTemplateModalProps> = ({
  isOpen,
  onClose,
  inboxId,
  channelType,
  isWhatsAppCloud,
  onSend,
}) => {
  const { t } = useLanguage('chat');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [proccessOpenDialog, setProccessOpenDialog] = useState(false);

  // Carregar templates quando o modal abre
  useEffect(() => {
    if (!isOpen) {
      // Resetar estado quando o modal fecha
      setSelectedTemplate(null);
      setProccessOpenDialog(false);
      return;
    }

    if (!inboxId) {
      return;
    }

    // Resetar estado interno quando o modal abre
    setSelectedTemplate(null);
    setProccessOpenDialog(false);
    setIsLoading(true);

    let cancelled = false;

    const loadTemplates = async () => {
      try {
        const response = await MessageTemplateService.getTemplates(inboxId);

        if (cancelled) return;

        const templates = response?.data || [];

        if (templates.length === 0) {
          toast.info(t('messageTemplates.noTemplates'));
          onClose();
          return;
        }

        if (cancelled) return;

        setTemplates(templates);
        setProccessOpenDialog(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Error loading templates:', error);
        toast.error(t('messageTemplates.errors.loadError'));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [isOpen, inboxId, t, onClose]);

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
  };

  const handleResetTemplate = () => {
    setSelectedTemplate(null);
  };

  const handleSendMessage = async (payload: {
    message: string;
    templateParams: {
      id: string;
      name: string;
      category: string;
      language: string;
      namespace: string;
      processed_params: Record<string, string>;
    };
  }) => {
    try {
      setIsLoading(true);
      await onSend(payload);
      // Fechar modal após envio bem-sucedido
      setSelectedTemplate(null);
      setProccessOpenDialog(false);
      onClose();
    } catch (error) {
      console.error('[MessageTemplateModal] Error sending template message:', error);
      toast.error(t('messageTemplates.errors.sendError'));
    } finally {
      setIsLoading(false);
    }
  };

  const modalTitle = selectedTemplate
    ? t('messageTemplates.modal.templateSelectedSubtitle', {
        templateName: selectedTemplate.name,
      })
    : t('messageTemplates.modal.subtitle');

  return (
    <Dialog
      open={proccessOpenDialog}
      onOpenChange={open => {
        if (!open) {
          setProccessOpenDialog(false);
          onClose();
        }
      }}
    >
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('messageTemplates.modal.title')}</DialogTitle>
          <DialogDescription>{modalTitle}</DialogDescription>
        </DialogHeader>

        <DialogPanel>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : selectedTemplate ? (
            <TemplateParser
              template={selectedTemplate}
              channelType={channelType}
              onSend={handleSendMessage}
              onReset={handleResetTemplate}
              loading={isLoading}
            />
          ) : (
            <TemplatesPicker
              isWhatsAppCloud={isWhatsAppCloud}
              templates={templates}
              onSelect={handleSelectTemplate}
            />
          )}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
};

export default MessageTemplateModal;
