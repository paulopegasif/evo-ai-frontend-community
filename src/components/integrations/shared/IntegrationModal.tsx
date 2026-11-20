import type { ReactNode } from 'react';
import { Integration } from '@/types/integrations';
import BrandIcon from '@/components/BrandIcon';
import { AgentIntegrationDialog } from '../agentConfig/AgentIntegrationDialog';

interface IntegrationModalProps {
  integration: Integration | null;
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  title?: string;
  description?: ReactNode;
  /** Shows a form-shaped skeleton instead of the body. */
  loading?: boolean;
  /** Primary actions at the end of the sticky footer. */
  footer?: ReactNode;
  /** Secondary action at the start of the footer (e.g. docs link). */
  footerStart?: ReactNode;
  children?: ReactNode;
}

/** Dialog shell for an integration: brand tile, title, scrollable body, sticky footer. */
export default function IntegrationModal({
  integration,
  open,
  onClose,
  onSave: _,
  title,
  description,
  loading,
  footer,
  footerStart,
  children,
}: IntegrationModalProps) {
  const modalTitle = title || (integration ? `Configurar ${integration.name}` : 'Nova Integração');

  return (
    <AgentIntegrationDialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
      icon={integration ? <BrandIcon id={integration.id} size={20} /> : undefined}
      title={modalTitle}
      description={description}
      loading={loading}
      footer={footer}
      footerStart={footerStart}
      className="sm:max-w-2xl"
    >
      {children}
    </AgentIntegrationDialog>
  );
}
