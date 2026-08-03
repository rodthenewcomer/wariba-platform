const SAFE_ORIGIN = 'https://wariba.internal';

/** Accept only an application-relative destination; reject open redirects. */
export function safeInternalPath(value: unknown, fallback = '/hub'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const destination = new URL(value, SAFE_ORIGIN);
    if (destination.origin !== SAFE_ORIGIN) {
      return fallback;
    }
    return `${destination.pathname}${destination.search}`;
  } catch {
    return fallback;
  }
}
