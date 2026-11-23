import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, File, Image, Music, Video } from '@/components/icons';
import { toast } from 'sonner';
import { Attachment } from '@/types/chat/api';
import { useLanguage } from '@/hooks/useLanguage';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

interface MessageFileProps {
  attachments: Attachment[];
}

const MessageFile: React.FC<MessageFileProps> = ({ attachments }) => {
  const { t } = useLanguage('chat');

  // Files above this threshold skip fetch+blob (which loads the entire file
  // into memory) and use direct browser download instead. 25 MB chosen because
  // WhatsApp videos regularly exceed 50 MB and would cause OOM on mobile/low-memory.
  const MAX_BLOB_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

  const downloadFile = async (attachment: Attachment) => {
    const url = attachment.data_url?.trim();
    if (!url) return;

    const filename = attachment.fallback_title || t('messages.messageFile.fileFallback');

    // Large files: skip fetch+blob to avoid loading entire file into memory.
    // Use direct <a download> which streams natively through the browser.
    if ((attachment.file_size ?? 0) > MAX_BLOB_DOWNLOAD_BYTES) {
      openAttachmentInNewTab({ url, filename });
      return;
    }

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.warn('[MessageFile] non-ok response:', response.status, url);
        toast.warning(t('messages.messageFile.downloadFallbackOpenedInNewTab'), {
          description: t('messages.messageFile.downloadFallbackReason.serverError', { status: response.status }),
        });
        openAttachmentInNewTab({ url, filename });
        return;
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
    } catch (err) {
      console.warn('[MessageFile] download fallback after fetch error:', err);
      toast.warning(t('messages.messageFile.downloadFallbackOpenedInNewTab'), {
        description: t('messages.messageFile.downloadFallbackReason.network'),
      });
      openAttachmentInNewTab({ url, filename });
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return t('messages.messageFile.unknownSize');

    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (extension?: string) => {
    if (!extension)
      return (
        <File className="size-5" />
      );

    const ext = extension.toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return (
        <Image className="size-5" />
      );
    }
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
      return (
        <Music className="size-5" />
      );
    }
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) {
      return (
        <Video className="size-5" />
      );
    }
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) {
      return (
        <FileText className="size-5" />
      );
    }

    return <File className="size-5" />;
  };

  return (
    <div className="space-y-2">
      {attachments
        .filter(attachment => {
          // 🔒 FILTRAR: Apenas attachments com data_url válido e não vazio
          return attachment && attachment.data_url && attachment.data_url.trim() !== '';
        })
        .map((attachment, index) => (
        <div
          key={attachment.id || index}
          className="flex w-full items-center gap-3 rounded-lg border bg-background/64 p-2"
          style={{
            minWidth: '200px',
            maxWidth: 'min(280px, calc(100vw - 120px))',
          }}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {getFileIcon(attachment.extension!)}
          </span>

          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-sm">
              {attachment.fallback_title || t('messages.messageFile.fileFallbackTitle')}
            </div>
            <div className="text-muted-foreground text-xs">
              {formatFileSize(attachment.file_size)}
              {attachment.extension && ` • ${attachment.extension.toUpperCase()}`}
            </div>
          </div>

          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => downloadFile(attachment)}
            aria-label={t('messages.messageFile.download', 'Baixar')}
            className="flex-shrink-0 text-muted-foreground"
          >
            <Download />
          </Button>
        </div>
      ))}
    </div>
  );
};

export default MessageFile;
