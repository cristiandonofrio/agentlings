// "5 min ago", "yesterday" and so on, for the hover label.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function ago(ms, now = Date.now()) {
  if (!ms) return '';
  const d = now - ms;
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  if (d < 2 * DAY) return 'yesterday';
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} days ago`;
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// The hover label's time line. Says when you last wrote, and when it last did anything
// if that was later.
export function whenLine(s, now = Date.now()) {
  const used = ago(s.lastUsed, now);
  const active = ago(s.lastActivity, now);
  if (!used) return active ? `Last active ${active}` : '';
  if (!active || s.lastActivity - s.lastUsed < MIN) return `You last used it ${used}`;
  return `You last used it ${used}, last active ${active}`;
}
