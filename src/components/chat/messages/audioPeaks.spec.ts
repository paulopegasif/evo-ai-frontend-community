import { describe, it, expect } from 'vitest';
import { computePeaks, seededBars, WAVEFORM_BARS } from './audioPeaks';

describe('computePeaks', () => {
  it('returns one normalized value per bar with the loudest at 1', () => {
    const data = new Float32Array(4000);
    for (let i = 2000; i < 2100; i++) data[i] = 0.9; // a loud burst in the middle
    const peaks = computePeaks(data, 40);
    expect(peaks).toHaveLength(40);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks[0]).toBe(0.08); // silence keeps a visible minimum
  });

  it('handles empty input', () => {
    expect(computePeaks(new Float32Array(0), 10)).toEqual(new Array(10).fill(0.08));
  });
});

describe('seededBars', () => {
  it('is stable for the same key and differs between keys', () => {
    expect(seededBars('a.ogg')).toEqual(seededBars('a.ogg'));
    expect(seededBars('a.ogg')).not.toEqual(seededBars('b.ogg'));
  });

  it('stays within (0, 1]', () => {
    const bars = seededBars('x');
    expect(bars).toHaveLength(WAVEFORM_BARS);
    bars.forEach(b => {
      expect(b).toBeGreaterThan(0);
      expect(b).toBeLessThanOrEqual(1);
    });
  });
});
