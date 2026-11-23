import { Badge } from '@/components/ui/badge';
import { User, Building2, Users, LucideIcon } from '@/components/icons';
import { useLanguage } from '@/hooks/useLanguage';

interface ContactTypeBadgeProps {
  type: 'person' | 'company' | 'group';
  className?: string;
}

type BadgeVariant = 'secondary' | 'info' | 'outline';

const TYPE_CONFIG: Record<string, { icon: LucideIcon; variant: BadgeVariant; labelKey: string }> = {
  person:  { icon: User,      variant: 'secondary', labelKey: 'type.person' },
  company: { icon: Building2, variant: 'info',      labelKey: 'type.company' },
  group:   { icon: Users,     variant: 'outline',   labelKey: 'type.group' },
};

export default function ContactTypeBadge({ type, className = '' }: ContactTypeBadgeProps) {
  const { t } = useLanguage('contacts');
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.person;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 ${className}`}>
      <Icon />
      {t(config.labelKey)}
    </Badge>
  );
}
