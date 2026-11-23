import React, { useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Badge } from '@/components/ui/badge';
import { Search } from '@/components/icons';
import type { MessageTemplate } from '@/types/channels/inbox';

import { useLanguage } from '@/hooks/useLanguage';
import {
  getStatusBadgeKey,
  hasUnsupportedFormat,
  isTemplateSendable,
} from './templateStatus';

interface TemplatesPickerProps {
  isWhatsAppCloud?: boolean;
  templates: MessageTemplate[];
  onSelect: (template: MessageTemplate) => void;
}

const TemplatesPicker: React.FC<TemplatesPickerProps> = ({ isWhatsAppCloud, templates, onSelect }) => {
  const { t } = useLanguage('chat');
  const [searchQuery, setSearchQuery] = useState('');

  const visibleTemplates = useMemo(
    () =>
      isWhatsAppCloud
        ? templates.filter(template => !hasUnsupportedFormat(template))
        : templates,
    [templates, isWhatsAppCloud],
  );

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) {
      return visibleTemplates;
    }

    const query = searchQuery.toLowerCase();
    return visibleTemplates.filter(template =>
      template.name.toLowerCase().includes(query),
    );
  }, [visibleTemplates, searchQuery]);


  return (
    <div className="w-full">
      <InputGroup className="mb-3">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t('messageTemplates.picker.searchPlaceholder')}
          aria-label={t('messageTemplates.picker.searchPlaceholder')}
        />
      </InputGroup>

      <div className="max-h-[320px] divide-y overflow-y-auto rounded-xl border bg-card">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template, index) => {
            const isEnabled = isWhatsAppCloud ? isTemplateSendable(template) : true;
            const badgeKey = isWhatsAppCloud ? getStatusBadgeKey(template) : null;
            const showBadge = badgeKey !== null && badgeKey !== 'approved';

            return (
              <button
                key={template.id || index}
                type="button"
                onClick={() => isEnabled && onSelect(template)}
                disabled={!isEnabled}
                title={!isEnabled ? t('messageTemplates.picker.status.disabledTooltip') : undefined}
                className={`block w-full px-3.5 py-2.5 text-left outline-none transition-colors first:rounded-t-xl last:rounded-b-xl focus-visible:bg-accent ${
                  isEnabled ? 'cursor-pointer hover:bg-accent/60' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium text-sm">{template.name}</p>
                    {showBadge && (
                      <Badge variant="warning" size="sm">
                        {t(`messageTemplates.picker.status.${badgeKey}`)}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" size="sm" className="flex-shrink-0">
                    {t('messageTemplates.picker.labels.language')}: {template.language}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground text-xs">
                  {t('messageTemplates.picker.labels.category')}:{' '}
                  <span className="text-foreground/80">{template.category}</span>
                </p>
              </button>
            );
          })
        ) : (
          <div className="p-6 text-center text-muted-foreground text-sm">
            {t('messageTemplates.picker.noTemplatesFound')}{' '}
            {searchQuery && <strong className="text-foreground">{searchQuery}</strong>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPicker;
