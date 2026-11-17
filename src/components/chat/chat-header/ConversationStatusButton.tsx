import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { STATUS_META } from './statusMeta';

interface ConversationStatusButtonProps {
  status: string;
  onMarkAsOpen: () => void;
  onMarkAsResolved: () => void;
  onMarkAsPending: () => void;
  onMarkAsSnoozed: () => void;
}

/**
 * Botão de status = 2 segmentos colados (não 1 botão único): segmento
 * principal (label = próxima ação, bg = cor do status ATUAL) + segmento
 * chevron (bg = tom escuro do mesmo status) que abre um dropdown com as 4
 * opções fixas. Espelha o protótipo pixel a pixel — ver spec-extraida.md.
 */
const ConversationStatusButton = ({
  status,
  onMarkAsOpen,
  onMarkAsResolved,
  onMarkAsPending,
  onMarkAsSnoozed,
}: ConversationStatusButtonProps) => {
  const { t } = useLanguage('chat');
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // mousedown (não click): fecha ANTES do próximo click "abrir de novo" ter
    // chance de competir, e não depende de bubbling terminar no mesmo tick em
    // que o menu abriu. capture:true garante que rodamos antes de qualquer
    // stopPropagation() de um filho.
    const onPointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const mainLabel =
    status === 'open'
      ? t('chatHeader.statusButton.complete', 'Concluir')
      : t('chatHeader.statusButton.open', 'Abrir');
  const mainAction = status === 'open' ? onMarkAsResolved : onMarkAsOpen;

  const options = [
    { key: 'open', label: t('chatHeader.statusButton.openFull', 'Abrir atendimento'), onClick: onMarkAsOpen },
    { key: 'pending', label: t('contexts.conversations.statusNames.pending', 'Pendente'), onClick: onMarkAsPending },
    { key: 'snoozed', label: t('chatHeader.statusButton.pause', 'Pausar Conversa'), onClick: onMarkAsSnoozed },
    { key: 'resolved', label: t('chatHeader.statusButton.complete', 'Concluir'), onClick: onMarkAsResolved },
  ];

  return (
    <div ref={rootRef} className="relative">
      {/* Primary action uses the brand tokens (white-label safe, correct in both
          themes); the per-status color lives only in the dots of the menu and of
          the header pill. */}
      <div className="inline-flex items-stretch overflow-hidden rounded-lg shadow-sm select-none">
        <button
          type="button"
          onClick={mainAction}
          className="inline-flex items-center whitespace-nowrap bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {mainLabel}
        </button>
        <button
          type="button"
          onClick={() => setMenuOpen(prev => !prev)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('chatHeader.statusButton.more', 'Mais opções de status')}
          className="inline-flex items-center border-l border-primary-foreground/20 bg-primary px-2 text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full z-[100] mt-1.5 w-52 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {options.map(o => {
            const optMeta = STATUS_META[o.key];
            const selected = o.key === status;
            return (
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                key={o.key}
                onClick={() => {
                  setMenuOpen(false);
                  o.onClick();
                }}
                className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors last:mb-0 hover:bg-accent hover:text-accent-foreground ${
                  selected ? 'border-border bg-accent text-accent-foreground' : 'border-transparent'
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 flex-none rounded-full"
                  style={{ background: optMeta.color }}
                />
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ConversationStatusButton;
