/**
 * The correlation id a failure is allowed to show.
 *
 * When a request fails, the one genuinely useful thing a screen can offer is a
 * value support can look up. Everything else the runtime knows — the message,
 * the stack, the module path, the query — describes the inside of the system
 * to someone standing outside it, and every one of those is a small disclosure
 * that costs nothing to withhold.
 *
 * So the reference is not "whatever the error carried". It is checked against
 * a deliberately narrow shape before it is rendered: opaque, bounded, and
 * incapable of carrying prose. A digest that does not match is dropped rather
 * than trimmed — a mangled reference is worse than none, because someone will
 * read it out to support and be told it does not exist.
 *
 * The same function guards the query parameter on `/erreur`, which is
 * attacker-controlled by definition: without it, anyone could hand a WARIBA
 * user a link that renders arbitrary text under the WARIBA brand.
 */

const REFERENCE_PATTERN = /^[A-Za-z0-9-]{6,64}$/;

export function safeSupportReference(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return REFERENCE_PATTERN.test(trimmed) ? trimmed : null;
}
