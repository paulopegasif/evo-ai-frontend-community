import React, { useCallback, useRef } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { useDropzone } from 'react-dropzone';
import { PaperclipIcon, ImageIcon } from 'lucide-react';
import { validateFile } from '@/types/core';
import { useLanguage } from '@/hooks/useLanguage';

interface ChatAttachmentProps {
  onFileUpload: (file: File) => void;
  isUploading?: boolean;
  isDisabled?: boolean;
}

export const ChatAttachment: React.FC<ChatAttachmentProps> = ({
  onFileUpload,
  isUploading = false,
  isDisabled = false,
}) => {
  const { t } = useLanguage('widget');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        alert(t('attachment.error', { error: validation.error }));
        return;
      }

      // Upload immediately (like Vue widget)
      onFileUpload(file);
    },
    [onFileUpload],
  );

  const processFiles = useCallback(
    (files: File[]) => {
      files.forEach(processFile);
    },
    [processFile],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      processFiles(acceptedFiles);
    },
    [processFiles],
  );

  const onFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        processFiles(files);
      }
      // Reset input value to allow selecting the same file again
      event.target.value = '';
    },
    [processFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isDisabled || isUploading,
    multiple: false, // Like Vue widget
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
    },
  });

  const openFileDialog = useCallback(() => {
    if (!isDisabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [isDisabled, isUploading]);

  // Handle paste events
  React.useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      if (isDisabled || isUploading) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        processFiles(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isDisabled, isUploading, processFiles]);

  return (
    <>
      {/* File Input (hidden) */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={onFileInputChange}
        multiple={false}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv"
        style={{ display: 'none' }}
      />

      {/* Attachment Button */}
      <button
        type="button"
        onClick={openFileDialog}
        disabled={isDisabled || isUploading}
        aria-label={t('attachment.attach')}
        title={t('attachment.attach')}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-64"
      >
        {isUploading ? <Spinner className="size-4" /> : <PaperclipIcon className="size-4.5" />}
      </button>

      {/* Drop Zone (activated on drag) */}
      {isDragActive && (
        <div
          {...getRootProps()}
          className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-info/48 border-dashed bg-background/90 backdrop-blur-sm"
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <ImageIcon className="mx-auto mb-2 size-10 text-info" />
            <p className="font-medium text-info-foreground text-sm">{t('attachment.dropHere')}</p>
          </div>
        </div>
      )}
    </>
  );
};
