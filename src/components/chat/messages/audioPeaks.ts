// Waveform data for audio messages (WhatsApp-style bars).
// Real peaks are decoded from the file once and cached; until then (or if the
// file can't be fetched/decoded) a stable pseudo-waveform derived from the URL
// is shown, so bars never reshuffle between renders.

export const WAVEFORM_BARS = 40;

/** Peak amplitude per bucket, normalized so the loudest bar is 1 (min 0.08). */
export const computePeaks = (channel: ArrayLike<number>, bars = WAVEFORM_BARS): number[] => {
  const len = channel.length;
  if (!len) return new Array(bars).fill(0.08);
  const size = Math.max(1, Math.floor(len / bars));
  const peaks: number[] = [];
  for (let b = 0; b < bars; b++) {
    const start = b * size;
    const end = b === bars - 1 ? len : Math.min(len, start + size);
    // RMS of the bucket: closer to perceived loudness than the raw max.
    let sum = 0;
    let n = 0;
    for (let i = start; i < end; i += 4) {
      const v = channel[i];
      sum += v * v;
      n++;
    }
    peaks.push(n ? Math.sqrt(sum / n) : 0);
  }
  const max = Math.max(...peaks);
  return peaks.map(p => (max > 0 ? Math.max(0.08, p / max) : 0.08));
};

/** Deterministic placeholder bars for a given key (same key → same bars). */
export const seededBars = (key: string, bars = WAVEFORM_BARS): number[] => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const r = ((h >>> 0) % 1000) / 1000;
    // Gentle envelope so it reads like speech rather than noise.
    const envelope = 0.55 + 0.45 * Math.sin((i / bars) * Math.PI);
    out.push(Math.max(0.15, Math.min(1, (0.25 + r * 0.75) * envelope)));
  }
  return out;
};

const cache = new Map<string, number[] | null>(); // null = failed, use placeholder
const inflight = new Map<string, Promise<number[] | null>>();
const MAX_CACHE = 300;
const MAX_CONCURRENT = 2;
let active = 0;
const queue: Array<() => void> = [];

const runLimited = <T>(job: () => Promise<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const start = () => {
      active++;
      job()
        .then(resolve, reject)
        .finally(() => {
          active--;
          queue.shift()?.();
        });
    };
    if (active < MAX_CONCURRENT) start();
    else queue.push(start);
  });

let sharedContext: BaseAudioContext | null = null;
const getContext = (): BaseAudioContext | null => {
  if (sharedContext) return sharedContext;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  sharedContext = new Ctor();
  return sharedContext;
};

export const getCachedPeaks = (url: string): number[] | null | undefined => cache.get(url);

export const loadPeaks = (url: string): Promise<number[] | null> => {
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);
  const existing = inflight.get(url);
  if (existing) return existing;

  const p = runLimited(async () => {
    try {
      const ctx = getContext();
      if (!ctx) return null;
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const audio = await ctx.decodeAudioData(buf);
      return computePeaks(audio.getChannelData(0));
    } catch {
      return null;
    }
  }).then(peaks => {
    if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value as string);
    cache.set(url, peaks);
    inflight.delete(url);
    return peaks;
  });
  inflight.set(url, p);
  return p;
};
