import React, { useState, useRef, useEffect } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';

interface EmojiPickerComponentProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}

export const EmojiPickerComponent: React.FC<EmojiPickerComponentProps> = ({
  onEmojiSelect,
  className = '',
}) => {
  const { t } = useLanguage('widget');
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  const togglePicker = () => {
    setIsOpen(!isOpen);
  };

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={togglePicker}
        type="button"
        aria-label={t('emoji.addEmoji')}
        aria-expanded={isOpen}
        title={t('emoji.addEmoji')}
        className={cn(
          'flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
          isOpen && 'bg-accent text-foreground',
        )}
      >
        <Smile className="size-4.5" />
      </button>

      {isOpen && (
        <div
          ref={pickerRef}
          className="absolute end-0 bottom-full z-50 mb-2 overflow-hidden rounded-xl border shadow-lg/5"
        >
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            searchDisabled={false}
            skinTonesDisabled={true}
            width={300}
            height={400}
            theme={isDark ? Theme.DARK : Theme.LIGHT}
            previewConfig={{
              showPreview: false,
            }}
          />
        </div>
      )}
    </div>
  );
};
