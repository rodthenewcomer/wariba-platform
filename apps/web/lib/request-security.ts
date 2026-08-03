/**
 * Cookie-authenticated JSON mutations must originate from WARIBA itself.
 * The configured application URL is authoritative; request Host headers are
 * attacker-controlled and therefore must not define the trusted origin.
 */
export function hasTrustedMutationOrigin(request: Request, appBaseUrl: string): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(appBaseUrl).origin;
  } catch {
    return false;
  }
}
