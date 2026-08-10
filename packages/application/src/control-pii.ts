/**
 * Prompt 09 — how much of a person Control shows, and when.
 *
 * A staff member with `account.view` legitimately needs to find and identify
 * a trader. That is not the same as needing every trader's full address in
 * one glance: a list of fifty users is fifty addresses harvested at once,
 * from a screen nobody had to justify opening. So the list masks and the
 * detail page does not — bulk exposure is the risk worth removing, targeted
 * lookup is the job.
 *
 * The mask keeps a search result recognisable to whoever already knows who
 * they are looking for (first characters and the full domain) while being
 * useless for collecting addresses.
 */
const VISIBLE_LOCAL_CHARACTERS = 2;

export function maskEmail(email: string | null): string {
  if (!email) return '—';
  const at = email.lastIndexOf('@');
  if (at <= 0) {
    // Not a shape we recognise: mask it entirely rather than guess which
    // part was the identifying one.
    return '•••';
  }
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= VISIBLE_LOCAL_CHARACTERS) return `${local[0] ?? ''}•••${domain}`;
  return `${local.slice(0, VISIBLE_LOCAL_CHARACTERS)}•••${domain}`;
}

/** A trader's display name, falling back to something stable when absent. */
export function displayName(firstName: string | null, lastName: string | null): string {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  return full.length > 0 ? full : '—';
}
