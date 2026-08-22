/**
 * Who the Hub says you are.
 *
 * ## Why this is not one line of string slicing
 *
 * The shell used to render `email.slice(0, 2)` in the avatar. On a real
 * account that produces something plausible; on the seeded test account it
 * produced **E2**, and "E2" shipped into the review captures as though it were
 * a person. That is the failure mode worth designing against: a fallback that
 * looks like data is more dangerous than one that looks like a fallback,
 * because nobody notices it is wrong.
 *
 * An address is also not a name. `contact@` and `info@` are not people, a
 * shared mailbox is not a person, and putting two characters of someone's
 * e-mail on screen leaks a fragment of it into every screenshot they take.
 *
 * ## The ladder
 *
 * 1. The image the identity provider gave us, if it gave us one.
 * 2. Initials — but only from a name a human actually entered.
 * 3. A neutral silhouette.
 *
 * There is no fourth rung, and in particular no generated portrait. A stock
 * face on a financial product is a stranger pretending to be the account
 * holder, which is exactly the kind of small fabrication this product has
 * spent the whole build refusing.
 */

export interface HubIdentity {
  /** The person's name when they gave one. Never an e-mail address. */
  displayName: string | null;
  /** One or two letters, from a real name only. `null` means draw the silhouette. */
  initials: string | null;
  /** Provider-supplied avatar, `https` only. */
  avatarUrl: string | null;
}

function readString(metadata: Record<string, unknown>, key: string): string {
  const value = metadata[key];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Accepts only `https`.
 *
 * The value arrives from an identity provider's metadata, so it is not ours to
 * trust blindly: `javascript:` and `data:` URLs have no business in an `src`,
 * and a plain-`http` avatar would downgrade the page's transport for a
 * decoration. An unparseable value is dropped, not repaired.
 */
function safeAvatarUrl(value: string): string | null {
  if (value.length === 0) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function initialsFrom(first: string, last: string, full: string): string | null {
  const fromParts = `${first.charAt(0)}${last.charAt(0)}`.trim();
  if (fromParts.length > 0) return fromParts.toUpperCase();

  // A single `full_name` field is what most social providers return. Take the
  // first and last words so "Marie Claire Diop" reads MD, not MC.
  const words = full.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) return null;
  const firstWord = words[0] ?? '';
  const lastWord = words.length > 1 ? (words[words.length - 1] ?? '') : '';
  const letters = `${firstWord.charAt(0)}${lastWord.charAt(0)}`.trim();
  return letters.length > 0 ? letters.toUpperCase() : null;
}

export function resolveHubIdentity(metadata: Record<string, unknown> | null): HubIdentity {
  const source = metadata ?? {};
  const first = readString(source, 'first_name');
  const last = readString(source, 'last_name');
  const full = readString(source, 'full_name') || readString(source, 'name');

  const displayName = [first, last].filter((part) => part.length > 0).join(' ') || full || null;

  return {
    displayName,
    initials: initialsFrom(first, last, full),
    avatarUrl: safeAvatarUrl(readString(source, 'avatar_url')),
  };
}
