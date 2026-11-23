import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu';
import { useLanguage } from '@/hooks/useLanguage';
import type { BaseFilter } from '@/types/core/filters';
import type { ConversationFilter } from '@/types/chat/api';
import { CONVERSATION_SEGMENTS, getActiveSegmentId, ALL_SEGMENT_PRESET } from './conversationSegmentsHelpers';

interface ConversationSegmentsProps {
  /** Current GLOBAL active filters, used to highlight the matching chip. */
  activeFilters: ConversationFilter[];
  /** Applies the segment preset through the existing filter pipeline. */
  onSelectSegment: (preset: BaseFilter[]) => void;
  disabled?: boolean;
}

const GAP = 4; // matches gap-1 (0.25rem)
// Chips compactos (px-2.5 + text-xs) pra caberem mais na largura da lista. A
// camada de medição usa a MESMA classe pro cálculo de overflow bater.
const CHIP_CLASS = 'shrink-0 rounded-full px-2.5';

/**
 * WhatsApp/CRM-style primary navigation for the conversation list. Chips são
 * mutuamente exclusivos; clicar no ativo volta pro All. Quando os chips não
 * cabem na largura, os que sobram colapsam num botão "▾" (estilo chip) que abre
 * um dropdown — responsividade no estilo WhatsApp Web.
 */
const ConversationSegments = ({
  activeFilters,
  onSelectSegment,
  disabled = false,
}: ConversationSegmentsProps) => {
  const { t } = useLanguage('chat');
  const activeId = getActiveSegmentId(activeFilters);

  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(CONVERSATION_SEGMENTS.length);

  // Mede as larguras naturais (camada oculta) e calcula quantos chips cabem,
  // reservando espaço pro botão de overflow. useLayoutEffect = colapsa antes do
  // paint (sem flicker). Recalcula no resize (ResizeObserver) e na troca de idioma.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureLayer = measureRef.current;
    if (!container || !measureLayer) return;

    const compute = () => {
      const chipEls = measureLayer.querySelectorAll<HTMLElement>('[data-measure-chip]');
      const widths = Array.from(chipEls).map(el => el.offsetWidth);
      const moreEl = measureLayer.querySelector<HTMLElement>('[data-measure-more]');
      const moreWidth = moreEl?.offsetWidth ?? 40;
      const total = widths.length;
      if (!total) return;

      const available = container.clientWidth;
      const sumAll = widths.reduce((acc, w) => acc + w, 0) + GAP * (total - 1);
      if (sumAll <= available) {
        setVisibleCount(total);
        return;
      }

      // Overflow: reserva o botão "▾" e encaixa o máximo de chips.
      const budget = available - moreWidth - GAP;
      let used = 0;
      let count = 0;
      for (let i = 0; i < total; i += 1) {
        const next = used + widths[i] + (count > 0 ? GAP : 0);
        if (next <= budget) {
          used = next;
          count += 1;
        } else {
          break;
        }
      }
      setVisibleCount(Math.max(1, count));
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(container);
    return () => observer.disconnect();
  }, [t]);

  const visible = CONVERSATION_SEGMENTS.slice(0, visibleCount);
  const overflow = CONVERSATION_SEGMENTS.slice(visibleCount);
  const overflowHasActive = overflow.some(segment => segment.id === activeId);

  const applySegment = (segmentId: string, preset: BaseFilter[]) => {
    // Toggle: clicar no chip já ativo desmarca e volta pro All.
    onSelectSegment(segmentId === activeId ? ALL_SEGMENT_PRESET : preset);
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-1 overflow-hidden"
      role="tablist"
      aria-label={t('chatSidebar.segments.ariaLabel')}
    >
      {/* Camada de medição oculta (todos os chips + o botão de overflow). */}
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 flex items-center gap-1 opacity-0"
      >
        {CONVERSATION_SEGMENTS.map(segment => (
          <Button key={segment.id} data-measure-chip variant="outline" size="xs" className={CHIP_CLASS}>
            {t(segment.labelKey)}
          </Button>
        ))}
        <Button data-measure-more variant="ghost" size="icon-xs" className="shrink-0">
          <ChevronDown />
        </Button>
      </div>

      {/* Chips visíveis */}
      {visible.map(segment => {
        const isActive = segment.id === activeId;
        return (
          <Button
            key={segment.id}
            role="tab"
            aria-selected={isActive}
            variant="outline"
            size="xs"
            className={`${CHIP_CLASS} ${isActive ? 'border-primary/40 bg-primary/10 text-foreground hover:bg-primary/14' : 'text-muted-foreground'}`}
            disabled={disabled}
            onClick={() => applySegment(segment.id, segment.preset)}
          >
            {t(segment.labelKey)}
          </Button>
        );
      })}

      {/* Botão de overflow (▾) → dropdown com os chips que não couberam */}
      {overflow.length > 0 && (
        <Menu>
          <MenuTrigger
            disabled={disabled}
            render={
              <Button
                variant={overflowHasActive ? 'secondary' : 'ghost'}
                size="icon-xs"
                className="shrink-0"
                aria-label={t('chatSidebar.segments.ariaLabel')}
              />
            }
          >
            <ChevronDown />
          </MenuTrigger>
          <MenuPopup align="end">
            {overflow.map(segment => (
              <MenuItem
                key={segment.id}
                className={segment.id === activeId ? 'font-semibold' : undefined}
                onClick={() => applySegment(segment.id, segment.preset)}
              >
                {t(segment.labelKey)}
              </MenuItem>
            ))}
          </MenuPopup>
        </Menu>
      )}
    </div>
  );
};

export default ConversationSegments;
