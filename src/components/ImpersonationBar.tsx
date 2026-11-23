import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Eye, UserX } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function ImpersonationBar() {
  const { t } = useLanguage('common');
  
  // Usar authStore para verificar impersonation (memória)
  const impersonation = useAuthStore(state => state.impersonation);
  const exitImpersonation = useAuthStore(state => state.exitImpersonation);

  const handleExitImpersonation = () => {
    // Restaurar dados do admin via authStore
    exitImpersonation();
    
    // Recarregar a página para aplicar as mudanças
    window.location.reload();
  };

  // Se não está impersonando, não renderizar
  if (!impersonation) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-success px-4 py-1.5 text-black text-sm"
    >
      <Eye className="size-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 truncate">
        {t('base.impersonation.viewing')} <span className="font-semibold">{impersonation.impersonatedClient}</span>
      </p>
      <Button
        onClick={handleExitImpersonation}
        size="xs"
        className="shrink-0 bg-black text-white hover:bg-black/80"
      >
        <UserX />
        {t('base.impersonation.exit')}
      </Button>
    </div>
  );
}
