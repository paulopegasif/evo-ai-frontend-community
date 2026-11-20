import { useState, useEffect, useRef } from 'react';

import { useLanguage } from '@/hooks/useLanguage';
import { CustomMcpServer, CustomMcpServerFormData } from '@/types/ai';
import WizardShell from '@/components/agents/wizard/WizardShell';
import {
  Step1_Identity,
  Step2_Connection,
  Step3_Advanced,
  Step4_Finish,
} from './wizard';

interface CustomMCPServerWizardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onSubmit: (data: CustomMcpServerFormData) => void;
  /** Render as a full-page embedded view (sidebar/topbar visible) instead of a Dialog overlay. */
  embedded?: boolean;
  /** When provided, the wizard runs in edit mode and prefills its state from this server. */
  server?: CustomMcpServer;
}

interface WizardData {
  // Step 1 — Identity
  name: string;
  description: string;
  tags: string[];
  // Step 2 — Connection
  url: string;
  headers: Record<string, unknown>;
  // Step 3 — Advanced
  timeout: number;
  retry_count: number;
}

const initialWizardData: WizardData = {
  name: '',
  description: '',
  tags: [],
  url: '',
  headers: {},
  timeout: 30,
  retry_count: 3,
};

const serverToWizardData = (server: CustomMcpServer): WizardData => ({
  name: server.name || '',
  description: server.description || '',
  tags: server.tags || [],
  url: server.url || '',
  headers: (server.headers as Record<string, unknown>) || {},
  timeout: server.timeout ?? 30,
  retry_count: server.retry_count ?? 3,
});

const TOTAL_STEPS = 4;

export default function CustomMCPServerWizardModal({
  open,
  onOpenChange,
  loading = false,
  onSubmit,
  embedded = false,
  server,
}: CustomMCPServerWizardModalProps) {
  const { t } = useLanguage('customMcpServers');
  const isEdit = !!server;
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(() =>
    server ? serverToWizardData(server) : initialWizardData,
  );
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setCurrentStep(1);
        setData(server ? serverToWizardData(server) : initialWizardData);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open, server]);

  useEffect(() => {
    if (open && server) {
      setData(serverToWizardData(server));
    }
  }, [server?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [open, currentStep]);

  const steps = [
    { id: 1, label: t('wizard.progress.identity') },
    { id: 2, label: t('wizard.progress.connection') },
    { id: 3, label: t('wizard.progress.advanced') },
    { id: 4, label: t('wizard.progress.finish') },
  ];

  const stepHeader: Record<number, { title: string; subtitle: string }> = {
    1: { title: t('wizard.step1.title'), subtitle: t('wizard.step1.subtitle') },
    2: { title: t('wizard.step2.title'), subtitle: t('wizard.step2.subtitle') },
    3: { title: t('wizard.step3.title'), subtitle: t('wizard.step3.subtitle') },
    4: { title: t('wizard.step4.title'), subtitle: t('wizard.step4.subtitle') },
  };

  const handleNext = () => setCurrentStep(s => Math.min(s + 1, TOTAL_STEPS));
  const handleBack = () => setCurrentStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    const payload: CustomMcpServerFormData = {
      name: data.name.trim(),
      description: data.description.trim() || '',
      url: data.url.trim(),
      headers: data.headers,
      timeout: data.timeout,
      retry_count: data.retry_count,
      tags: data.tags,
    };
    onSubmit(payload);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1_Identity
            data={{
              name: data.name,
              description: data.description,
              tags: data.tags,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <Step2_Connection
            data={{
              url: data.url,
              headers: data.headers,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <Step3_Advanced
            data={{
              timeout: data.timeout,
              retry_count: data.retry_count,
            }}
            onChange={d => setData(prev => ({ ...prev, ...d }))}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <Step4_Finish
            data={{
              name: data.name,
              description: data.description,
              url: data.url,
              headers: data.headers,
              timeout: data.timeout,
              retry_count: data.retry_count,
              tags: data.tags,
            }}
            onBack={handleBack}
            onSubmit={handleSubmit}
            loading={loading}
            mode={isEdit ? 'edit' : 'create'}
          />
        );
      default:
        return null;
    }
  };

  const header = stepHeader[currentStep];

  return (
    <WizardShell
      open={open}
      onOpenChange={onOpenChange}
      embedded={embedded}
      title={header.title}
      subtitle={header.subtitle}
      dialogTitle={t('modal.title.create')}
      steps={steps}
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      contentRef={contentRef}
    >
      {renderStep()}
    </WizardShell>
  );
}
