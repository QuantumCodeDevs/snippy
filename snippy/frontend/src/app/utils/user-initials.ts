const USERNAME_PATTERN = /^[a-zA-Z0-9_][a-zA-Z0-9_-]{1,31}$/;

/** Two-letter initials from username, then display name. `silver-otter-1234` → `SO`. */
export function userInitials(userName?: string | null, displayName?: string | null): string {
  const source = (userName || displayName || '').trim();
  const parts = source.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  const alnum = source.replace(/[^a-zA-Z0-9]/g, '');
  if (alnum.length >= 2) return alnum.slice(0, 2).toUpperCase();
  if (alnum.length === 1) return (alnum + alnum).toUpperCase();
  return '?';
}

export function slugUsername(raw: string | undefined | null): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 32);
  if (!USERNAME_PATTERN.test(cleaned)) return '';
  return cleaned;
}

/** Generated email-signup handles: `adj-noun-1234` or autogenerate `[a-z]{5}[0-9]{4}`. */
export function isPlaceholderUsername(name: string | undefined | null): boolean {
  const value = String(name || '');
  return /^[a-z]+-[a-z]+-\d{4}$/.test(value) || /^[a-z]{5}\d{4}$/.test(value);
}
