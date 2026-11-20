import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem as BreadcrumbListItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/utils/cn';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface ChannelBreadcrumbProps {
  items: BreadcrumbItem[];
  onBack?: () => void;
  className?: string;
}

const ChannelBreadcrumb: React.FC<ChannelBreadcrumbProps> = ({ items, onBack, className = '' }) => {
  const { t } = useLanguage('channels');

  return (
    <div className={cn('flex items-center gap-2 py-4', className)}>
      {onBack && (
        <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label={t('newChannel.buttons.back')}>
          <ArrowLeft />
        </Button>
      )}
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbListItem>
                {item.active || !item.onClick ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<button type="button" />} onClick={item.onClick}>
                    {item.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbListItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default ChannelBreadcrumb;
