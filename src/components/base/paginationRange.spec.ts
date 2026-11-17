import { describe, expect, it } from 'vitest';
import { getVisiblePageNumbers } from './paginationRange';

describe('getVisiblePageNumbers', () => {
  it('shows each page once with a single trailing gap on the first page', () => {
    expect(getVisiblePageNumbers(1, 10)).toEqual([1, 2, 3, -2, 10]);
  });

  it('shows gaps on both sides in the middle', () => {
    expect(getVisiblePageNumbers(6, 12)).toEqual([1, -1, 4, 5, 6, 7, 8, -2, 12]);
  });

  it('shows a single leading gap on the last page', () => {
    expect(getVisiblePageNumbers(10, 10)).toEqual([1, -1, 8, 9, 10]);
  });

  it('fills a one-page gap with the page instead of dots', () => {
    expect(getVisiblePageNumbers(4, 10)).toEqual([1, 2, 3, 4, 5, 6, -2, 10]);
    expect(getVisiblePageNumbers(7, 10)).toEqual([1, -1, 5, 6, 7, 8, 9, 10]);
  });

  it('never repeats a page', () => {
    for (let total = 1; total <= 30; total++) {
      for (let page = 1; page <= total; page++) {
        const pages = getVisiblePageNumbers(page, total).filter(p => p > 0);
        expect(new Set(pages).size).toBe(pages.length);
        expect(pages).toContain(page);
      }
    }
  });
});
