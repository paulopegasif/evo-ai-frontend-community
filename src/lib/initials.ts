/** Avatar initials: first letter of the first and last words ("Ana Maria Costa" -> "AC"). */
export const initials = (name?: string | null, fallback = 'U'): string => {
  if (!name) return fallback;
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || fallback;
};
