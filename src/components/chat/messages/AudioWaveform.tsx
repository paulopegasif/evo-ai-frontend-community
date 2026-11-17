import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCachedPeaks, loadPeaks, seededBars } from './audioPeaks';

interface AudioWaveformProps {
  url: string;
  /** Playback position, 0–1. */
  progress: number;
  /** Called with the target position (0–1) on click, drag or arrow keys. */
  onSeek: (fraction: number) => void;
  ariaLabel: string;
  valueText: string;
}

/**
 * WhatsApp-style waveform: real peaks decoded from the file (lazily, when the
 * bubble scrolls into view), filled up to the playback position. Click or drag
 * to seek; arrow keys move 5%.
 */
const AudioWaveform: React.FC<AudioWaveformProps> = ({ url, progress, onSeek, ariaLabel, valueText }) => {
  const ref = useRef<HTMLDivElement>(null);
  const placeholder = useMemo(() => seededBars(url), [url]);
  const [peaks, setPeaks] = useState<number[] | null>(() => getCachedPeaks(url) ?? null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const cached = getCachedPeaks(url);
    if (cached !== undefined) {
      setPeaks(cached);
      return;
    }
    setPeaks(null);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    let cancelled = false;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      void loadPeaks(url).then(p => {
        if (!cancelled) setPeaks(p);
      });
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [url]);

  const bars = peaks ?? placeholder;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));

  const fractionAt = (clientX: number) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={valueText}
      className="relative flex h-6 w-full cursor-pointer touch-none items-center justify-between gap-[2px] rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-current/40"
      onPointerDown={e => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onSeek(fractionAt(e.clientX));
      }}
      onPointerMove={e => {
        if (draggingRef.current) onSeek(fractionAt(e.clientX));
      }}
      onPointerUp={e => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          onSeek(Math.max(0, Math.min(1, clamped + (e.key === 'ArrowRight' ? 0.05 : -0.05))));
        }
      }}
    >
      {bars.map((h, i) => {
        const played = (i + 0.5) / bars.length <= clamped;
        return (
          <span
            key={i}
            aria-hidden
            className={`w-[2px] shrink-0 rounded-full ${played ? 'bg-current' : 'bg-current/35'}`}
            style={{ height: `${Math.max(12, h * 100)}%` }}
          />
        );
      })}
      {/* Playhead dot, like WhatsApp */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current"
        style={{ left: `${clamped * 100}%` }}
      />
    </div>
  );
};

export default AudioWaveform;
