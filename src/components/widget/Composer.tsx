import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChatAttachment } from './ChatAttachment';
import { EmojiPickerComponent } from './EmojiPicker';
import { ResizableTextarea, ResizableTextareaRef } from './ResizableTextarea';
import { useLanguage } from '@/hooks/useLanguage';
import { SendHorizontal } from 'lucide-react';

interface ComposerProps {
  onSend: (text: string) => void | Promise<void>;
  onUpload?: (file: File) => void;
  isUploading?: boolean;
  onTyping?: (isTyping: boolean) => void;
  widgetColor?: string;
}

const Composer: React.FC<ComposerProps> = ({
  onSend,
  onUpload,
  isUploading = false,
  onTyping,
  widgetColor = '#00d4aa',
}) => {
  const { t } = useLanguage('widget');
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<ResizableTextareaRef>(null);

  const handleSend = async () => {
    const v = text.trim();
    if (!v) return;

    try {
      setIsSending(true);
      await onSend(v);
      setText('');
      // Stop typing indicator when sending
      onTyping?.(false);
      setIsSending(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsSending(false);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Trigger typing indicator
    if (onTyping) {
      if (newText.length > 0 && text.length === 0) {
        // Started typing
        onTyping(true);
      } else if (newText.length === 0 && text.length > 0) {
        // Stopped typing (cleared text)
        onTyping(false);
      }
    }
  };

  const handleFileUpload = (file: File) => {
    if (onUpload) {
      onUpload(file);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const currentText = text;

    const newText = currentText.slice(0, start) + emoji + currentText.slice(end);
    setText(newText);

    // Trigger typing indicator if starting to type
    if (onTyping && currentText.length === 0) {
      onTyping(true);
    }

    // Focus back to textarea and set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  return (
    <div className="p-3 pt-2">
      <div className="relative flex items-end gap-1 rounded-xl border border-input bg-background p-1 shadow-xs/5 transition-shadow has-focus-visible:border-ring has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 dark:bg-input/32">
        {/* Attachment button only while the input is empty (like the Vue widget) */}
        {text.length === 0 && (
          <div className="flex h-10 items-center">
            <ChatAttachment onFileUpload={handleFileUpload} isUploading={isUploading} isDisabled={false} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <ResizableTextarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder={t('composer.placeholder')}
            className={text.length === 0 ? 'ps-1.5' : undefined}
            maxRows={4}
            minRows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>
        <div className="flex h-10 items-center gap-1">
          <EmojiPickerComponent onEmojiSelect={handleEmojiSelect} />
          {/* Send button only when there's text (like the Vue widget) */}
          {text.length > 0 && (
            <Button
              size="icon-sm"
              onClick={handleSend}
              loading={isSending}
              aria-label={t('composer.send')}
              className="shrink-0 text-white hover:opacity-90"
              style={{ backgroundColor: widgetColor, borderColor: widgetColor }}
            >
              <SendHorizontal />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Composer;
