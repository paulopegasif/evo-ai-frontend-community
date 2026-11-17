/**
 * Page buttons for the "smart" pagination: first, last, and `delta` pages
 * around the current one, with -1 / -2 marking the leading / trailing gaps.
 * e.g. (1, 10) → [1, 2, 3, -2, 10]; (5, 10) → [1, -1, 3, 4, 5, 6, 7, -2, 10].
 * It used to drop the gap markers and the JSX re-added first/last pages,
 * rendering "1 2 3 10 … 10".
 */
export const getVisiblePageNumbers = (currentPage: number, totalPages: number, delta = 2): number[] => {
  if (totalPages <= 1) return [1];
  const start = Math.max(2, currentPage - delta);
  const end = Math.min(totalPages - 1, currentPage + delta);
  const pages: number[] = [1];
  if (start > 2) pages.push(start === 3 ? 2 : -1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push(end === totalPages - 2 ? totalPages - 1 : -2);
  pages.push(totalPages);
  return pages;
};
